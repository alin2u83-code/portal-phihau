---
phase: 03-calendar-crud-antrenamente
fixed_at: 2026-06-15T15:00:00Z
review_path: .planning/phases/03-calendar-crud-antrenamente/03-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 9
skipped: 1
status: partial
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-06-15T15:00:00Z
**Source review:** `.planning/phases/03-calendar-crud-antrenamente/03-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (4 Critical + 6 Warning)
- Fixed: 9
- Skipped: 1 (WR-01 — already correct, no change needed)

---

## Fixed Issues

### CR-01: navigateMonth overflow — integer arithmetic replaces setMonth()

**Files modified:** `components/Grupe/GrupaDetailView.tsx`
**Commit:** `9b2630d`
**Applied fix:** Replaced `new Date(date); d.setMonth(d.getMonth() + direction)` with direct year/month integer arithmetic. The new implementation parses year and month from the date string using `parseInt(..., 10)`, constructs `new Date(yr, mo + direction, 1)`, and formats the result back as `YYYY-MM-01`. This eliminates the date overflow (e.g., Jan 31 + 1 month -> Mar 3) and always navigates to the first of the target month.

---

### CR-02: Non-atomic delete+insert in TabOrar.handleSave (pre-existing)

**Files modified:** `components/Grupe/GrupaDetailView.tsx`
**Commit:** `d90ead0`
**Applied fix:** Added error checking on the delete operation. The `await supabase.from('orar_saptamanal').delete()...` now captures its error and throws if the delete fails, preventing the subsequent insert from running against a partially cleared state. Renamed inner error variables to `deleteError` and `insertError` for clarity. Note: true atomicity (rollback on insert failure after successful delete) requires a Supabase RPC/transaction and is outside the scope of this fix — the current fix prevents silent data loss by surfacing the delete error.
**Pre-existing:** Yes — this defect predates Phase 03 changes.

---

### CR-03: Modal dismisses unconditionally on save failure (two commits)

**Files modified:** `hooks/useCalendarView.ts`, `components/Grupe/GrupaDetailView.tsx`, `components/AntrenamentForm.tsx`
**Commits:** `a3d5c0e`, `f6419e3`
**Applied fix:** Changed `handleSaveCustom` return type from `void` to `Promise<boolean>`. All error paths now `return false` (after calling `showError`), success paths `return true`. `handleSubmitAdaugare` in `GrupaDetailView` now guards `setIsModalAdaugareOpen(false)` with `if (ok)`. Updated `AntrenamentForm.onSave` prop type from `Promise<void>` to `Promise<boolean | void>` and added `if (result !== false) onClose()` guard in `doSave` so all callers of this form also respect the new contract. TypeScript passes clean.
**Note: requires human verification** — logic change affects UX for all callers of `handleSaveCustom` and `AntrenamentForm`.

---

### CR-04: Silent global fallback in handleGenerate corrupts other groups (pre-existing)

**Files modified:** `hooks/useCalendarView.ts`
**Commit:** `0fdeeee`
**Applied fix:** Removed the nested try/catch that retried `generateTrainingsFromSchedule(daysToGenerate)` without `grupaId` on error. The catch block now simply calls `showError("Eroare generare", error.message)` and lets the finally block reset loading state. Combined with WR-05 (see below).
**Pre-existing:** Yes — this data-integrity bug predates Phase 03 changes.

---

### WR-02: sportivi-grupa cache not invalidated after athlete add

**Files modified:** `components/Grupe/index.tsx`
**Commit:** `eb9cde9`
**Applied fix:** Added `queryClient.invalidateQueries({ queryKey: ['sportivi-grupa', grupaForAdaugaSportivi.id] })` in `handleAdaugaSportiviInGrupa` after the existing `['sportivi']` and `['grupe']` invalidation calls. This causes `TabSportivi` (which uses `staleTime: 5 * 60 * 1000`) to immediately refetch when the user returns to the Sportivi tab.

---

### WR-03: TabOrar local state stale after refetch

**Files modified:** `components/Grupe/GrupaDetailView.tsx`
**Commit:** `d90ead0`
**Applied fix:** Added `grupa.program` as a second dependency to the `useEffect` that resets local `program` state. The effect now runs when either `grupa.id` or `grupa.program` changes, ensuring local editor state re-syncs when the parent React Query cache refetches updated data for the same group.

---

### WR-04: fetchAntrenamente missing try/catch — UI hangs on uncaught exception

**Files modified:** `hooks/useCalendarView.ts`
**Commit:** `0fdeeee`
**Applied fix:** Wrapped the entire body of `fetchAntrenamente` (from after `setLoading(true)` to before the current `setLoading(false)`) in a `try/finally` block. The existing `if (error) showError(...)` logic is preserved inside the try. The `setLoading(false)` moved to the `finally` block, guaranteeing it runs even if the supabase call throws an uncaught exception (e.g., network timeout).

---

### WR-05: handleGenerate does not reset loading if fetchAntrenamente throws

**Files modified:** `hooks/useCalendarView.ts`
**Commit:** `0fdeeee`
**Applied fix:** Replaced the `setLoading(false)` at the end of `handleGenerate` with a `finally` block wrapping the entire try/catch. This guarantees `loading` resets to `false` even if `fetchAntrenamente()` (called inside the try) throws.

---

### WR-06: parseInt without radix on date substrings

**Files modified:** `components/Grupe/GrupaDetailView.tsx`
**Commit:** `d90ead0`
**Applied fix:** Added explicit radix `10` to both `parseInt(date.substring(0, 4))` and `parseInt(date.substring(5, 7))` calls on lines 73-74. Updated `navigateMonth` similarly (CR-01 fix already included radix 10).

---

## Skipped Issues

### WR-01: todayLocal frozen at mount — stale after midnight

**File:** `hooks/useCalendarView.ts:9`
**Reason:** No change needed — already correct. `todayLocal` is computed as a plain `const` (not in state) on line 9 of the hook function body. Since it is outside `useState`, it recomputes on every invocation of the hook function, which happens on every render of the consuming component. This is exactly "Option A — recompute on render" from the fix suggestion. The reviewer's concern applies only if the app sits completely idle past midnight with no re-renders at all — an edge case that would not affect normal use. Adding a `setInterval`-based refresh (Option B) would be over-engineering for this scenario.

---

## Files Modified

| File | Findings Fixed |
|------|---------------|
| `components/Grupe/GrupaDetailView.tsx` | CR-01, CR-02, CR-03, WR-03, WR-06 |
| `hooks/useCalendarView.ts` | CR-03, CR-04, WR-04, WR-05 |
| `components/Grupe/index.tsx` | WR-02 |
| `components/AntrenamentForm.tsx` | CR-03 (type compatibility) |

---

_Fixed: 2026-06-15T15:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
