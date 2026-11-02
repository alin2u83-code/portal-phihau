---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 06
subsystem: ui
tags: [dashboard, tokens, federation, react]
requires: [34-01]
provides:
  - "FederationDashboard (desktop + mobil) si AdminDashboard pe tokeni --t-*, acelasi limbaj ca dashboard-ul din 34-05"
affects: [components/ui.tsx]
tech-stack:
  added: []
  patterns: ["Card/StatCard/Skeleton/AccordionItem/Button din ui.tsx", "culoare doar semantica (status-danger la taxe restante > 0)"]
key-files:
  created: []
  modified:
    - components/FederationDashboard.tsx
    - components/FederationDashboardMobile.tsx
    - components/AdminDashboard.tsx
    - components/ui.tsx
key-decisions:
  - "AdminDashboard pastreaza doar 4 StatCard; cele 3 acordeoane de navigare eliminate (duplicau meniul)"
requirements-completed: [UI-07]
metrics:
  tasks: 2
  files: 4
  completed: 2026-11-03
---

# Phase 34 Plan 06: Panouri federatie pe tokeni Summary

Cele trei panouri de federatie (FederationDashboard desktop, varianta mobila, AdminDashboard) folosesc acum Card/StatCard/Skeleton/AccordionItem/Button din ui.tsx si tokeni --t-*; fara h1 mari, fundaluri slate sau culori decorative, cu date si props neschimbate.

## Commits
- 1d88ff3: FederationDashboard desktop pe tokeni (NavCard inlocuit cu doua Button, h2 24/600) + fix Skeleton in ui.tsx
- 69fb300: FederationDashboardMobile (AccordionItem, cautare pe tokeni, Button pe latime completa) + AdminDashboard (4 StatCard, fara acordeoane)

## Deviations from Plan
- [Rule 1 - Bug] `Skeleton` din `components/ui.tsx` nu avea spatiu intre `rounded-lg` si `className` (`rounded-lgh-8`), deci clasele `h-*` se pierdeau. Adaugat spatiul (o singura linie). Afecteaza toate folosirile Skeleton (corect acum). Commit 1d88ff3.
- Carduri cu antet/tabel: `!p-0` pe Card pentru a anula padding-ul implicit p-4 (altfel antetul si tabelul ramaneau cu margine dubla).
- Pastrate: efectul de redirect si `isFederationAdmin` in AdminDashboard (3 aparitii), query-urile de count, calculele din FederationDashboard.

## Verification
- `npx tsc --noEmit`: 0 erori. `npm run build`: OK.
- Grep-urile din plan (culori hardcodate, font-bold/medium, text-white, uppercase, actionGroups, NavCard, animate-pulse): 0 potriviri in cele 3 fisiere.
- NU verificat in browser (preview 1280x800 si 390x844, teme Lavender Light / QwanKiDo Blue, cont SUPER_ADMIN): ramane de facut manual.

## Known Stubs
None.

## Threat Flags
None (doar aspect; fara query-uri noi; guard-ul isFederationAdmin neatins).

## Self-Check: PASSED
Fisierele modificate exista; commit-urile 1d88ff3 si 69fb300 exista.
