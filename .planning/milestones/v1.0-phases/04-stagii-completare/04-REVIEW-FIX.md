---
phase: 04-stagii-completare
fixed_at: 2026-06-16T12:30:00Z
review_path: .planning/phases/04-stagii-completare/04-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-06-16T12:30:00Z
**Source review:** .planning/phases/04-stagii-completare/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 Critical + 5 Warning)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Payment orphaned when `rezultate` insert succeeds but `plati` insert fails

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Moved `setRezultate` local state update to after both DB writes succeed. Added compensating delete against the freshly inserted `rezultate` row if the `plati` insert fails, ensuring DB consistency. Removed the `console.error` debug line.

### CR-02: `platiParticipanti` fallback join matches payments from other events

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Removed the loose fallback branch `(p.eveniment_id == null && rezultate.some(...))` from the `platiParticipanti` filter. Now only strict `p.eveniment_id === eveniment.id` matches are included. Updated the `useMemo` dependency array to remove `rezultate` (no longer needed). Added clarifying comment.

### CR-03: `createSetter` calls `useCallback` inside a non-hook function — React Rules of Hooks violation

**Files modified:** `hooks/useDataProvider.ts`
**Commit:** ff5666c
**Applied fix:** Removed `useCallback` from `createSetter`. The factory now returns a plain arrow function. Since `setData` from `useState` is already stable, no memoization is needed. The returned setter functions are recreated on each render but remain functionally correct, and the React Rules of Hooks violation is eliminated.

### WR-01: `handleAddParticipant` has no permission guard for Competitie type

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Added clarifying comment to the existing `if (!permissions.isAdminClub) return;` guard confirming it now applies to all event types. The guard was already positioned above the type branch — the fix confirms intent and documents it explicitly.

### WR-02: `calculeazaCategorieStagiu` silently defaults athletes with no `data_nasterii` to `'grade'`

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Changed function return type to `'copii' | 'grade' | 'centuri' | null`. Returns `null` immediately when `dataNasterii` is falsy. Updated all three call sites: (1) `handleAddParticipant` shows a user-visible error and returns early when `null`; (2) `taxaPreview` useMemo returns a `missingBirthDate: true` object so the UI can show a warning; (3) `randuriiParticipanti` uses `?? 'grade'` nullish coalescing as a safe display fallback.

### WR-03: `getTaxaStagiu` comment says 3 levels but only 2 are implemented

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Updated the function doc comment from "fallback pe 3 niveluri" to "fallback pe 2 niveluri". Renamed "Nivel 3" to "Nivel 2" in the inline comment. Added note that `tipuri_stagii.pret` (the missing Nivel 2 from the original design) is not yet implemented.

### WR-04: `confirmDelete` deletes `rezultate` but not associated `plati`

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Added `await supabase.from('plati').delete().eq('eveniment_id', id)` before the `rezultate` delete. Added `setPlati(prev => prev.filter(p => p.eveniment_id !== id))` to update local state. Added `setPlati` to the `useData()` destructuring in `StagiiCompetitiiManagement`. Removed `console.error` debug line.

### WR-05: `handleSave` failures swallowed — form closes even when save fails

**Files modified:** `components/Competitii/StagiiCompetitii.tsx`
**Commit:** 8d64d7a
**Applied fix:** Wrapped `EvenimentForm.handleSubmit` body in try/catch/finally: `onClose()` is now only called inside the `try` block on success; `finally` handles `setLoading(false)`. Updated `handleSave` in `StagiiCompetitiiManagement` to re-throw after calling `showError`, so `handleSubmit` receives the error and does not close the form. Removed `console.error` debug lines.

---

_Fixed: 2026-06-16T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
