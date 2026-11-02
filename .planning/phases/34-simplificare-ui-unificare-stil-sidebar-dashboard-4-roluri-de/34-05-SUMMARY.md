---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 05
subsystem: ui
tags: [dashboard, tokens, react, staff-roles]
requires: [34-01, 34-02, 34-04]
provides:
  - "Dashboard unificat SUPER_ADMIN/ADMIN_CLUB/INSTRUCTOR (AdminMasterMap)"
  - "DeRezolvatCard cu prop probleme (calea federatie)"
  - "QuickAccess = rand Recente"
affects: [components/AppRouter.tsx]
tech-stack:
  added: []
  patterns: ["tokeni --t-* in loc de culori hardcodate", "dashboard pe rol (federatie/club/instructor)"]
key-files:
  created: []
  modified:
    - components/DeRezolvatCard.tsx
    - components/NewsfeedWidget.tsx
    - components/QuickAccess.tsx
    - components/AdminMasterMap.tsx
    - components/AppRouter.tsx
key-decisions:
  - "AdminMasterMap foloseste useData() (context) in loc de useDataProvider(), care re-instantia toate query-urile"
  - "Cereri de inscriere noi numarate doar pentru federatie, count head, eroare = 0"
requirements-completed: [UI-07]
metrics:
  tasks: 2
  files: 5
  completed: 2026-11-03
---

# Phase 34 Plan 05: Dashboard unificat staff Summary

Dashboard scurt pe tokeni pentru federatie/club/instructor: Salut cu data in romana, De rezolvat, 3 KPI pe rol, Acțiuni rapide (un singur primary), Recente, Anunțuri; acordeoanele, cardul emerald "Prezență Rapidă" si ~35 ItemCard au disparut.

## Commits
- dbf5a8f: DeRezolvatCard, NewsfeedWidget, QuickAccess pe tokeni
- e4301d8: AdminMasterMap rescris + ramura dashboard din AppRouter simplificata

## Deviations from Plan
- [Rule 1 - Bug] `gradTintaLaVarsta(..., grade)` primea `grade` optional: adaugat `|| []` pentru ca propsul a devenit optional.
- Baseline `34-TSC-BASELINE.txt` este gol; `tsc --noEmit` raporteaza 0 erori inainte si dupa.
- Pastrate din rute: nicio ruta stearsa (view-urile raman in sidebar/hub/UserMenu).

## Verification
- `npx tsc --noEmit`: 0 erori. `npm run build`: OK.
- Grep de culori hardcodate/acordeoane/ItemCard: 0 potriviri in fisierele atinse.
- NU verificat in browser (Playwright/preview, mobil 390x844, masurare scrollHeight la 1920x1080, teme, fiecare rol): ramane de facut manual.

## Known Stubs
None.

## Threat Flags
None (doar doua count-uri head sub RLS, fara scrieri).

## Self-Check: PASSED
Fisierele modificate exista, commit-urile dbf5a8f si e4301d8 exista.
