---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 07
subsystem: ui
tags: [dashboard, sportiv, tokens, react]
requires: [34-01]
provides:
  - "Dashboard SPORTIV pe 5 blocuri + acordeon Detalii, un singur CTA primary, fara carduri tintate"
  - "Notificari push relocat in Setari Cont"
affects: [components/SportivDashboard, components/AccountSettings.tsx]
tech-stack:
  added: []
  patterns: ["Card/Badge/Accordion/AccordionItem din ui.tsx", "tab strip de hub (border-b, aria-current)", "tokeni --t-*"]
key-files:
  created: []
  modified:
    - components/SportivDashboard/TrainingActionCard.tsx
    - components/SportivDashboard/VizaMedicalaCard.tsx
    - components/SportivDashboard/index.tsx
    - components/AccountSettings.tsx
key-decisions:
  - "Widgeturile fara loc in UI-SPEC (Prezente, Pasaport, Antrenamente viitoare) merg in acordeon Detalii, nu se sterg"
  - "'Vezi antrenamentul' = buton ghost catre view-ul calendar"
  - "VizaMedicalaCard apare doar cand viza nu e valida (data expirarii nu exista in datele incarcate)"
requirements-completed: [UI-08]
metrics:
  tasks: 3
  files: 4
  completed: 2026-11-03
---

# Phase 34 Plan 07: Dashboard SPORTIV Summary

Dashboard-ul sportiv are ordinea Salut, Antrenament, Plati + Viza, Evenimente + Progres, Familie, apoi acordeon "Detalii" inchis; "Particip" e singurul buton primary, fara gradient/avatar/carduri rose-emerald.

## Commits
- 893315e: TrainingActionCard (Particip primary, Intarzii/Absent secondary, ring pe tokeni, optional "Vezi antrenamentul") si VizaMedicalaCard (export `areVizaValida`, apare doar cand invalida)
- 491b4a8: index.tsx - tab Dashboard restructurat; eliminate header gradient, Status Plati tintat, Notificari Push, Comuta Rol Activ; grafice Recharts pe tokeni
- 0e2ea2f: tab strip de hub + tabul Echipamente curatat de culori/greutati (Badge pentru starea cererii); Notificari push in AccountSettings, carduri AccountSettings pe tokeni (zero zinc)

## Deviations from Plan
- [Rule 3] AccountSettings: pe langa Card/titluri, am inlocuit si `bg-black border-zinc-700` din Input-uri, tile-urile de roluri (zinc/red-600) si badge-ul "Principal" (acum `Badge blue`) deoarece verificarea cere zero `zinc-8/9` in fisier.
- Props `canSwitchRoles/activeRole/onSwitchRole/isSwitchingRole` ramase in interfata, nefolosite in randare (conform planului).
- Cardul Plati: suma restanta = suma `restDePlata` pe facturile Neachitate (cum cere planul); facturile Partial nu intra, ca inainte (`neachitate` neschimbat).

## Verification
- `npx tsc --noEmit`: 0 erori. `npm run build`: OK.
- Grep-urile din plan (culori/greutati interzise, Comuta Rol Activ, NotificationPermissionWidget, gradient, zinc): 0 potriviri.
- NU verificat in browser (1280x800 / 390x844, Lavender Light / QwanKiDo Blue): ordinea blocurilor, lizibilitatea graficelor cu `var(--t-*)` in atribute SVG (Recharts fill/stroke - daca nu se rezolva, se inlocuieste cu valoare getComputedStyle), anuntul de prezenta, Setari Cont. Ramane de facut manual.
- Nerulat: code-review separat pe diff.

## Known Stubs
None.

## Threat Flags
None (fara query-uri noi; guard-urile `isViewingOwnProfile` pastrate pentru TrainingActionCard, "Vezi detalii plati", "Istoric prezente", butoanele Echipamente).

## Self-Check: PASSED
Fisierele modificate exista; commit-urile 893315e, 491b4a8, 0e2ea2f exista.
