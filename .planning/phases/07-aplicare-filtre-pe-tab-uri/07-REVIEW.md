---
phase: 07-aplicare-filtre-pe-tab-uri
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - components/Competitii/RaportInscrieri.tsx
  - components/Competitii/InscrieriView.tsx
  - components/Competitii/index.tsx
  - components/Competitii/CompetitieDetail.tsx
  - components/Competitii/CategoriiTemplateManager.tsx
findings:
  critical: 4
  warning: 4
  info: 3
  total: 11
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the unified filter system implementation across the Competitii module. The implementation achieves its core goal — `CompetitieFilterBar` appears on the Inscrieri, Raport, and Template tabs — but two critical structural defects undermine it: `CompetitieDetail.tsx` is a near-duplicate of the internal `CompetitieDetail` component in `index.tsx` but with the filter integration *missing* from the Categorii tab, and `CompetitieDetail.tsx` is never imported anywhere, making it dead code. Additionally, filters do not reset on tab change in `CompetitieDetail.tsx`, causing cross-tab filter bleed. Destructive delete in `InscrieriView` fires without user confirmation, and `expandedCats` state is allocated and populated but never consumed in either copy of the component.

---

## Critical Issues

### CR-01: `CompetitieDetail.tsx` is dead code — never imported, never rendered

**File:** `components/Competitii/CompetitieDetail.tsx:1`
**Issue:** `CompetitieDetail.tsx` exports `CompetitieDetailProps` and `CompetitieDetail` but is imported nowhere in the codebase. `index.tsx` contains its own private `CompetitieDetail` component (line 49) that is the one actually rendered. All of the filter integration work done in `index.tsx` is missing from `CompetitieDetail.tsx`, but it doesn't matter in practice because `CompetitieDetail.tsx` is unreachable. The file is either:
- A half-completed refactor that was abandoned (leaving `index.tsx` as the live code), or
- The intended future replacement that was never wired up.

Either way, two divergent implementations of the same 650-line component exist simultaneously, with only `index.tsx`'s version active. Any future developer editing `CompetitieDetail.tsx` will believe they are modifying live code and produce invisible changes.
**Fix:** Decide which file is authoritative and remove the other. If `CompetitieDetail.tsx` is intended to replace the embedded component: import it in `index.tsx` (replacing the private definition at line 49) and ensure it contains all filter integration features from `index.tsx` (see CR-02, CR-03). If the plan is to keep the monolith, delete `CompetitieDetail.tsx` entirely.

---

### CR-02: `CompetitieDetail.tsx` — Categorii tab has no `CompetitieFilterBar`, `filteredCategorii` ignores filters

**File:** `components/Competitii/CompetitieDetail.tsx:100-102`
**Issue:** In `CompetitieDetail.tsx` the `filteredCategorii` computation only filters by `selectedProbaId` — it does not call `aplicaFiltreCategorie` and does not use `filtre` at all:

```ts
// CompetitieDetail.tsx line 100
const filteredCategorii = selectedProbaId
  ? categorii.filter(c => c.proba_id === selectedProbaId)
  : categorii;
```

And the old standalone probe-pill UI is rendered instead of `CompetitieFilterBar` (lines 273–292). The `useCompetitieFilters()` hook is instantiated (line 56) but its `filtre`, `toggleGen`, `setFiltre` are threaded down to child components (`InscrieriView`, `RaportInscrieri`, `CategoriiTemplateManager`) while the Categorii tab itself never uses them. This means the Categorii tab filter integration is entirely absent from this file.

Contrast with `index.tsx` lines 126–131:
```ts
const filteredCategorii = useMemo(() => {
  const baza = selectedProbaId
    ? categorii.filter(c => c.proba_id === selectedProbaId)
    : categorii;
  return aplicaFiltreCategorie(baza, filtre);
}, [categorii, selectedProbaId, filtre]);
```
and `index.tsx` lines 302–311 where `CompetitieFilterBar` replaces the old pill row.

This is only live if CR-01 is resolved in favor of `CompetitieDetail.tsx`.
**Fix:** Apply the same `useMemo`+`aplicaFiltreCategorie` pattern and replace the pill row with `CompetitieFilterBar`. Also add missing imports: `useMemo` from React, `aplicaFiltreCategorie` from `useCompetitieFilters`, `CompetitieFilterBar` from `./CompetitieFilterBar`.

---

### CR-03: `CompetitieDetail.tsx` — `handleSetActiveTab` does not call `resetFiltre()`; filters bleed across tabs

**File:** `components/Competitii/CompetitieDetail.tsx:62-65`
**Issue:** `handleSetActiveTab` only persists the tab to sessionStorage without resetting filters:

```ts
const handleSetActiveTab = useCallback((tab: ...) => {
  setActiveTab(tab);
  ssSet(SS_KEY_TAB, tab);
}, []);
```

In `index.tsx` (line 85–89) the same callback explicitly calls `resetFiltre()`:
```ts
const handleSetActiveTab = useCallback((tab: ...) => {
  resetFiltre();
  setActiveTab(tab);
  ssSet(SS_KEY_TAB, tab);
}, [resetFiltre]);
```

Without the reset, filters set on one tab (e.g., "Feminin" on Raport) remain active when the user switches to Categorii or Inscrieri, silently hiding rows. This is only live if CR-01 is resolved in favor of `CompetitieDetail.tsx`.
**Fix:**
```ts
const handleSetActiveTab = useCallback((tab: ...) => {
  resetFiltre();
  setActiveTab(tab);
  ssSet(SS_KEY_TAB, tab);
}, [resetFiltre]);
```

---

### CR-04: `InscrieriView` — individual inscription DELETE fires without confirmation dialog

**File:** `components/Competitii/InscrieriView.tsx:72-84`
**Issue:** `handleRetrage` for `type === 'inscris'` executes a hard DELETE from `inscrieri_competitie` with no `window.confirm()` or modal confirmation:

```ts
const handleRetrage = async (id: string, type: 'inscris' | 'echipa') => {
  if (type === 'inscris') {
    const { error } = await supabase.from('inscrieri_competitie').delete().eq('id', id);
    if (error) { showError("Eroare retragere", error.message); return; }
  } else { ... }
  onRefresh();
};
```

A comment in the code says `// DELETE definitiv din inscrieri_competitie (confirmat de utilizator)` but there is no user confirmation in code. A mis-click on the "Retrage" button permanently deletes the registration with no undo path. The same function correctly treats team withdrawals as a status update (not a DELETE), which is safer behavior.

**Fix:**
```ts
const handleRetrage = async (id: string, type: 'inscris' | 'echipa') => {
  if (!window.confirm('Sigur vrei să retragi această înscriere? Acțiunea nu poate fi anulată.')) return;
  if (type === 'inscris') {
    const { error } = await supabase.from('inscrieri_competitie').delete().eq('id', id);
    if (error) { showError("Eroare retragere", error.message); return; }
  } else { ... }
  onRefresh();
};
```

---

## Warnings

### WR-01: `CompetitieDetail.tsx` — `expandedCats` state set but never read (dead state)

**File:** `components/Competitii/CompetitieDetail.tsx:55,78`
**Issue:** `expandedCats` is initialized as `new Set()` and populated in `fetchData` with all category IDs, but is never referenced in any JSX or derived computation. The same dead state also exists in `index.tsx` lines 75 and 102.

```ts
const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set()); // line 55
// in fetchData:
setExpandedCats(new Set(loadedCats.map(c => c.id)));                       // line 78
```

This appears to be a leftover from an earlier iteration (Task 5: expand/collapse tabele) that was never completed or cleaned up. The `viewInscrieriCatId` pattern was used instead.
**Fix:** Remove `expandedCats` and `setExpandedCats` from both `CompetitieDetail.tsx` and `index.tsx`. The `fetchData` in `index.tsx` (line 102) also sets it needlessly.

---

### WR-02: `CompetitieDetail.tsx` — `'template'` tab not included in sessionStorage restore guard, causing silent fallback to `'inscrieri'`

**File:** `components/Competitii/CompetitieDetail.tsx:38-42`
**Issue:** The `activeTab` initializer checks for valid saved tab values but `'template'` is absent from the guard:

```ts
const [activeTab, setActiveTab] = useState<...>(() => {
  const saved = ssGet(SS_KEY_TAB);
  if (saved === 'categorii' || saved === 'inscrieri' || saved === 'raport' ||
      saved === 'admin' || saved === 'rezultate_legacy' || saved === 'financiar' ||
      saved === 'cereri_interclub') return saved;
  return 'inscrieri'; // 'template' falls through here
});
```

If an admin is on the Template tab and refreshes the page, the restored tab will silently be `'inscrieri'` instead of `'template'`. The same bug exists in `index.tsx` line 58-61.
**Fix:** Add `saved === 'template'` to the guard in both files.

---

### WR-03: `RaportInscrieri` — `CompetitieFilterBar` rendered below the header but *above* the report; empty-state check runs before filter bar renders

**File:** `components/Competitii/RaportInscrieri.tsx:101-107`
**Issue:** When all inscriptions are filtered out, the component returns early with an empty-state message at line 101-107, *before* rendering the `CompetitieFilterBar` (which is in the main return below line 125). This means a user who activates a filter that eliminates all results sees only "Niciun sportiv înscris momentan." with no way to reset or change the filters — the filter bar disappears entirely.

```ts
if (raport.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <p className="text-sm">Niciun sportiv înscris momentan.</p>
    </div>
  );
}
```

**Fix:** Move the `CompetitieFilterBar` before the early return or include it in the empty-state return:
```tsx
if (raport.length === 0) {
  return (
    <div className="space-y-4">
      <CompetitieFilterBar
        filtre={filtre}
        toggleGen={toggleGen}
        setFiltre={setFiltre}
        resetFiltre={resetFiltre}
        nrFiltreActive={nrFiltreActive}
        probe={probe}
        grade={grade}
      />
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm">
          {nrFiltreActive > 0
            ? 'Niciun sportiv corespunde filtrelor aplicate.'
            : 'Niciun sportiv înscris momentan.'}
        </p>
      </div>
    </div>
  );
}
```

---

### WR-04: `CategoriiTemplateManager` — `nextNumar()` is stale during bulk import of selected items

**File:** `components/Competitii/CategoriiTemplateManager.tsx:350,373-374`
**Issue:** `nextNumar()` reads from `categoriiExistente` prop at call time:

```ts
const nextNumar = () => Math.max(0, ...categoriiExistente.map(c => c.numar_categorie ?? 0));
```

In `handleImportSelected`, `nextNumar()` is called once before the batch insert:

```ts
const base = nextNumar();
const payload = toInsert.map((t, i) => buildCategoriePayload(t, base + i + 1));
```

However, when `onImported` fires (`index.tsx` line 629: `setCategorii(prev => [...prev, ...cats])`), the `categoriiExistente` prop passed to `CategoriiTemplateManager` is updated asynchronously on the next render — meaning a second rapid import (or concurrent import from `handleImportOne`) can compute the same `base` value, causing duplicate `numar_categorie` assignments.

For single-item imports via `handleImportOne`, the same staleness applies: each call reads the same `categoriiExistente` length and assigns `nextNumar() + 1` regardless of how many imports are already in flight.
**Fix:** Rely on the DB for ordering (e.g., use a DB sequence or read the actual max from the server before inserting) rather than the client-side prop, or disable the import button while any import is in flight.

---

## Info

### IN-01: `CompetitieDetail.tsx` — duplicate `VizaSportiv` import from `../../types`

**File:** `components/Competitii/CompetitieDetail.tsx:2,8`
**Issue:** `VizaSportiv` is imported twice from `../../types`: once on line 2 embedded in the main types import, and once as a standalone import on line 8. This causes a TypeScript linting warning and indicates copy-paste from `index.tsx` without cleanup.

```ts
import { Permissions, Competitie, ..., Sportiv } from '../../types'; // line 2 — no VizaSportiv here
import { VizaSportiv } from '../../types'; // line 8
```

Actually reviewing the exact line 2: `Sportiv` is the last named export — `VizaSportiv` is only on line 8. The issue is that both lines import from the same module and should be consolidated into one import statement.
**Fix:** Merge into a single import: `import { Permissions, Competitie, ..., Sportiv, VizaSportiv } from '../../types';`

---

### IN-02: `InscrieriView` — `statusOrdine` object recreated on every render

**File:** `components/Competitii/InscrieriView.tsx:53`
**Issue:** `statusOrdine` is defined inline in the component body without `useMemo` or moving it to module scope:

```ts
const statusOrdine: Record<string, number> = { inscris: 0, confirmat: 1 };
```

This is a constant that never changes and could be a module-level constant or at minimum wrapped in `useMemo`. This is a minor concern given the object is tiny, but it's inconsistent with the pattern used elsewhere.
**Fix:** Move to module scope: `const STATUS_ORDINE: Record<string, number> = { inscris: 0, confirmat: 1 };`

---

### IN-03: `index.tsx` — duplicate refresh button rendered (header area and tab bar)

**File:** `components/Competitii/index.tsx:161-172` and `281-292`
**Issue:** The `CompetitieDetail` component in `index.tsx` renders two refresh buttons: one in the competition header area (lines 161–172) and one in the tab row (lines 281–292). Both do exactly the same thing (`onClick={fetchData}`). The `CompetitieDetail.tsx` file has the same duplication. This is likely intentional for mobile UX (different scroll contexts), but the two buttons share no label and do not indicate loading state consistently — the header button uses `w-4 h-4` icon while the tab row uses `w-5 h-5`. One should be removed or they should be visually unified.
**Fix:** Remove the header-area refresh button (lines 161–172 in both `index.tsx` and `CompetitieDetail.tsx`) and keep only the tab-row button, which is always visible during tab navigation.

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
