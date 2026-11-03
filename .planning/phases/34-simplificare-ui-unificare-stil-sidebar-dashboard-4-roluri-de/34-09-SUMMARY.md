---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 09
subsystem: ui
tags: [sportivi, tokens, react, tailwind]
requires: [34-01, 34-04, 34-05]
provides:
  - "Pagina Sportivi (antet, filtre, tabel, lista mobila) pe tokeni --t-*, fara h1 duplicat si cu un singur primary"
affects: [components/Sportivi]
tech-stack:
  added: []
  patterns: ["Badge din ui.tsx pentru status", "tokeni --t-*", "un singur Button primary per ecran"]
key-files:
  created: []
  modified:
    - components/Sportivi/index.tsx
    - components/Sportivi/SportiviFilter.tsx
    - components/Sportivi/SportiviTable.tsx
    - components/Sportivi/SportiviMobileList.tsx
key-decisions:
  - "Statusul Inactiv devine Badge slate (era rosu), Activ = green, conform UI-SPEC"
  - "Butoanele de sortare din SportiviMobileList sunt mereu secondary (starea activa ramane indicata de sageata), ca sa nu existe mai multe primary pe ecran"
  - "Bara de selectie in masa neutra; 'Marcheaza Activ/Inactiv' pierd override-urile verde/rosu si caracterele colorate"
requirements-completed: [UI-09]
metrics:
  tasks: 2
  files: 4
  completed: 2026-11-03
---

# Phase 34 Plan 09: Pagina Sportivi pe tokeni Summary

Antetul Sportivi nu mai repeta h1 "Management Sportivi", are un singur Button primary ("Adauga Sportiv"), iar filtrele, tabelul si lista mobila folosesc tokeni `--t-*` si Badge din ui.tsx; logica, handler-ele si ancorele data-tour/data-tutorial neschimbate.

## Commits
- fab7b9f: antet fara h1, Import/Link-uri Magic/Export secondary, bara de selectie neutra, paginare pe tokeni (index.tsx)
- 91c4f16: SportiviFilter (container inline, inaltime 44/40, tokeni), SportiviTable si SportiviMobileList (Badge status, fara border-l colorat, fara slate/font-bold/text-[10px])

## Verificare
- `tsc --noEmit`: zero erori in cele 4 fisiere; `npm run build` reuseste.
- grep: 0 "Management Sportivi", 0 override-uri verde/rosu, ancorele data-tour (adauga, tabel, tabel-ancora) si data-tutorial="sportivi-filter" prezente.
- NU s-a verificat in browser (preview 1280/390, doua teme, scroll restore, bulk) - de facut manual.

## Deviations from Plan
- [Rule 2] Zona de paginare din index.tsx (page-level, nu modala) a primit si ea inlocuirea slate/font-medium -> tokeni, conform regulii de curatare a regiunii de pagina.
- Botonul "Aplica filtre" din filtrul mobil nu mai e amber, ci secondary pe tokeni (un singur primary pe ecran).
- SportiviMobileList: adaugat Badge de status (informatia era data inainte doar de border-l colorat, eliminat).

## Deferred / Known gaps
- `components/ResponsiveTable.tsx` (partajat, in afara fisierelor planului) inca foloseste `--bg-table-header`, `text-white`, `text-slate-*` si `p-3` pentru antet/celule; tokenii `--t-table-header-bg/-text`, `--t-table-row-hover` pe antetul/randurile tabelului Sportivi nu sunt deci aplicati pana nu se atinge acea componenta (afecteaza si alte pagini - decizie separata).
- Continutul modalelor din index.tsx neatins (in afara scope-ului paginii).

## Self-Check: PASSED
Fisierele modificate exista, commit-urile fab7b9f si 91c4f16 exista in git log.
