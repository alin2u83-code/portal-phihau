---
phase: 09-raport-financiar
fixed_at: 2026-06-16T10:30:00Z
review_path: .planning/phases/09-raport-financiar/09-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 6
skipped: 2
status: partial
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-06-16T10:30:00Z
**Source review:** .planning/phases/09-raport-financiar/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 Critical + 5 Warning; Info excluded per fix_scope=critical_warning)
- Fixed: 6
- Skipped: 2 (IN-01, IN-02, IN-03 — Info tier, out of scope)

## Fixed Issues

### WR-01: BOM literal → escape in exportRestanteCSV

**Files modified:** `utils/exportFinanciar.ts`
**Commit:** 7cd45ff
**Applied fix:** Replaced literal UTF-8 BOM bytes (`\xef\xbb\xbf`) at line 132 with the explicit `'﻿'` escape sequence, matching the pattern already used in `exportIncasariCSV` at line 23. Used binary replacement to handle the invisible character correctly.

---

### WR-02: setTimeout for revokeObjectURL in both CSV exports

**Files modified:** `utils/exportFinanciar.ts`
**Commit:** 521dd0d
**Applied fix:** Changed synchronous `URL.revokeObjectURL(url)` to `setTimeout(() => URL.revokeObjectURL(url), 100)` in both `exportIncasariCSV` (line 46) and `exportRestanteCSV` (line 154), allowing the browser to initiate the download before the object URL is revoked.

---

### WR-03: Add clubNume param to exportIncasariPDF

**Files modified:** `utils/exportFinanciar.ts`, `components/Plati/RaportFinanciar.tsx`
**Commit:** ebf1607
**Applied fix:** Added `clubNume = 'Club QwanKiDo'` parameter to `exportIncasariPDF` function signature and replaced the hardcoded `'Club Qwan Ki Do'` string in the PDF header with `clubNume`. Updated the call site in `RaportFinanciar.tsx` to pass the already-computed `clubNume` variable (line 517).

---

### CR-03: Wrap lunaCurenta in useMemo + add to raportLunarData deps

**Files modified:** `components/Plati/RaportFinanciar.tsx`
**Commit:** 746bbec
**Applied fix:** Wrapped `lunaCurenta` in `useMemo(() => new Date().toISOString().slice(0, 7), [])` at line 166 so it stabilizes across renders. Added `lunaCurenta` to the `raportLunarData` useMemo dependency array to ensure re-computation if the value ever changes (e.g., on midnight crossing).

---

### CR-01 + CR-02 + WR-04: Rewrite restanteRows to use istoricPlatiDetaliat

**Files modified:** `components/Plati/RaportFinanciar.tsx`
**Commit:** be43088
**Applied fix:**
- **CR-01:** Switched data source from `plati` (nominal `p.suma`) to `istoricPlatiDetaliat` (actual `p.rest_de_plata`), so partially-paid invoices show the real remaining balance.
- **CR-02:** Changed `if (isNaN(d.getTime())) return true` to `return false` — rows with unparseable `data_emitere` are now excluded when a date filter is active.
- **WR-04:** Replaced `'__necunoscut__'` fallback key with `` `__orfan__${p.plata_id}` `` so each orphaned invoice gets a unique aggregation key, preventing unrelated payments from merging and eliminating React key collisions.
- Updated useMemo dependency array from `[plati, ...]` to `[istoricPlatiDetaliat, ...]`.

**Note:** Logic correctness — requires human verification that `rest_de_plata` values from the DB view are always accurate for all payment states.

---

### WR-05: Relabel "Scadență" column to "Dată emitere" in raportLunarData table

**Files modified:** `components/Plati/RaportFinanciar.tsx`
**Commit:** 44b5fe5
**Applied fix:** Changed the `<th>` text from `"Scadență"` to `"Dată emitere"` in the desktop table inside the Lunar tab's "De achitat" section (~line 642). The displayed value (`formatDate(p.data_emitere)`) was already correct — only the label was misleading.

---

## Skipped Issues

### IN-01: formatDate / fmtDate duplication across files

**File:** `utils/exportFinanciar.ts:8-12` vs `components/Plati/RaportFinanciar.tsx:39-43`
**Reason:** Info severity — out of scope for fix_scope=critical_warning. Refactoring into a shared `utils/formatari.ts` utility is a separate cleanup task with no correctness impact.
**Original issue:** Both files implement identical date-formatting logic; the only difference is the fallback sentinel (`''` vs `'—'`).

---

### IN-02: Total sum in Restanțe tab computed twice inline

**File:** `components/Plati/RaportFinanciar.tsx:1012`, `1040`
**Reason:** Info severity — out of scope for fix_scope=critical_warning. A memoized `totalRestanteTab` would be cleaner but has no correctness impact.
**Original issue:** `restanteRows.reduce(...)` called in two separate JSX expressions instead of a single memoized value.

---

### IN-03: SportivLink defined inside component body

**File:** `components/Plati/RaportFinanciar.tsx:321-333`
**Reason:** Info severity — out of scope for fix_scope=critical_warning. Moving `SportivLink` outside `RaportFinanciar` is a performance/pattern improvement with no correctness impact; it requires careful prop threading.
**Original issue:** Inline component definition forces full unmount+remount on every render.

---

## TypeScript Verification

`npx tsc --noEmit` run in worktree reports only pre-existing "Cannot find module" errors from missing `node_modules` in the isolated worktree environment (packages not installed). No errors reference `RaportFinanciar.tsx` or `exportFinanciar.ts` for logic or type issues introduced by these fixes.

---

_Fixed: 2026-06-16T10:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
