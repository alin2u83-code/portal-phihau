---
phase: quick-260908-tgu
plan: 01
subsystem: Prezenta
tags: [grupe, prezenta, ui, react-query]
dependency-graph:
  requires: [services/grupeIstoricService.ts, hooks/usePermissions.ts, contexts/DataContext.tsx, components/ui.tsx]
  provides: [components/Prezenta/GestioneazaGrupaModal.tsx]
  affects: [components/Prezenta/PrezentaRapida.tsx, components/icons.tsx]
tech-stack:
  added: []
  patterns:
    - "Modal cu diff batch (selectedIds vs useRef initiali) pentru UPDATE grupa_id in masa, dupa modelul din components/Sportivi/index.tsx (mutaInGrupa/scoateDinGrupa)"
key-files:
  created:
    - components/Prezenta/GestioneazaGrupaModal.tsx
  modified:
    - components/Prezenta/PrezentaRapida.tsx
    - components/icons.tsx
decisions:
  - "Header sectiune restructurat din <button> unic in <div> cu doua <button> frati (titlu+3puncte / counter+chevron) — evita <button> imbricat in DOM, fara schimbare vizuala"
  - "Butonul 3 puncte apare doar cand poateGestionaGrupa (ADMIN_CLUB/INSTRUCTOR) SI section.grupaId non-null — SPORTIV nu il vede, iar sectiunile fara grupa reala (fara grupa_id) nu ofera tinta de scriere"
metrics:
  duration: ~35min
  completed: 2026-09-08
---

# Phase quick-260908-tgu Plan 01: Buton meniu 3 puncte Prezenta Rapida -> gestionare componenta grupa Summary

Buton meniu "3 puncte" langa numele fiecarei grupe din Prezenta Rapida, care deschide inline `GestioneazaGrupaModal` — lista bifabila a tuturor sportivilor activi ai clubului, cu membrii curenti ai grupei deja bifati; salvarea scrie `sportivi.grupa_id` in batch (adaugare/eliminare), scrie istoricul de apartenenta prin `grupeIstoricService` si reimprospateaza automat lista de prezenta.

## Ce s-a implementat

**Task 1 — infrastructura + trigger UI** (`components/icons.tsx`, `components/Prezenta/PrezentaRapida.tsx`, commit `0638130`)
- `EllipsisVerticalIcon` (alias `MoreVertical` din lucide-react) adaugat in `icons.tsx`.
- `TrainingSection.grupaId: string | null` — populat din select-ul `grupe(id, denumire, sportivi!grupa_id(...))` (anterior lipsea `id`).
- `usePermissions(activeRoleContext)` + `poateGestionaGrupa = isAdminClub || isInstructor`.
- `managingSection` state + `handleOpenGestionare(section)` — daca sectiunea are modificari nesalvate de prezenta, arata `UnsavedWarningDialog` inainte de a deschide modalul (evita pierderea bifelor la refetch).
- Header-ul sectiunii restructurat: din `<button>` unic in `<div>` cu doi `<button>` frati (zona stanga: titlu/badge-uri + buton 3 puncte; zona dreapta: counter + chevron), pentru a evita `<button>` imbricat in DOM (warning React `validateDOMNesting`). Continutul vizual si clasele raman identice.
- Butonul 3 puncte randat doar cand `poateGestionaGrupa && section.grupaId`.

**Task 2 — modalul + wiring** (`components/Prezenta/GestioneazaGrupaModal.tsx` nou, `components/Prezenta/PrezentaRapida.tsx`, commit `729a945`)
- `GestioneazaGrupaModal` — props `{ grupaId, grupaDenumire, clubId, onClose, onSaved }`. Foloseste `Modal`/`Button` din `ui.tsx`, `useData()` pentru `filteredData.sportivi`/`grade`/`currentUser`, `useError()` pentru toast-uri.
- Setul initial de membri (`initialeRef`, calculat o singura data la montare cu `useRef`) e sursa de adevar pentru diff — nu se recalculeaza dupa invalidarea cache-ului, ca sa nu se strice diff-ul in timpul salvarii.
- Lista de candidati: sportivi activi ai clubului (`s.club_id === clubId` cand `clubId` e non-null), filtrati pe cautare, sortati `nume` apoi `prenume` cu `localeCompare('ro-RO')`. Randul afiseaza gradul si, daca sportivul e deja in alta grupa, un indiciu `momentan in {denumire grupa}`.
- `handleSave`: calculeaza `deAdaugat`/`deEliminat` fata de `initialeRef`; daca ambele goale -> `onClose()` fara request; altfel doua UPDATE-uri batch conditionale pe `sportivi.grupa_id` (`= grupaId` / `= null`), cu eroare -> `showError` + modal ramane deschis cu selectia intacta; apoi `mutaInGrupa`/`scoateDinGrupa` din `grupeIstoricService.ts` pentru istoricul de apartenenta; `invalidateQueries` pe `['sportivi']` si `['grupe']`; `showSuccess` cu numarul de adaugati/eliminati; `onSaved()` + `onClose()`.
- Wiring in `PrezentaRapida.tsx`: `handleGrupaSalvata(sectionId)` face `await fetchTrainings()` apoi re-adauga sectiunea in `expandedIds` (fetchTrainings reseteaza expandarea la prima sectiune); modalul randat conditionat pe `managingSection?.grupaId`, langa `AddExternalAthleteModal` existent (neschimbat).

## Deviations from Plan

None - plan executed exactly as written. Singura ajustare fata de descrierea literala din plan: import-ul `GestioneazaGrupaModal` in `PrezentaRapida.tsx` a fost adaugat abia in Task 2 (nu impreuna cu restul importurilor in Task 1), pentru ca fisierul modal inca nu exista la momentul Task 1 si `npm run lint` ar fi esuat cu import spre modul inexistent. Nu e o deviatie de comportament, doar de ordine de scriere in interiorul Task 1 vs Task 2 — rezultatul final e identic cu ce cere planul.

## Verification results

- `npm run lint` (tsc --noEmit): **trece fara erori**, rulat dupa Task 1 si din nou dupa Task 2.
- Toate verificarile automate grep din plan (OK-SELECT, OK-PERM, OK-ICON, OK-UPDATE, OK-CACHE-ISTORIC, OK-WIRING, OK-SCOPE-INTACT) au trecut.
- Verificare vizuala in consola browserului pentru `validateDOMNesting` **NU a fost rulata** (vezi sectiunea de mai jos) — restructurarea headerului a fost facuta explicit pentru a preveni acest warning (fara `<button>` imbricat in JSX), dar confirmarea vizuala ramane de facut de un om.

## Checkpoint uman — verificat live in browser (2026-09-08, dev server + Chrome, rol ADMIN_CLUB)

1. Butonul 3 puncte apare vizual corect langa numele grupei, headerul se comporta identic la click (expand/collapse). **CONFIRMAT.**
2. Zero warning `validateDOMNesting` in consola browserului dupa incarcare + interactiune. **CONFIRMAT.**
3. Click pe 3 puncte deschide modalul inline (fara navigare), membrii curenti bifati corect ("7 selectati din 467 sportivi activi"). **CONFIRMAT.**
4. Bifare/debifare + Salveaza scrie corect in DB (`sportivi.grupa_id`) si lista de prezenta se actualizeaza automat (0/7 -> 0/11 fara refresh manual). **CONFIRMAT.**
5. Modificarile se reflecta in modulul Sportivi (grupa afisata acolo s-a actualizat). **CONFIRMAT.**
6. Dialogul "Modificari nesalvate" (UnsavedWarningDialog) — **NETESTAT** in aceasta sesiune.
7. Butonul "Alt sportiv" — cod neatins, **netestat direct** in browser in aceasta sesiune.
8. Rolul SPORTIV nu vede butonul 3 puncte — **NETESTAT** (verificare facuta doar cu ADMIN_CLUB).

**Nota incident:** in timpul testarii manuale, o secventa de taste destinata campului de cautare a ajuns partial gresit (glitch unealta de automatizare browser, nu bug de cod) si a bifat + salvat 3 sportivi (BALMUS FILIP/IUSTINA/VERONICA) din grupa "Copii Avansati" in "Grupa copii". Comportamentul de salvare in sine a functionat corect tehnic (fara erori, batch UPDATE + istoric + invalidare cache asa cum era proiectat) — utilizatorul a fost informat si a cerut explicit sa ramana asa ("lasa asa cum e"), deci nu s-a facut revert.

Plan considerat verificat functional pentru fluxul principal (1-5). Punctele 6-8 raman de confirmat intr-o sesiune viitoare daca se doreste acoperire completa.

## Self-Check: PASSED

- FOUND: components/Prezenta/GestioneazaGrupaModal.tsx
- FOUND: components/Prezenta/PrezentaRapida.tsx
- FOUND: components/icons.tsx
- FOUND commit: 0638130 (Task 1)
- FOUND commit: 729a945 (Task 2)
