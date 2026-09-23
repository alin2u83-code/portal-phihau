---
phase: quick-260923-upx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - sql/migrations/fix_refactor_create_user_account_260923.sql
  - utils/error.ts
  - utils/error.test.ts
  - services/sportivService.ts
  - hooks/useRoleAssignment.ts
autonomous: true
requirements: [QUICK-260923-UPX-01, QUICK-260923-UPX-02, QUICK-260923-UPX-03]

must_haves:
  truths:
    - "Activarea unui cont pentru un sportiv existent (p_sportiv_id dat) salvează pe rândul lui din sportivi valorile cnp/gen/telefon/adresa/data_nasterii trimise în p_additional_data"
    - "Activarea NU suprascrie niciodată cnp/gen/telefon/adresa/data_nasterii existente cu șir gol, null, placeholder-ul '1900-01-01' sau un CNP mascat (conține '*')"
    - "Pe DB live există o singură funcție public.refactor_create_user_account (9 parametri, p_sportiv_id uuid DEFAULT NULL); apelul cu 8 argumente numite din api/genereaza-magic-link.ts se rezolvă în continuare"
    - "Funcția SECURITY DEFINER refactor_create_user_account nu mai poate fi executată direct de rolurile anon/authenticated, doar de service_role"
    - "Adăugarea unui sportiv fără cont care intră în conflict pe CNP/email/username/nr. legitimație/nume+prenume+dată naștere+club afișează un mesaj în română care numește câmpul, nu mesajul generic 'Datele introduse sunt deja în sistem (duplicat)'"
    - "adaugaSportiv nu face niciun query de verificare suplimentar înainte de insert — mapează doar eroarea returnată de insert"
  artifacts:
    - path: "sql/migrations/fix_refactor_create_user_account_260923.sql"
      provides: "Documentația SQL exactă aplicată live (CREATE OR REPLACE + DROP + REVOKE/GRANT + bloc ROLLBACK comentat)"
      contains: "p_sportiv_id uuid DEFAULT NULL"
    - path: "utils/error.ts"
      provides: "Mapper pur eroare unicitate 23505 -> mesaj prietenos"
      exports: ["mapeazaEroareUnicitateSportiv", "formatErrorMessage", "getAuthErrorMessage"]
    - path: "utils/error.test.ts"
      provides: "Test colocat rulat cu node --import tsx"
      contains: "ruleazaTeste"
    - path: "services/sportivService.ts"
      provides: "adaugaSportiv returnează eroare mapată"
      contains: "mapeazaEroareUnicitateSportiv"
  key_links:
    - from: "services/sportivService.ts"
      to: "utils/error.ts"
      via: "import mapper, aplicat în catch-ul adaugaSportiv"
      pattern: "mapeazaEroareUnicitateSportiv\\(error\\)"
    - from: "hooks/useRoleAssignment.ts"
      to: "utils/error.ts"
      via: "mapper aplicat în catch-ul createAccountAndAssignRole"
      pattern: "mapeazaEroareUnicitateSportiv\\(err\\)"
    - from: "api/creare-cont.ts"
      to: "public.refactor_create_user_account (9 param)"
      via: "supabaseAdmin.rpc cu p_sportiv_id -> ramura UPDATE"
      pattern: "p_sportiv_id: sportiv_id"
    - from: "api/genereaza-magic-link.ts"
      to: "public.refactor_create_user_account (9 param, după DROP)"
      via: "8 argumente numite, p_sportiv_id completat de DEFAULT NULL"
      pattern: "rpc\\('refactor_create_user_account'"
---

<objective>
Repară cele 3 probleme din auditul fluxului „înregistrare sportivi + creare conturi":

- **QUICK-260923-UPX-01 [Mediu]** — Ramura UPDATE a RPC-ului live `public.refactor_create_user_account` (9 parametri) nu scrie `cnp/gen/telefon/adresa/data_nasterii` din `p_additional_data`, deși `hooks/useRoleAssignment.ts:57-71` le trimite mereu. Se modifică funcția direct pe DB live (proiect `wuhidifzsutwgdfkwhmd`) prin MCP Supabase, cu gărzi care nu suprascriu cu gol/null/placeholder/CNP mascat.
- **QUICK-260923-UPX-02 [Mic]** — `adaugaSportiv` (flux „fără cont") propagă eroarea brută 23505; `ErrorProvider.showError` o transformă în mesajul generic „Datele introduse sunt deja în sistem (duplicat)." fără să spună ce câmp. Se mapează eroarea insert-ului (fără query prealabil) la un mesaj specific per constrângere.
- **QUICK-260923-UPX-03 [Foarte mic]** — Overload-ul vechi cu 8 parametri al funcției e încă pe DB live. După auditul apelanților se face DROP.

Purpose: activarea contului pentru sportivi existenți să nu mai piardă datele personale introduse, iar erorile de duplicat să fie inteligibile pentru admin.
Output: funcția RPC live actualizată + overload vechi șters + EXECUTE restricționat; documentație SQL comisă în `sql/migrations/`; mapper pur + test; `adaugaSportiv` și `createAccountAndAssignRole` returnează mesaje clare.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@hooks/useRoleAssignment.ts
@api/creare-cont.ts
@services/sportivService.ts
@utils/error.ts

<planning_findings>
Concluzii verificate în timpul planificării. Citește-le înainte de orice modificare.

1. **Fișierele SQL locale NU sunt sursa de adevăr.** `sql/` e în `.gitignore` (linia 16). Ultima versiune cunoscută a funcției cu 9 parametri e în `sql/fix_p_sportiv_id_refactor_create_user_account.sql` (necomisă), iar cea cu 8 parametri în `sql/fix_gen_default_refactor_create_user_account.sql`. Folosește definiția LIVE (`pg_get_functiondef`), nu fișierele. Tool-ul Grep/ripgrep respectă `.gitignore` și sare peste `sql/`, așa că pentru audit folosește `grep -r` din Bash.
2. **Există un al doilea apelant al RPC-ului.** `api/genereaza-magic-link.ts:82-95` apelează cu 8 argumente numite (fără `p_sportiv_id`), cu service role. Endpoint-ul e folosit din `components/Sportivi/index.tsx:153`, `components/UserProfile/CreateAccountModal.tsx:60` și `components/Sportivi/ImportSportiviPage/Pas2Raport.tsx:80` (fluxul de import, în afara scope-ului). Funcția cu 9 parametri are `p_sportiv_id uuid DEFAULT NULL`, deci după DROP apelul se rezolvă pe ea cu NULL, cu comportament identic cu funcția veche. **NU modifica `api/genereaza-magic-link.ts`.**
3. **Placeholder-ul pentru data nașterii.** `hooks/useRoleAssignment.ts:62` trimite `'1900-01-01'` când data lipsește, iar magic-link trimite și el `'1900-01-01'`. Ramura UPDATE trebuie să trateze `'1900-01-01'` ca „netrimis", altfel suprascrie datele reale de naștere.
4. **Există mascare de CNP.** View-ul `sportivi_instructor` (`sql/migrations/sportivi_instructor_view.sql`) întoarce `'**********' || right(cnp,4)`. Un CNP care conține `*` nu se scrie niciodată.
5. **`ErrorProvider.showError`** (`components/ErrorProvider.tsx:41-42`) înlocuiește orice mesaj care conține `duplicate key value violates unique constraint` cu textul generic. Mesajele prietenoase nu au voie să conțină acel subșir.
6. **Gaură de securitate existentă.** RPC-ul e `SECURITY DEFINER`, iar Supabase dă implicit EXECUTE pe funcțiile din `public` rolurilor `anon` și `authenticated`. Orice utilizator logat ar putea apela `supabase.rpc('refactor_create_user_account', {p_roles:['SUPER_ADMIN_FEDERATIE'], p_user_id:<propriul id>, p_email:<propriul email>, ...})` și și-ar putea da singur orice rol, ocolind garda per club din `api/_permisiuniCont.ts`. Singurii apelanți reali (ambele endpoint-uri `api/`) folosesc `SUPABASE_SERVICE_ROLE_KEY`. Din cod de browser nu există niciun apel (grep pe `components/ services/ hooks/ utils/ supabase/` a găsit doar un comentariu în `components/CluburiManagement.tsx:187`).
7. **Baseline `npm run lint` (tsc --noEmit): 0 erori.**
8. **Pattern de test pentru helper pur:** `api/_permisiuniCont.test.ts` are helper `assert` local, `ruleazaTeste()` exportat și guard de auto-run pe `process.argv[1]` + `process.exit(1)` la erori. Se rulează cu `node --import tsx <fișier>`.
9. **Precedent pentru migrații comise:** `sql/migrations/*_260912.sql` sunt urmărite prin `git add -f`.
</planning_findings>
</context>

<tasks>

<task type="auto">
  <name>Task 1: RPC live — ramura UPDATE scrie cnp/gen/telefon/adresa/data_nasterii cu gărzi anti-suprascriere (QUICK-260923-UPX-01)</name>
  <files>sql/migrations/fix_refactor_create_user_account_260923.sql (nou, documentație); DB live: public.refactor_create_user_account (overload 9 parametri)</files>
  <read_first>
    - sql/fix_p_sportiv_id_refactor_create_user_account.sql (ultimul corp cunoscut al overload-ului cu 9 parametri; doar ca referință, adevărul e LIVE)
    - hooks/useRoleAssignment.ts liniile 53-71 (ce trimite clientul în userData)
    - api/creare-cont.ts liniile 113-131 (maparea userData -> p_additional_data)
  </read_first>
  <action>
Toate operațiile pe DB se fac prin tool-urile MCP Supabase (`mcp__plugin_supabase_supabase__execute_sql` pentru citiri și teste, `mcp__plugin_supabase_supabase__apply_migration` pentru DDL), cu project_id `wuhidifzsutwgdfkwhmd`. Dacă tool-urile sunt deferred, încarcă-le întâi prin ToolSearch. Nu folosi Supabase CLI, `psql` sau fișiere de migrare ca mecanism de aplicare. Fișierul din `sql/migrations/` e doar documentație.

1. **Inspecție live (execute_sql).** Listează toate overload-urile. Pentru fiecare: `p.oid::regprocedure`, `pg_get_function_arguments(p.oid)`, `pg_get_function_identity_arguments(p.oid)`, `pg_get_functiondef(p.oid)`, `p.prosecdef`, `p.proconfig`, `p.proacl`. Sursa: `pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace`, cu `n.nspname = 'public' AND p.proname = 'refactor_create_user_account'`. Rezultatul așteptat e 2 rânduri. Salvează ieșirea completă, inclusiv definiția overload-ului cu 8 parametri, într-un fișier din scratchpad-ul sesiunii (Task 2 o folosește pentru blocul ROLLBACK). În același pas mai interoghează:
   - `information_schema.columns` pentru `sportivi`, coloanele `cnp`, `gen`, `telefon`, `adresa`, `data_nasterii` (data_type, udt_name, is_nullable);
   - constrângerile CHECK pe `sportivi` (`pg_constraint` cu `contype='c'`, plus `pg_get_constraintdef`);
   - trigger-ele non-interne pe `sportivi` (`pg_trigger`, `NOT tgisinternal`, `pg_get_triggerdef`), ca să știi dacă un trigger criptează `cnp` sau validează `gen`.

2. **Construiește noua definiție pornind de la `pg_get_functiondef` LIVE al overload-ului cu 9 parametri.** Dacă diferă de `sql/fix_p_sportiv_id_refactor_create_user_account.sql`, câștigă varianta live. Modifică DOAR lista SET a UPDATE-ului din ramura `IF v_existing_id IS NOT NULL` (cel cu `WHERE id = v_existing_id`), adăugând după `grad_actual_id` cinci atribuiri, conform cerinței UPX-01:
   - `gen`, `telefon`, `adresa`: tiparul `coloana = COALESCE(NULLIF(btrim(p_additional_data->>'coloana'), ''), coloana)`.
   - `cnp`: păstrează valoarea existentă când `NULLIF(btrim(p_additional_data->>'cnp'), '')` e NULL SAU când `strpos(p_additional_data->>'cnp', '*') > 0` (CNP mascat, vezi planning_findings #4). Altfel scrie `btrim(p_additional_data->>'cnp')`. Implementează cu `CASE WHEN ... THEN cnp ELSE ... END`.
   - `data_nasterii`: păstrează valoarea existentă când `NULLIF(btrim(p_additional_data->>'data_nasterii'), '')` e NULL SAU când `btrim(p_additional_data->>'data_nasterii') = '1900-01-01'` (placeholder, vezi planning_findings #3). Altfel scrie `(p_additional_data->>'data_nasterii')::DATE`.
   - Dacă pasul 1 arată că o coloană nu e text (de ex. `gen` enum sau `cnp` bytea criptat), folosește pentru ea exact expresia sau cast-ul pe care îl folosește ramura INSERT din aceeași funcție, învelit în aceeași gardă.

   **Neschimbate obligatoriu:**
   - semnătura: nume, tipuri, ordine și DEFAULT-uri ale parametrilor (CREATE OR REPLACE nu le poate schimba);
   - `RETURNS uuid`, `LANGUAGE plpgsql`;
   - `SECURITY DEFINER` și `SET search_path TO 'public', 'extensions'`. Omiterea lor la CREATE OR REPLACE ar reseta tacit funcția la SECURITY INVOKER;
   - ramura INSERT, inserarea în `istoric_grade` și blocul de roluri (DELETE + FOREACH INSERT).

   Nu adăuga `status`, `data_inscrierii` sau `grupa_id` în UPDATE; nu sunt cerute.

3. **Aplicare.** `apply_migration` cu name `fix_refactor_create_user_account_update_date_personale` și query = CREATE OR REPLACE-ul complet de la pasul 2. Apoi `execute_sql` cu `NOTIFY pgrst, 'reload schema';`.

4. **Verificare statică (execute_sql).** Pe `pg_get_functiondef` al overload-ului a cărui identitate conține `p_sportiv_id`, confirmă că:
   - UPDATE-ul conține atribuiri pentru toate cele 5 coloane, garda `'1900-01-01'` și garda `strpos(..., '*')`;
   - `prosecdef = true` și `proconfig` conține search_path.

5. **Smoke test cu rollback garantat (execute_sql).** Rulează un singur bloc `DO $$ ... $$`. Blocul se termină OBLIGATORIU cu `RAISE EXCEPTION`, ca tot ce face (UPDATE, roluri, trigger-e, audit_log) să fie anulat. Sunt date reale de producție: nu apela niciodată funcția în afara unui astfel de bloc. În bloc:
   - (a) Selectează un sportiv `r` cu `user_id IS NOT NULL AND email IS NOT NULL` (LIMIT 1) și reține-i valorile originale `cnp`, `gen`, `telefon`, `adresa`, `data_nasterii`.
   - (b) Apelul A: `PERFORM public.refactor_create_user_account(...)` cu argumente numite `p_nume => r.nume, p_prenume => r.prenume, p_email => r.email, p_username => r.username, p_club_id => r.club_id, p_roles => ARRAY['SPORTIV'], p_user_id => r.user_id, p_sportiv_id => r.id` și `p_additional_data => jsonb_build_object('telefon','0700999111','adresa','Str. Smoke Test 1','data_nasterii','2011-02-03','gen', r.gen)`. Include cheia `cnp` cu `r.cnp` doar dacă pasul 1 a arătat că `cnp` e text simplu. Recitește rândul și verifică `telefon='0700999111'`, `adresa='Str. Smoke Test 1'`, `data_nasterii='2011-02-03'`.
   - (c) Apelul B: aceleași argumente, dar `p_additional_data => jsonb_build_object('telefon','', 'adresa', NULL, 'data_nasterii','1900-01-01', 'cnp','**********1234', 'gen','')`. Recitește rândul și verifică: telefon, adresa și data_nasterii au rămas cele de la apelul A; `cnp` și `gen` sunt egale cu valorile originale (compară cu `IS NOT DISTINCT FROM`).
   - (d) Termină cu `RAISE EXCEPTION 'SMOKE_OK ...'` dacă toate verificările trec, altfel cu `RAISE EXCEPTION 'SMOKE_FAIL ...'` împreună cu valorile observate.

   Rezultatul așteptat al tool-ului este o eroare al cărei mesaj începe cu `SMOKE_OK`. Orice alt mesaj (SMOKE_FAIL sau o eroare a RPC-ului, de exemplu FK sau constrângere) se investighează și se repară înainte de a continua.

6. **Documentație.** Creează `sql/migrations/fix_refactor_create_user_account_260923.sql` cu:
   - un header de comentarii `--`: ce s-a schimbat și de ce (UPX-01, gărzile pentru gol/null/'1900-01-01'/CNP mascat), linia „Aplicat live pe proiectul wuhidifzsutwgdfkwhmd (23.09.2026) via MCP apply_migration" și referința la quick task-ul 260923-upx;
   - sub header, secțiunea `-- 1. Ramura UPDATE scrie datele personale`, cu CREATE OR REPLACE-ul exact aplicat.

   Task 2 adaugă restul. Adaugă fișierul în index cu `git add -f` (sql/ e ignorat, vezi planning_findings #9). Commit: `fix(quick-260923-upx): RPC refactor_create_user_account scrie datele personale la activare cont`.
  </action>
  <verify>
    <automated>MCP execute_sql (wuhidifzsutwgdfkwhmd): blocul DO de la pasul 5 întoarce eroare cu prefix SMOKE_OK, iar pg_get_functiondef al overload-ului cu p_sportiv_id conține cnp/gen/telefon/adresa/data_nasterii în UPDATE și SECURITY DEFINER. Shell: F=sql/migrations/fix_refactor_create_user_account_260923.sql; test -f "$F" && grep -v '^\s*--' "$F" | grep -c "1900-01-01" && grep -v '^\s*--' "$F" | grep -c "SECURITY DEFINER" && grep -v '^\s*--' "$F" | grep -ci "p_sportiv_id uuid DEFAULT NULL" && git ls-files --error-unmatch "$F"</automated>
  </verify>
  <done>Funcția live cu 9 parametri scrie cnp/gen/telefon/adresa/data_nasterii în ramura UPDATE doar când valoarea primită e reală. Gol, null, '1900-01-01' și CNP-ul mascat păstrează valoarea existentă (smoke test SMOKE_OK, cu rollback). Semnătura, SECURITY DEFINER și search_path sunt neschimbate. Fișierul de documentație există și e urmărit în git.</done>
</task>

<task type="auto">
  <name>Task 2: DROP overload vechi cu 8 parametri + EXECUTE doar pentru service_role (QUICK-260923-UPX-03)</name>
  <files>sql/migrations/fix_refactor_create_user_account_260923.sql (append); DB live: public.refactor_create_user_account</files>
  <read_first>
    - api/genereaza-magic-link.ts liniile 80-100 (apelul cu 8 argumente numite; NU se modifică)
    - api/creare-cont.ts liniile 113-131 (apelul cu 9 argumente)
    - fișierul din scratchpad salvat la Task 1 pasul 1 (definițiile și ACL-urile live ale ambelor overload-uri)
  </read_first>
  <action>
Aceleași tool-uri MCP Supabase ca la Task 1 (project_id `wuhidifzsutwgdfkwhmd`).

1. **Auditul apelanților din repo, cu Bash, nu cu tool-ul Grep** (acesta sare peste `sql/`, vezi planning_findings #1): `grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.planning "refactor_create_user_account" .`. Clasifică fiecare rezultat. Stare verificată la planificare:
   - apelanți runtime: doar `api/creare-cont.ts:113` (9 argumente numite, inclusiv `p_sportiv_id`) și `api/genereaza-magic-link.ts:82` (8 argumente numite, fără `p_sportiv_id`), ambii cu service role;
   - restul sunt definiții în `sql/` și `supabase/migrations/` sau comentarii (`components/CluburiManagement.tsx:187`).

   Dacă apare ORICE alt apelant runtime, mai ales `supabase.rpc('refactor_create_user_account'` din cod de browser sau dintr-o funcție din `supabase/functions/`: OPREȘTE DROP-ul și REVOKE-ul, nu aplica nimic și raportează.

2. **Auditul apelanților din DB (execute_sql).** `SELECT n.nspname, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.prosrc ILIKE '%refactor_create_user_account%' AND p.proname <> 'refactor_create_user_account'`. Rezultatul așteptat e 0 rânduri. Dacă există rânduri: STOP și raportează.

3. **Condiție pentru DROP.** În ieșirea de la Task 1 pasul 1, `pg_get_function_arguments` pentru overload-ul cu 9 parametri trebuie să conțină `p_sportiv_id uuid DEFAULT NULL`. Asta garantează că apelul cu 8 argumente numite din genereaza-magic-link se rezolvă după DROP pe funcția cu 9 parametri, cu `p_sportiv_id` NULL. Pe această cale singura diferență față de funcția veche e `email = COALESCE(p_email, email)`, care nu schimbă nimic când rândul a fost găsit chiar după email. Cât timp coexistă ambele overload-uri, acel apel poate fi ambiguu pentru PostgREST (PGRST203); DROP-ul elimină ambiguitatea. Dacă DEFAULT-ul lipsește: STOP, nu face DROP și raportează. NU modifica `api/genereaza-magic-link.ts` (vezi planning_findings #2).

4. **Grant-uri curente (execute_sql).** Pentru oid-ul overload-ului cu 9 parametri rulează `has_function_privilege('anon', oid, 'EXECUTE')`, apoi același apel pentru `'authenticated'` și `'service_role'`. Adaugă `proacl`. Notează rezultatul, pentru că intră în blocul ROLLBACK.

5. **Aplicare.** Un singur `apply_migration` cu name `drop_refactor_create_user_account_8_param_si_restrict_execute`, care conține, în ordine:
   - (a) `DROP FUNCTION public.refactor_create_user_account(<identity args>)`, cu argumentele de identitate luate exact din `pg_get_function_identity_arguments` al overload-ului cu 8 parametri. Nu le ghici. Fără CASCADE: dacă există dependențe, operația trebuie să eșueze vizibil.
   - (b) `REVOKE EXECUTE ON FUNCTION public.refactor_create_user_account(<identity args ale overload-ului cu 9 parametri>) FROM PUBLIC, anon, authenticated;`.
   - (c) `GRANT EXECUTE ON FUNCTION` pe aceeași semnătură `TO service_role;`.

   Motivul pentru (b) și (c) e în planning_findings #6 și T-upx-01. Dacă pasul 4 arată că anon/authenticated nu aveau oricum EXECUTE, REVOKE-ul e un no-op inofensiv; păstrează-l pentru idempotență. Apoi `execute_sql` cu `NOTIFY pgrst, 'reload schema';`.

6. **Verificare (execute_sql):**
   - numărul de overload-uri `public.refactor_create_user_account` este 1, iar identitatea lui conține `p_sportiv_id`;
   - `has_function_privilege` dă false pentru `'anon'`, false pentru `'authenticated'` și true pentru `'service_role'`;
   - **verificarea de rezolvare:** un bloc `DO $$ ... $$` terminat OBLIGATORIU cu `RAISE EXCEPTION` (rollback). Apelează funcția cu exact cele 8 argumente numite pe care le trimite magic-link (`p_nume, p_prenume, p_email, p_username, p_club_id, p_roles, p_user_id, p_additional_data`, fără `p_sportiv_id`). Folosește un sportiv existent cu `user_id` și `email` nenule, pasând `p_email => r.email`, ca să intre pe calea UPDATE, fără INSERT. `p_additional_data` e `jsonb_build_object('data_nasterii','1900-01-01','status','Activ','data_inscrierii', current_date::text)`. Recitește `data_nasterii`. Termină cu `RAISE EXCEPTION 'RESOLVE_OK'` dacă apelul a reușit și `data_nasterii` e neschimbată, altfel `'RESOLVE_FAIL ...'`. Rezultatul așteptat e o eroare cu prefix `RESOLVE_OK`.
   - opțional: `mcp__plugin_supabase_supabase__get_advisors` cu type `security`; confirmă că nu mai apare o avertizare despre `refactor_create_user_account` executabilă de anon/authenticated.

7. **Documentație.** Adaugă în `sql/migrations/fix_refactor_create_user_account_260923.sql`:
   - secțiunea `-- 2. DROP overload vechi (8 parametri) + EXECUTE doar service_role`, cu SQL-ul exact aplicat la pasul 5 și `NOTIFY pgrst, 'reload schema';`;
   - la final, un bloc `-- ROLLBACK (NU se rulează automat)`, cu toate liniile comentate cu `--`. Conține definiția completă a overload-ului cu 8 parametri salvată la Task 1 pasul 1 (ca DROP-ul să fie reversibil) și GRANT-urile originale de la pasul 4.

   `git add -f` pe fișier. Commit: `fix(quick-260923-upx): drop overload vechi refactor_create_user_account + EXECUTE doar service_role`.
  </action>
  <verify>
    <automated>MCP execute_sql (wuhidifzsutwgdfkwhmd): count overload-uri = 1; has_function_privilege anon=false, authenticated=false, service_role=true; blocul DO de rezolvare întoarce eroare cu prefix RESOLVE_OK. Shell: F=sql/migrations/fix_refactor_create_user_account_260923.sql; grep -v '^\s*--' "$F" | grep -c "DROP FUNCTION public.refactor_create_user_account" && grep -v '^\s*--' "$F" | grep -c "REVOKE EXECUTE" && grep -c "ROLLBACK" "$F" && git diff --quiet HEAD -- api/genereaza-magic-link.ts api/creare-cont.ts && echo "API-UNTOUCHED"</automated>
  </verify>
  <done>Pe DB live a rămas o singură funcție `refactor_create_user_account` (9 parametri, `p_sportiv_id` DEFAULT NULL). Apelul cu 8 argumente numite se rezolvă (RESOLVE_OK). anon și authenticated nu mai au EXECUTE; service_role are. `api/genereaza-magic-link.ts` și `api/creare-cont.ts` nu sunt modificate. Documentația conține SQL-ul aplicat și blocul ROLLBACK comentat.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Mesaje clare la conflict de unicitate 23505 — adaugaSportiv + activare cont (QUICK-260923-UPX-02)</name>
  <files>utils/error.ts, utils/error.test.ts (nou), services/sportivService.ts, hooks/useRoleAssignment.ts</files>
  <read_first>
    - utils/error.ts (fișier pur, fără import-uri; aici se adaugă mapper-ul)
    - api/_permisiuniCont.test.ts (pattern exact de test: assert local, ruleazaTeste, guard de auto-run, process.exit(1))
    - services/sportivService.ts liniile 5-34 (adaugaSportiv)
    - hooks/useRoleAssignment.ts liniile 76-98 (catch-ul din createAccountAndAssignRole)
    - components/ErrorProvider.tsx liniile 29-47 (showError înlocuiește subșirul „duplicate key value violates unique constraint")
  </read_first>
  <behavior>
    - Test 1: {code:'23505', message:'duplicate key value violates unique constraint "<numele real al constrângerii CNP>"', details:'Key (cnp)=(1234567890123) already exists.'} produce un Error al cărui mesaj conține „CNP" și NU conține „duplicate key".
    - Test 2: constrângerea pe email produce un mesaj care conține „email".
    - Test 3: `unique_sportiv_phi_hau`, cu details `Key (nume, prenume, data_nasterii, club_id)=(Cnpescu, Ion, 2010-01-01, <uuid>)`, produce mesajul „același nume, prenume" și NU mesajul CNP. Valorile din details (aici numele „Cnpescu") nu influențează maparea.
    - Test 4: `unique_nr_legitimatie` produce un mesaj cu „legitimație".
    - Test 5: `username_is_unique` produce un mesaj cu „nume de utilizator" și NU mesajul de nume+prenume.
    - Test 6: fără code, doar message 'duplicate key value violates unique constraint "<constrângerea pe email>"' (eroarea venită ca text prin /api/creare-cont) produce tot mesajul de email.
    - Test 7: o constrângere necunoscută `foo_key`, cu details `Key (bar)=(x)`, produce mesajul de fallback, fără „duplicate key".
    - Test 8: o eroare non-unicitate {code:'42501', message:'x'} e returnată ca aceeași referință (===). null și undefined sunt returnate neschimbate, fără throw.
    - Test 9: eroarea mapată are code === '23505' și NU are proprietatea `details` (nu se propagă PII).
  </behavior>
  <action>
1. **Numele reale ale constrângerilor (execute_sql, project_id `wuhidifzsutwgdfkwhmd`).**
   - `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.sportivi'::regclass AND contype = 'u'`;
   - `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'sportivi' AND indexdef ILIKE 'CREATE UNIQUE%'`.

   Folosește numele reale în teste. Din definiția lui `unique_sportiv_phi_hau` confirmă coloanele, ca formularea mesajului să fie exactă. Nu adăuga nicio validare client-side de email/CNP (constrângere a task-ului).

2. **RED:** scrie `utils/error.test.ts` după pattern-ul `api/_permisiuniCont.test.ts`:
   - helper `assert` local și `export function ruleazaTeste()`;
   - guard de auto-run pe `process.argv[1]` terminat în `error.test.ts` sau `error.test.js`, cu `process.exit(1)` dacă există erori;
   - cazurile din `<behavior>`;
   - import din `./error`.

   Rulează `node --import tsx utils/error.test.ts`: trebuie să eșueze (funcția nu există încă). Commit: `test(quick-260923-upx): test mapper eroare unicitate sportiv`.

3. **GREEN:** în `utils/error.ts` adaugă `export const mapeazaEroareUnicitateSportiv = (error: any): any`. Funcția e pură, fără import-uri, iar `formatErrorMessage` și `getAuthErrorMessage` rămân neschimbate.
   - **Detecție:** `error?.code === '23505'` SAU `error.message` e string și conține `duplicate key value violates unique constraint`. A doua condiție acoperă erorile venite ca text simplu prin `/api/creare-cont`, unde codul s-a pierdut. Orice altceva, inclusiv null și undefined, se returnează ca aceeași referință.
   - **Extragere:** numele constrângerii din `error.message`, cu regex pe `constraint "([^"]+)"`, și lista de coloane din `error.details`, cu regex pe `Key \((.+?)\)=\(`. Folosește DOAR aceste două fragmente, niciodată valorile: sunt PII și pot conține orice text. Concatenează-le în lowercase.
   - **Mapare, în această ordine:**
     - conține `cnp` → „Există deja un sportiv cu acest CNP.";
     - conține `email` → „Există deja un sportiv cu această adresă de email.";
     - conține `legitimatie` → „Există deja un sportiv cu acest număr de legitimație.";
     - conține `username` → „Există deja un sportiv cu acest nume de utilizator.";
     - conține `unique_sportiv_phi_hau` SAU conține atât `nume` cât și `prenume` → „Există deja în acest club un sportiv cu același nume, prenume și aceeași dată de naștere." (ajustează formularea la coloanele reale de la pasul 1);
     - fallback → „Există deja un sportiv cu aceste date. Verificați CNP-ul, emailul și numele introduse.".

     `username` se verifică înaintea regulii nume+prenume.
   - **Retur:** `Object.assign(new Error(mesaj), { code: '23505', constraint: numeConstrangere ?? null })`. NU copia `details`, `hint` sau mesajul original: ar propaga PII, iar subșirul englezesc ar fi înlocuit de `ErrorProvider.showError` cu textul generic (planning_findings #5).
   - Rulează testul: trebuie să treacă.

4. **`services/sportivService.ts`, doar `adaugaSportiv`, conform UPX-02:**
   - importă `mapeazaEroareUnicitateSportiv` din `'../utils/error'`;
   - în `catch (error)` întoarce `{ success: false, error: mapeazaEroareUnicitateSportiv(error) }`.

   NU adăuga niciun SELECT de verificare înainte de insert (fără round-trip suplimentar). NU modifica `actualizeazaSportiv`. Apelantul din `components/Sportivi/index.tsx:559-560` face deja `throw resultFaraCont.error`, urmat de `showError("Eroare la Salvare", err)`, care afișează `err.message`. Fișierul acela nu se modifică.

5. **`hooks/useRoleAssignment.ts`, catch-ul din `createAccountAndAssignRole` (liniile 92-94).** Importă mapper-ul din `'../utils/error'` (există deja un import din acest modul pentru `getAuthErrorMessage`; extinde-l). Păstrează `console.error` pe eroarea originală și schimbă retur-ul în `error: mapeazaEroareUnicitateSportiv(err)?.message || "A apărut o eroare neașteptată."`.

   Motiv: după Task 1, ramura UPDATE a RPC-ului scrie și `cnp`. Un CNP care coincide cu al altui sportiv ridică acum 23505 din RPC. `api/creare-cont.ts` îl întoarce ca text brut, iar `handleCreateAccount` din Sportivi (`setCreateAccountError(err.message)`) sau UserManagement l-ar afișa în engleză. Același lucru se întâmplă la coliziunile de email/username deja posibile. Fluxul de import nu folosește acest hook, deci nu e atins.

6. Rulează `npm run lint` (baseline 0 erori). Commit: `fix(quick-260923-upx): mesaje clare la conflict de unicitate sportiv (23505)`.
  </action>
  <verify>
    <automated>node --import tsx utils/error.test.ts && npm run lint && test "$(awk '/export const adaugaSportiv/,/^};/' services/sportivService.ts | grep -c "from('sportivi')")" -eq 1 && grep -v '^\s*//' services/sportivService.ts | grep -c "mapeazaEroareUnicitateSportiv(error)" && grep -v '^\s*//' hooks/useRoleAssignment.ts | grep -c "mapeazaEroareUnicitateSportiv(err)" && git diff --quiet HEAD -- components/Sportivi/index.tsx components/Sportivi/ImportSportiviPage && echo "UI-IMPORT-UNTOUCHED"</automated>
  </verify>
  <done>Testul trece pe toate cazurile. `npm run lint` are 0 erori. `adaugaSportiv` are un singur `.from('sportivi')`, cel de insert, fără SELECT prealabil, și întoarce la 23505 un Error cu mesaj românesc care numește câmpul. `createAccountAndAssignRole` întoarce același tip de mesaj pentru conflictele venite din RPC. `components/Sportivi/index.tsx` și fluxul de import nu sunt modificate.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> PostgREST `/rpc/refactor_create_user_account` | Endpoint expus automat de Supabase oricărui rol cu EXECUTE; funcția e SECURITY DEFINER (rulează ca owner, ocolește RLS) |
| browser -> `/api/creare-cont` -> RPC (service role) | Payload nesigur: `sportiv_id`, `userData.cnp/telefon/adresa/data_nasterii/gen`, `roles` |
| browser -> `sportivi` INSERT (RLS) | `adaugaSportiv`: eroarea Postgres 23505 întoarsă clientului conține valori PII în `details` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-upx-01 | Elevation of privilege | `public.refactor_create_user_account` (SECURITY DEFINER), apelabilă direct de anon/authenticated | mitigate | Task 2 pasul 5: `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role`, condiționat de auditul apelanților (grep repo + pg_proc prosrc = 0 apelanți din browser/DB); verificat cu `has_function_privilege` |
| T-upx-02 | Tampering | Ramura UPDATE a RPC-ului suprascrie PII reale cu gol/null/placeholder/CNP mascat | mitigate | Task 1 pasul 2: `COALESCE(NULLIF(btrim(...),''), col)`, garda `'1900-01-01'` pe data_nasterii, garda `strpos(cnp,'*')`; dovedit de smoke test SMOKE_OK (apelul B) |
| T-upx-03 | Tampering | `/api/creare-cont` acceptă un `sportiv_id` din alt club decât cel verificat de `verificaPermisiuneCreareCont` (existent din ba9cc75; UPX-01 adaugă 5 coloane PII în același UPDATE) | accept | Existent înainte de acest task și cere un apelant deja ADMIN_CLUB autentificat; închiderea lui înseamnă o gardă nouă de autorizare pe clubul curent al sportivului, în afara celor 3 probleme. Se înregistrează ca todo în SUMMARY |
| T-upx-04 | Information disclosure | Mesajul/details 23505 (conține valori CNP/email) propagat în UI și în console.error prin showError | mitigate | Task 3: mapper-ul întoarce un Error nou doar cu mesaj prietenos + `code` + `constraint`, fără `details`/`hint`/mesaj original; Test 9 |
| T-upx-05 | Denial of service | DROP-ul overload-ului rupe apelul live cu 8 argumente din `api/genereaza-magic-link.ts` | mitigate | Task 2 pașii 1-3: condiție pe `p_sportiv_id uuid DEFAULT NULL`, fără CASCADE, `NOTIFY pgrst`, verificare RESOLVE_OK cu exact cele 8 argumente numite; ROLLBACK documentat în fișierul SQL |
</threat_model>

<verification>
- DB live: un singur overload `refactor_create_user_account` (9 parametri, `p_sportiv_id` DEFAULT NULL); SECURITY DEFINER și search_path păstrate; EXECUTE doar pentru service_role; SMOKE_OK și RESOLVE_OK obținute în blocuri DO cu rollback.
- `node --import tsx utils/error.test.ts` trece; `npm run lint` are 0 erori.
- `git diff` arată modificări doar în cele 5 fișiere din `files_modified`; `api/`, `components/` și fluxul de import sunt neatinse.
- `sql/migrations/fix_refactor_create_user_account_260923.sql` e urmărit în git și conține SQL-ul exact aplicat plus blocul ROLLBACK.
</verification>

<success_criteria>
- UPX-01: activarea contului pentru un sportiv existent persistă cnp/gen/telefon/adresa/data_nasterii trimise, fără să suprascrie cu gol, null, '1900-01-01' sau CNP mascat.
- UPX-02: la adăugarea unui sportiv fără cont, un conflict de unicitate arată un mesaj românesc care numește câmpul (CNP / email / nr. legitimație / nume de utilizator / nume+prenume+dată naștere), fără query suplimentar înainte de insert.
- UPX-03: overload-ul vechi cu 8 parametri nu mai există pe DB live, iar ambii apelanți (`creare-cont`, `genereaza-magic-link`) se rezolvă pe funcția rămasă.
- Hardening: funcția SECURITY DEFINER nu mai e executabilă de anon/authenticated.
</success_criteria>

<output>
Creează `.planning/quick/260923-upx-fix-audit-inregistrare-sportivi-conturi-/260923-upx-SUMMARY.md` la final. Pe lângă conținutul standard, include secțiunea „Follow-up (todo-uri descoperite, NEREZOLVATE aici)":
1. `api/genereaza-magic-link.ts` nu trimite `p_sportiv_id`. RPC-ul intră pe ramura INSERT (emailul provizoriu e mereu nou), deci creează un rând `sportivi` duplicat sau eșuează pe `unique_sportiv_phi_hau`. Update-ul ulterior `.update({user_id, email}).eq('id', sportiv_id)` nu are eroarea verificată și intră în conflict pe emailul unic cu duplicatul. Fix recomandat: o linie, `p_sportiv_id: sportiv_id`, într-un quick task separat, pentru că endpoint-ul e folosit și de fluxul de import (Pas2Raport).
2. T-upx-03: `/api/creare-cont` nu verifică faptul că `sportiv_id` aparține unui club în care apelantul are drepturi. Recomandare: `verificaPermisiuneCreareCont` rulat și pentru `club_id`-ul curent al sportivului.
3. Modificările DB sunt live imediat. Cele frontend (`utils/`, `services/`, `hooks/`) intră în producție doar după push/deploy Vercel.
</output>
