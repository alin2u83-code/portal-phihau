---
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
plan: 12
subsystem: ui
tags: [tokens, grupe, examene, prezenta, simplificare-ui]
requires: [34-01, 34-04, 34-05]
provides:
  - Grupe, Examene, Prezenta fara h1 duplicat, un singur primary, containere pe tokeni --t-*
affects: [components/Grupe/index.tsx, components/GestiuneExamene/index.tsx, components/Prezenta/index.tsx, components/Prezenta/InstructorPrezentaPage.tsx]
key-files:
  modified:
    - components/Grupe/index.tsx
    - components/GestiuneExamene/index.tsx
    - components/Prezenta/index.tsx
    - components/Prezenta/InstructorPrezentaPage.tsx
decisions:
  - "ConfirmModal variant=info din Grupe ramas (variant de modal, nu buton decorativ)"
metrics:
  tasks: 2
  files: 4
  completed: 2026-11-03
---

# Phase 34 Plan 12: Grupe, Examene, Prezenta pe tokeni Summary

Grupe, Examene si Prezenta (plus InstructorPrezentaPage) aduse la regulile de pagina UI-SPEC: fara h1 duplicat (titlul vine din Header), un singur Button primary, filtre inline, containere/carduri pe `--t-*` fara `bg-slate-*`/`indigo`/`amber`. Doar clase si antete; logica neatinsa.

## Commits

- cb676b4: Task 1, Grupe + GestiuneExamene
- 1c382ee: Task 2, Prezenta + InstructorPrezentaPage

## Ce s-a schimbat

- **Grupe:** h1 sters (si din starea de incarcare, unde cardurile `animate-pulse` au devenit `Skeleton`), "Adauga Grupa" primary cu `data-tour="grupe-adauga"` pastrat, filtrul Sezon inline fara fundal propriu, Select `h-11 lg:h-10`.
- **Examene:** h1 sters, "Adauga Sesiune" singurul primary (Import Bulk, Vezi Detalii, Editare -> secondary), blocul de filtre si cardurile de sesiune pe `--t-surface/--t-border/--t-primary`, `font-semibold` in loc de bold/medium.
- **Prezenta:** modalul "Sedinta azi" pe tokeni (inputuri `--t-input-bg`, focus ring `--t-input-focus-ring`, butoane `Button` primary/secondary), comutatorul de vedere neutru, dropdown-ul Adauga pe tokeni cu `Button primary`, pastilele de shortcut pe tokeni.
- **InstructorPrezentaPage:** h1 "Prezenta Zilnica" sters, segmente Ieri/Azi si Rapid/Lista neutre, carduri de antrenament pe tokeni.

## Verificare

- `npx tsc --noEmit`: fara erori in cele 4 fisiere.
- `npm run build`: reuseste.
- grep pe clasele interzise in Prezenta (ambele fisiere): 0 potriviri; diff-ul nu contine `supabase.`/`await`/`useEffect`/`useMemo`.
- **Neverificat:** verificarea in browser (preview, 1280x800 / 390x844, doua teme, modalul "Sedinta azi", ghidurile data-tour) nu a fost rulata in aceasta executie.

## Deviations from Plan

None - plan executed as written (Edit/Grep tool-ul Grep a fost indisponibil, folosit grep prin Bash).

## Known Stubs

None.

## Self-Check: PASSED

Commits cb676b4 si 1c382ee exista; cele 4 fisiere modificate.
