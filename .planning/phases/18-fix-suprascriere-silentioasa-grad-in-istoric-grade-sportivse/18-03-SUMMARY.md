---
phase: 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse
plan: 03
subsystem: database
tags: [react, typescript, supabase, grad, istoric_grade, postgres-trigger]

requires:
  - phase: 18-01
    provides: "Trigger canonic trg_sync_grad_actual_canonical pe istoric_grade care deriva sportivi.grad_actual_id ca MAX(grade.ordine), activ pe INSERT/UPDATE/DELETE"
provides:
  - "hooks/useExamManager.ts si components/GestiuneExamene/RapoarteExamen.tsx cu zero scrieri directe pe sportivi.grad_actual_id (D-03, D-04)"
  - "components/GestiuneExamene/ImportExamenModal.tsx cu SELECT+update inversat eliminat (singurul call site care scria pe sportivi INAINTE de upsert-ul in istoric_grade)"
  - "components/UserProfile.tsx cu comentarii corectate: regula reala e MAX(ordine) via trg_sync_grad_actual_canonical, nu data_obtinere DESC"
affects: [18-04, 19]

tech-stack:
  added: []
  patterns:
    - "Scriere unica in istoric_grade + stare optimista locala, fara update ulterior pe sportivi — pattern deja stabilit in services/sportivService.ts si replicat in 18-02, extins acum la toate cele 4 fisiere ramase"

key-files:
  created: []
  modified:
    - hooks/useExamManager.ts
    - components/GestiuneExamene/RapoarteExamen.tsx
    - components/GestiuneExamene/ImportExamenModal.tsx
    - components/UserProfile.tsx

key-decisions:
  - "ImportExamenModal.tsx avea ordinea INVERSATA fata de celelalte 4 call site-uri ale fazei: SELECT sportivi.grad_actual_id+grade(ordine) si update conditionat rulau INAINTE de upsert-ul in istoric_grade, nu dupa. Blocul sters e cel de DEASUPRA upsert-ului (liniile 601-611), nu dedesubt — tratat explicit ca atare, nu copiat mecanic din pattern-ul Task 1."
  - "Upsert-ul in istoric_grade din ImportExamenModal.tsx ramane DO UPDATE (comportament implicit supabase-js pe onConflict fara ignoreDuplicates), spre deosebire de celelalte call site-uri care folosesc ignoreDuplicates: true. NU s-a schimbat aceasta semantica — D-09 cere pastrarea comportamentului de conflict actual in Faza 18. Hand-off explicit catre Faza 19 (\"Elimina ignoreDuplicates silentios pe upsert istoric_grade, 8 locuri\")."
  - "In useExamManager.ts si RapoarteExamen.tsx garda pe ordine (targetOrdine > currentOrdine) a fost pastrata dupa eliminarea update-ului DB — guverneaza acum DOAR appliedGradeBySportiv.set / sportiviGradMap.set (starea locala optimista de UI), nu mai are niciun efect asupra DB."

requirements-completed: [D-03, D-04, D-09]

duration: ~20min
completed: 2026-09-06
---

# Phase 18 Plan 03: Elimina ultimele scrieri directe grad_actual_id (useExamManager, RapoarteExamen, ImportExamenModal) + comentarii UserProfile Summary

**Cele ultime 3 call site-uri de scriere directa pe `sportivi.grad_actual_id` (finalizare examen din hook, finalizare din raport, import CSV) au fost eliminate, cu tratament separat explicit pentru ordinea inversata din `ImportExamenModal.tsx`; comentariile invechite din `UserProfile.tsx` au fost corectate sa descrie regula reala MAX(ordine) via trigger-ul canonic.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-06T22:30:00Z
- **Completed:** 2026-09-06T22:42:37Z
- **Tasks:** 3/3 complete
- **Files modified:** 4

## Accomplishments
- `hooks/useExamManager.ts`: eliminat `supabase.from('sportivi').update({ grad_actual_id })` din bucla de finalizare examen; `appliedGradeBySportiv.set(...)` pastrat neschimbat pentru starea locala optimista; comentariul care numea trigger-ul inexistent `sync_grad_actual_on_exam_result` inlocuit cu explicatia corecta (trg_sync_grad_actual_canonical, D-01/D-04)
- `components/GestiuneExamene/RapoarteExamen.tsx`: eliminat acelasi tip de update direct; `sportiviGradMap.set(...)` pastrat; comentariul "Aceasta este pasul care lipsea si cauza bug-ul" (documenta un patch ad-hoc anterior, chiar cauza dual-write-ului) inlocuit
- `components/GestiuneExamene/ImportExamenModal.tsx`: eliminat blocul `SELECT sportivi.grad_actual_id, grade(ordine)` + `update` conditionat, care rula INAINTE (nu dupa) upsert-ul in `istoric_grade` — singurul call site cu ordinea inversata din toata faza. Reduce un round-trip Supabase per rand admis, relevant pentru importuri de sute de randuri. Exceptiile D-04 (payload `grad_actual_id` la insert sportiv nou si la insert `inscrieri_examene`) si update-ul separat pe `data_nasterii` raman intacte
- `components/UserProfile.tsx`: comentariul de deasupra `refetchGradActual` (afirma gresit "triggerul a recalculat pe baza data_obtinere DESC") inlocuit cu descrierea corecta a regulii MAX(ordine); adaugat comentariu nou deasupra `handleDeleteGrade` care noteaza ca stergerea unei intrari declanseaza recalcul server-side si poate retrograda legitim sportivul (D-02) — cale care nu functiona inainte de faza 18
- `npm run lint` (tsc --noEmit) trece fara erori dupa fiecare task

## Task Commits

Each task was committed atomically:

1. **Task 1: Elimina scrierile directe din useExamManager.ts si RapoarteExamen.tsx** - `b694683` (fix)
2. **Task 2: Corecteaza ImportExamenModal.tsx (ordine inversata) pastrand exceptiile D-04** - `8eb0655` (fix)
3. **Task 3: Corecteaza comentariile invechite din UserProfile.tsx** - `4a4551d` (docs)

## Files Created/Modified
- `hooks/useExamManager.ts` - eliminat update direct pe `sportivi.grad_actual_id`; comentarii corectate
- `components/GestiuneExamene/RapoarteExamen.tsx` - eliminat update direct pe `sportivi.grad_actual_id`; comentariu invechit inlocuit
- `components/GestiuneExamene/ImportExamenModal.tsx` - eliminat SELECT+update inversat (rula inainte de upsert); exceptiile D-04 neatinse
- `components/UserProfile.tsx` - doar comentarii corectate (fisier consumator, nu scriitor, al `grad_actual_id`)

## Decisions Made

Vezi `key-decisions` din frontmatter. Cea mai importanta: ordinea inversata din `ImportExamenModal.tsx` a fost identificata si tratata explicit ca atare (bloc sters DEASUPRA upsert-ului), nu prin copierea mecanica a pattern-ului din celelalte 3 fisiere.

## Deviations from Plan

None - plan executat exact cum a fost scris. Toate cele 3 task-uri au corespuns 1:1 cu actiunile si criteriile de acceptare din `18-03-PLAN.md`.

## Issues Encountered

None.

## Hand-off catre Faza 19

Upsert-ul in `istoric_grade` din `ImportExamenModal.tsx` (linia ~603 dupa fix) foloseste in continuare comportamentul implicit `DO UPDATE` pe `onConflict: 'sportiv_id,grad_id'` (fara `ignoreDuplicates`), spre deosebire de celelalte call site-uri din faza 18 care folosesc `ignoreDuplicates: true`. Aceasta faza (D-09) a pastrat deliberat comportamentul de conflict existent — schimbarea semanticii de upsert pe `istoric_grade` in toate cele 8 locuri este scopul explicit al Fazei 19 ("Elimina ignoreDuplicates silentios pe upsert istoric_grade, 8 locuri"), nu al Fazei 18.

## Next Phase Readiness

- Toate cele 4 fisiere ale acestui plan respecta acum D-03/D-04 — zero scrieri directe pe `sportivi.grad_actual_id`, cu exceptiile D-04 neatinse (insert sportiv nou, insert inscrieri_examene).
- Impreuna cu 18-02 (ManagementInscrieri.tsx), toate cele 5 call site-uri identificate in 18-CONTEXT.md sunt acum corectate — fisierele sunt gata pentru verificarea end-to-end live din 18-04.
- Faza 19 are hand-off explicit privind upsert-ul `DO UPDATE` ramas in `ImportExamenModal.tsx`.

---
*Phase: 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse*
*Completed: 2026-09-06*

## Self-Check: PASSED

- FOUND: hooks/useExamManager.ts
- FOUND: components/GestiuneExamene/RapoarteExamen.tsx
- FOUND: components/GestiuneExamene/ImportExamenModal.tsx
- FOUND: components/UserProfile.tsx
- FOUND: commit b694683 (Task 1)
- FOUND: commit 8eb0655 (Task 2)
- FOUND: commit 4a4551d (Task 3)
