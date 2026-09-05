---
phase: 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse
plan: 01
subsystem: database
tags: [postgres, trigger, supabase, grad, istoric_grade]

requires: []
provides:
  - "Trigger canonic unic (trg_sync_grad_actual_canonical) pe public.istoric_grade care deriva sportivi.grad_actual_id ca MAX(grade.ordine), activ pe INSERT/UPDATE/DELETE"
  - "Eliminare completa a celor 4 trigger-e redundante + tr_sync_grad_history (sursa bug-ului de data gresita)"
  - "Prima migratie de trigger a acestui proiect comisa in git (sql/migrations/consolidare_trigger_grad_actual_260906.sql)"
  - "Raport audit D-10: 178 randuri istoric_grade suspecte + 95 sportivi cu grad_actual_id divergent de MAX(ordine)"
affects: [18-02, 18-03, 18-04]

tech-stack:
  added: []
  patterns:
    - "Trigger canonic single-source-of-truth pe istoric_grade, inlocuind 4 trigger-e cu reguli contradictorii (latest-by-date x3 vs ordine-mai-mare x1)"
    - "CREATE noul trigger INAINTE de DROP-urile vechi, intr-un singur apply_migration, ca sa nu existe fereastra fara sincronizare"

key-files:
  created:
    - sql/migrations/consolidare_trigger_grad_actual_260906.sql
    - .planning/phases/18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse/18-AUDIT-DATE-CORUPTE.md
  modified: []

key-decisions:
  - "Migratia a fost executata INLINE de sesiunea orchestrator (nu spawn Agent/gsd-executor) — planul cerea explicit acces mcp__supabase__* pe care subagentii dispatch-uiti in aceasta sesiune (cercetator, planner, plan-checker) NU l-au avut, confirmat direct"
  - "Smoke test-ul original din plan a esuat prima data pe date de test nerealiste: data_inscrierii=CURRENT_DATE facea ca insertul cu data_obtinere=2020-01-01 sa declanseze trigger_ajusteaza_debutant_la_import_examen (D-08, neatins), care backfilleaza automat un rand Debutant — coliziune cu al doilea insert de test (v_low=Debutant). Corectat: data_inscrierii=2015-01-01 (inainte de orice data de test), fara alta modificare la asertii."
  - "Auditul D-10 a confirmat bug-ul real: 178 randuri istoric_grade cu observatii='Schimbare automată grad (Update Profil)' (semnatura exacta a trigger-ului eliminat) si 95 sportivi cu grad_actual_id divergent de MAX(ordine) din istoric — NU corectate automat, raportate in 18-AUDIT-DATE-CORUPTE.md pentru decizie manuala"

requirements-completed: [D-01, D-02, D-05, D-06, D-07, D-08, D-09, D-10]

duration: ~35min
completed: 2026-09-06
---

# Phase 18 Plan 01: Consolidare trigger canonic grad_actual_id Summary

**Migratie DB aplicata live: 4 trigger-e redundante + trigger-ul sursa a bug-ului (`tr_sync_grad_history`) inlocuite cu un singur trigger canonic MAX(ordine); smoke test trece toate cele 3 asertii; audit confirma 178 randuri istoric corupte + 95 sportivi divergenti, pastrate neatinse pentru decizie manuala.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-06T~08:30Z
- **Completed:** 2026-09-06T~09:05Z
- **Tasks:** 2/2 complete
- **Files modified:** 2 (creare)

## Accomplishments
- Migratie versionata scrisa si aplicata live prin `mcp__supabase__apply_migration` — prima data cand un trigger al acestui proiect ajunge intr-un fisier comis in git (precedent: toate trigger-ele traiau exclusiv live pe Supabase)
- Inventar PRE/POST confirma exact eliminarea celor 5 trigger-e tinta si crearea singurului trigger canonic ramas pe `istoric_grade` (plus `trigger_ajusteaza_debutant_la_import`, neatins)
- Smoke test SQL demonstreaza toate cele 3 reguli: MAX(ordine) la INSERT (asertie A), non-retrogradare la grad inferior cu data mai noua (asertie B, D-01), recalcul corect la DELETE (asertie C, D-02); `metoda_selectie_grad` ramane populat cu 'automat'
- Audit D-10 ruleaza si documenteaza scara reala a bug-ului preexistent: 178 randuri istoric corupte, 95 sportivi divergenti — nicio corectie automata, doar raport

## Task Commits

1. **Task 1: Scrie fisierul de migratie versionat** - `892db11` (feat)
2. **Task 2: Aplica migratia live + smoke test + audit D-10** - migratie aplicata prin `mcp__supabase__apply_migration` (fara fisier repo pentru pasul live in sine); raportul de audit e artefactul commis pentru acest task

## Files Created/Modified
- `sql/migrations/consolidare_trigger_grad_actual_260906.sql` - migratie versionata: functia+trigger-ul canonic, DROP pe cele 5 trigger-e vechi
- `.planning/phases/18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse/18-AUDIT-DATE-CORUPTE.md` - raport audit D-10 (178 randuri suspecte, 95 sportivi divergenti, recomandari, SQL de resincronizare NEEXECUTAT)

## Verification Evidence

**Inventar PRE-migratie** (`public.istoric_grade` + `public.sportivi`, trigger-e non-interne):
```
trg_after_history_change -> fn_sync_sportiv_grad_from_history (istoric_grade)
trg_sync_grad_actual_from_istoric -> sync_grad_actual_from_istoric_grade (istoric_grade)
trg_sync_grad_actual_manual -> sync_grad_actual_on_manual_grade (istoric_grade)
trg_sync_grade_on_history_change -> fn_refresh_sportiv_grad (istoric_grade)
trigger_ajusteaza_debutant_la_import -> ajusteaza_debutant_la_import_examen (istoric_grade)
tr_sync_grad_history -> fn_sync_grad_to_history (sportivi)
(+ audit_sportivi, tr_format_data, tr_set_default_grade, tr_sportiv_main_automation pe sportivi, neatinse)
```

**Inventar POST-migratie:**
```
trg_sync_grad_actual_canonical -> sync_grad_actual_canonical (istoric_grade)
trigger_ajusteaza_debutant_la_import -> ajusteaza_debutant_la_import_examen (istoric_grade)
(+ cele 4 trigger-e neatinse pe sportivi, tr_sync_grad_history ABSENT)
```

**Smoke test:** toate cele 3 asertii (A/A2/B/C) au trecut fara `RAISE EXCEPTION`; curatenie confirmata (`SELECT count(*) FROM sportivi WHERE nume='ZZ_TEST_TRIGGER'` = 0).

**Audit D-10:** 178 randuri sectiunea C, 95 sportivi sectiunea D — detaliu complet in `18-AUDIT-DATE-CORUPTE.md`.

## Deviations from Plan

**Structura:** planul original (creat de gsd-planner) avea 3 task-uri; plan-checker a semnalat ca asta ar fi rutat plan-ul spre un subagent worktree fara acces MCP Supabase (confirmat direct in aceasta faza: agentul `gsd-phase-researcher` nu a avut niciun tool `mcp__supabase__*`). Fixat INAINTE de executie: Task 2+3 comasate intr-un singur task (2 total, sub pragul implicit de rutare inline), plus `workflow.use_worktrees: false` in config.json ca aparare suplimentara. Vezi commit `f93c407`.

**Date de test:** vezi `key-decisions` — `data_inscrierii` a testului ajustata de la `CURRENT_DATE` la `2015-01-01` pentru a evita coliziunea cu `trigger_ajusteaza_debutant_la_import_examen` (D-08, neatins). Asertiile A/B/C nu au fost modificate.

## Next Phase Readiness
- 18-02 si 18-03 pot rula (autonome, doar editari TS pe frontend) — trigger-ul canonic e live si testat.
- 18-04 (poarta finala) poate rula dupa 18-02/18-03, folosind acelasi acces MCP inline pentru verificarea end-to-end.
