# Faza 36 — Raport de verificare (acces extern la competiție)

Data: 2026-11-05. Plan: 36-12. Toate testele automate ruleaza pe DB-ul LIVE, cu date efemere `ZZ_TEST_FAZA36_*` / `zztest_faza36*` si cleanup in `finally` (reziduuri verificate = 0).

## Verdict

NU este gata de lansare publica. Doua blocante: (1) formularul „Solicita acces" nu poate fi folosit de un anonim (lista de cluburi goala, vezi sectiunea Defecte), (2) prerechizitul SMTP custom (plan 32-08) nu este indeplinit. Riscurile HIGH/MEDIUM din 36-11 cer decizie explicita.

## (a) Acoperirea cerintelor

| Cerinta | Plan(uri) | Dovada |
|---------|-----------|--------|
| ACX-01 link public `/competitie/<uuid>` + teaser | 36-02, 36-05, 36-09, 36-10 | `tests/acces_extern_fundatie_faza36.ts` (36/36); spec UI teste 1-2 (link invalid/draft/inexistent -> mesaj generic; teaser anonim) |
| ACX-02 login email + OTP, context eligibil | 36-05, 36-09 | `tests/acces_extern_aprobare_faza36.ts` (OTP prin `generateLink` + `verifyOtp`, nu email real); `utils/accesExtern.test.ts` |
| ACX-03 cerere -> aprobare/respingere | 36-02, 36-05, 36-06, 36-10 | `tests/acces_extern_aprobare_faza36.ts`: 28/28 (RPC anonim, handler 401/403/400/405/409, aprobare, respingere, cont existent, revocare); `api/_aprobaCerereAcces.test.ts`. **Partea de UI a cererii (formularul) NU trece, vezi Defecte** |
| ACX-04 inscriere prin wizard, inter-club dezactivat | 36-03, 36-04, 36-09 | `tests/rls_competitii_scriere_faza36.ts` (27/27); spec UI test 4 (shell extern randat); inscrierea efectiva din browser NU s-a testat |
| ACX-05 doar participantii propriului club | 36-03, 36-08, 36-09 | `tests/rls_acces_extern_faza36.ts` (57/57); spec UI test 4 (niciun raspuns de retea cu SP_B / club B) |
| ACX-06 taxe doar citire | 36-03, 36-08, 36-09 | 36-11 (scriere pe plati respinsa); vizual doar fila „Taxe" existenta |
| ACX-07 date generale | 36-03, 36-09 | spec UI teste 2 si 4 |
| ACX-08 fara sidebar; „Acces limitat" pe `/` | 36-07, 36-09 | spec UI teste 2, 4, 5 (0 sidebar, 0 cereri `sportivi`/`inscrieri_competitie` pe `/`) |
| ACX-09 RLS izolare | 36-01, 36-02, 36-08, 36-11 | `tests/rls_acces_extern_faza36.ts` 57/57, sweep 229 relatii: ALLOW=30, OK=199, LEAK=0 |
| ACX-10 repararea politicilor de scriere cross-club | 36-01, 36-04 | `tests/rls_competitii_scriere_faza36.ts` 27/27 |
| ACX-11 portalul principal neschimbat | 36-04, 36-07, 36-08, 36-11, 36-12 | regresii interne in 36-11 (ADMIN_CLUB si cont MIXT); 36-12: vizibilitatea ADMIN_CLUB neschimbata dupa adaugarea rolului extern; `rls_izolare_cross_club_faza25` OK |
| ACX-12 verificare finala | 36-11, 36-12 | acest document; vezi limitele de mai jos |

## Rezultate 36-12

- Test live flux: `npx tsx tests/acces_extern_aprobare_faza36.ts` -> 28/28 PASS, reziduuri 0.
- Spec Playwright pe build de productie: 5/6 PASS (teste 1, 2, 4, 5, 6). Testul 3 (Solicita acces) PICA, defect DB descris mai jos.
- `npx tsc --noEmit` OK; `npm run build` OK; `utils/accesExtern.test.ts` ALL PASSED; `api/_aprobaCerereAcces.test.ts` ALL PASSED; `tests/rls_acces_extern_faza36.ts` 57/57 (rulat din nou la final).

## Defecte gasite

1. **BLOCANT (DB/RLS) — anonimul nu poate lista cluburile.** `select id,nume from cluburi` ca `anon` intoarce 0 randuri (verificat live; `get_competitie_publica` functioneaza). `SolicitaContForm` incarca cluburile din tabela, deci selectul „Club" ramane gol si cererea nu se poate trimite din UI (RPC-ul `trimite_cerere_acces` functioneaza corect, dovedit in testul live). Spec UI test 3 pica pe acest lucru. Cauza: lipseste un RPC/politica publica de cluburi (migrarea 36-02 nu are unul; `cluburi_public_select` e doar pentru `authenticated`).
   - Fix propus (neaplicat, nu am acces DDL in acest executor):
     ```sql
     CREATE OR REPLACE FUNCTION public.lista_cluburi_publice()
     RETURNS TABLE (id uuid, nume text) LANGUAGE sql STABLE SECURITY DEFINER
     SET search_path = public, pg_catalog AS $$
       SELECT c.id, c.nume FROM public.cluburi c ORDER BY c.nume;
     $$;
     REVOKE EXECUTE ON FUNCTION public.lista_cluburi_publice() FROM PUBLIC;
     GRANT EXECUTE ON FUNCTION public.lista_cluburi_publice() TO anon, authenticated, service_role;
     NOTIFY pgrst, 'reload schema';
     ```
     (migrarile din `supabase/` se adauga cu `git add -f`.) Codul aplicatiei este deja pregatit: `services/accesExternService.ts::incarcaCluburiPublice` apeleaza `lista_cluburi_publice` si cade pe tabela daca RPC-ul nu exista. Dupa aplicare se re-ruleaza `npx playwright test tests/ui_acces_extern_faza36.spec.ts`. Nota: expune numele tuturor cluburilor federatiei oricui are linkul unei competitii (decizie de acceptat).
2. (Test, nu defect de produs) In testul live, cont existent ADMIN_CLUB: asertiunea initiala „vede doar clubul B" era gresita pentru ca politica preexistenta `Select_Sportivi_Unified` (20260507) face vizibili sportivii cu inscrieri la competitii pentru orice autentificat (31 de cluburi vizibile si INAINTE de aprobare). Asertiunea a fost inlocuita cu o comparatie inainte/dupa aprobare (vizibilitatea nu scade, castigul este doar clubul din grant). Nu s-a relaxat nicio verificare de securitate a rolului extern.

## (b) Ce s-a verificat automat si ce NU

Verificat: RLS live cu conturi reale (citire, scriere, escaladare, spoof de header, sweep pe 229 relatii); contractul endpointului de aprobare cu tokenuri reale (handler importat direct, nu prin HTTP/Vercel); fluxul cerere -> aprobare -> OTP -> acces -> revocare; comportamentul in browser pe build-ul de productie (Chromium headless, desktop 1280x800), inclusiv absenta datelor clubului strain in toate raspunsurile Supabase.

NU verificat:
- **Niciun email real** cu cod OTP (codul se obtine cu `auth.admin.generateLink`); nu s-a testat `signInWithOtp` end-to-end cu livrare.
- **Nicio verificare pe telefon real**; screenshot-ul mobil (`screens/36-12-extern-mobil.png`) provine din Chromium headless redimensionat la 390x844 dupa incarcare (nu un dispozitiv, nu un reload la acea latime) si necesita verificare umana.
- Inscrierea efectiva a unui sportiv din browser (wizard) cu cont extern; fila „Taxe" cu date reale; schimbarea contextului cu mai multe granturi.
- Formularul „Solicita acces" in browser (blocat de defectul 1).
- Simulare de politica fantoma `USING(true)` pe live (nu s-a facut, pentru a nu expune date).
- Endpointul prin infrastructura Vercel (rate limit in-memory pe cold start, headere reale de IP).
- Consumatorii interni ai view-urilor trecute pe `security_invoker` (`vedere_prezenta_sportiv`, `vedere_istoric_grade_sportiv`) in browser.
- Nu s-a rulat un code review separat pe diff (cerut de instructiunile globale pentru modificari netriviale; aici modificarea de cod de productie este doar o functie de 3 linii in `accesExternService.ts`).

## (c) Prerechizit de lansare — SMTP custom (plan 32-08)

Planul 32-08 (SMTP custom, rate limit emailuri) este **neexecutat** (checkpoint de configurare externa in Dashboard, `[ ]` in ROADMAP). Fara el Supabase limiteaza emailurile Auth (implicit cateva pe ora pe proiect), deci OTP-ul pentru mai multi reprezentanti de club nu functioneaza la volum. Pana atunci: doar testare cu `generateLink` sau cu codul din consola Supabase. Notificarea la aprobare nu exista (federatia anunta separat; fara linkuri de actiune in email, conform deciziei proiectului).

## (d) Riscuri ramase (din 36-08 / 36-11 / 36-12)

1. **HIGH — ~170 functii RPC `SECURITY DEFINER` apelabile de orice `authenticated`, inclusiv contul extern** (ex. `adauga_sportiv_complet`, `export_sportivi_selectati`, `decrypt_cnp`, `get_all_app_data`, `merge_sportivi`, `transfer_sportiv`, `genereaza_taxe_anuale`, `inregistreaza_plata_federatie`, `seteaza_scutire_taxa`, `proceseaza_*`, `set_primary_context`/`switch_*`, `scoala_ioncreanga_*`). RLS nu le acopera; garda depinde de corpul fiecarei functii. Neapelate in teste (pot muta date). Necesita audit al gardelor + `REVOKE EXECUTE` sau garda `NOT este_doar_extern()`.
2. **MEDIUM — `sportivi` SELECT pe toate coloanele pentru clubul din grant**: extern poate cere `cnp`, `adresa`, `telefon`, `email` prin PostgREST, nu doar coloanele folosite de `ExternDataProvider`. Mitigari: view limitat / column grants.
3. `storage.objects`: politica restrictiva `ext_r_storage_deny` creata; `avatars` INSERT blocat pentru extern. Politicile existente pe storage nu au fost auditate exhaustiv.
4. `cluburi_public_select` expune toate coloanele (inclusiv `cif`, `setari`) oricarui autentificat, inclusiv extern — risc scazut.
5. View-uri `vedere_prezenta_sportiv` / `vedere_istoric_grade_sportiv` trecute pe `security_invoker` (36-08): consumatorii interni netestati in browser. Alte view-uri `SECURITY DEFINER` din baza nu au fost inventariate exhaustiv.
6. Cheia localStorage `phi-hau-active-role-context-id` este comuna intre login extern si portal (T-36-31): pe acelasi browser, loginul extern suprascrie contextul portalului.
7. Enumerarea emailurilor prin eroarea `signInWithOtp` (`otp_disabled` 422 pentru email inexistent) — acceptat in D-05 (T-36-60).
8. INSTRUCTOR extern nu poate edita arme CVD (aliniere cu RLS Faza 35: doar ADMIN_CLUB/federatie) — de confirmat.
9. Contul mixt (rol intern + grant extern) vede reuniunea: politicile `ext_p_*` pe grant nu depind de headerul de context.
10. Rate limit al endpointului de aprobare e in-memory (se reseteaza la cold start); admisibil pentru volumul actual.
11. `SELECT` larg intern pe `inscrieri_competitie` (ADMIN_A vede inscrierile clubului B) — preexistent, pastrat intentionat (D-16).
12. Lista publica de cluburi (fix-ul defectului 1) expune numele cluburilor la oricine are un link de competitie.

## (e) Decizii cerute inainte de lansare

1. Aplicarea fix-ului pentru lista publica de cluburi (migratie `lista_cluburi_publice`) si re-rularea spec-ului UI (test 3).
2. Executarea planului 32-08 (SMTP custom) inainte de a invita reprezentanti reali.
3. Riscul HIGH (RPC-uri `SECURITY DEFINER`): remediere inainte de lansare sau acceptat explicit pentru un grup mic de conturi invitate? Recomandare: faza separata de hardening, inainte de a deschide linkul unui numar mare de conturi.
4. Riscul MEDIUM (coloane `sportivi`, in special `cnp`): view limitat / column grants inainte de lansare? (date de minori, GDPR).
5. Politica de storage si view-urile `SECURITY DEFINER` ramase: acceptat sau faza separata.
6. Enumerarea emailurilor: acceptata (D-05)?

## Verificari umane (neautomatizabile)

- Reprezentant real de club, de pe telefon: deschide linkul, cere codul pe emailul lui, vede doar competitia si participantii clubului sau, inscrie un sportiv; federatia vede inscrierea (necesita SMTP custom).
- Super admin federatie: tab „Acces extern", copiaza linkul, aproba o cerere reala de test, apoi revoca; verifica textele in romana si afisarea pe mobil (screenshot in `screens/`, fara nume de sportivi in vedere).
