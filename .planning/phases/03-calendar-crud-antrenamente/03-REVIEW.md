---
phase: 03-calendar-crud-antrenamente
reviewed: 2026-06-15T14:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - components/Grupe/GrupaDetailView.tsx
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-15T14:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

`GrupaDetailView.tsx` implements a calendar-based training management view with three tabs (Antrenamente, Orar, Sportivi). The calendar logic is partially delegated to `hooks/useCalendarView.ts` and `utils/trainingGenerator.ts`, both of which were cross-referenced during this review.

The component has four critical defects: a date-overflow bug in month navigation that silently skips to the wrong month, a non-atomic delete+insert in schedule save that can leave the DB in a half-written state without any error surfacing to the user, modal dismissal that happens unconditionally even when a save mutation fails, and a dangerous silent fallback in `handleGenerate` that triggers global schedule generation when group-scoped generation fails — potentially inserting duplicate training entries for every other group.

Six additional warnings cover stale `todayLocal`, missing cache invalidation for sportivi after add, an unguarded `parseInt` on `date` substrings, and more.

---

## Critical Issues

### CR-01: `navigateMonth` date-overflow — wrong month shown when navigating from end-of-month dates

**File:** `components/Grupe/GrupaDetailView.tsx:106-109`

**Issue:** `navigateMonth` constructs a `Date` from the `date` string (e.g., `2025-01-31`) then calls `d.setMonth(d.getMonth() + 1)`. JavaScript's `setMonth` does not clamp the day to the new month's last day — it overflows: January 31 + 1 month = March 3. `toLocaleDateString('sv-SE')` then returns `'2025-03-03'`, so `currentMonth` becomes March (index 2), the calendar header shows "Martie 2025", and `fetchAntrenamente` fetches March data — silently skipping February entirely. The bug affects every month with 31 days when the user currently lands on day 29/30/31 of that month.

```ts
// BUGGY:
const navigateMonth = (direction: -1 | 1) => {
    const d = new Date(date);          // e.g. 2025-01-31 parsed as UTC midnight
    d.setMonth(d.getMonth() + direction); // Jan 31 + 1 → Mar 3 overflow
    setDate(d.toLocaleDateString('sv-SE'));
    setSelectedDate(null);
};

// FIX — always clamp to the first of the target month:
const navigateMonth = (direction: -1 | 1) => {
    const currentYear = parseInt(date.substring(0, 4));
    const currentMonth = parseInt(date.substring(5, 7)) - 1; // 0-indexed
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    setDate(`${yyyy}-${mm}-01`);
    setSelectedDate(null);
};
```

---

### CR-02: Non-atomic delete+insert in `TabOrar.handleSave` — data loss on insert failure

**File:** `components/Grupe/GrupaDetailView.tsx:426-434`

**Issue:** The schedule save does a hard `delete().eq('grupa_id', grupa.id)` first (line 426), then conditionally inserts the new rows (line 433). The delete is unconditional and not awaited for error checking:

```ts
await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
// ← error from delete is IGNORED
const toInsert = program.map(...)
if (toInsert.length > 0) {
    const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
    if (error) throw error;
}
```

If the delete succeeds but the insert fails (network error, RLS rejection, constraint violation), the schedule is permanently erased. The catch block will show an error toast, but the data is already gone — there is no rollback. Additionally, the error from `delete()` is silently dropped.

```ts
// FIX — check delete error, and accept data loss only if insert also succeeds:
const { error: deleteError } = await supabase
    .from('orar_saptamanal')
    .delete()
    .eq('grupa_id', grupa.id);
if (deleteError) throw deleteError;

if (toInsert.length > 0) {
    const { error: insertError } = await supabase
        .from('orar_saptamanal')
        .insert(toInsert);
    if (insertError) throw insertError;
}
// Note: true atomicity requires a Supabase RPC/transaction.
// Checking delete error at minimum prevents silent data loss.
```

---

### CR-03: `handleSubmitAdaugare` closes modal unconditionally even on mutation failure

**File:** `components/Grupe/GrupaDetailView.tsx:158-167`

**Issue:** `handleSaveCustom` in `useCalendarView.ts` (lines 80-92) calls `showError` on failure but does NOT return or throw — it falls through silently. Back in `GrupaDetailView.tsx`, `setIsModalAdaugareOpen(false)` is called unconditionally after `await handleSaveCustom(...)` regardless of success or failure. The user sees an error toast but the modal disappears immediately, so they cannot correct the form and retry — they must navigate back, losing any form input.

```ts
// BUGGY (GrupaDetailView.tsx line 158-167):
const handleSubmitAdaugare = async () => {
    await handleSaveCustom({ ... }, grupa.club_id ?? undefined);
    setIsModalAdaugareOpen(false);   // always runs, even on error
};

// FIX — handleSaveCustom must return a success boolean or throw,
// and the caller must guard the close:
const handleSubmitAdaugare = async () => {
    const ok = await handleSaveCustom({ ... }, grupa.club_id ?? undefined);
    if (ok) setIsModalAdaugareOpen(false);
};

// In useCalendarView.ts — handleSaveCustom non-recurent branch:
// if (error) { showError(...); return false; }
// ...
// return true;
```

---

### CR-04: Silent fallback in `handleGenerate` triggers global schedule generation — corrupts other groups

**File:** `hooks/useCalendarView.ts:45-62` (called from `GrupaDetailView.tsx:69`)

**Issue:** When `generateTrainingsFromSchedule(daysToGenerate, grupaId)` throws, the catch block immediately retries with `generateTrainingsFromSchedule(daysToGenerate)` — no `grupaId` — which queries ALL active `orar_saptamanal` rows and inserts training entries for every group in the club. This is a silent data-integrity bomb: a transient error on one group causes bulk insertion for all groups. The user sees a success toast ("Global") and has no way to know that hundreds of spurious entries were created.

```ts
// BUGGY:
} catch (error: any) {
    try {
        await generateTrainingsFromSchedule(daysToGenerate);  // global — no grupaId
        showSuccess("Succes", `...calendarul a fost populat... (Global).`);
    } catch (error2: any) {
        showError("Eroare generare", error2.message);
    }
}

// FIX — remove the global fallback; surface the original error:
} catch (error: any) {
    showError("Eroare generare", error.message);
}
setLoading(false);
```

---

## Warnings

### WR-01: `todayLocal` computed once at hook init — stale "today" after midnight if app stays open

**File:** `hooks/useCalendarView.ts:9`

**Issue:** `todayLocal` is computed once when the hook mounts (`new Date().toLocaleDateString('sv-SE')`). If the app is left open past midnight, "today" becomes yesterday — the ring highlight on the calendar will mark the wrong day. This is a subtle visual bug for apps used across midnight (e.g., late-night training sessions).

**Fix:** Compute `todayLocal` inside a `useMemo` or `useState` with no dependencies, and expose a refresh mechanism, or simply recompute it on every render since `toLocaleDateString` is cheap:

```ts
// Option A — recompute on render (cheap, always correct):
const todayLocal = new Date().toLocaleDateString('sv-SE');
// Remove it from the return object and let callers compute it,
// or keep it here and derive it outside useState.

// Option B — if it must be stable across renders but refreshed daily,
// use a useEffect with a daily setInterval.
```

---

### WR-02: `TabSportivi` query cache never invalidated after `onOpenAdaugaSportivi` completes

**File:** `components/Grupe/GrupaDetailView.tsx:557-569`

**Issue:** `TabSportivi` uses `useQuery({ queryKey: ['sportivi-grupa', grupa.id], staleTime: 5 * 60 * 1000 })`. When the user opens the "Adaugă Sportivi" modal (via `onOpenAdaugaSportivi`), adds an athlete, and returns to the Sportivi tab, the list will not refresh for up to 5 minutes because no code invalidates the `sportivi-grupa` cache key after a successful add. The user sees stale data and may believe the add failed.

**Fix:** Wherever `onOpenAdaugaSportivi` resolves successfully (in the parent component that owns the modal), call:
```ts
queryClient.invalidateQueries({ queryKey: ['sportivi-grupa', grupa.id] });
```

---

### WR-03: `TabOrar` local state initialized from prop, not re-synced on prop change except via `grupa.id`

**File:** `components/Grupe/GrupaDetailView.tsx:412, 419-421`

**Issue:** `TabOrar` initializes `program` from `grupa.program` (line 412). The `useEffect` at lines 419-421 resets only when `grupa.id` changes, not when `grupa.program` changes (e.g., after a parent refetch returns updated data for the same group). If the parent's React Query cache revalidates and passes a new `grupa` prop with updated program, the local `program` state will not update — the UI will show the stale editor state.

```ts
// CURRENT (only resets when id changes):
React.useEffect(() => {
    setProgram(grupa.program || []);
}, [grupa.id]);

// FIX — also re-sync when program content changes, or add a version/etag:
React.useEffect(() => {
    setProgram(grupa.program || []);
}, [grupa.id, grupa.program]);
// Note: if programa.program is a new array reference on every render,
// use a stable comparison (deep equal) or JSON key.
```

---

### WR-04: `fetchAntrenamente` in `useCalendarView` does not set `loading: false` on error path — UI may hang

**File:** `hooks/useCalendarView.ts:18-39`

**Issue:** `fetchAntrenamente` sets `setLoading(true)` at line 19, then at line 38 sets `setLoading(false)`. However, the error path at line 33 calls `showError(...)` but does NOT have a `finally` block — `setLoading(false)` is in the `else` branch (line 36-38). If `error` is truthy, `setLoading(false)` is called at line 38 inside `else` — wait, looking more carefully:

```
33: if (error) {
34:     showError(...);
35: } else {
36:     setAntrenamente(...)
37: }
38: setLoading(false);  // line 38 is OUTSIDE the if/else
```

Actually `setLoading(false)` at line 38 is after the if/else block, so it runs in both paths. However, if `showError` throws (unlikely but possible if ErrorProvider is misconfigured), `setLoading(false)` would be skipped. **The real issue is** that if the `supabase` call itself throws an unhandled exception (network timeout etc.), there is no `try/catch` around the fetch — the component will be stuck in loading state permanently.

**Fix:** Wrap the fetch body in try/finally:

```ts
const fetchAntrenamente = useCallback(async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.from('program_antrenamente')...;
        if (error) {
            showError("Eroare la încărcarea calendarului", error.message);
        } else {
            setAntrenamente((data || []).map(a => ({ ...a, prezenta: a.prezenta || [] })));
        }
    } finally {
        setLoading(false);
    }
}, [grupaId, date, showError]);
```

---

### WR-05: `handleGenerate` does not reset `loading` to `false` if `fetchAntrenamente` throws

**File:** `hooks/useCalendarView.ts:45-62`

**Issue:** `handleGenerate` sets `setLoading(true)` at line 47 and `setLoading(false)` at line 62 — but line 62 is after the entire try/catch. If `fetchAntrenamente()` throws inside the inner catch block (line 57), control exits the catch before reaching line 62, and `loading` stays `true` permanently.

**Fix:** Use a `finally` block:

```ts
const handleGenerate = async () => {
    setLoading(true);
    try {
        await generateTrainingsFromSchedule(daysToGenerate, grupaId);
        showSuccess(...);
        await fetchAntrenamente();
    } catch (error: any) {
        showError("Eroare generare", error.message);
    } finally {
        setLoading(false);
    }
};
```

---

### WR-06: `parseInt(date.substring(0, 4))` / `parseInt(date.substring(5, 7))` — no radix, fragile parsing

**File:** `components/Grupe/GrupaDetailView.tsx:73-74`

**Issue:** `parseInt` without a radix is bad practice (will behave unexpectedly if the substring starts with `0` in older JS engines). More importantly, these `substring` calls are duplicated from the logic in `getCalendarCells` and scattered through the component. If `date` is ever an empty string or a malformed value (which can happen if `useCalendarView` is initialised with a bad `initialDate`), both `parseInt` calls silently return `NaN`, and `getCalendarCells(NaN, NaN)` will produce 0 cells without any error — the calendar grid will render empty with no feedback.

**Fix:**

```ts
// Add explicit radix:
const currentYear = parseInt(date.substring(0, 4), 10);
const currentMonth = parseInt(date.substring(5, 7), 10) - 1;

// Guard against NaN:
if (isNaN(currentYear) || isNaN(currentMonth)) {
    return <div className="text-rose-400">Dată invalidă în calendar.</div>;
}
```

---

## Info

### IN-01: `s: any` type annotation in `TabSportivi` — bypasses TypeScript type checking

**File:** `components/Grupe/GrupaDetailView.tsx:597`

**Issue:** `sportivi.map((s: any) => ...)` defeats type safety. The `useQuery` return type is inferred from the `queryFn`, which returns `data ?? []` without an explicit type. Assigning `any` hides any future schema mismatch.

**Fix:** Define an inline type or import from `types.ts`:

```ts
interface SportivInGrupa {
    id: string;
    nume: string;
    prenume: string;
    grad_actual_id: string | null;
    grade: { denumire: string } | null;
}
// Then: useQuery<SportivInGrupa[]>(...) and remove the : any cast.
```

---

### IN-02: Week-day header labels are ambiguous — two columns both labeled 'M'

**File:** `components/Grupe/GrupaDetailView.tsx:204`

**Issue:** `['L', 'M', 'M', 'J', 'V', 'S', 'D']` — Monday is 'L' (Luni) and Tuesday is 'M' (Marți), but Wednesday is also 'M' (Miercuri). A user cannot distinguish Tuesday from Wednesday by the header. Accessibility tools will also read both as "M" with no semantic differentiation.

**Fix:** Use unambiguous abbreviations — e.g. `['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']` — or add `aria-label` attributes with the full day name.

---

### IN-03: `clearCache` called with manually constructed key prefix before `invalidateQueries` — fragile coupling

**File:** `components/Grupe/GrupaDetailView.tsx:437-439`

**Issue:** The code manually iterates `localStorage` to find keys starting with `'cache_grupe_'` and calls `clearCache(k)` on each, then calls `queryClient.invalidateQueries({ queryKey: ['grupe'] })`. This dual-layer cache-bust is fragile: if the localStorage key naming convention changes in `utils/cache.ts` or the cache is populated under a different prefix, the manual clear silently does nothing. The `clearCache` utility already has a bulk-clear mode — this selective clear pattern adds coupling without guaranteed coverage.

**Fix:** If invalidating React Query cache (`['grupe']`) is the intent, `invalidateQueries` alone is sufficient. The `clearCache` call is redundant unless there is a specific localStorage cache that React Query does not know about — in that case, document the reason explicitly in a comment.

---

_Reviewed: 2026-06-15T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
