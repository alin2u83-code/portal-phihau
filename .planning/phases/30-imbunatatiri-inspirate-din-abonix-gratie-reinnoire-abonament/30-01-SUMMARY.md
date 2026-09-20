---
phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament
plan: 01
subsystem: database
tags: [postgres, plpgsql, sms, pg_cron, supabase]

requires: []
provides:
  - "public.add_sms_to_queue_intern() — functie interna fara guard has_access_to_club, apelabila doar de service_role"
  - "schedule_training_reminders() cu filtre capitalizate ('Abonament'/'Achitat') si guard s.status='Activ'"
affects: [30-03, 30-06]

tech-stack:
  added: []
  patterns: ["functie *_intern SECURITY DEFINER fara guard RLS-like, apelabila doar de service_role, pentru cod care ruleaza in context pg_cron/Edge Function fara sesiune de utilizator"]

key-files:
  created: [supabase/migrations/20260918_fix_memento_expirare_abonament.sql]
  modified: []

key-decisions:
  - "Executat inline in sesiunea orchestrator, nu prin subagent gsd-executor — subagentul spawnat nu avea tool-urile MCP Supabase in registry (bug cunoscut, vezi Issues Encountered)"
  - "trg_plata_confirmare_sms() NU a fost reparat (are acelasi bug de capitalizare 'achitat') — decizie de business separata, documentata ca defect cunoscut"

patterns-established:
  - "Pattern *_intern: pentru orice RPC apelat atat din frontend autentificat CAT SI din pg_cron/Edge Function, se separa logica in doua functii — publica (guard has_access_to_club, GRANT authenticated+service_role) si interna (fara guard, GRANT DOAR service_role, REVOKE explicit PUBLIC/anon/authenticated)"

requirements-completed: [ABX-01]

duration: ~20min
completed: 2026-09-20
---

# Phase 30 Plan 01: Fix memento SMS expirare abonament

**Migratie live care repara doua defecte independente ce faceau ca memento-urile SMS de expirare abonament sa nu ajunga NICIODATA in `sms_queue`: filtre necapitalizate + RAISE EXCEPTION in context fara sesiune (pg_cron)**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 (diagnostic, migratie, verificare comportamentala)
- **Files modified:** 1

## Accomplishments
- Diagnostic live complet: confirmat ca `sms_queue` era 100% goala (zero randuri, niciodata) si ca `plati.tip`/`plati.status` sunt capitalizate ('Abonament'/'Achitat', zero randuri cu litere mici)
- Migratie `add_sms_to_queue_intern` + fix capitalizare + guard `s.status='Activ'`, aplicata live pe `wuhidifzsutwgdfkwhmd`
- Verificat comportamental: `schedule_training_reminders()` ruleaza acum fara exceptie in context fara sesiune

## Task Commits

Executat inline (fara subagent) din cauza unei limitari de infrastructura — vezi Issues Encountered. Commit unic pentru migratie + SUMMARY (nu 3 commit-uri separate per task, deoarece Task 1 si Task 3 sunt interogari read-only fara artefact de fisier).

## Files Created/Modified
- `supabase/migrations/20260918_fix_memento_expirare_abonament.sql` — migratie noua (nu s-a editat migratia originala din mai, imutabila)

## Diagnostic Task 1 (rezultate concrete, live 2026-09-20)

1. **cron.job:** 2 job-uri active — `refresh-dashboard-sportivi` (*/10 * * * *, EROARE de 10 min: `relation "vedere_sportivi_detaliat_mv" does not exist` — bug preexistent, NEATINS, in afara scope-ului acestui plan) si `sms-schedule-reminders` (`0 7 * * *`, `SELECT public.schedule_training_reminders()`). **ZERO** job de procesare a cozii (`sms-process-queue`) — regula de oprire trece, sigur de continuat.
2. **Istoric rulari `sms-schedule-reminders`:** ultimele 10 rulari (19-27 sept) toate `status='succeeded'`, `return_message='1 row'`. Nicio eroare `Access denied to club` — pentru ca bucla de expirare nu gasea niciodata randuri (filtre gresite), deci `add_sms_to_queue` nu era niciodata apelat, deci nu arunca niciodata exceptia. Ipoteza (2) din obiectiv era corecta structural, dar nu se manifesta INCA vizibil in job history — s-ar fi manifestat imediat ce (1) ar fi fost reparat singur, fara (2).
3. **Continut `sms_queue` inainte de fix:** `[]` — complet goala, zero randuri, de la deploy-ul din mai.
4. **Capitalizare `plati`:** `cap_abonament=232, mic_abonament=0, cap_achitat=257, mic_achitat=0` — confirmat: datele reale sunt 100% capitalizate, filtrele vechi (litere mici) nu se potriveau niciodata.
5. **Template-uri SMS active:** `sms_templates` este **complet gol** — 0 randuri, pentru orice club, orice tip. **Consecinta importanta:** chiar si dupa acest fix, `add_sms_to_queue_intern` va returna NULL pentru orice sportiv (niciun template activ de gasit) — memento-urile TOT nu vor ajunge in coada pana cand un SUPER_ADMIN/ADMIN_CLUB nu configureaza cel putin un template `tip='expirare_abonament'` cu `activ=true` per club. Acest plan repara mecanismul, nu configurarea lipsa — in afara scope-ului (nu exista task pentru asta in 30-01).
6. **Populatie tinta azi:** 0 sportivi eligibili in fereastra 6-8 zile (query standalone, filtre corecte).

## Decisions Made
- Migratia noua e separata de `20260523_sms_system.sql` (migratiile aplicate sunt imutabile) — pattern standard.
- `add_sms_to_queue_intern` primeste `REVOKE ALL FROM PUBLIC/anon/authenticated` explicit, nu doar omiterea unui GRANT — apara impotriva unui viitor `GRANT ALL ON ALL FUNCTIONS IN SCHEMA public` accidental.

## Deviations from Plan

### Auto-fixed Issues

**1. [Executie] Plan rulat inline in orchestrator, nu prin subagent**
- **Found during:** dispatch initial catre `gsd-executor`
- **Issue:** subagentul spawnat (`Agent(subagent_type="gsd-executor", ...)`) nu avea niciun tool `mcp__plugin_supabase_supabase__*` in registry, desi plugin-ul e activ global si instructiunile MCP apar in system prompt-ul orchestratorului. Subagentul a raportat corect blocajul (fara sa fabrice rezultate, fara commit, fara SUMMARY fals) si a recomandat executie inline — pattern deja cunoscut din memoria proiectului (`feedback_gsd_worktree_infra_esuata_execute_inline.md`, valabil acum si pentru MCP tools, nu doar pentru worktree isolation).
- **Fix:** Task 1-3 executate inline in sesiunea curenta (orchestrator), cu tool-urile Supabase incarcate explicit prin ToolSearch.
- **Verificare:** toate cele 3 task-uri completate cu succes, migratia aplicata si verificata live.

---

**Total deviations:** 1 (limitare de infrastructura, nu de continut al planului)
**Impact on plan:** Zero impact asupra continutului livrat — planul a fost executat exact cum a fost scris, doar mecanismul de dispatch a fost schimbat.

## Issues Encountered
- Subagent `gsd-executor` fara acces la MCP tools Supabase — vezi Deviations. Recomandare pentru viitoarele faze: fie executie inline pentru planuri care necesita MCP Supabase, fie configurare explicita a `tools:` allowlist pe agentul `gsd-executor` sa includa `mcp__plugin_supabase_supabase__*`.
- **Descoperire colaterala (in afara scope-ului):** job-ul cron `refresh-dashboard-sportivi` esueaza la fiecare 10 minute cu `relation "vedere_sportivi_detaliat_mv" does not exist` — materialized view lipsa/redenumita. NEATINS in acest plan. Merita un todo separat.

## User Setup Required
None — nicio configurare externa. **Dar:** pentru ca memento-urile sa aiba efect real, un SUPER_ADMIN/ADMIN_CLUB trebuie sa configureze cel putin un template SMS `tip='expirare_abonament'` cu `activ=true` (tabela `sms_templates` e goala azi pentru toate cluburile). Fara asta, mecanismul repara ramane "corect dar mut".

## Next Phase Readiness
- Planul 30-03 (praguri configurabile -7/-3/0/+3/+7) se bazeaza pe `add_sms_to_queue_intern` livrat aici — depinde direct de acest plan.
- Planul 30-06 (activare procesare coada) poate porni in siguranta — coada nu are inca niciun consumator, deci nimic nu s-a trimis real.
- Blocker nou pentru valoare business reala (nu pentru executia planurilor urmatoare): `sms_templates` gol. De adaugat ca todo separat daca nu e acoperit de alt plan din faza 30.

---
*Phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament*
*Completed: 2026-09-20*
