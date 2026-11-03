---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 11
subsystem: ui
tags: [competitii, filtre, tokens, tailwind]
requires: [34-01, 34-04, 34-05]
provides:
  - Lista de competitii pe tokeni (Card-uri neutre, un Badge de status per rand)
  - CompetitieFilterBar rand inline pe tokeni, API si logica AND neschimbate
affects: [components/Competitii/index.tsx, components/Competitii/CompetitieFilterBar.tsx]
key-files:
  modified:
    - components/Competitii/index.tsx
    - components/Competitii/CompetitieFilterBar.tsx
decisions:
  - "Maparea status -> varianta Badge (STATUS_BADGE) definita local in index.tsx; statusLabel.color si tipBadge raman in constants.tsx pentru vederea de detaliu (l.~165)"
  - "Toggle-ul colapsibil al barei de filtre pastrat (comportament), doar panoul a devenit rand inline flex-wrap fara fundal de card"
metrics:
  tasks: 2
  files: 2
  completed: 2026-11-03
---

# Phase 34 Plan 11: Competitii lista si bara de filtre pe tokeni Summary

Lista de competitii fara h2 duplicat, cu "Adauga Competitie" primary, cautare pe tokeni, statistici ca Card-uri neutre si un singur Badge (status) per rand; bara de filtre gen/varsta/grad/proba restilizata inline, fara a atinge hook-ul sau handler-ele.

## Commits

- `0a7f8e1` feat(34-11): lista Competitii pe tokeni, un Badge de status per rand
- `2c9803a` feat(34-11): CompetitieFilterBar rand inline pe tokeni

## Ce s-a facut

**index.tsx:** h2 "Competiții Qwan Ki Do" sters; Button `success` -> `primary` (`min-h-11 lg:min-h-10`, conditia `isAdmin` neatinsa); input de cautare pe `--t-input-bg`/`--t-border`/`--t-input-focus-ring`; statistici ca `Card md:p-6` cu valoare 24/600 si eticheta 12/600 muted (fara chip colorat); card competitie: hover `--t-primary`, h3 16/600, `Badge` de status + tipul ca text muted; h2 din detaliu 16/600; texte "Se incarca" pe `--t-text-muted`. onClick/scroll (`savedScrollRef`, `ssSet`) neatinse.

**CompetitieFilterBar.tsx:** toggle "Filtreaza" si "Reset" prin `Button` (secondary / secondary ghost), contor filtre `Badge variant="blue"`; panou = `flex flex-wrap items-end gap-2` fara fundal; inputuri `--t-input-bg`, h-11 / lg:h-10; etichete 12/600 muted (fara uppercase/tracking/10-11px); gen pills pe tokeni. Props, tipuri, handler-e `onChange`, optiuni si hook-ul `useCompetitieFilters` neschimbate.

## Deviations from Plan

None - plan executat ca scris. Nota de verificare: poarta automata din Task 2 (grep `onChange=\{` in diff <= 3) numara 12 linii deoarece panoul a coborat un nivel de indentare (aceleasi handler-e, doar spatiere); verificat cu `git diff --ignore-space-at-eol` ca handler-ele sunt identice. Scrierea fisierului a schimbat finalurile de linie (avertisment git LF/CRLF), fara efect functional.

## Verificare

- `npx tsc --noEmit`: nicio eroare in `components/Competitii/`.
- `npm run build`: reuseste.
- NU s-a facut verificare in browser (lista cu Card-uri, scroll restaurat, filtre combinate gen+varsta+grad, 1280x800 si 390x844, teme Lavender Light / QwanKiDo Blue) - ramane pentru verificarea umana/end-of-phase.

## Known Stubs

None.

## Self-Check: PASSED

Fisiere modificate existente, commit-urile 0a7f8e1 si 2c9803a prezente.
