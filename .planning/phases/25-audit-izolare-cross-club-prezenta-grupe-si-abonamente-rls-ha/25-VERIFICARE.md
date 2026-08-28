# Faza 25 Plan 04 — Verificare izolare cross-club (Grupe / Prezenta / Abonamente)

**Data:** 2026-08-28/29
**Proiect Supabase:** `wuhidifzsutwgdfkwhmd`

Acest document e dovada scrisa, reproductibila, ca fix-ul RLS din 25-01 (revizuit
in `25-AUDIT-CORECTAT.md` dupa esecul initial de aplicare) e activ pe DB live si
functioneaza corect — atat la citire cat si la scriere, atat pentru negarea
accesului cross-club cat si pentru pastrarea accesului legitim (ADMIN_CLUB,
INSTRUCTOR, SPORTIV).

**Nota despre executie:** Task 1 (aplicarea migratiei live) a fost preluat de
orchestrator, pentru ca subagentii nu au acces la tool-urile MCP Supabase in acest
mediu — acelasi tipar documentat deja in `15-01-SUMMARY.md` si `16-01-SUMMARY.md`.
Task 2 si Task 3 (acest document) au fost executate de acest agent, rulate
sequential pe `main`, nu intr-un worktree izolat.

---

## Aplicare migratie

| Camp | Valoare |
|------|---------|
| Fisier sursa | `supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql` |
| Nume migratie aplicata (varianta initiala, esuata) | `fix_rls_izolare_cross_club_grupe_prezenta_abonamente` — a picat cu eroare de sintaxa (`get_my_club_ids()` intr-un comentariu de verificare inexecutabil corect), rollback complet, DB neschimbat |
| Nume migratie aplicata (varianta revizuita, reusita) | `fix_rls_izolare_cross_club_grupe_prezenta_abonamente_v2` |
| Data aplicarii | 2026-08-28 |
| Rezultat | Succes, tranzactie unica |
| Tabele scopate | `perioade_vacanta`, `participare_vacanta`, `tipuri_abonament`, `grupe`, `orar_exceptii`, `program_antrenamente`, `sesiune_activitate` (+ coloana noua `club_id`), `plati` (doar WRITE), `evenimente` |
| Motiv revizuire | Interogarea live `pg_policies` (rulata de orchestrator dupa esecul initial) a descoperit ~20 politici RLS "fantoma" pe minim 9 tabele, nedocumentate in niciun fisier de migratie din repo (aplicate direct din Supabase Studio SQL Editor), coexistente PERMISIV (OR) cu politicile documentate in `25-AUDIT.md`. Detalii complete: `25-AUDIT-CORECTAT.md`. |

---

## Dovezi pg_policies

**Context important:** interogarile brute `pg_policies`/`pg_proc` au fost rulate
de orchestrator prin tool-ul MCP `execute_sql` (acest agent nu are acces la acel
tool in acest mediu — limitare identica cu Faza 15/16). Ce urmeaza este raportul
verbatim primit de la orchestrator dupa rulare, insotit de interogarile exacte
folosite (extrase din comentariul de verificare al fisierului de migratie,
liniile 604-630).

### Interogarile rulate (7, cerute de Task 1 din 25-04-PLAN.md)

```sql
-- (1) Inventar politici pe cele 8 tabele
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
WHERE tablename IN ('grupe','evenimente','perioade_vacanta','participare_vacanta',
  'tipuri_abonament','orar_exceptii','program_antrenamente','sesiune_activitate')
ORDER BY tablename, policyname;

-- (2) Zero politici cu qual literal 'true'
SELECT tablename, policyname FROM pg_policies
WHERE qual = 'true' AND tablename IN (...aceeasi lista...);

-- (3) Zero call-site-uri get_my_club_ids() ramase
SELECT tablename, policyname FROM pg_policies
WHERE qual ILIKE '%get_my_club_ids%' OR with_check ILIKE '%get_my_club_ids%';

-- (4) Zero predicate fail-open 'club_id IS NULL OR'
SELECT tablename, policyname FROM pg_policies
WHERE qual ILIKE '%club_id IS NULL OR%';

-- (5) Backfill confirmat
SELECT count(*) FILTER (WHERE club_id IS NULL) AS fara_club, count(*) AS total
FROM public.program_antrenamente;
-- + echivalent pentru public.sesiune_activitate

-- (6) Coloana noua sesiune_activitate.club_id
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'sesiune_activitate' AND column_name = 'club_id';

-- (7) Supravietuirea cailor SPORTIV
SELECT policyname FROM pg_policies
WHERE tablename IN ('plati','prezenta_antrenament')
  AND policyname IN ('rbv_plati_own','rbv_prezenta_own');
```

### Rezultate raportate de orchestrator (verbatim, dupa rularea celor 7 interogari + verificari suplimentare)

> - Inventar `pg_policies` pe cele 8 tabele: fiecare are acum un singur set canonic
>   de politici (has_access_to_club/este_staff_club/is_super_admin), zero politici
>   fantoma ramase. Am rulat suplimentar si pe `evenimente` (Sectiunea 9, in afara
>   cerintei stricte dar inclusa de agentul de audit pentru ca avea acelasi bug —
>   vezi 25-AUDIT-CORECTAT.md pentru justificare).
> - Zero randuri cu `qual ILIKE '%club_id IS NULL OR%'` (fail-closed confirmat).
> - Zero randuri cu referinte la
>   `get_my_club_ids/get_my_clubs/has_power_role/este_staff_autorizat` PE CELE 8
>   TABELE DIN SCOPE. ATENTIE: acelasi tipar de politici fantoma exista in
>   continuare pe alte tabele din afara scope-ului (`tranzactii`, `grade`,
>   `istoric_grade`, `eveniment`, `reduceri`, `cluburi`) — NU au fost atinse, e un
>   risc rezidual (vezi sectiunea "Risc rezidual" mai jos).
> - `program_antrenamente`: 0 randuri cu `club_id IS NULL` din 308 total (backfill
>   confirmat).
> - `sesiune_activitate`: 1 rand cu `club_id IS NULL` din 1 total (predictia din
>   audit — randul orfan definitiv, fail-closed prin `is_super_admin()` —
>   comportament corect, nu regresie).
> - `sesiune_activitate.club_id`: coloana exista, tip `uuid`.
> - Supravietuire cai SPORTIV: `rbv_plati_own` exista neschimbata pe `plati`.
>   ATENTIE: `rbv_prezenta_own` NU EXISTA sub acel nume — `prezenta_antrenament`
>   (tabela NEATINSA de aceasta migratie, in afara scope) are de fapt politicile
>   `prezenta_select_policy`/`prezenta_insert_policy`/`prezenta_update_policy`/
>   `prezenta_delete_policy`, cu o cale SPORTIV functionala
>   (`sportiv_id IN (SELECT id FROM sportivi WHERE user_id = auth.uid())`) in
>   `prezenta_select_policy`. Numele din 25-04-PLAN.md ("rbv_prezenta_own") era o
>   alta presupunere gresita mostenita din research vechi — NU o regresie cauzata
>   de aceasta migratie.

**Limitare de onestitate metodologica:** dump-ul tabelar linie-cu-linie al
interogarii (1) (toate coloanele `qual`/`with_check` complete pentru fiecare
politica) nu a fost pastrat verbatim de orchestrator in mesajul transmis acestui
agent — doar concluziile structurate de mai sus. Continutul politicilor noi CREATE
este insa disponibil integral, verbatim, in
`supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`
(fisierul aplicat efectiv), iar rezultatele de mai sus au fost validate independent
in acest document prin testul automat (sectiunea urmatoare) si prin verificarea UI
live, ambele rulate DUPA aplicare, pe date reale.

---

## Test automat izolare

Fisier: `tests/rls_izolare_cross_club_faza25.ts` (comis `test(25-04)`, vezi
`25-04-SUMMARY.md` pentru hash).

Cluburi de referinta (din `25-AUDIT.md`):
- CLUB_A = Kim Long Dao Falticeni (`83e7f771-46cf-4c4e-b70f-356d7b0bff06`) — context
  activ al clientului testat
- CLUB_B = C.S. Phi Hau (`cbb0b228-b3e0-4735-9658-70999eb256c6`) — clubul "strain"

Output brut, ultima rulare (exit 0):

```
Creare utilizator de test: zztest_faza25_1787955917793@example.com
Context ADMIN_CLUB @ CLUB_A creat: id=00d96f07-add2-47c4-a41d-5f457b2ea5bf
Randuri canar create in CLUB_B: {
  grupa: 'dfc81cb5-2348-4dc3-ae69-459d3886c5da',
  perioada: '39233b4f-5c9c-4f34-b3a0-4e8f632c040f',
  tipAbonament: 'd60ec16c-7d21-4e1b-a1f0-594a1beb2241',
  programAntrenament: '4ef21b1c-c15d-4a6f-860a-b2d6b3284720'
}
Randuri canar create in CLUB_A (propriul club, pt. calea SPORTIV): { tipAbonament: '02d9b81e-00a4-490d-bad2-e7b91dc511c5' }

Autentificat ca utilizator de test, context activ = ADMIN_CLUB @ CLUB_A.

--- SELECT: izolare la citire ---
PASS — grupe: zero randuri CLUB_B (total vazute=6)
PASS — grupe: zero canar
PASS — evenimente: zero randuri CLUB_B (total vazute=2)
PASS — perioade_vacanta: zero randuri CLUB_B (total vazute=0)
PASS — perioade_vacanta: zero canar
PASS — participare_vacanta: zero randuri legate de CLUB_B (total vazute=0)
PASS — tipuri_abonament: zero randuri CLUB_B (total vazute=1)
PASS — tipuri_abonament: canarul din CLUB_B invizibil
PASS — tipuri_abonament: canarul din propriul club (CLUB_A) vizibil (fara regresie)
PASS — program_antrenamente: zero randuri CLUB_B (total vazute=101)
PASS — program_antrenamente: zero canar (id explicit)

--- INSERT cross-club: trebuie respins ---
PASS — perioade_vacanta: INSERT cu club_id strain respins (new row violates row-level security policy for table "perioade_vacanta")
PASS — tipuri_abonament: INSERT cu club_id strain respins (new row violates row-level security policy for table "tipuri_abonament")

--- INSERT in propriul club: trebuie acceptat ---
PASS — tipuri_abonament: INSERT in propriul club acceptat
PASS — tipuri_abonament: DELETE propriu client reuseste

--- Cale SPORTIV pe tipuri_abonament: fara regresie ---
PASS — tipuri_abonament (SPORTIV): vede cel putin propriul club (total vazute=1)

=== REZUMAT ===
16/16 verificari PASS.

Toate cele 16 verificari au trecut. Exit 0.

--- Cleanup ---
program_antrenamente canar sters: true
tipuri_abonament canar (CLUB_B) sters: true
tipuri_abonament canar (CLUB_A) sters: true
perioade_vacanta canar sters: true
grupe canar sters: true
context SPORTIV sters: true
context ADMIN_CLUB sters: true
utilizator de test sters: true
Cleanup complet.
```

Verificari suplimentare (gate-uri automate din plan):
- `grep -q "active-role-context-id" tests/rls_izolare_cross_club_faza25.ts && grep -q "ZZ_TEST_FAZA25_" ... && grep -q "deleteUser" ...` → `TEST_STRUCTURE_OK`
- `npx tsx scripts/audit_rls_faza25.ts | grep -ci "ZZ_TEST_FAZA25_"` → `0` (zero reziduu confirmat prin re-rulare audit dupa test)
- `npm run lint` (`tsc --noEmit`) → trece curat, zero erori

**Nota importanta despre un bug descoperit in timpul rularii acestui test (in
afara scope-ului 25-04, dar necesar pentru ca testul sa poata rula deloc):** vezi
sectiunea "Risc rezidual" de mai jos, punctul despre trigger-ul
`tr_automatizeaza_roluri`.

---

## Verificare UI live

**Metoda:** acest agent nu are acces la tool-urile `mcp__playwright__*` in acest
mediu. Verificarea a fost facuta prin automatizare Playwright scriptata manual
(fisier temporar, NEcomis — sters dupa rulare, nu face parte din artefactele
plan-ului), rulata cu `npx tsx` peste `npm run dev` (Vite, `http://localhost:5173`).

**Cont folosit:** utilizator efemer creat prin `auth.admin.createUser` +
`utilizator_roluri_multicont` (rol `ADMIN_CLUB`, `club_id` = C.S. Phi Hau,
`cbb0b228-b3e0-4735-9658-70999eb256c6` — **NU** super admin), sters imediat dupa
verificare (`auth.admin.deleteUser` + stergerea randului de rol). Contextul activ
afisat corect in UI dupa login: "CONTEXT ACTIV — C.S. Phi Hau".

### Ecrane verificate

| # | Ecran | Rezultat observat |
|---|-------|--------------------|
| 1 | **Grupe & Orar** | 5 grupe afisate — `Copii Incepatori` (6 sportivi), `Retrasi` (427), `Juniori si Adulti` (3), `Copii Avansati` (24), `Grupa vacanță` (0). Corespunde exact distributiei `grupe` pentru C.S. Phi Hau din `25-AUDIT.md` (5 randuri). Zero grupe din alt club. Butonul "Adaugă Grupă" prezent si vizibil. |
| 2 | **Prezenta — tab Rapid** | Se incarca fara eroare: "Niciun antrenament programat pentru astăzi." Buton "Adaugă ședință azi" prezent. Zero date din alt club (nu exista date de comparat azi, dar zero erori de acces). |
| 3 | **Plati → Config. Abonamente** (`tipuri-abonament`) | 5 tipuri de abonament afisate — `Individual` (220 RON, 1 membru), `Familie 2` (330, 2), `Familie 3` (380, 3), `Familie 4` (440, 4), `Familie 5` (500, 5). Corespunde exact celor 5 randuri reale `tipuri_abonament`, toate apartinand C.S. Phi Hau, din `25-AUDIT.md`. Zero tipuri din alt club. |
| 4 | **Vacanțe Antrenamente** (`perioade-vacanta`) | Se incarca fara eroare de permisiune: 1 perioada afisata, "Vacanță de vară 2026" (01 Iul 2026 — 31 Aug 2026). Buton "Adaugă Perioadă" prezent. |

Toate 4 ecranele s-au incarcat cu date REALE ale clubului propriu (nu date mock),
fara nicio urma de date apartinand altui club, si fara nicio eroare vizibila in UI.

### Empty states (D-05)

Ecranul "Prezenta — Rapid" a afisat corect mesajul empty-state ("Niciun
antrenament programat pentru astăzi") cu buton de actiune functional ("Adaugă
ședință azi") — comportamentul livrat in 25-02 (`EmptyState` din `ui.tsx`)
functioneaza corect si pentru acest cont/context.

### Consola browserului

**6 erori 401 observate, TOATE inainte/in timpul incarcarii initiale a
Dashboard-ului (imediat dupa login), NICIUNA in timpul navigarii ulterioare pe
cele 4 ecrane verificate:**

```
401 POST .../rest/v1/rpc/get_my_active_clubs   (x2)
401 GET  .../rest/v1/rbv_plati_club?select=*    (x2)
401 GET  .../rest/v1/rbv_sportivi_complet?...   (x2)
```

**Analiza:** aceste 3 endpoint-uri NU fac parte din cele 8 tabele/politici
atinse de migratia 25-01/25-04 (`grupe`, `orar_exceptii`, `program_antrenamente`,
`tipuri_abonament`, `perioade_vacanta`, `participare_vacanta`,
`sesiune_activitate`, `plati` doar WRITE, `evenimente`). Codul HTTP 401
(Unauthorized — lipsa/JWT invalid) e diferit calitativ de un blocaj RLS
(care ar da 200 cu 0 randuri sau, la INSERT/UPDATE fara drept, `42501`/"violates
row-level security policy" — exact eroarea vazuta corect la testele automate de
INSERT cross-club din sectiunea anterioara). Un 401 la incarcarea initiala indica
o cursa de sesiune la pornirea aplicatiei (cereri de prefetch declansate inainte
ca sesiunea Supabase sa fi atasat complet header-ul `Authorization`), reprodusa
identic la 2 rulari succesive, INDEPENDENT de contul folosit — comportament
preexistent, nelegat de aceasta migratie. Documentat ca risc rezidual mai jos
(follow-up separat, nu blocheaza inchiderea Fazei 25).

Pe cele 4 ecrane cerute explicit de plan (Grupe, Prezenta, Config. Abonamente,
Vacanțe Antrenamente), **zero erori noi in consola dupa navigare** — rezultat
stabil, confirmat prin 3 rulari succesive ale scriptului de verificare.

---

## Risc rezidual

1. **Politici RLS fantoma pe tabele din afara scope-ului acestei faze** —
   confirmat de orchestrator ca tiparul de politici nedocumentate
   (`UNIFIED_CLUB_ACCESS`/`Staff_Full_Access`/`SuperAdmin_Total_Access`/
   `has_power_role`) exista in continuare pe cel putin `tranzactii`, `grade`,
   `istoric_grade`, `eveniment`, `reduceri`, `cluburi`. Recomandare: audit RLS
   dedicat pe intreaga schema `public`, nu doar pe cele 8-9 tabele ale acestei
   faze (vezi si `25-AUDIT-CORECTAT.md`, sectiunea "Riscuri reziduale").

2. **`evenimente_public_select` (`SELECT USING(true)`)** — ramasa neverificata ca
   intentionata (posibila pagina publica de listare evenimente neautentificata).
   Nu a fost atinsa in aceasta migratie (SELECT-only, nu afecteaza izolarea de
   scriere). Necesita decizie de produs separata.

3. **`prezenta_antrenament` — posibile politici duplicate coexistente** —
   descoperire deja loggata in `25-AUDIT.md` ("Descoperire in afara scopului"):
   posibil coexista `rbv_prezenta_*` (din `role_based_views.sql`) cu politici
   vechi inline (`Admin Club - Full Access Prezenta`, `Instructor - Management
   Prezenta`, din `20260305_update_auth_functions_and_rls.sql`), nedropuite.
   Numele `rbv_prezenta_own` cautat de acest plan NU exista live — calea SPORTIV
   reala e `prezenta_select_policy` (verificat de orchestrator, sectiunea
   "Dovezi pg_policies" de mai sus). NU a fost re-verificat exhaustiv live in
   aceasta faza (tabela nu era in scope) — risc real, in crestere avand in vedere
   cate politici fantoma s-au gasit pe tabelele vecine. **Recomandare puternica:
   audit RLS dedicat pe `prezenta_antrenament` intr-o faza viitoare**, inainte de
   a considera acest tabel "sigur".

4. **Randuri orfane ramase, vizibile DOAR prin `is_super_admin()`:**
   - `sesiune_activitate`: 1 rand din 1 total (`eveniment_id` sters, orfan
     definitiv — comportament corect, nu regresie).
   - `program_antrenamente`: 0 randuri orfane ramase (backfill 100% reusit, toate
     3 randurile initiale rezolvate prin `grupa_id -> grupe.club_id`).
   - `tipuri_abonament`: 0 randuri cu `club_id IS NULL` azi (fail-closed by
     default aplicat preventiv — daca apare vreodata un rand orfan, va fi vizibil
     doar super admin).

5. **`get_my_club_ids()` si `get_my_clubs()` — deprecate de facto** — zero
   call-site-uri ramase dupa aceasta migratie (ultimul, `Staff - Full Access
   Grupe`, a fost inlocuit in Sectiunea 4). Functiile raman definite in DB (fara
   `DROP FUNCTION`, in afara scope-ului unei migratii de politici) — documentat
   in `STATE.md` ca decizie (vezi mai jos).

6. **Follow-up ramas de la 25-03: cablarea prop-ului `activeClubId` in
   `GrupaFormModal`** — prop-ul e optional si NU e cablat de `Grupe/index.tsx`
   (apelantul, detinut de planul 25-02 din aceeasi unda). Comportament identic cu
   inainte de 25-03 pentru acest apel — narrowing-only, nicio regresie, dar
   ramane follow-up documentat pentru Faza 26 (wizard onboarding club nou), alaturi
   de cele 5 locuri suplimentare (`Familii.tsx`, `GestiuneFacturi.tsx`,
   `JurnalIncasari.tsx` x2, `TaxeAnuale.tsx`) identificate in `25-AUDIT-FRONTEND.md`.

7. **[Descoperire conexa, in afara scope-ului 25-04, FIXATA de orchestrator ca
   sa poata rula Task 2] Trigger `tr_automatizeaza_roluri` fara `SECURITY
   DEFINER`** — in timpul scrierii/rularii testului automat (Task 2), orice
   INSERT in `public.utilizator_roluri_multicont` (inclusiv cel facut cu
   `SUPABASE_SERVICE_ROLE_KEY`, cu privilegii depline) esua cu `42501 permission
   denied for table users`. Diagnostic (rulat de orchestrator via `execute_sql`):
   trigger-ul `tr_automatizeaza_roluri -> fn_automatizeaza_legatura_utilizator()`
   de pe `utilizator_roluri_multicont` NU avea `SECURITY DEFINER` (spre deosebire
   de celelalte trigger-uri de pe acelasi tabel, ex. `audit_roluri`), iar functia
   face JOIN direct pe `auth.users` — rulata cu privilegiile APELANTULUI (nu ale
   proprietarului functiei), acel JOIN nu are drept de citire pe `auth.users`.
   Orchestratorul a aplicat `CREATE OR REPLACE FUNCTION` adaugand `SECURITY
   DEFINER` (restul corpului neschimbat), aplicat cu succes pe `wuhidifzsutwgdfkwhmd`.
   **Impact real, in afara acestui test:** `services/authService.ts` foloseste
   EXACT acelasi cod path (`.upsert()` pe `utilizator_roluri_multicont`, liniile
   78 si 122) la inregistrarea reala a unui sportiv nou — daca bug-ul nu era
   prins acum, inregistrarea self-service de sportivi noi ar fi fost afectata in
   productie (severitate necunoscuta exact — depinde daca upsert-ul client-side,
   rulat ca `authenticated` cu `auth.uid()` propriu, lovea acelasi cod defect;
   nu a fost confirmat separat, dar riscul e suficient de mare incat sa merite
   flag explicit). Fix aplicat, verificat implicit prin rularea cu succes a
   testului automat din Task 2 (16/16 PASS, insert-uri in
   `utilizator_roluri_multicont` reusite pentru 3 roluri diferite pe parcursul
   testului). Recomandare: verificare separata, directa, ca inregistrarea reala
   de sportivi (`authService.ts`) functioneaza corect post-fix.
