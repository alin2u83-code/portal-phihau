---
phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament
plan: 04
subsystem: payments
tags: [postgres, react, typescript, date-fns, supabase, rls]

requires:
  - phase: 30-02
    provides: "proprietate exclusiva types.ts in acest val (evitare conflict scriere)"
provides:
  - "politici_reducere.reinnoiri_necesare + tip_bonus (coloane noi pe tabel preexistent)"
  - "aplicare_reduceri.plata_id (coloana noua, index unic)"
  - "types.ts: interface PoliticaReducere, distinct de Reducere"
  - "utils/loialitateReinnoiri.ts — numaraReinnoiriConsecutive() + calculeazaBonusLoialitate() (functii pure)"
  - "services/loialitateService.ts — getPoliticiLoialitate()"
affects: [30-05]

tech-stack:
  added: []
  patterns: []

key-files:
  created: [supabase/migrations/20260918d_loialitate_politici_reducere.sql, utils/loialitateReinnoiri.ts, utils/loialitateReinnoiri.test.ts, services/loialitateService.ts]
  modified: [types.ts]

key-decisions:
  - "Executat inline (nu prin subagent gsd-executor) — acelasi motiv ca planurile 30-01/02/03"
  - "Task 1 (schema live) a demontat 3 din 4 presupuneri ale planului: aplicare_reduceri.reducere_id -> reduceri (NU politici_reducere), aplicare_reduceri nu are sportiv_id/plata_id (doar obligatie_id -> obligatii_plata), plati.reducere_id NU are nicio constrangere FK. Migratia s-a scris pe baza realitatii, nu pe presupunere."
  - "RLS pe politici_reducere are O SINGURA politica (Bypass_Super_Admin) — ADMIN_CLUB nu are acces deloc, nu doar acces limitat de club. NU s-a extins RLS in acest plan (tabel preexistent, decizie business separata) — flagat explicit ca blocker functional pentru planul 30-05."

patterns-established: []

requirements-completed: [ABX-05]

duration: ~30min
completed: 2026-09-20
---

# Phase 30 Plan 04: Fundatie loialitate automata (schema reala + calcul pur)

**Schema live verificata inainte de orice cod (Task 1 obligatoriu) a demontat presupunerile planului; migratie adaptata la realitate + calcul pur `numaraReinnoiriConsecutive`/`calculeazaBonusLoialitate`, gata pentru planul 30-05 — dar RLS pe `politici_reducere` blocheaza azi orice citire non-SUPER_ADMIN**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Task 1 (obligatoriu, read-only): schema live completa a `politici_reducere`/`aplicare_reduceri`/`reduceri` documentata, raspunsuri Q1-Q4 stabilite cu dovezi
- Migratie `loialitate_politici_reducere` aplicata live: 2 coloane pe `politici_reducere` (CHECK verificat), 1 coloana + index unic pe `aplicare_reduceri`
- `types.ts`: `PoliticaReducere` cu campurile REALE (nu presupuse), comentariu explicit de diferentiere fata de `Reducere`
- `utils/loialitateReinnoiri.ts`: 2 functii pure, 7/7 teste trec (`npx tsx utils/loialitateReinnoiri.test.ts`)
- `services/loialitateService.ts`: `getPoliticiLoialitate()`, pattern `{ data, error }`

## Schema live — raspunsuri Task 1 (2026-09-20)

### Q1: `politici_reducere` exista?
DA. Coloane reale: `id (uuid)`, `club_id (uuid, nullable)`, `nume_reducere (text)`, `procentaj (INTEGER, nu NUMERIC(5,2) cum presupunea planul)`, `valoare_fixa (numeric, default 0)`, `activ (boolean, default true)`. Corespunde in mare cu presupunerea, cu exceptia tipului lui `procentaj`.

### Q2: `aplicare_reduceri` exista si cum se leaga de o entitate?
DA, dar structura e DIFERITA de presupunere: `id`, `obligatie_id (FK -> obligatii_plata.id)`, `reducere_id (FK -> reduceri.id, NU politici_reducere!)`, `valoare_calculata (numeric)`, `created_at`. **Fara `sportiv_id`, fara `plata_id`, fara `(luna, an)`** — legatura catre o factura individuala nu exista, doar catre o "obligatie" agregata. Migratia adauga `plata_id` (nullable, FK -> plati) exact pentru asta.

### Q3: `plati.reducere_id` are FK catre `reduceri` sau `politici_reducere`?
**NICIUNA.** Coloana `plati.reducere_id (uuid)` exista dar NU are nicio constrangere FOREIGN KEY definita in DB — e o coloana "libera". Conform regulii din obiectivul planului, bonusul de loialitate NU va popula `plati.reducere_id`; planul 30-05 va folosi doar `plati.suma_initiala` + `plati.reducereDetalii`.

### Q4: RLS activ, ce politici?
Ambele tabele au `relrowsecurity = true`.
- `politici_reducere`: **O SINGURA politica**, `Bypass_Super_Admin` — `EXISTS (... rol_denumire = 'SUPER_ADMIN_FEDERATIE')`. **Nu exista nicio politica pentru ADMIN_CLUB sau alt rol** — implicit, RLS blocheaza TOT pentru oricine altcineva decat federatia. Nu foloseste `has_access_to_club(club_id)`.
- `aplicare_reduceri`: politica `club_member_access` — `is_super_admin() OR obligatie_club_id(obligatie_id) = get_active_club_id()`.

**Consecinta critica pentru planul 30-05**, documentata explicit: daca `handleGenerateSubscriptions` (owner `PlatiScadente.tsx`) ruleaza in contextul unui ADMIN_CLUB (nu SUPER_ADMIN_FEDERATIE), `getPoliticiLoialitate()` va returna `{ data: [], error: null }` — nu o eroare, ci o lista goala, din cauza RLS. Bonusul de loialitate va parea "dezactivat" pentru orice club, chiar daca exista politici configurate. **Nu s-a extins RLS in acest plan** (tabelul e preexistent, deschis inainte de faza 30; extinderea RLS e o decizie de business separata, in afara scope-ului declarat al planului 30-04) — flagat aici ca blocker functional cunoscut pentru 30-05.

## Coloane folosite in `aplicare_reduceri` pentru planul 30-05

`plata_id` (nou adaugat) — planul 30-05 va scrie `INSERT INTO aplicare_reduceri (politica_id, plata_id, valoare_calculata) VALUES (...)`. **Notă:** coloana reala pentru FK catre politica e `reducere_id`, dar aceasta pointeaza spre `reduceri`, NU spre `politici_reducere` — planul 30-05 trebuie sa decida daca reutilizeaza `reducere_id` (semantic incorect, dar coloana existenta) sau adauga o coloana noua `politica_id` in migratia proprie. Nu s-a decis aici, deliberat — decizie pentru 30-05.

## Files Created/Modified
- `supabase/migrations/20260918d_loialitate_politici_reducere.sql` — coloane noi pe tabele preexistente
- `types.ts` — `interface PoliticaReducere`
- `utils/loialitateReinnoiri.ts` — `numaraReinnoiriConsecutive()`, `calculeazaBonusLoialitate()`
- `utils/loialitateReinnoiri.test.ts` — 7 teste (identic cu acceptance criteria)
- `services/loialitateService.ts` — `getPoliticiLoialitate()`

## Decisions Made
- Nu s-a recreat `politici_reducere`/`aplicare_reduceri` (existau deja) — doar extindere aditiva, conform regulii explicite din plan.
- `PoliticaReducere.procentaj` tipat ca `number | null` in TS chiar daca DB il are `INTEGER` (nu `NUMERIC`) — TS nu distinge, comportamentul JS e identic.
- Nu s-a atins politica RLS `Bypass_Super_Admin` — extinderea ei (ex. adaugare `has_access_to_club(club_id)`) e o decizie de business/securitate separata, nu implicita acestui plan de fundatie.

## Deviations from Plan

### Auto-fixed Issues

**1. [Executie] Plan rulat inline in orchestrator, nu prin subagent**
- Identic cu 30-01/02/03.

---

**Total deviations:** 1 (limitare de infrastructura, identica cu planurile anterioare)
**Impact on plan:** Zero impact asupra continutului — Task 1 a schimbat CE se scrie in migratie (adaptare la schema reala, exact cum cerea planul), nu CUM a fost executat planul.

## Issues Encountered
Niciuna in plus fata de descoperirile documentate mai sus (schema reala diferita de presupunere — tratata ca parte normala a Task 1, nu ca problema).

## User Setup Required
None. **Dar:** planul 30-05 nu poate livra bonus real de loialitate functional pentru ADMIN_CLUB pana cand RLS pe `politici_reducere` nu e extins dincolo de `Bypass_Super_Admin` — decizie de business, in afara scope-ului acestui plan.

## Next Phase Readiness
- `PoliticaReducere`, `numaraReinnoiriConsecutive()`, `calculeazaBonusLoialitate()`, `getPoliticiLoialitate()` sunt gata de consumat de planul 30-05.
- **Blocker cunoscut pentru 30-05:** RLS `politici_reducere` (doar SUPER_ADMIN) + decizia nerezolvata despre ce coloana FK foloseste `aplicare_reduceri` pentru politica (vezi sectiunea de mai sus).

---
*Phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament*
*Completed: 2026-09-20*
