---
slug: wizard-selectedsportivi-inp-fix
date: 2026-06-09
status: complete
type: bugfix
files:
  - components/Competitii/InscriereClubWizard/index.tsx
  - components/Competitii/InscrieriView.tsx
commits:
  - 78fe854
---

# Fix: selectedSportivi izolat per probă + INP retragere

## Bug 1 — selectedSportivi amestecat între probe

Sportivii adăugați la probe de echipă apăreau ca selectați la deschiderea
Thao Quyen individual. Cauza: `selectedSportivi` era un `Set<string>` global,
iar fetch-ul de echipe din DB îl polua cu echipieri.

**Fix:** `selectedSportiviMap: Map<probaId, Set<string>>` — fiecare probă
individuală ține selecție separată. `mergedSelectedSportivi` (useMemo) trimis
la Pas4 + InscriereClubCards pentru backward compat. Init din inscrieri
existente restaurează per probă corect.

## Bug 2 — INP 1020ms la click Retrage / Confirmă

Event handler bloca UI ~1 secundă după DELETE/UPDATE Supabase.

**Fix:** `startTransition(() => onRefresh())` în handleRetrage și butonul
Confirmă — refresh marcat low-priority, buton răspunde instant.
