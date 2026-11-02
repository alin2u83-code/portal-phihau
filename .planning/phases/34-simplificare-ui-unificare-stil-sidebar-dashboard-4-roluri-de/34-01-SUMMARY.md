---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 01
subsystem: ui
tags: [design-system, tokens, tailwind, ui.tsx]
requires: []
provides:
  - "Card, StatCard, AccordionItem, Badge, Skeleton plate si pe tokeni --t-*"
  - "34-TSC-BASELINE.txt (0 erori tsc inainte de faza)"
  - "34-UI-SPEC.md aprobat, cu deviatiile de implementare"
affects: [34-02, 34-05, 34-13]
tech-stack:
  added: []
  patterns: ["culori de stare doar prin var(--t-status-*)", "StatCard: doar rose/emerald poarta stare, restul neutru"]
key-files:
  created:
    - .planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/34-TSC-BASELINE.txt
  modified:
    - components/ui.tsx
    - .planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/34-UI-SPEC.md
key-decisions:
  - "Card pastreaza p-4; md:p-6 se paseaza local pe dashboard (22 utilizari p-0 ar fi sparte)"
  - "Props StatCard neschimbate; accentColor nu mai are default 'amber' (lipsa = neutru)"
metrics:
  tasks: 2
  files: 3
  completed: 2026-11-02
---

# Phase 34 Plan 01: Tokeni plati in ui.tsx Summary

Card, StatCard, AccordionItem, Badge si Skeleton din `components/ui.tsx` sunt acum plate (fara gradient/umbra/scale/uppercase), exclusiv pe variabile `--t-*`, cu API (props) neschimbat.

## Commits
- 6ca6668: feat(34-01) ui.tsx tokeni plati + baseline tsc
- 4eb0d56: docs(34-01) UI-SPEC aprobat, FLAG-uri inchise, 9 deviatii documentate

## Ce s-a facut
- Baseline `npx tsc --noEmit` salvat inainte de editari: 0 erori (fisier gol).
- Card: `shadow-none`, fara `backdrop-blur-sm`, `p-4` neschimbat.
- StatCard: markup colapsat; rose -> `--t-status-danger`, emerald -> `--t-status-success`, restul `--t-text`; iconita 20px `--t-primary`; clickabil are role=button, tabIndex, Enter/Space, focus ring.
- AccordionItem: titlu 14/600 fara uppercase, iconita muted, `aria-expanded`, focus ring, corp `--t-surface`.
- Badge: `text-xs font-semibold`, slate pe tokeni. Skeleton: `--t-border`, `motion-reduce:animate-none`.
- UI-SPEC: "Rezolvă problema", justificari 12/36/40px, sectiune "Deviații de implementare", decizii deschise rezolvate, status approved.

## Deviations from Plan
- Vizual: StatCard fara `accentColor` primea inainte default `amber`; acum e neutru (conform planului: "orice alt accentColor = neutru"). Fara alta deviatie.

## Verificare
- `npx tsc --noEmit`: 0 erori (incl. cei 3 consumatori StatCard).
- `npm run build`: OK.
- Grep pe Card/StatCard/AccordionItem pentru backdrop-blur/gradient/scale/shadow-lg/xl/amber-/slate-9/font-black/uppercase: 0 potriviri.
- Verificarea in browser (preview build, 2 teme, 2 latimi) NU a fost rulata in acest plan; ramane pentru poarta vizuala (34-13).

## Known Stubs
None.

## Self-Check: PASSED
