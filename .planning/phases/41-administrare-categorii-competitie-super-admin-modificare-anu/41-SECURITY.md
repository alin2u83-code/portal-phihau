---
phase: 41
slug: administrare-categorii-competitie-super-admin-modificare-anu
status: files_verified_live_pending
asvs_level: 1
block_on: high
threats_total: 33
threats_closed: 33
threats_open: 0
findings_open: 9
findings_blocking: 0
audited: 2026-11-15
live_db_verification: NOT PERFORMED (see "Limits of this audit")
---

# Faza 41 - SECURITY (administrare categorii competitie)

Audit read-only: nu s-a modificat cod, migrari sau DB. Singurul fisier scris este acesta.

## Limits of this audit (citeste primul)

1. **Verificarea LIVE pe DB nu a fost facuta.** Sub-agentul de audit nu are tool-uri Supabase MCP, iar un apel read-only prin `service_role` din `.env` (RPC `acl_functii_snapshot`) a fost blocat de permisiuni; nu am ocolit blocajul. Tot ce e marcat "fisier" mai jos este verificat in migrari/cod; **nu** dovedeste ca DB-ul live are aceeasi stare (precedent: politici fantoma, Faza 25).
2. Dovezile "live" din `41-04-SUMMARY.md` (grants, prosecdef, 16/16 PASS) sunt documentatie de mana a doua, nu dovada mea. `tests/categorii_admin_faza41.ts` exista in repo si testeaza ce se afirma (checks 1, 2, 3, 12, 13), dar rezultatele rularii nu au fost reproduse.
3. UI: nu s-a testat in browser; gating-ul a fost verificat citind codul.
4. Amenintarile care depind de starea live si trebuie reconfirmate cu checklist-ul de la sfarsit: **T-41-01, T-41-05, T-41-16, T-41-25 (partea RLS)**. Daca o interogare diverge de fisier, acestea se redeschid.

## Rezultat

Toate cele 33 de amenintari din `<threat_model>` (41-01..41-07) au mitigarea declarata prezenta in cod/migrari (20 mitigate, 4 transfer, 9 accept). Nu exista nicio mitigare declarata absenta, deci 0 BLOCKER cu `block_on: high`. Sunt insa 9 constatari neinregistrate (2 MEDIUM, 4 LOW, 3 INFO), dintre care 2 MEDIUM merita decizia utilizatorului: SEC-41-01 si SEC-41-02.

## Threat Verification

Legenda: **CLOSED** = mitigare gasita in fisier; **CLOSED+L** = gasita in fisier, dar depinde si de starea live (nereverificata de mine).

| ID | Categorie | Disp. | Status | Dovada (fisier:linie) |
|----|-----------|-------|--------|-----------------------|
| T-41-01 | Elevation of privilege (RPC) | mitigate | CLOSED+L | `supabase/migrations/20261114a_categorii_aplica_operatie.sql:75-77` garda `is_super_admin()` primul statement, ERRCODE 42501; `:358` `REVOKE ALL ... FROM PUBLIC, anon`; `:359` `GRANT ... TO authenticated, service_role`; `tests/acl_definer_faza37.allowlist.json:30` semnatura in allowlist. `is_super_admin()` valideaza header-ul contra `user_id = auth.uid()` (`20260319_security_audit_fixes.sql:445-458`), deci header-ul client nu poate fi falsificat. |
| T-41-02 | Tampering (IDOR) | mitigate | CLOSED | `:167-220` fiecare rand din `p_mutari` trebuie sa existe in `p_competitie` si sa nu fie retras (`:178-191`); fuziune/impartire: categorie_id in `p_surse` si tinta = cheie noua (`:193-196`); mutare: tinta activa, aceeasi competitie, compatibila proba/tip/arma (`:199-219`); surse din aceeasi competitie si active (`:113-119`). |
| T-41-03 | Tampering (preview vechi) | mitigate | CLOSED | `:91` `competitii ... FOR UPDATE`; `:113` surse `FOR UPDATE ORDER BY id`; `:229-244` acoperire completa fuziune/impartire (`v_activi <> v_cnt_m`) si `p_asteptat` la anulare. Rezidual: SEC-41-04. |
| T-41-04 | DoS / pierdere date (CASCADE) | mitigate | CLOSED | Functia nu contine DELETE/TRUNCATE/DROP/EXECUTE in SQL ne-comentat (grep: doar `GRANT EXECUTE`); sursele ramana cu status `anulata/fuzionata/impartita` (`:325,338,340`). Atentie: stergerea de categorie este o alta cale (SEC-41-02). |
| T-41-05 | Elevation (search_path) | mitigate | CLOSED+L | `:44` `SET search_path = public, pg_catalog`; zero SQL dinamic (grep EXECUTE). Reducere de strictete: SEC-41-03. |
| T-41-06 | Tampering (jsonb) | mitigate | CLOSED | `:86-88` `jsonb_typeof = 'array'`; `:140-159` validare enum/interval + `EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range`; `:169-175` `jsonb_to_recordset` tipat, tip/id/tinta obligatorii, fara duplicate; regex uuid `:47` aplicat inainte de cast `:210,:262` (cast final `:304-310` doar dupa validare). |
| T-41-07 | Repudiation | accept | CLOSED | Vezi "Accepted Risks Log". |
| T-41-08 | Info disclosure (Wave 0) | mitigate | CLOSED | Header `:9-31` contine doar numaratori si nume de obiecte, fara date personale. |
| T-41-09 | Elevation (wrapper FE) | mitigate | CLOSED | `services/categoriiAdminService.ts:14-17` JSDoc "garda reala este server-side"; `:27-34` doar forwardeaza, nu arunca. |
| T-41-10 | Tampering (mapare preview) | transfer | CLOSED | Transfer catre RPC verificat: `20261114a...sql:161-272` (competitie, surse, acoperire, compatibilitate, dubluri). |
| T-41-11 | Info disclosure (SELECT_* +gen,status) | accept | CLOSED | Log. `components/Competitii/constants.tsx:31-32`: nu s-au adaugat CNP/telefon/email, doar `gen, status`. |
| T-41-12 | DoS (preview mare) | accept | CLOSED | Log. |
| T-41-13 | Integritate financiara (taxe achitate) | mitigate | CLOSED | RPC nu scrie `taxa_achitata` (apare doar in SELECT-uri de numarare, `:329-335`); `utils/taxeCompetitie.ts:79,97,131` (`taxaAnulata`, `totalAchitatAnulat`); `components/Competitii/FinanciarView.tsx:97-98` "Marcheaza tot achitat" exclude `taxaAnulata`; nicio resetare `taxa_achitata: false` in cod (doar INSERT-uri noi in `Pas4Sumar.tsx:350,404`). |
| T-41-14 | Repudiation (restituiri) | accept | CLOSED | Log. |
| T-41-15 | Info disclosure (vedere taxe club) | accept | CLOSED | Log. |
| T-41-16 | Elevation (RPC live) | mitigate | CLOSED+L | `tests/categorii_admin_faza41.ts:149` (ADMIN_CLUB -> 42501) si `:152` (anon refuzat) exista; REVOKE din migrare. Grants live nereverificate de mine (checklist Q1/Q8). |
| T-41-17 | Tampering (poluare date test) | mitigate | CLOSED | `tests/categorii_admin_faza41.ts:26` prefix `ZZ_TEST_FAZA41_`, cleanup in afara `try` (`:304-307`), check 15 (`:288`). Vezi SEC-41-05. |
| T-41-18 | Tampering (schimbare prod fara OK) | mitigate | CLOSED | `41-04-PLAN.md:65` `checkpoint:decision gate="blocking"`; decizia inregistrata in `41-04-SUMMARY.md` (dovada doar documentara, control de proces). |
| T-41-19 | Info disclosure (output test) | mitigate | CLOSED | Doar UUID/numaratori in `record(...)`; mesajul de dublura (contine nume) nu se tipareste (`tests/categorii_admin_faza41.ts:199`); parola nu e tiparita. Partea "random" a parolei nu e adevarata: SEC-41-05. |
| T-41-20 | Repudiation (audit_log din teste) | accept | CLOSED | Log. |
| T-41-21 | Elevation (modal la rol gresit) | transfer | CLOSED | `components/Competitii/index.tsx:114` `!extern && permissions.isSuperAdmin && status !== 'finalizata'`; actiunile `:418,456,501,611`; garda reala in RPC. |
| T-41-22 | Tampering (confirmare preview vechi) | transfer | CLOSED | RPC `:229-244`; `CategorieOperatieModal.tsx:119` la eroare `showError` + `return` (modalul ramane deschis). |
| T-41-23 | DoS (dublu submit) | mitigate | CLOSED | `CategorieOperatieModal.tsx:135` `persistent={loading}`, `:297` `disabled={blocaje.length > 0 || loading}`; server `:91` lock competitie. |
| T-41-24 | Info disclosure (varsta/gen in tabel) | accept | CLOSED | Log. |
| T-41-25 | Elevation (clona/edit de non-super-admin) | mitigate | CLOSED+L | Butoane Categorii gate-uite `index.tsx:114,456-501`; RLS RESTRICTIVE `categorii_r_ins/upd/del` (`20261106b:193-202`) blocheaza rolurile de club; extern fara scriere (`20261106c:94-100`); test live `:255` (ADMIN_CLUB nu poate modifica). **Dar rolul federatie `ADMIN` ramane permis de RLS si are acces la AdminPanel: SEC-41-01.** |
| T-41-26 | Tampering (edit proba/tip cu inscrieri) | mitigate | CLOSED | `components/Competitii/CategorieForm.tsx:91` `blocat`, `:159,213` `disabled={blocat}`; `areInscrieri` pasat din `index.tsx:643` si `AdminPanel.tsx:289`. Blocaj doar in UI (acceptabil pentru roluri de incredere, vezi SEC-41-01). |
| T-41-27 | Tampering (selectie realocare) | transfer | CLOSED | RPC mutare `:198-219` + dubluri `:246-272`. |
| T-41-28 | Info disclosure (lista orfani) | accept | CLOSED | Log. |
| T-41-29 | Elevation (actiuni la ADMIN/club) | mitigate | CLOSED | Actiunile noi (Fuzioneaza/Imparte/Anuleaza/Realoca) doar cu `poateAdminCategorii` (`index.tsx:114,418,456,501,611`); garda reala RPC. Butonul Edit pre-existent din AdminPanel ramane vizibil rolului `ADMIN`: SEC-41-01. |
| T-41-30 | Tampering (fuziune non-atomica + DELETE) | mitigate | CLOSED | `handleFuzioneaza` nu mai exista (grep zero in components/services/utils); `FuzionariPanel.tsx` nu contine nicio scriere `supabase.`. |
| T-41-31 | Pierdere date (DELETE CASCADE) | mitigate | CLOSED | `AdminPanel.tsx:70` `areRanduri` (orice status), `:252` buton doar `categorieActiva(cat) && !areRanduri(cat.id)`. Mitigarea declarata exista, dar e doar pe starea clientului: **SEC-41-02**. |
| T-41-32 | Info disclosure (grad/quyen in lista) | accept | CLOSED | Log. |
| T-41-33 | DoS (re-rendere) | mitigate | CLOSED | `useMemo` in `CategorieOperatieModal.tsx` (6) si `FaraCategoriePanel.tsx` (2). |

## Findings neinregistrate (unregistered_flag, WARNING; niciunul nu e BLOCKER la `block_on: high`)

### SEC-41-01 (MEDIUM) - D-01/D-09 nu sunt impuse in DB pentru edit/clonare/stergere de categorie
- RLS pe `categorii_competitie` (`20261106b_rls_competitii_scriere_club_scoped.sql:165-202`) permite scriere pentru `SUPER_ADMIN_FEDERATIE` **si** `ADMIN` (federatie). Garda `is_super_admin()` exista doar in RPC.
- Tab-ul Admin este vizibil pentru `isAdmin = isSuperAdmin || isFederationAdmin` (`components/Competitii/index.tsx:111,336,842`). In `AdminPanel.tsx:249` butonul Editeaza si `:252-256` Sterge nu verifica `isSuperAdmin` si nici `competitie.status === 'finalizata'`; `CategorieForm.tsx:132,136` scrie direct (UPDATE/INSERT).
- Efect: un utilizator `ADMIN` (sau orice client cu JWT-ul lui) poate edita/sterge categorii, inclusiv pe competitii finalizate, si poate seta direct `status_categorie='anulata'` ocolind RPC-ul (fara drift check, fara garda `finalizata`). D-01 spune "DOAR SUPER_ADMIN_FEDERATIE".
- Mitigare recomandata (decide utilizatorul): fie se accepta explicit `ADMIN` ca rol de incredere (log accept), fie se strange RLS la `is_super_admin()` pe `categorii_competitie` si se ascunde AdminPanel-ul categoriilor pentru `ADMIN`, plus trigger BEFORE UPDATE/DELETE care refuza pe competitie `finalizata`.
- De verificat live: cate conturi `ADMIN` exista (checklist Q9).

### SEC-41-02 (MEDIUM) - Stergerea categoriei nu e RPC; garda CASCADE e doar in client
- Cererea de audit presupunea un RPC de stergere: **nu exista**. `components/Competitii/AdminPanel.tsx:72-78` face `supabase.from('categorii_competitie').delete().eq('id', id)` direct. Handler-ul nu re-verifica nimic; garda e doar vizibilitatea butonului (`:252`) calculata din `inscrieri`/`echipe` incarcate in memorie.
- FK `inscrieri_competitie.categorie_id` / `echipe_competitie.categorie_id` sunt `ON DELETE CASCADE` (`20260319_competitii_schema.sql:80,97`; live nereverificat), iar `echipa_sportivi` cade in cascada prin echipa.
- Doua cai de pierdere silentioasa: (a) lista veche (un club s-a inscris dupa incarcare; `onRefresh` nu se cheama inainte de DELETE); (b) lista trunchiata: `index.tsx:155-160` selecteaza fara paginare, iar PostgREST taie la `max_rows` (1000 implicit pe Supabase hostat), deci la o competitie cu peste 1000 inscrieri `areRanduri` poate fi fals pentru o categorie cu randuri. Azi cea mai mare competitie are 182 inscrieri (risc latent, la tinta 3500 sportivi devine real).
- Mitigare recomandata: trigger `BEFORE DELETE ON categorii_competitie` care ridica exceptie daca exista randuri in `inscrieri_competitie`/`echipe_competitie` (orice status), sau RPC `sterge_categorie_goala` cu `is_super_admin()` + `FOR UPDATE` + count; alternativ FK `RESTRICT` pe `categorie_id`.

### SEC-41-03 (LOW) - ordinea `search_path = public, pg_catalog`
- `20261114a...sql:44` pune `public` inaintea `pg_catalog` (implicit, `pg_catalog` e cautat primul). Un obiect `public.btrim/lower/...` ar umbri functia interna si ar rula ca owner al functiei. Exploatabil doar de cine poate crea obiecte in `public` (nu verificat live). Aceeasi forma in precedentul `20261112b` (`:55,189,227,291`).
- Recomandat: `SET search_path = pg_catalog, public` (sau `''` cu nume calificate).
- Conexa: `is_super_admin()` apare in 4 versiuni in migrari; cea din `20260313_update_context_functions.sql:50` nu are `SET search_path`, cea din `20260319_security_audit_fixes.sql:427-430` are `SET search_path = public`. Versiunea live trebuie confirmata (Q3).

### SEC-41-04 (LOW) - categoriile neactive pot primi inscrieri noi prin INSERT direct
- `ic_r_gate_ins` (`20261106b:41-47`) verifica doar `categorie_apartine_competitiei` (competitia), nu `status_categorie`. UI-ul le exclude (fix `d74963db`), DB-ul nu. Un INSERT blocat de lock-ul RPC pe `competitii`/`categorii` (FK = KEY SHARE) se completeaza dupa commit si produce un rand nou pe categorie `fuzionata/anulata` = orfan "Fara categorie" (recuperabil din FaraCategoriePanel, nu pierdere de date).

### SEC-41-05 (LOW) - parola utilizatorilor de test nu este aleatoare
- `tests/categorii_admin_faza41.ts:28,55`: `RUN_ID = Date.now()`, parola `Zz!${RUN_ID}aA`, aceeasi valoare apare si in email (`:134`). Se creeaza pe DB-ul de productie un utilizator `SUPER_ADMIN_FEDERATIE` temporar (`:143`) cu parola derivabila din email, cu `email_confirm: true`, pe durata rularii. Cleanup `:304-307`; `41-04-SUMMARY.md` raporteaza 0 utilizatori ramasi dupa rulare. T-41-19 spunea "random passwords".
- Recomandat: `crypto.randomUUID()` pentru parola, email fara RUN_ID previzibil.

### SEC-41-06 (INFO) - `is_super_admin()` ignora contextul activ in fallback
- `20260319_security_audit_fixes.sql:454-458`: orice rand `SUPER_ADMIN_FEDERATIE` al utilizatorului trece garda, chiar daca actioneaza in context ADMIN_CLUB. Consecvent cu restul portalului; de documentat, nu de reparat in aceasta faza.

### SEC-41-07 (INFO) - radacina increderii: politicile de scriere pe `utilizator_roluri_multicont`
- Garda RPC depinde de ca niciun utilizator sa nu-si poata insera singur un rand `SUPER_ADMIN_FEDERATIE`. In migrari nu exista niciun `CREATE POLICY` de INSERT/UPDATE pe acest tabel (doar SELECT si blocarea extern), deci politicile reale sunt in afara fisierelor. De confirmat live (Q10).

### SEC-41-08 (INFO) - lipsuri de acoperire in teste/UAT
- Live test acopera doar ADMIN_CLUB si anon (checks 1-2); `ADMIN` federatie, `INSTRUCTOR`, `SPORTIV`, `REPREZENTANT_COMPETITIE` nu sunt testati contra RPC (logica `is_super_admin()` ii refuza, dar netestat). `41-UAT.md` test 1: negativul (alte roluri) si competitia finalizata sunt marcate NETESTATE in UI.

### SEC-41-09 (INFO, in afara fazei) - `.env` local contine o linie cu credentiale in clar
- `.env` (gitignored, neurmarit, `git log --all -- .env` gol) are, pe langa variabilele `KEY=...`, o linie `email:`/`password:` pentru o casuta de mail. Nu am reprodus valoarea. Recomandat: mutare in manager de secrete / variabila dedicata, rotire daca fisierul a circulat.

## Accepted Risks Log

| ID | Risc acceptat | Justificare (din PLAN) | Revizuire |
|----|---------------|------------------------|-----------|
| T-41-07 | Atribuire modificari (cine a mutat inscrieri) | `audit_trigger_fn` logheaza UPDATE pe inscrieri/echipe cu contextul de rol; modificarile pe `categorii_competitie` sunt rare si facute de super admin. Nereverificat live daca exista trigger de audit pe `categorii_competitie`. | Q7 |
| T-41-11 | `gen`/`status` sportiv adaugate in SELECT_* | Aceleasi randuri deja vizibile sub RLS; necesar pentru impartire pe gen si regula gradului la data competitiei; fara CNP/telefon. | la schimbare de scope |
| T-41-12 | Preview O(randuri x categorii) in memorie | Categoriile au zeci de randuri. | - |
| T-41-14 | Restituiri taxe achitate pe categorii anulate | Se inregistreaza prin demarcarea `taxa_achitata` in FinanciarView (audit pe tabel); nu exista registru de restituiri in modul. | la modul plati competitii |
| T-41-15 | Vedere taxe club | Domeniu de date neschimbat (randuri filtrate pe club, RLS existent). | - |
| T-41-20 | `audit_log` fara DELETE (30 randuri din teste) | Tabelul nu permite DELETE; numarul se raporteaza. | - |
| T-41-24 | Varsta/gen in tabelul modalului | Vedere doar pentru super admin, date deja incarcate sub RLS. | - |
| T-41-28 | Lista orfani vizibila cluburilor | Randuri pe care utilizatorul le poate citi deja (filtrate pe club). | - |
| T-41-32 | Grad/quyen in lista expandata | Aceleasi randuri deja listate; fara identificatori personali noi. | - |

## Unregistered Flags (din `## Threat Flags` ale SUMMARY-urilor)

Toate cele 7 SUMMARY-uri raporteaza "None". Constatarile SEC-41-01..09 de mai sus sunt suprafata noua descoperita in audit, fara mapare completa in threat model (SEC-41-01 se leaga de T-41-25/T-41-29, SEC-41-02 de T-41-31). Observatie: migrarea `20261114b_revoke_trg_echipe_denumire_implicita.sql` (REVOKE EXECUTE de la `authenticated` pe functie trigger) nu are threat ID, dar reduce suprafata; urmarita in git.

## Checklist de verificare LIVE (de rulat prin Supabase MCP `execute_sql`, read-only)

Rezultate asteptate intre paranteze. Daca oricare diverge, redeschide T-41-01/05/16/25 (si SEC-41-02/07 dupa caz).

```sql
-- Q1 RPC: exact o semnatura, definer, search_path, grants
SELECT p.oid::regprocedure, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) AS owner, p.proacl::text,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,        -- false
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec -- true
FROM pg_proc p WHERE p.proname = 'categorii_aplica_operatie';                -- 1 rand, prosecdef=true

-- Q2 definitia live == fisierul (garda prima, fara DELETE)
SELECT pg_get_functiondef('public.categorii_aplica_operatie(text,uuid,uuid[],jsonb,jsonb,integer)'::regprocedure);

-- Q3 is_super_admin live (header validat cu auth.uid(), search_path)
SELECT pg_get_functiondef('public.is_super_admin()'::regprocedure);
SELECT proconfig FROM pg_proc WHERE oid = 'public.is_super_admin()'::regprocedure;

-- Q4 politici (fantome? permisive cu true?)
SELECT tablename, policyname, permissive, cmd, roles, qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('categorii_competitie','inscrieri_competitie','echipe_competitie','competitii') ORDER BY 1,2;

-- Q5 RLS + FORCE
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
WHERE relname IN ('categorii_competitie','inscrieri_competitie','echipe_competitie','competitii','utilizator_roluri_multicont');

-- Q6 reguli FK catre categorii_competitie (confdeltype 'c' = CASCADE -> confirma SEC-41-02)
SELECT conrelid::regclass, conname, confdeltype FROM pg_constraint
WHERE contype='f' AND confrelid='public.categorii_competitie'::regclass;

-- Q7 triggere (audit pe categorii? trigger care blocheaza DELETE?)
SELECT tgrelid::regclass, tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid IN ('public.categorii_competitie'::regclass,'public.inscrieri_competitie'::regclass,'public.echipe_competitie'::regclass);

-- Q8 ACL ratchet pe cele doua functii atinse de faza (anon: niciuna)
SELECT p.oid::regprocedure, has_function_privilege('anon',p.oid,'EXECUTE') AS anon, has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth
FROM pg_proc p WHERE proname IN ('categorii_aplica_operatie','trg_echipe_denumire_implicita'); -- trg_*: auth=false

-- Q9 cate conturi pot scrie categorii direct (dimensioneaza SEC-41-01)
SELECT rol_denumire, count(*) FROM public.utilizator_roluri_multicont
WHERE rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN') GROUP BY 1;

-- Q10 cine poate scrie rolurile (radacina increderii, SEC-41-07)
SELECT policyname, permissive, cmd, roles, qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename='utilizator_roluri_multicont' ORDER BY 1;
```

Plus: in Supabase Dashboard > API settings, verifica "Max rows" (influenteaza SEC-41-02b).

## Ce am verificat si ce nu

Verificat (in fisiere): migrarea `20261114a` integral (garda, SECURITY DEFINER, search_path, REVOKE/GRANT, validari jsonb/uuid, blocare, drift, dubluri, lipsa DELETE/SQL dinamic); `20261114b`; allowlist ACL; definitiile `is_super_admin`/`get_active_role` din migrari; politicile RLS din `20261106b/c` pentru cele 4 tabele; serviciul `categoriiAdminService.ts`; gating UI in `index.tsx`, `AdminPanel.tsx`, `CategorieOperatieModal.tsx`, `CategorieForm.tsx`, `FuzionariPanel.tsx`, `FinanciarView.tsx`, `taxeCompetitie.ts`; toate caile de scriere directa din client pe cele 3 tabele; `tests/categorii_admin_faza41.ts`.

Neverificat: orice stare live (definitii, grants, politici, trigger-e, FK, `max_rows`); rularea testelor; comportamentul in browser; politicile de scriere pe `utilizator_roluri_multicont`; efectul real al tuturor politicilor aplicate direct pe DB.

## Verificare LIVE (15.11.2026, phi-hau-db, read-only) + remedieri

Q1-Q10 rulate live. Totul conform cu fisierele; T-41-01/05/16/25 raman CLOSED.
- SEC-41-06 INCHIS: `is_super_admin()` live nu are fallback (valideaza header contra `auth.uid()`).
- SEC-41-07 INCHIS: pe `utilizator_roluri_multicont` scrie doar super adminul (`is_super_admin()`); restul au doar SELECT pe propriile randuri.
- SEC-41-01 coboara la LOW: 2 conturi SUPER_ADMIN_FEDERATIE, 0 conturi ADMIN (RLS permite scriere directa si lui ADMIN; de strans la `is_super_admin()` daca se creeaza conturi ADMIN).
- SEC-41-02 confirmat: FK catre `categorii_competitie` sunt CASCADE pe inscrieri/echipe/cereri_coechipier; nu exista trigger pe tabel.
- "Max rows" din Dashboard: neverificat.

Remediat prin `supabase/migrations/20261115a_categorii_securitate_hardening.sql` (aplicata live 15.11.2026):
- SEC-41-02: trigger BEFORE DELETE `trg_categorie_blocheaza_stergere` (refuza daca exista inscrieri/echipe/cereri; nu blocheaza service_role si stergerea in cascada a competitiei).
- SEC-41-03: `search_path = pg_catalog, public` pe RPC si `is_super_admin()`.
- SEC-41-04: triggere `trg_inscrieri_categorie_activa` / `trg_echipe_categorie_activa` (INSERT sau schimbare categorie spre categorie neactiva -> 23514).
- T-41-07: `audit_categorii_competitie` (audit_trigger_fn) pe `categorii_competitie`.
Verificat: proba cu rollback (T1-T6 OK, inclusiv cascada competitie), `categorii_admin_faza41.ts` 16/16, `acl_definer_faza37.ts` 30/30. Netestat in browser (mesajul 23503 din AdminPanel).
