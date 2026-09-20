---
phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament
plan: 03
subsystem: database
tags: [postgres, plpgsql, sms, react, typescript]

requires:
  - phase: 30-01
    provides: "add_sms_to_queue_intern() si schedule_training_reminders() cu filtre capitalizate"
provides:
  - "sms_config.praguri_expirare_zile + memento_expirare_activ — praguri configurabile per club"
  - "schedule_training_reminders() rescris pe model de luna calendaristica (nu 30 zile aproximate)"
  - "card UI in SMSConfigurare.tsx pentru configurare praguri + comutator"
affects: [30-06]

tech-stack:
  added: []
  patterns: ["deduplicare pe cheie compusa (prag, data_expirare) in metadata JSONB, in loc de fereastra de timp fixa"]

key-files:
  created: [supabase/migrations/20260918c_praguri_memento_expirare.sql]
  modified: [components/SMS/SMSConfigurare.tsx]

key-decisions:
  - "Executat inline (nu prin subagent gsd-executor) — acelasi motiv ca 30-01/30-02"
  - "Switch din ui.tsx nu suporta prop disabled nativ — cele 5 comutatoare de prag sunt dezactivate vizual/functional printr-un wrapper div cu opacity-40 pointer-events-none cand memento_expirare_activ e false, nu prin prop pe componenta"

patterns-established: []

requirements-completed: [ABX-02]

duration: ~35min
completed: 2026-09-20
---

# Phase 30 Plan 03: Praguri configurabile memento expirare abonament

**sms_config capata praguri_expirare_zile (subset din -7/-3/0/3/7) + memento_expirare_activ; schedule_training_reminders() foloseste ultima luna calendaristica achitata in loc de aproximarea "plata + 30 zile"**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Migratie `praguri_memento_expirare` aplicata live: 2 coloane noi + CHECK `<@ ARRAY[-7,-3,0,3,7]`, verificat cu insert-uri temporare (valoare interzisa blocata, valoare permisa acceptata, fara urme ramase)
- `schedule_training_reminders()` rescris: bucla de expirare foloseste CTE `ultima_acoperire` (ultima zi a lunii celei mai recente facturi Abonament/Achitat) + `CROSS JOIN LATERAL unnest(c.praguri_expirare_zile)`
- Simulare pe date reale: aritmetica pragurilor confirmata pe 3 zile din urmatoarele 11 (populatie identificata la fiecare prag), toate `data_expirare` cad pe ultima zi de luna (28/30/31)
- Deduplicare verificata cu test izolat (insert simulat + predicat `NOT EXISTS` identic cu cel din migratie) — confirmat ca blocheaza corect un duplicat pe `(sportiv_id, prag, data_expirare)`
- Card "Memento expirare abonament" in `SMSConfigurare.tsx`, verificat cu roundtrip real DB (praguri partiale + comutator oprit, persistat si sters la final)

## Files Created/Modified
- `supabase/migrations/20260918c_praguri_memento_expirare.sql` — coloane + CHECK + rescrierea functiei
- `components/SMS/SMSConfigurare.tsx` — `interface SmsConfig` extinsa, `defaultConfig()`, `fetchConfig()` (plus verificare sablon activ), `handleSave()` payload, card nou, `handleTogglePrag()`

## Descoperire colaterala importanta (consistenta cu 30-01)

**`sms_config` este complet gol** — 0 randuri, pentru orice club, la fel ca `sms_templates` (raportat in 30-01-SUMMARY.md). Consecinta: simularea Task 2 (populatie pe zile, folosind `CROSS JOIN` direct pe CTE-ul de populatie, fara filtrul `sms_config`) a aratat populatie reala (4 sportivi pe fiecare din 3 zile testate), dar rularea EFECTIVA a `schedule_training_reminders()` a produs 0 randuri in `sms_queue`, pentru ca `JOIN public.sms_config c ON c.club_id = ua.club_id` elimina tot — niciun club nu are inca un rand `sms_config`. Testul de idempotenta (`dupa_prima = dupa_a_doua = 0`) e valid dar vacuu; deduplicarea reala a fost dovedita separat, cu un test izolat pe un rand simulat in `sms_queue` (inserat si sters, fara urme).

**Implicatie business:** mecanismul e complet corect si testat, dar mut pana cand fiecare club are un rand `sms_config` (creat automat de `handleSave()` din UI la prima salvare, prin upsert `onConflict: 'club_id'`) — nu e un blocker al acestui plan, doar o confirmare a lantului "configurare lipsa" deja semnalat in 30-01.

## Decisions Made
- Cardul de configurare a fost adaugat in acelasi ecran (`SMSConfigurare.tsx`), nu intr-un tab separat, conform interfetei planului — apartine aceluiasi rand `sms_config`.
- `handleTogglePrag` sorteaza array-ul crescator la fiecare toggle, pentru stabilitate in DB.

## Deviations from Plan

### Auto-fixed Issues

**1. [Executie] Plan rulat inline in orchestrator, nu prin subagent**
- Identic cu 30-01/30-02.

**2. [Rule — Missing Detail] Switch fara prop `disabled` nativ**
- **Found during:** Task 3
- **Issue:** planul cerea comutatoarele de prag "dezactivate" (`disabled`) cand comutatorul principal e oprit, dar `components/ui.tsx` → `Switch` nu are un prop `disabled` in semnatura.
- **Fix:** wrapper `<div>` cu `opacity-40 pointer-events-none` in jurul celor 5 switch-uri, condiționat de `config.memento_expirare_activ` — efect vizual si functional identic (nu se pot apasa, arata inactiv), fara sa modific componenta `ui.tsx` (design system intern, schimbare cu impact mai larg).
- **Files modified:** components/SMS/SMSConfigurare.tsx
- **Verificare:** lint curat, comportament confirmat prin citirea codului (clasa CSS se aplica condiționat corect).

---

**Total deviations:** 2 (1 infrastructura identica cu planurile anterioare, 1 adaptare mica de UI fara impact functional)
**Impact on plan:** Zero impact asupra continutului livrat.

## Issues Encountered
- Primul test de deduplicare a esuat fals-negativ pentru ca `LIMIT 1` pe `cluburi` a nimerit un club fara niciun sportiv (`v_sportiv` NULL, `NULL = NULL` e `false` in SQL) — nu o eroare de migratie, ci o eroare de test. Corectat selectand direct din `sportivi` (garantat non-null), test repetat cu succes.

## User Setup Required
None. **Dar** (vezi Descoperire colaterala): fara cel putin un rand `sms_config` per club (creat automat la prima salvare din UI) si un sablon `sms_templates` activ (semnalat deja in 30-01), memento-urile de expirare raman mute.

## Next Phase Readiness
- Planul 30-06 (activare procesare coada) poate porni in siguranta — inca nu exista niciun consumator, deci nimic nu s-a trimis real, indiferent de configurare.
- Verificarea vizuala manuala din browser (human-check din PLAN.md: SMS → Configurare, debifare praguri, oprire comutator) **NU a fost efectuata** in aceasta rulare — verificarea automata (lint, grep, roundtrip DB direct, test izolat de deduplicare) confirma mecanismul corect, dar randarea vizuala ramane neverificata.

---
*Phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament*
*Completed: 2026-09-20*
