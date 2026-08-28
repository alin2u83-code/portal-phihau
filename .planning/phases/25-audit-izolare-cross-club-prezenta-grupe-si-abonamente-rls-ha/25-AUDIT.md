# Faza 25 — Audit RLS live: Grupe / Prezenta / Abonamente

**Data:** 2026-08-28
**Metodologie:** Acest subagent executor NU are acces la tool-urile MCP Supabase
(`execute_sql`/`apply_migration`) — confirmat identic cu precedentul din 15-01-SUMMARY
si 16-01-SUMMARY ("doar orchestratorul principal le are"). Nu exista nici conexiune
Postgres directa (`pg` client) si nici un RPC `exec_sql` expus prin PostgREST in acest
proiect (verificat: `grep -rn "exec_sql\|execute_sql" scripts/ services/` = 0 rezultate).

In loc de interogare directa `pg_policies`, inventarul de politici de mai jos a fost
reconstruit prin **arheologie exhaustiva a istoricului de migratii** din
`supabase/migrations/` (folder local, gitignored, 101 fisiere — contine istoricul
complet al migratiilor aplicate live pe proiectul `wuhidifzsutwgdfkwhmd`) combinata cu
date live interogate direct (bypass RLS, `SUPABASE_SERVICE_ROLE_KEY`) via
`scripts/audit_rls_faza25.ts`. Pentru fiecare tabel, am identificat **cea mai recenta
migratie datata care modifica politicile acelui tabel** (dupa prefixul `YYYYMMDD_` din
numele fisierului) si am tratat acea definitie ca fiind starea live curenta — aceeasi
metoda descrisa explicit in `15-01-SUMMARY.md` ("Inspectie schema live... combinata cu
istoricul de migratii").

**Risc rezidual al metodei:** daca vreo politica a fost modificata direct din Supabase
Studio SQL Editor FARA a salva un fisier corespunzator in `supabase/migrations/`, acea
schimbare nu apare in acest audit. Acest risc exista si in metodologia Fazei 15/16 (care
a folosit acelasi mecanism) si e considerat acceptabil pentru acest proiect — istoricul
`supabase/migrations/` a fost pana acum complet si consistent cu comportamentul live
verificat (ex. `20260507_fix_plati_timeout_indexes_and_rls.sql` documenteaza explicit
rezultatul asteptat al `pg_policies` dupa aplicare, iar politicile ramase corespund
exact cu ce am gasit prin arheologie).

**Corectie majora fata de research (25-RESEARCH.md):** investigatia acestui task a
descoperit ca cel putin 2 din verdictele research-ului sunt **bazate pe politici deja
suprascrise** de migratii ulterioare pe care research nu le-a gasit/citat. Detaliile sunt
in sectiunile de mai jos (`evenimente` si `program_antrenamente`).

---

## Inventar politici live

Metodologie per tabel: fisierul `CREATE POLICY`/`DROP POLICY` cu cea mai recenta data
din numele fisierului este tratat ca sursa de adevar. Politicile marcate **[NEATINSA]**
raman exact cum sunt; cele marcate **[INLOCUITA]** sunt tinta migratiei din Task 2/3.

| # | Tabel | Politici live (nume exact) | Sursa (fisier, cea mai recenta) | Predicat | Verdict |
|---|-------|------------------------------|----------------------------------|----------|---------|
| 1 | `grupe` | `Admin_Select_Grupe` (SELECT) | `20260301_admin_view_all_tables.sql` | `has_access_to_club(club_id)` | **[NEATINSA]** — deja corect, context-aware |
| 1b | `grupe` | `Staff - Full Access Grupe` (FOR ALL) | `20260305_get_my_club_ids_and_rls.sql` | `club_id = ANY(get_my_club_ids()) OR is_super_admin()` | **[INLOCUITA]** — non-context-aware, permisiva pe OR cu #1, afecteaza si WRITE |
| 2 | `evenimente` | `View Evenimente` (SELECT) | `20260310_fix_rezultate_rls.sql` | `club_id IS NULL OR has_access_to_club(club_id)` | **[NEATINSA]** — vezi corectie mai jos, NU foloseste `get_my_club_ids()`, NULL e intentionat (evenimente federale) |
| 2b | `evenimente` | `Manage Evenimente` (FOR ALL) | `20260310_fix_rezultate_rls.sql` | `(club_id IS NULL AND (is_super_admin() OR rol IN admin/super_admin)) OR (club_id IS NOT NULL AND has_access_to_club(club_id))` | **[NEATINSA]** — deja fail-closed pe scriere pentru NULL |
| 3 | `program_antrenamente` | `Admin_Select_Program` (SELECT) | `20260301_admin_view_all_tables.sql` | `has_access_to_club(club_id)` | **[NEATINSA]** — deja corect, context-aware |
| 3b | `program_antrenamente` | `Admin Club - Full Access Antrenamente` (FOR ALL) | `20260305_update_auth_functions_and_rls.sql` | `urm.rol_denumire='ADMIN_CLUB' AND urm.club_id=program_antrenamente.club_id` (fara filtrare pe `active-role-context-id`) | **[INLOCUITA]** — vezi corectie mai jos, context-bleed multi-rol |
| 3c | `program_antrenamente` | `Instructor - Read Access Antrenamente` (SELECT) | idem | idem, `rol_denumire='INSTRUCTOR'` | **[INLOCUITA]** — idem |
| 3d | `program_antrenamente` | `Sportiv - Read Access Antrenamente` (SELECT) | idem | idem, `rol_denumire='SPORTIV'` | **[INLOCUITA]** — idem, cale SPORTIV de pastrat cu scop identic |
| 3e | `program_antrenamente` | `Sportiv - Read Access Antrenamente Secundare` (SELECT) | `20260410_rls_sportivi_grupe_secundare.sql` | scope diferit (grupe secundare) | **[NEATINSA]** — nu face parte din setul inlocuit |
| 4 | `orar_saptamanal` | (politica curenta) | `20260302_fix_orar_saptamanal_columns.sql` | `has_access_to_club(club_id)` (SELECT+WRITE) | **[NEATINSA]** — confirmat OK, nicio migratie ulterioara nu o atinge |
| 5 | `orar_exceptii` | `SuperAdmin Full Access OrarExceptii` (FOR ALL) | `20260519_create_orar_exceptii.sql` (unica sursa, identica in `sql/migrations/` si `supabase/migrations/`) | `rol_denumire='SUPER_ADMIN_FEDERATIE'` (inline, fara club check) | **[INLOCUITA]** — consolidata in politica noua |
| 5b | `orar_exceptii` | `Admin Club Full Access OrarExceptii` (FOR ALL) | idem | `rol IN ('ADMIN_CLUB','ADMIN') AND urm.club_id=orar_exceptii.club_id` | **[INLOCUITA]** — consolidata |
| 5c | `orar_exceptii` | `Instructor Access OrarExceptii` (FOR ALL) | idem | `rol='INSTRUCTOR' AND urm.club_id=orar_exceptii.club_id` | **[INLOCUITA]** — consolidata |
| 5d | `orar_exceptii` | `Sportiv Read OrarExceptii` (SELECT) | idem | `EXISTS sportivi s WHERE s.user_id=auth.uid() AND s.grupa_id=orar_exceptii.grupa_id` | **[NEATINSA]** — cale SPORTIV, obligatoriu de pastrat (Invariant 5) |
| 6 | `perioade_vacanta` | `perioade_vacanta_select` (SELECT) | `sql/migrations/create_perioade_vacanta.sql` (unica sursa, nu exista in `supabase/migrations/` datat — aplicata direct) | `USING (true)` | **[INLOCUITA]** — leak activ |
| 6b | `perioade_vacanta` | `perioade_vacanta_write` (FOR ALL) | idem | doar rol, fara club | **[INLOCUITA]** |
| 7 | `participare_vacanta` | `participare_vacanta_select` (SELECT) | idem | `USING (true)` | **[INLOCUITA]** — leak activ |
| 7b | `participare_vacanta` | `participare_vacanta_write` (FOR ALL) | idem | doar rol, fara club | **[INLOCUITA]** |
| 8 | `sportivi_grupe_secundare` | (politici curente) | `20260409_sportivi_grupe_secundare.sql` | `has_access_to_club(club_id)` (staff) + `sportiv_id=own` | **[NEATINSA]** — confirmat OK |
| 9 | `prezenta_antrenament` | `rbv_prezenta_staff/own/insert/update/delete` | `sql/migrations/role_based_views.sql` (unica sursa datata cu certitudine dupa 20260507, nu exista in `supabase/migrations/`) | staff: `has_access_to_club` via sportivi; own: `get_own_sportiv_id()`; insert/update/delete: doar rol | **[NEATINSA — cale SPORTIV explicit interzisa de modificat de plan]** — vezi "Descoperire in afara scopului" mai jos |
| 9b | `prezenta_antrenament` | `Admin Club - Full Access Prezenta`, `Instructor - Management Prezenta` | `20260305_update_auth_functions_and_rls.sql` | inline, non-context-aware | **[NEATINSA — in afara scopului acestui plan]** — posibil coexista cu #9, vezi nota |
| 10 | `anunturi_prezenta` | `Staff - Full Access Anunturi` (FOR ALL) | `20260305_comprehensive_rls_and_functions.sql` | `EXISTS sportivi s WHERE s.id=anunturi_prezenta.sportiv_id AND has_access_to_club(s.club_id)` | **[NEATINSA]** — confirmat OK, nicio migratie ulterioara |
| 11 | `sesiune_activitate` | `club_member_access` (FOR ALL) | `supabase/migrations/20260706_fix_rls_izolare_cross_club_financiar.sql` (Faza 15) | `is_super_admin()` only | **[INLOCUITA]** — adauga club_id + backfill + scoping normal |
| 12 | `tipuri_abonament` | `tipuri_abonament_select` (SELECT) | `sql/migrations/fix_rls_all_tables.sql` (unica sursa, nu exista in `supabase/migrations/` datat) | `USING (true)` | **[INLOCUITA]** — leak activ |
| 12b | `tipuri_abonament` | `tipuri_abonament_write` (FOR ALL) | idem | doar rol, fara club | **[INLOCUITA]** |
| 13 | `plati` | `rbv_plati_super_admin`, `rbv_plati_admin_club`, `rbv_plati_own` (SELECT) | `sql/migrations/role_based_views.sql` | `is_super_admin()` / `has_access_to_club(COALESCE(club_id, sportivi.club_id))` / `sportiv_id=own` | **[NEATINSA]** — SELECT deja corect scopat, vezi Open Question #1 |
| 13b | `plati` | `rbv_plati_insert/update/delete` | idem | doar rol (`SUPER_ADMIN_FEDERATIE`,`ADMIN_CLUB`), fara verificare club_id | **[INLOCUITA]** — gap real gasit, vezi Open Question #1 |

**Zero politici gasite** pentru niciunul din cele 13 tabele auditate — toate au minim o
politica activa.

---

## Open Question #1 — predicatul exact al `rbv_plati_*`

**Sursa gasita:** `sql/migrations/role_based_views.sql` (fisier tracked in git,
ignorat de research pentru ca a cautat doar in `supabase/migrations/`; research a
marcat explicit A2 in Assumptions Log ca risc), linii 1125-1185.

**SELECT — `rbv_plati_admin_club`:**
```sql
CREATE POLICY "rbv_plati_admin_club" ON public.plati
    FOR SELECT TO authenticated
    USING (public.has_access_to_club(COALESCE(club_id,
        (SELECT s.club_id FROM public.sportivi s WHERE s.id = sportiv_id)
    )));
```
**Verdict SELECT: deja scopat corect, ZERO modificari.** `has_access_to_club(NULL)`
(cazul in care nici `club_id` nici `sportiv_id` nu rezolva un club) evalueaza la
`false` pentru ADMIN_CLUB/INSTRUCTOR (comparatia `club_id = NULL` nu e niciodata true)
si la `true` doar pentru SUPER_ADMIN_FEDERATIE/ADMIN (ramura lor nu depinde de
`p_club_id`) — fail-closed prin constructie, fara pattern `club_id IS NULL OR`.

**WRITE — `rbv_plati_insert`/`rbv_plati_update`/`rbv_plati_delete`:**
```sql
CREATE POLICY "rbv_plati_insert" ON public.plati
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont
                WHERE user_id = auth.uid()
                  AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN_CLUB'))
    );
-- update/delete identice ca predicat (USING/WITH CHECK doar pe rol)
```
**Verdict WRITE: predicat SLAB — de reparat.** Aceste 3 politici verifica DOAR ca
userul are rolul ADMIN_CLUB/SUPER_ADMIN_FEDERATIE (pe ORICE rand din
`utilizator_roluri_multicont`, nefiltrat de `active-role-context-id`), fara sa compare
clubul randului cu clubul userului. Un ADMIN_CLUB al Clubului A poate insera/edita/sterge
plati apartinand Clubului B. Acesta e un gap real de tip Tampering, aceeasi clasa ca
T-25-02, descoperit direct din citirea sursei (nu presupunere) — se repara in Task 3
Sectiunea 8, pastrand verbatim verificarea de rol si adaugand conjunctul de club identic
cu cel din `rbv_plati_admin_club` (narrowing-only, Invariant 1).

**Actiune in migratie:** SELECT neatins; INSERT/UPDATE/DELETE rescrise cu conjunct de
club, USING+WITH CHECK identice unde aplicabil. `rbv_plati_own` NU e atinsa in niciun
scenariu (Invariant/gate explicit din plan).

---

## Open Question #2 — orfanele `program_antrenamente`

Din `scripts/audit_rls_faza25.ts`, punctul (b), rulat live 2026-08-28:

```
id=9e16bde9-ff34-4890-b50b-f99f12dee217  grupa_id=a110fc8e-...  data=2026-04-15  club_id=null
  -> grupa {"id":"a110fc8e-...","denumire":"Copii Incepatori","club_id":"cbb0b228-b3e0-4735-9658-70999eb256c6"}
id=a688e20d-9824-4a47-bfdf-c299a38007bc  grupa_id=e759f77b-...  data=2026-06-03  club_id=null
  -> grupa {"id":"e759f77b-...","denumire":"Copii Avansati","club_id":"cbb0b228-b3e0-4735-9658-70999eb256c6"}
id=72014374-ef9b-4a59-b3ff-0594fd86b581  grupa_id=e759f77b-...  data=2026-06-03  club_id=null
  -> grupa {"id":"e759f77b-...","denumire":"Copii Avansati","club_id":"cbb0b228-b3e0-4735-9658-70999eb256c6"}
```

**Verdict: toate 3 randuri sunt recuperabile prin `grupa_id -> grupe.club_id`.**
Toate rezolva catre acelasi club (`cbb0b228-b3e0-4735-9658-70999eb256c6` = C.S. Phi
Hau). Backfill 100% posibil, executat in Task 3 Sectiunea 6 prin
`UPDATE ... FROM public.grupe g WHERE pa.grupa_id = g.id AND pa.club_id IS NULL`.

**Corectie fata de research/plan:** research a caracterizat politica curenta SELECT ca
`club_id IS NULL OR has_access_to_club(club_id)` (fail-open, "vizibile TUTUROR staff") —
aceasta politica (`"Admin - Vizualizare Antrenamente Club"`, din
`20260302_fix_program_antrenamente_rls.sql`) **a fost DROP-uita** de
`20260305_update_auth_functions_and_rls.sql` (linia 70), care a inlocuit-o cu 3
politici noi per-rol (vezi Inventar #3b/#3c/#3d). Niciuna din cele 3 politici curente nu
contine `club_id IS NULL OR` — de fapt, verificarea `urm.club_id = program_antrenamente.club_id`
nu se potriveste niciodata cand `club_id` e NULL (comparatie cu NULL = NULL, nu true),
deci cele 3 randuri orfane sunt deja invizibile prin aceste 3 politici. Raman vizibile
DOAR prin `Admin_Select_Program` (SELECT, `has_access_to_club(club_id)`) — care pentru
`club_id=NULL` e `true` doar pentru SUPER_ADMIN_FEDERATIE/ADMIN, `false` pentru
ADMIN_CLUB/INSTRUCTOR (acelasi mecanism NULL-safe explicat la Open Question #1). **Deci
starea LIVE curenta e deja efectiv fail-closed pe cele 3 randuri, nu fail-open cum
presupunea research-ul** — insa politicile 3b/3c/3d au o problema DIFERITA si mai
severa: sunt non-context-aware (vezi Open Question #3 extins mai jos), deci le
rescriem oricum in Task 3, iar backfill-ul + garda explicita `club_id IS NOT NULL`
raman corecte si necesare ca aparare in adancime (defense-in-depth), consistent cu
Invariantul 2.

---

## Open Question #3 — call-site-uri ramase `get_my_club_ids()`

**Grep exhaustiv** (`grep -rn "get_my_club_ids" supabase/ sql/ scripts/ services/ hooks/ components/`):
singurele rezultate sunt in `supabase/migrations/20260305_get_my_club_ids_and_rls.sql`
(definitia functiei + 3 `CREATE POLICY` originale) si `supabase/all_migrations.sql`
(fisier bundle/concatenare, nu o migratie aplicata separat) — zero referinte in cod
frontend/backend (`components/`, `hooks/`, `services/`, `scripts/`).

**Din cele 3 politici originale create de acel fisier** (`Staff - Full Access Plati`,
`Staff - Full Access Grupe`, `Staff - Full Access Evenimente`), am verificat starea
curenta a fiecarui tabel prin arheologie de migratii:

| Politica originala (get_my_club_ids) | Stare curenta | Dovada |
|---|---|---|
| `Staff - Full Access Plati` | **DROP-uita definitiv** — inlocuita de `rbv_plati_*` | `supabase/migrations/20260410_fix_nom_locatii_and_plati_rls.sql:67` (`DROP POLICY IF EXISTS "Staff - Full Access Plati"`), confirmat de comentariul din `20260507_fix_plati_timeout_indexes_and_rls.sql` care listeaza explicit politicile ramase asteptate (doar `rbv_*`) |
| `Staff - Full Access Evenimente` | **DROP-uita definitiv** — inlocuita de `View Evenimente`/`Manage Evenimente` (`has_access_to_club`, nu `get_my_club_ids`) | `supabase/migrations/20260310_fix_rezultate_rls.sql:71` |
| `Staff - Full Access Grupe` | **INCA LIVE** — singurul call-site ramas | Nicio migratie ulterioara (verificat: nicio aparitie `public.grupe` in fisiere datate dupa 20260305) |

**Verdict: dupa migrarea `grupe` (Task 2 Sectiunea 4), raman ZERO call-site-uri.**
`get_my_club_ids()` primeste `COMMENT ON FUNCTION` de deprecare, fara `DROP FUNCTION`.

**Notă:** `evenimente` NU necesita nicio modificare pentru acest Open Question — nu
apeleaza `get_my_club_ids()` azi (a fost deja migrata pe `has_access_to_club()` din
2026-03-10, inainte chiar de fix-ul context-aware din 260705). Vezi "Corectie evenimente"
mai jos pentru motivul complet pentru care `evenimente` ramane neatinsa in Task 2.

### Corectie `evenimente` (research a citat o politica suprascrisa)

Research a caracterizat `evenimente` identic cu `grupe` (get_my_club_ids, de migrat).
Fals — vezi tabelul de mai sus. Politica curenta (`View Evenimente`/`Manage Evenimente`
din `20260310_fix_rezultate_rls.sql`) foloseste deja `has_access_to_club(club_id)`
(context-aware din 260705) si NU apeleaza `get_my_club_ids()`.

Ramane un pattern `club_id IS NULL OR has_access_to_club(club_id)` pe SELECT — care
arata ca cel din `program_antrenamente` — DAR verificarea live a datelor
(`scripts/audit_rls_faza25.ts`, punctul f) arata ca **exact 2 randuri au `club_id IS
NULL` azi, ambele evenimente federale legitime**:
```
'Stagiu National de Qwan Ki Do'                      club_id=null  tip='Stagiu'
'Stagiu Internațional Qwan Ki Do - Thay Chuong Mon'  club_id=null  tip='Stagiu'
```
Nu sunt randuri orfane/corupte — sunt evenimente la nivel de federatie, intentionat
vizibile tuturor cluburilor (`components/Competitii/index.tsx:689` le incarca separat
de logica de club). Politica de scriere (`Manage Evenimente`) restrictioneaza deja
crearea de randuri cu `club_id NULL` la `is_super_admin()` sau rol
SUPER_ADMIN_FEDERATIE/ADMIN — deci un ADMIN_CLUB nu poate crea evenimente "federale"
false. **Verdict: `evenimente` ramane complet neatinsa in migratie** — nu e un gap de
securitate, e semantica intentionata deja corect scopata pe scriere.

---

## Semantica tipuri_abonament.club_id IS NULL

Din `scripts/audit_rls_faza25.ts`, punctul (a): **0 din 5 randuri** au `club_id IS
NULL` azi (toate 5 apartin clubului `cbb0b228-b3e0-4735-9658-70999eb256c6` = C.S. Phi
Hau). Intrebarea din research ("nomenclator federal partajat vs orfan") **e goala azi —
nu exista niciun rand de clasificat.**

**Verdict:** aplicam fail-closed by default (D-02) — politica noua de SELECT NU adauga
o ramura explicita `club_id IS NULL`. Daca in viitor apare un rand cu `club_id NULL`
(ex. printr-o inserare gresita), va fi vizibil DOAR prin `is_super_admin()`, consistent
cu tratamentul standard al randurilor orfane din acest plan. Nu se inventeaza semantica
"nomenclator federal" pentru date care nu exista azi.

Politica noua de SELECT tot primeste ramura obligatorie `get_own_sportiv_id()` (vezi
sectiunea urmatoare) — aceasta e necesara indiferent de semantica NULL, pentru ca
`has_access_to_club()` returneaza `false` pentru rolul SPORTIV pe orice club.

---

## Cai de citire SPORTIV de protejat

Grep executat: `grep -rn "from('tipuri_abonament')\|from('perioade_vacanta')\|from('participare_vacanta')\|from('grupe')\|from('evenimente')" components/ hooks/ services/`

| Fisier | Tabel | Rol care il atinge | Actiune |
|--------|-------|---------------------|---------|
| `components/SportivDashboard/FamilieWidget.tsx:46` | `tipuri_abonament` (`.select('*')`, fara filtru club) | SPORTIV (dashboard familie) | **Obligatoriu**: ramura `get_own_sportiv_id()` in noua politica SELECT (Task 2 Sectiunea 3) — confirmat: `sportivi.tip_abonament_id` exista ca si coloana (`hooks/useDataProvider.ts:335`, `FamilieWidget.tsx:45`), deci sportivul are nevoie sa vada catalogul complet de tipuri ale propriului club pentru a-si vedea/schimba abonamentul |
| `hooks/useDataProvider.ts:335` | `tipuri_abonament` prin `withClub(...)` (filtrare JS suplimentara pe `club_id`, cand `clubId` e cunoscut) | toate rolurile (defense-in-depth frontend) | Neschimbat — RLS-ul devine bariera reala, filtrarea JS ramane ca strat suplimentar existent |
| `hooks/useDataProvider.ts:340` | `evenimente` (`.select('*')` prin `withClub`) | toate rolurile | Neschimbat — `evenimente` nu se modifica (vezi corectia de mai sus) |
| `components/SportivDashboard/index.tsx:92` | `grupe` (doar `denumire`, pt afisarea numelui grupei unui sportiv vizualizat) | context ADMIN_CLUB/staff care vizualizeaza profilul unui sportiv, nu self-service SPORTIV | Neschimbat — comportamentul `grupe` pentru SPORTIV ramane "vede zero randuri direct", consistent cu Invariantul din Task 2 Sectiunea 4 (nicio cale noua SPORTIV pe `grupe`) |
| `components/Prezenta/ListaPrezentaAntrenament.tsx:180,196` | `perioade_vacanta`/`participare_vacanta` | staff (afisate in ecranul de marcare prezenta, pentru a exclude sportivii in vacanta) | Neschimbat — SELECT nou (`has_access_to_club`) acopera staff normal; nu exista incarcare directa de catre SPORTIV a acestor tabele |
| `components/Plati/PerioadaVacanta.tsx` (multiple) | `perioade_vacanta`/`participare_vacanta` (CRUD complet) | ADMIN_CLUB/staff (ecranul de administrare vacante) | Neschimbat — WRITE nou (`has_access_to_club`) acopera acest flux identic cu azi (userul e deja staff-ul clubului propriu) |

**Concluzie:** singura cale SPORTIV afectata de aceasta migratie e `tipuri_abonament`,
acoperita explicit de ramura `get_own_sportiv_id()` in Task 2 Sectiunea 3.
`orar_exceptii` are de asemenea o cale SPORTIV directa (`Sportiv Read OrarExceptii`,
vezi Inventar #5d) — aceasta e in afara grep-ului de mai sus (nu e citita direct din
componente `.from('orar_exceptii')` verificate aici, ci prin RLS insusi) si e pastrata
intacta prin decizia explicita de a nu o atinge in Task 2 Sectiunea 5.

---

## Cluburi de referinta pentru testul de izolare (25-04)

Din `scripts/audit_rls_faza25.ts`, punctul (f) — distributie `grupe` pe club_id:

| club_id | Nume club | Randuri `grupe` |
|---------|-----------|-------------------|
| `83e7f771-46cf-4c4e-b70f-356d7b0bff06` | Kim Long Dao Falticeni | 6 |
| `cbb0b228-b3e0-4735-9658-70999eb256c6` | C.S. Phi Hau | 5 |
| `aafad92d-f709-49c1-8769-13c8a492ff06` | Hâc Long Dao Brașov | 2 |
| `2982c5e8-423e-4ee1-9359-1bd293c8bc8e` | Thoi Son Brasov | 1 |

**Cluburi de referinta recomandate pentru 25-04:** `83e7f771-46cf-4c4e-b70f-356d7b0bff06`
(Kim Long Dao Falticeni) si `cbb0b228-b3e0-4735-9658-70999eb256c6` (C.S. Phi Hau) — cele
2 cu cele mai multe randuri reale in `grupe`, deci si in `program_antrenamente`/
`prezenta_antrenament` (via FK), suficiente pentru un test cross-club vizibil.

Lista completa cluburi (`cluburi.id, nume`), din punctul (g):
Club Bogdan, Federația Română de Qwan Ki Do (`00000000-0000-0000-0000-000000000000`),
Thoi Son Brasov, Am Duong, Long Ho Cluj, C.S. Phi Hau, Kim Long Dao Falticeni, Hong Ha,
Hâc Long Dao Brașov, ACS Phuong Bao, Long Dao.

---

## Descoperire in afara scopului (loggat, NEATINS)

**`prezenta_antrenament`** are potential DOUA seturi de politici coexistente azi:
1. `rbv_prezenta_staff/own/insert/update/delete` (din `sql/migrations/role_based_views.sql`)
2. `Admin Club - Full Access Prezenta` / `Instructor - Management Prezenta` (din
   `supabase/migrations/20260305_update_auth_functions_and_rls.sql`, care NU sunt
   dropuite de `role_based_views.sql` — acel fisier doar dropuie propriile politici
   `rbv_prezenta_*` inainte de a le recrea, nu si pe cele vechi cu alt nume)

Daca ambele seturi sunt live simultan, politicile #2 (inline, non-context-aware, fara
verificare `active-role-context-id`) ar putea re-introduce exact tipul de context-bleed
pe care `has_access_to_club()` a fost fixat sa il previna, prin semantica OR a
politicilor permisive multiple pe Postgres RLS.

**De ce NU se repara in acest plan:** invariantele acestui plan (25-01-PLAN.md,
verificarile automate din Task 2/3) INTERZIC explicit orice atingere a
`rbv_prezenta_*`/`prezenta_antrenament` — plan-ul le declara "deja corecte" bazat pe
research, iar gate-urile de verificare esueaza daca migratia contine `rbv_prezenta`.
Aceasta descoperire schimba acea premisa, dar rezolvarea ei necesita o decizie de plan
(care politica veche se dropuie, ce impact are pe fluxul curent de prezenta) — nu poate
fi facuta in siguranta ca "auto-fix" in interiorul unui plan care interzice explicit
modificarea acestui tabel.

**Actiune:** loggat aici ca risc rezidual pentru o faza viitoare de audit RLS (posibil
follow-up dupa Faza 25/26). Nu se modifica `prezenta_antrenament` in Task 2/3 ale
acestui plan.
