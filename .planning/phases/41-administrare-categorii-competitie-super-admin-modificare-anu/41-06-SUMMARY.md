---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 06
subsystem: ui
tags: [react, competitii, categorii, form, panel]
requires:
  - phase: 41-02
    provides: "utils/categoriiAdmin.ts (participantiFaraCategorie, cheieRand)"
provides:
  - "CategorieForm: props optionale cloneDin/inscrisi/dataCompetitie/areInscrieri; doua_quyenuri in form si payload; avertisment eligibilitate; Proba/Tip participare blocate la editare cu inscrieri"
  - "components/Competitii/FaraCategoriePanel.tsx: FaraCategoriePanel, FaraCategoriePanelProps"
affects: [41-07]
tech-stack:
  added: []
  patterns: ["props optionale noi, AdminPanel neschimbat", "panou fara query-uri Supabase, doar useMemo peste date incarcate"]
key-files:
  created:
    - components/Competitii/FaraCategoriePanel.tsx
  modified:
    - components/Competitii/CategorieForm.tsx
key-decisions:
  - "Payload-ul formularului extras intr-o functie valori() folosita si la salvare si la pseudo-categoria pentru avertisment (o singura sursa de parsare)"
  - "Eticheta categoriei anterioare in panou reutilizeaza categorieEticheta (clasa = bg+text) ca pill"
requirements-completed: [D-01, D-02, D-04, D-05, D-06, D-07, D-08]
duration: ~10min
completed: 2026-11-14
---

# Phase 41 Plan 06: CategorieForm clonare/editare sigura + FaraCategoriePanel Summary

CategorieForm poate clona o categorie (prefill complet, inclusiv "Două quyenuri") si avertizeaza la editare ce sportivi inscrisi nu mai respecta criteriile; FaraCategoriePanel listeaza inscrierile ramase pe categorii ne-active, cu selectie pentru realocare doar pentru super admin.

## Ce s-a livrat
- **Task 1** (`a5adae6f`): `src = categorie ?? cloneDin`, Switch "Două quyenuri" in form si payload (insert + update), titlu "Clonează Categorie", avertisment amber nebloc (max 10 randuri + "… și încă K") calculat cu `verificaEligibilitate`, Probă si Tip Participare `disabled` cand `categorie && areInscrieri` + hint.
- **Task 2** (`8f7e9820`): `FaraCategoriePanel` — null la 0 randuri; Card "Fără categorie (de realocat) — n"; tabel Nume/Club/Grad/Quyen(md+)/Categoria anterioara/Taxa (Badge "Anulată" / "Achitată — de realocat"); checkbox-uri + "Realocă selectate (k)" doar cand `poateRealoca`.

## Verificare
- `npx tsc --noEmit`: 0 erori pe tot proiectul (dupa fiecare task).
- Grep: `cloneDin`, `doua_quyenuri`, `verificaEligibilitate(` prezente in CategorieForm; "supabase" 0x in FaraCategoriePanel.

## Deviations from Plan
None - plan executed as written.

## Limitari de verificare
- Nu am rulat `/code-review` separat pe diff.
- Componentele nu sunt conectate inca (41-07): nu au fost randate/testate in browser, fara teste unitare.
- AdminPanel verificat doar prin compilare (props noi optionale), nu in browser.
- La clonare, efectele auto existente (tip participare din proba, nr. membri) ruleaza la montare ca la editare; netestat vizual.

## Known Stubs
None.

## Threat Flags
None (T-41-25/26 mitigate: butoanele doar pentru super admin vin in 41-07; campuri blocate; T-41-27 transferat la RPC).

## Self-Check: PASSED
- components/Competitii/CategorieForm.tsx: FOUND
- components/Competitii/FaraCategoriePanel.tsx: FOUND
- commits a5adae6f, 8f7e9820: FOUND
