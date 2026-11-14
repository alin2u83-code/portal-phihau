---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 07
subsystem: ui
tags: [react, competitii, categorii, wiring, docs]
requires:
  - phase: 41-04
    provides: "RPC categorii_aplica_operatie LIVE (16/16 verificari)"
  - phase: 41-05
    provides: "CategorieOperatieModal"
  - phase: 41-06
    provides: "CategorieForm clonare/editare sigura, FaraCategoriePanel"
provides:
  - "Tab Categorii: selectie + actiuni (Editeaza, Cloneaza, Imparte, Anuleaza, Fuzioneaza) doar pentru super admin, fara extern, fara competitie finalizata"
  - "Lista expandata cu grad si quyen; FaraCategoriePanel vizibil tuturor rolurilor"
  - "O singura cale de fuziune (modal + RPC); FuzionariPanel doar sugestii; stergere categorie doar fara niciun rand"
  - "docs/ARHITECTURA_COMPETITII.md sectiunea 7.7 rescrisa"
affects: []
tech-stack:
  added: []
  patterns: ["gate UI poateAdminCategorii (garda reala in RPC)", "SELECT_* partajate in fetchData/fetchDataSilent"]
key-files:
  created: []
  modified:
    - components/Competitii/index.tsx
    - components/Competitii/AdminPanel.tsx
    - components/Competitii/FuzionariPanel.tsx
    - docs/ARHITECTURA_COMPETITII.md
key-decisions:
  - "inscrisi pentru CategorieForm = Sportiv[] derivat din participanti([cat.id]) (planul cerea sportiviInscrisi, care returneaza doar ID-uri)"
  - "Gradul din lista expandata prin gradEfectivLaData (data competitiei), consecvent cu modalul"
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11]
duration: ~25min
completed: 2026-11-14
---

# Phase 41 Plan 07: Wiring tab Categorii + curatare cai vechi + docs Summary

Tab-ul Categorii este spatiul de lucru al super adminului pentru toate cele sase operatii (prin modal + RPC atomic), iar caile vechi conflictuale (fuziune cu 4 scrieri + DELETE, stergere cu CASCADE pe randuri retrase) au fost eliminate.

## Ce s-a livrat
- **Task 1** (`3180d37a`, index.tsx): select-uri partajate `SELECT_INSCRIERI_COMPETITIE` / `SELECT_ECHIPE_COMPETITIE` in `fetchData` si `fetchDataSilent` (aduc gen, status, quyen); `poateAdminCategorii = !extern && isSuperAdmin && status !== 'finalizata'`; coloana de checkbox (dezactivata pe categorii ne-active), coloana Actiuni, bara de selectie cu "Fuzioneaza" (activ la 2+); lista expandata cu "Grad:" si "Quyen:" (individual, echipa, grad in chip-ul membrilor); `FaraCategoriePanel` (toate rolurile, `poateRealoca` doar super admin), `CategorieOperatieModal` si `CategorieForm` (cloneDin / inscrisi / dataCompetitie / areInscrieri) in tab-ul categorii. `onDone` => reset selectie + `fetchDataSilent()`.
- **Task 2** (`0500d459`, AdminPanel + FuzionariPanel): statistici si `catByProba` doar pe categorii active ("Categorii active"); butonul de stergere doar pentru categorie activa fara niciun rand (orice status), mesaj de confirmare nou; FuzionariPanel: sugestii/sub minim/goale doar pe active, `handleFuzioneaza` + butonul eliminate, text catre tab-ul Categorii, importuri nefolosite scoase.
- **Docs** (`fe8fb93c`): sectiunea 7.7 rescrisa (operatii, preview, RPC, statusuri, "Fara categorie", taxe derivate, fara stergere, fara notificare club).

## Verificare automata
- `npx tsc --noEmit`: 0 erori pe tot proiectul (dupa Task 1 si dupa Task 2).
- `npx tsx utils/categoriiAdmin.test.ts` si `npx tsx utils/taxeCompetitie.test.ts`: toate testele trec.
- Grep: niciun string inline `sportiv:sportivi(id, nume, prenume, grad_actual_id` in index.tsx; `poateAdminCategorii` 8x; FuzionariPanel fara `handleFuzioneaza`/DELETE, cu "tab-ul Categorii"; docs cu `categorii_aplica_operatie`.

## Deviations from Plan
**1. [Rule 1 - Bug] `inscrisi` pentru CategorieForm**
- **Found during:** Task 1
- **Issue:** planul indica `sportiviInscrisi(...)`, dar functia returneaza `string[]` (ID-uri), iar `CategorieForm.inscrisi` e `Sportiv[]` (eroare de tip, si avertismentul de eligibilitate ar fi mers pe ID-uri).
- **Fix:** `useMemo` in index.tsx cu `participanti([catToEdit.id], ctx).flatMap(r => r.sportiv ? [r.sportiv] : r.membri)`; importat `participanti` in loc de `sportiviInscrisi`.
- **Files modified:** components/Competitii/index.tsx
- **Commit:** 3180d37a

**2. [Rule 2 - consistenta] grad prin `gradEfectivLaData`** in locul `grad_actual_id` simplu din plan, ca lista sa afiseze acelasi grad ca modalul. `showSuccess` nu a fost luat din `useError` (modalul afiseaza toast-ul; ar fi fost variabila nefolosita).

## Limitari de verificare
- **Human-check (end-of-phase, 10 puncte) NEEFECTUAT** — ramane de rulat de utilizator pe o competitie de test (nu live). Nu am testat nimic in browser.
- **Review de cod separat NERULAT** (instrumentul de subagent nu e disponibil in acest executor); de rulat `/code-review` pe diff-ul fazei 41 (`3180d37a`, `0500d459`, `fe8fb93c` + planurile 41-02..41-06), conform CLAUDE.md global.
- Re-render-uri: starea noua (selectie, operatie, clona) e la nivel de `CompetitieDetail`, deci schimbarea selectiei re-randeaza tabul; neprofilat.
- Mesajul de confirmare la stergere in Admin presupune ca randurile retrase sunt incarcate (fetch-ul incarca toate randurile competitiei); in zona externa/AdminPanel nu se aplica.
- FK din `rezultate_competitie` / `solicitari_echipe_incomplete` pot inca bloca stergerea (eroarea ajunge prin `showError`).

## Known Stubs
None.

## Threat Flags
None (T-41-29..33: gate UI + RPC; fuziune non-atomica eliminata; stergere restransa; memoizare in modal/panou).

## Self-Check: PASSED
- components/Competitii/index.tsx, AdminPanel.tsx, FuzionariPanel.tsx, docs/ARHITECTURA_COMPETITII.md: modificate si comise
- commits 3180d37a, 0500d459, fe8fb93c: FOUND
