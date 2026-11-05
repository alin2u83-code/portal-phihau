# Faza hardening securitate DB — PROPUNERE (nimic aplicat)

Data: 2026-11-05. Sursa: inventar read-only pe `phi-hau-db` (pg_proc, pg_policies, simulari SELECT cu rollback) dupa faza 36.
Context: reprezentantii externi (faza 36) si orice cont logat pot apela functii/citi date pe care RLS nu le acopera. Blocheaza invitarea de conturi reale.

## 1. Ce am masurat (live, 5.11.2026)

| # | Constatare | Numere / dovada | Severitate |
|---|---|---|---|
| H1 | Un SPORTIV dintr-un singur club vede sportivii altor cluburi, cu CNP | simulat cu un cont SPORTIV: **1199 sportivi din 32 cluburi, 122 cu CNP**; 759 inscrieri din 31 cluburi. Cauza: `Select_Sportivi_Unified` (20260507) + `inscrieri_select auth.uid() IS NOT NULL` | HIGH, preexistent, minori (GDPR) |
| H2 | Functii `SECURITY DEFINER` fara garda, apelabile de orice cont logat (inclusiv extern) | 177 definer; 165 apelabile de `authenticated`; ~91 fara garda aparenta dupa regex (are false pozitive: `genereaza_taxe_anuale`, `raport_taxe_anuale_cluburi` sunt pazite prin `poate_gestiona_taxe_club`) | HIGH |
| H2a | `proceseaza_incasare_normalizata`, `recalculare_stare_plata`, `generare_factura_examen` (2 variante) | INSERT in tranzactii/tranzactie_plata pentru orice club, fara verificare | HIGH (financiar) |
| H2b | `adauga_sportiv_complet` | accepta `p_club_id` arbitrar, fara verificare de apartenenta | HIGH |
| H2c | `export_sportivi_selectati` | fara garda, intoarce CNP + adresa; azi esueaza cu eroare de tip (varchar(13) vs text), deci nu scurge, dar devine scurgere cand cineva o repara | HIGH latent |
| H2d | `decrypt_cnp`, `get_all_app_data` (100 sportivi nume+email, toate cluburile) | fara garda; `decrypt_cnp` depinde de setarea `app.cnp_encryption_key` | MEDIUM |
| H3 | Functii apelabile de **anon** (59) | intentionate: `get_competitie_publica`, `lista_cluburi_publice`, `trimite_cerere_acces`. **Neintentionat probabil:** `cauta_utilizatori_comisie` (anon cauta numele staff-ului: 17 rezultate la "a"); ~28 `scoala_ioncreanga_*` (aplicatie straina in aceeasi baza, pazite doar de parametrul `p_secret`, login cu PIN fara rate limit vizibil); helperi `*_club_id`, `is_comisie_*`; functii trigger apelabile (`sync_grad_actual_canonical`, `fn_automatizeaza_legatura_utilizator`) | MEDIUM-HIGH |
| H4 | Contul extern citeste TOATE coloanele sportivilor clubului din grant (cnp, adresa, telefon) | `ext_p_sportivi_sel`; UI cere doar coloane minime | MEDIUM (T-36-41) |
| H5 | Mici: `cluburi_public_select` expune `cif`/`setari`; cheia localStorage `phi-hau-active-role-context-id` comuna extern/portal; `ext_r_deny_all` acopera doar tabelele existente la momentul migrarii; politici storage neauditate exhaustiv; oracolul rezidual `signInWithOtp` direct | LOW-MEDIUM |

Limite ale inventarului: clasificarea garzii e pe regex (false pozitive/negative); n-am citit corpul tuturor celor 91; n-am apelat functii care scriu; n-am masurat performanta.

## 2. Plan in 5 valuri (ordonat dupa risc/efort)

**Val 0 — Triaj + plasa de regresie (read-only + 1 test).**
- Clasifica cele 177 de functii definer manual: A garda ok / B are nevoie de garda / C functii trigger (nu trebuie sa fie apelabile) / D publice intentionate. Rezultat: tabel `fn × rol × decizie` in `37-TRIAJ.md`.
- Test nou `tests/acl_definer_faza37.ts`: lista alb (allowlist) a functiilor apelabile de `anon`/`authenticated`; pica daca apare una noua. Inchide recidiva (functiile noi nu mai sunt expuse in tacere).

**Val 1 — Reducere suprafata (risc mic, castig mare).**
- `REVOKE EXECUTE ... FROM anon` pe tot, cu exceptia listei D. `REVOKE` de la `authenticated` pe functiile trigger/interne.
- `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon` (functiile viitoare nu mai sunt expuse implicit).
- `cauta_utilizatori_comisie`: cere `authenticated` + staff.
- Inainte de REVOKE: `grep rpc(` in frontend + `api/` ca sa nu stricam apelanti; migrarea include rollback (GRANT-urile vechi) in comentariu.

**Val 2 — Garzi in functiile de bani/date (B).**
- Tipar: `IF (SELECT este_doar_extern()) OR NOT (is_super_admin() OR has_access_to_club(<club>)) THEN RAISE ... 42501`.
- Tinte: `proceseaza_incasare_normalizata`, `recalculare_stare_plata`, `generare_factura_examen` x2, `adauga_sportiv_complet`, `process_exam_row_v4`, `export_sportivi_selectati` (repara si tipul + garda + limita pe ids), `decrypt_cnp` (doar service_role), `get_all_app_data` (sterge daca nu e folosita; altfel garda).
- Teste live per functie: extern respins, SPORTIV respins, ADMIN alt club respins, ADMIN propriu + federatie permis.

**Val 3 — Modelul de citire pentru `sportivi` (cea mai delicata, atinge UI).**
- Inlocuieste clauza cross-club din `Select_Sportivi_Unified` cu un view cu coloane limitate (`id, nume, prenume, club_id, grad, data_nasterii`, fara cnp/adresa/telefon/email) pentru ecranele de competitie. Contul extern citeste view-ul, nu tabela (inchide H4); tabela ramane pe club/familie/federatie.
- Necesita audit de consumatori (competitii, examene comisie, import). Test: SPORTIV vede doar clubul + familia; extern nu mai vede cnp.
- Revizuiește decizia D-16 ("SELECT larg intern, intentionat"): de decis cine are nevoie real de sportivi inter-club.

**Val 4 — Restul (H5) + aplicatia straina.**
- Plasa default-deny pentru tabele noi (verifica `rls_auto_enable` existent), restrangere `cluburi_public_select`, cheie localStorage separata pt. extern, audit storage.
- `scoala_ioncreanga_*`: decizie de arhitectura (vezi mai jos).

Estimare: 5-6 planuri, ~1 sesiune per val; Val 3 e cea mai mare. Fiecare val: migrare + teste live pe date efemere + review separat; push abia dupa OK.

## 3. Decizii luate (5.11.2026)

- **`scoala_ioncreanga_*`**: aplicatie folosita in alta aplicatie; se discuta separat. NU se ating in valurile 0-4 (nici REVOKE de la anon pe ele).
- **Ordine**: Val 1 si 2 INAINTE de invitatii; Val 3 DUPA.
- **H1 / Val 3**: doar federatia vede sportivi din alte cluburi. ADMIN_CLUB/INSTRUCTOR vad doar clubul lor (+ familie). Consecinta: un club nu mai poate inscrie sportivi ai altui club (flux inter-club ramane doar pentru federatie) — de verificat la Val 3 daca exista date/ecrane care depind de asta.

## 3b. Decizii initiale (arhiva)

1. **Aplicatia `scoala_ioncreanga_*`** (≈28 RPC apelabile anonim, in baza portalului): o mutam intr-un proiect/schema separat, o lasam cum e (acceptat), sau doar punem rate limit pe `scoala_ioncreanga_login`? Nu o ating fara decizia ta.
2. **H1 (cross-club cu CNP)**: ecranele de competitie au nevoie legitima de sportivi din alte cluburi pentru ADMIN_CLUB/INSTRUCTOR (inscrieri inter-club) sau doar pentru federatie? Raspunsul decide forma Val 3.
3. **Ordinea**: vrei Val 1+2 inainte de a invita reprezentanti reali (recomandat), iar Val 3 dupa? Val 3 poate astepta doar daca invitatii sunt putini si de incredere.
4. **Planul 32-08 (SMTP)** ramane prerechizit separat de lansare.

## 4. Ce NU face acest plan
Nu schimba logica de business a modulelor, nu atinge frontend-ul in afara Val 3, nu da push. Nu rezolva oracolul `signInWithOtp` direct (cere endpoint server, plan separat).
