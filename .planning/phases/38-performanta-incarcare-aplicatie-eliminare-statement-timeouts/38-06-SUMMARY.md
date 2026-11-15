---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 06
subsystem: frontend-loading
tags: [attendance-window, on-demand, d-03]

requires: [38-04]
provides:
  - cele 6 ecrane care au nevoie de prezenta/antrenamente in afara ferestrei azi-90..azi+30 cer 'antrenamenteIstoricComplet'
affects: [38-07]

key-files:
  modified:
    - components/Prezenta/RaportIntervalExamen.tsx
    - components/Prezenta/RaportLunarPrezenta.tsx
    - components/Prezenta/RaportPrezenta.tsx
    - components/Activitati.tsx
    - components/CalendarView.tsx
    - components/Grupe/ProgramAntrenamenteManagement.tsx

key-decisions:
  - "Activitati: previzualizarea (unde se verifica conflictele) este si ea blocata, nu doar generarea/salvarea, pentru ca acolo se calculeaza isConflict"
  - "ProgramAntrenamenteManagement nu are verificare de conflicte, deci nu s-a adaugat guard pe handleSave (editeaza un singur rand)"

requirements-completed: [D-03]
completed: 2026-11-16
---

# Phase 38 Plan 06: Ecrane cu istoric complet de prezenta Summary

**Trei rapoarte, Activitati, CalendarView si ProgramAntrenamenteManagement apeleaza `useDateLaCerere(['antrenamenteIstoricComplet'])`; rapoartele arata linia "Se incarca istoricul complet de prezenta...", iar generatorul de antrenamente nu poate crea duplicate cat istoricul nu a sosit.**

## Task Commits

1. Task 1 (rapoarte) - `01408074`
2. Task 2 (Activitati, CalendarView, ProgramAntrenamenteManagement) - `2512013c`

## Implementat

- Cele 3 rapoarte: hook sus in componenta (inainte de orice return), linie de incarcare deasupra continutului; logica si dependentele memo neschimbate.
- Activitati: butoanele "Previzualizeaza", "Confirma Generarea" si salvarea editarii sunt `disabled` cu `title` "Se incarca programul complet..."; handlePreview, handleGenerate, handleSaveEdit au guard `showError("Asteapta", ...)` pentru click-uri care cursa cu randarea.
- ProgramAntrenamenteManagement: `loading` global inlocuit cu `attendanceLoading || seIncarca` pentru lista (inainte arata "Nu am gasit antrenamente" cat timp prezenta se incarca).
- CalendarView: doar cererea (fara gating).

## Verificare

- `npx tsc --noEmit -p .`: 0 erori (dupa fiecare task).
- `npx tsx utils/incarcareDate.test.ts` si `utils/supabaseHelpers.test.ts`: "Toate testele au trecut".
- grep: fiecare dintre cele 6 fisiere contine exact un apel `useDateLaCerere(['antrenamenteIstoricComplet'])`.
- NU verificat: orice rulare in browser (linia de incarcare, butoane dezactivate, tab-urile Viitor/Arhiva, navigarea calendarului in luni indepartate, incarcarea reala pe SUPER_ADMIN). Fara review separat de cod (diff mic, 6 fisiere).

## Deviations from Plan

None - planul executat ca scris (singura nuanta: previzualizarea din Activitati blocata in plus, vezi key-decisions).

## Known Stubs

Niciunul.

## Threat Flags

Niciunul. T-38-18/19 mitigate (cerere explicita + butoane/handlere blocate + linie de incarcare); T-38-20 acceptat.

## Self-Check: PASSED

Commit-urile 01408074 si 2512013c exista; fisierele modificate sunt cele din files_modified. STATE.md/ROADMAP.md neatinse (le actualizeaza orchestratorul).
