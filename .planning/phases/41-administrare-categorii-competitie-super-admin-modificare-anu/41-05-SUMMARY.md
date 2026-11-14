---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 05
subsystem: ui
tags: [react, competitii, categorii, modal, preview]
requires:
  - phase: 41-02
    provides: "utils/categoriiAdmin.ts (planuri pure) + aplicaOperatieCategorii"
provides:
  - "components/Competitii/CategorieOperatieModal.tsx: CategorieOperatieModal, CategorieOperatieModalProps (preview + confirmare anulare / fuziune / impartire / mutare)"
affects: [41-07]
tech-stack:
  added: []
  patterns: ["un singur modal pentru 4 operatii, toata logica in utils/categoriiAdmin.ts", "zero query-uri Supabase in componenta; doar apelul de serviciu la Confirm"]
key-files:
  created:
    - components/Competitii/CategorieOperatieModal.tsx
  modified: []
key-decisions:
  - "Optiunile de tinta la mutare/impartire se calculeaza in modal (categorii active compatibile cu cea curenta); validitatea reala o dau blocajele din mutariDinPlan + RPC"
  - "alegeri se reseteaza la schimbarea criteriului/pragurilor (tintele impartirii sunt chei care se schimba)"
  - "Modal persistent cat timp loading (fara inchidere cu Escape in timpul submit-ului)"
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-08, D-10, D-11]
duration: ~20min
completed: 2026-11-14
---

# Phase 41 Plan 05: Modal preview + confirmare operatii categorii Summary

Un singur modal (`CategorieOperatieModal`) care arata, pentru anulare / fuziune / impartire / mutare, cine se muta unde (nume, club, grad, varsta, gen, quyen), rezumatul taxelor la anulare si blocajele, si aplica operatia prin `aplicaOperatieCategorii` doar la Confirm.

## Ce s-a livrat
- **Task 1** (`2230b03f`): modalul, tabelul de participanti cu coloana "Din"/"Catre" (Select cu categorii active compatibile la mutare; N1 static la fuziune), cutia cu taxe anulate / achitate (D-08), liste de avertismente (amber) si blocaje (red), Confirm dezactivat la `blocaje.length > 0` sau `loading`, `showError` / `showSuccess` cu rezumat, `onDone(data)`.
- **Task 2** (`d041d74d`): controale de impartire: Select Criteriu (Varsta/Grad/Gen, cu nota pentru Mixt), Select Prag (VARSTE_OPTIONS sau grade sortate dupa ordine) + "Adauga prag", chip-uri cu "✕", lista categoriilor rezultate cu numarul de participanti rezolvati (override sau sugestie); randurile fara sugestie ramane cu Select gol, blocajul din `mutariDinPlan` tine Confirm dezactivat (D-10).

## Verificare
- `npx tsc --noEmit`: 0 erori pe tot proiectul (dupa fiecare task).
- Grep: `aplicaOperatieCategorii(` 1x, `mutariDinPlan(` 1x, `from('` 0x; `planImpartire(`, "Adauga prag", `VARSTE_OPTIONS` prezente; `setPraguri([])` si `setAlegeri({})` in handlerul de criteriu.

## Deviations from Plan
None - plan executed as written. Mica alegere: planul cerea mai intai impartirea cu criteriu fix, apoi controale; la Task 1 am folosit constante locale inlocuite la Task 2 cu state.

## Limitari de verificare
- Nu am rulat `/code-review` separat pe diff.
- Componenta nu e conectata inca (41-07), deci nu a fost randata/testata in browser; nu exista teste unitare pentru ea. RPC-ul nu e live (41-04), deci `aplicaOperatieCategorii` nu a fost apelat.
- Mesajul de succes la anulare foloseste `taxe_anulate` din raspunsul serverului, necunoscut pana la 41-04.
- Dupa schimbarea pragurilor, tinta unui rand ramasa din `alegeri` e resetata complet (nu se pastreaza alegeri manuale).

## Known Stubs
None.

## Threat Flags
None (T-41-23 mitigat: Confirm dezactivat si modal persistent cat timp loading; garda reala e in RPC).

## Self-Check: PASSED
- components/Competitii/CategorieOperatieModal.tsx: FOUND
- commits 2230b03f, d041d74d: FOUND
