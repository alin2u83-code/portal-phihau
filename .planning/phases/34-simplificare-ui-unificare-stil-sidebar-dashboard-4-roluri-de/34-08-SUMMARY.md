---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 08
subsystem: ui
tags: [widgets, sportiv, tokens, react]
requires: [34-01]
provides:
  - "EvenimenteWidget, HistoryModal, FamilieWidget pe Card/Badge/Button din ui.tsx si tokeni --t-*"
affects: [components/EvenimenteWidget.tsx, components/SportivDashboard]
tech-stack:
  added: []
  patterns: ["Card/Badge din ui.tsx", "tokeni --t-*", "un Badge per rand"]
key-files:
  created: []
  modified:
    - components/EvenimenteWidget.tsx
    - components/SportivDashboard/HistoryModal.tsx
    - components/SportivDashboard/FamilieWidget.tsx
key-decisions:
  - "Tipul evenimentului in EvenimenteWidget devine text muted ('· Stagiu'), pentru ca Badge-ul de pe rand ramane 'Inscris'"
  - "FamilieWidget: 'Tu' devine text '(tu)', 'Reprezentant' ramane singurul Badge pe randul de membru (GradBadge ramas neatins)"
requirements-completed: [UI-08]
metrics:
  tasks: 2
  files: 3
  completed: 2026-11-03
---

# Phase 34 Plan 08: Widgeturi dashboard sportiv Summary

EvenimenteWidget, HistoryModal si FamilieWidget folosesc doar Card/Badge/Button si tokeni --t-*, fara slate/violet/rose/emerald/sky, font-bold/black, text-[10px], uppercase sau gradient; props, efecte, interogari si handler-e neschimbate.

## Commits
- b1c198e: EvenimenteWidget + HistoryModal (status prezenta ca Badge green/red/slate; buton Inscrie-te secondary xs)
- b137477: FamilieWidget (butoane violet fortate eliminate -> primary/secondary din ui.tsx; stari plati pe `--t-status-danger/success`, nu pe fundal de rand)

## Deviations from Plan
- Pe langa lista de culori din verificare am eliminat si `violet-*` (folosit masiv in FamilieWidget, nepermis de D-01), plus `text-white`/`active:scale`.
- HistoryModal: Absent=red, orice alt status=slate (inainte orice non-prezent era rosu), conform planului.

## Verification
- `npx tsc --noEmit`: 0 erori. `npm run build`: OK.
- Grep-urile din plan: 0 potriviri in cele 3 fisiere. `git diff` pe FamilieWidget: nicio linie cu `supabase.`/`await`/`useState`/`useEffect`/`handle` modificata.
- NU verificat in browser (1280x800 / 390x844, Lavender Light / QwanKiDo Blue); modalele FamilieWidget (detalii frate, upgrade abonament) netestate vizual.
- Nerulat: code-review separat pe diff.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Cele 3 fisiere exista; commit-urile b1c198e, b137477 exista.
