---
phase: 04-stagii-completare
reviewed: 2026-06-16T12:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - types.ts
  - hooks/useDataProvider.ts
  - components/Competitii/StagiiCompetitii.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-06-16T12:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Review covers the Phase 4 additions: 3 nullable price columns on `evenimente`, FK `eveniment_id` on `plati`, `preturiConfig` fetch in `useDataProvider`, `calculeazaCategorieStagiu` + `getTaxaStagiu` in `StagiiCompetitii.tsx`, `handleAddParticipant` with payment generation, and the Raport Participanți table with `platiParticipanti` useMemo join plus `exportParticipantiCSV`.

Three blockers found: a silent payment orphan on partial failure, a broken fallback join that can match payments for the wrong athlete, and a `createSetter` hook-inside-hook rules violation. Five warnings cover missing access control, a missing level of the 3-tier pricing fallback, stale-payment state after deletion, a floating Promise in the form submit chain, and an unsafe `currentUser` access. Three info items cover dead code, a debug `console.error` left in, and a missing encoding guard in CSV export.

---

## Critical Issues

### CR-01: Payment orphaned when `rezultate` insert succeeds but `plati` insert fails

**File:** `components/Competitii/StagiiCompetitii.tsx:292-318`

**Issue:** `handleAddParticipant` inserts into `rezultate` first (line 293), then conditionally inserts into `plati` (line 310). If the `plati` insert throws, the `catch` block at line 317 shows an error to the user but the `rezultate` row was already committed. The participant appears enrolled with no payment record, and the UI state is partially updated (`setRezultate` called at line 295 before the payment insert). There is no rollback or compensating delete. The user sees an error but the DB is inconsistent.

**Fix:** Reverse the insert order — create the payment first, then the result, or wrap both in a Supabase database function/RPC that is atomic. At minimum, if `plati` fails, issue a compensating delete against the freshly inserted `risultati` row before re-throwing:

```typescript
const { data, error } = await supabase.from('rezultate').insert(newRezultat).select().single();
if (error) throw error;

if (suma != null && suma > 0) {
    const { data: plataData, error: plataError } = await supabase
        .from('plati').insert(newPlata).select().single();
    if (plataError) {
        // Compensating delete — keep DB consistent
        await supabase.from('rezultate').delete().eq('id', data.id);
        throw plataError;
    }
    setPlati(prev => [...prev, plataData as Plata]);
}
// Only update local state after both DB writes succeed
setRezultate(prev => [...prev, data as Rezultat]);
```

---

### CR-02: `platiParticipanti` fallback join matches payments from other events (wrong-athlete cross-contamination)

**File:** `components/Competitii/StagiiCompetitii.tsx:348-358`

**Issue:** The `platiParticipanti` memo builds a `sportivId → Plata` map. The filter includes a fallback branch at line 353-354:

```typescript
(p.eveniment_id == null && rezultate.some(r => r.sportiv_id === p.sportiv_id))
```

This matches *any* `Taxa Stagiu` payment with no `eveniment_id` for a sportiv who appears in this event's results. A sportiv who previously had a legacy/migrated payment for a *different* stagiu (with `eveniment_id = null`) will have that old payment shown as if it belongs to the current event — wrong amount, wrong status. In the Raport Participanți table this produces incorrect tax amounts and incorrect payment status displayed to the admin.

**Fix:** Remove the loose fallback. New payments created by Phase 4 always set `eveniment_id`. Only legacy data has `eveniment_id = null`. If backward compatibility is required, add a date guard so only payments near the event date can be matched, and document that this is a best-effort heuristic — not a hard link.

```typescript
const platiParticipanti = useMemo(() => {
    const map = new Map<string, Plata>();
    filteredData.plati
        .filter(p =>
            p.tip === 'Taxa Stagiu' &&
            p.eveniment_id === eveniment.id   // strict match only
        )
        .forEach(p => { if (p.sportiv_id) map.set(p.sportiv_id, p); });
    return map;
}, [filteredData.plati, eveniment.id]);
```

---

### CR-03: `createSetter` calls `useCallback` inside a non-hook function — React Rules of Hooks violation

**File:** `hooks/useDataProvider.ts:493-496`

**Issue:** `createSetter` is defined as a regular function (not a React hook), yet it calls `useCallback` unconditionally inside its body:

```typescript
const createSetter = <K extends keyof AppData>(key: K) => 
    useCallback((value: React.SetStateAction<AppData[K]>) => {
        setData(prev => ({ ...prev, [key]: ... }));
    }, []);
```

`createSetter` is called multiple times in sequence (lines 514-536), which means `useCallback` is invoked inside a loop-like pattern driven by the call count. This violates the React Rules of Hooks ("don't call Hooks inside loops, conditions, or nested functions"). The current call count is fixed (18 calls), so React does not yet detect the violation, but any future conditional call or reordering will break Hook ordering silently. TypeScript and ESLint with the hooks plugin would flag this.

**Fix:** Inline the setter directly or use a factory that does not call Hook APIs, since `setData` is already stable from `useState`:

```typescript
// No useCallback needed — setData is already stable
const createSetter = <K extends keyof AppData>(key: K) =>
    (value: React.SetStateAction<AppData[K]>) => {
        setData(prev => ({
            ...prev,
            [key]: typeof value === 'function' ? (value as any)(prev[key]) : value
        }));
    };
```

Alternatively, memoize a single `createSetter` with `useCallback` and call it, not the result.

---

## Warnings

### WR-01: `handleAddParticipant` has no permission guard for Competitie type — any role can enroll

**File:** `components/Competitii/StagiiCompetitii.tsx:269-271`

**Issue:** The early-return permission check `if (!permissions.isAdminClub) return;` only gates enrollment for Stagiu events. When `eveniment.tip === 'Competitie'`, the code path continues through the same handler without any role check. An INSTRUCTOR or SPORTIV role context could call `handleAddParticipant` for a Competitie event and it would execute fully. The form is rendered inside `{permissions.isAdminClub && ...}` (line 465), which hides the UI, but the handler itself is not gated for Competitie.

**Fix:** Move the permission check above the type branch, or duplicate it:

```typescript
const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.isAdminClub) return;  // gate applies to ALL event types
    ...
```

---

### WR-02: `calculeazaCategorieStagiu` silently defaults athletes with no `data_nasterii` to `'grade'` category

**File:** `components/Competitii/StagiiCompetitii.tsx:138-153`

**Issue:** When `dataNasterii` is falsy (undefined/null), the age check is skipped entirely and the function falls through to the grade check. A sportiv with no birth date set is silently bucketed into `'grade'` (or `'centuri'` if they have a Dan grade). This means the wrong fee will be charged — a 10-year-old child with no `data_nasterii` pays the adult `pret_grade` price. The caller in `handleAddParticipant` (line 281) uses the returned category directly for payment generation with no warning to the admin.

**Fix:** Either return `null` when `dataNasterii` is missing and block enrollment, or surface a warning in the `taxaPreview` UI:

```typescript
function calculeazaCategorieStagiu(...): 'copii' | 'grade' | 'centuri' | null {
    if (!dataNasterii) return null; // caller must handle
    ...
}
```

In `handleAddParticipant` and `taxaPreview`, check for `null` and show a user-visible warning that the birth date is missing.

---

### WR-03: `getTaxaStagiu` skips "Nivel 2" — the comment says 3 levels but only 2 are implemented

**File:** `components/Competitii/StagiiCompetitii.tsx:155-168`

**Issue:** The comment on the function says "Fallback pe 3 niveluri" and labels the global config check as "Nivel 3", but there is no "Nivel 2" implemented. The original design (per RESEARCH.md comment in code) implies Nivel 2 was `tipuri_stagii.pret` — a per-stagiu-type price. This level is entirely absent. If an event has no per-category price but the stagiu type has a default price, that price is silently skipped and the function falls directly to the global config. Depending on the business configuration this may produce the wrong fee.

**Fix:** Either implement Nivel 2 (query `tipuri_stagii.pret` for the matching `tip_stagiu` and pass it into the function), or remove the misleading comment and renumber consistently. At minimum, update the comment to say "Fallback pe 2 niveluri" to avoid future confusion:

```typescript
// Nivel 1: preț per categorie pe eveniment
// Nivel 2: preț global din preturiConfig (tipuri_stagii.pret not yet implemented)
```

---

### WR-04: `confirmDelete` deletes `rezultate` but does not delete associated `plati` — payment orphans on event deletion

**File:** `components/Competitii/StagiiCompetitii.tsx:604-617`

**Issue:** `confirmDelete` deletes linked `rezultate` rows but not `plati` rows linked via `eveniment_id`. After Phase 4 added the `eveniment_id` FK on `plati`, deleting an event leaves behind payment records with a dangling `eveniment_id`. These orphan payments continue to appear in the sportiv's payment history and financial dashboard as unpaid debts for an event that no longer exists.

**Fix:** Add a deletion step for payments before or after deleting results:

```typescript
await supabase.from('plati').delete().eq('eveniment_id', id);
await supabase.from('rezultate').delete().eq('eveniment_id', id);
await supabase.from('evenimente').delete().eq('id', id);
```

Also update local state: `setPlati(prev => prev.filter(p => p.eveniment_id !== id))`.

---

### WR-05: `handleSave` in `StagiiCompetitiiManagement` is an `async` function passed to `EvenimentForm.onSave`, but the form's `handleSubmit` does not propagate errors — failures are swallowed

**File:** `components/Competitii/StagiiCompetitii.tsx:73-93` and `588-602`

**Issue:** `EvenimentForm.handleSubmit` calls `await onSave(eventData)` (line 90), then unconditionally calls `onClose()` (line 92). If `onSave` throws (e.g., Supabase error), the `catch` is in `handleSave` (lines 591, 599) which calls `showError` but does not re-throw. `handleSubmit` then proceeds to `setLoading(false)` and `onClose()`, closing the modal even when the save failed. The user sees the error toast but the form closes, losing their input.

**Fix:** Either re-throw from `handleSave` so `handleSubmit` can gate `onClose()`, or return a boolean success indicator and let `handleSubmit` decide:

```typescript
// In EvenimentForm.handleSubmit
try {
    await onSave(eventData as Omit<Eveniment, 'id'>);
    onClose(); // only close on success
} catch {
    // error already shown by handleSave via showError
} finally {
    setLoading(false);
}
```

---

## Info

### IN-01: `currentUser.club_id` accessed without null guard in `canEdit` lambda

**File:** `components/Competitii/StagiiCompetitii.tsx:632-635`

**Issue:** `canEdit` compares `ev.club_id === currentUser.club_id`. The `User` type declares `club_id` as `string | null | undefined`. If `currentUser` has no `club_id` (e.g., federation-level user), the comparison `ev.club_id === undefined` always returns `false`, so federation users can never edit club events through this path. This is currently masked by the `permissions.isFederationAdmin || permissions.isSuperAdmin` early return, but it is a fragile assumption that those checks will always precede the `club_id` comparison.

**Fix:** Explicit guard: `ev.club_id != null && ev.club_id === currentUser.club_id`.

---

### IN-02: Debug `console.error` calls left in production code

**File:** `components/Competitii/StagiiCompetitii.tsx:318, 327, 592, 599, 613`

**Issue:** Five `console.error('DETALII EROARE:', JSON.stringify(err, null, 2))` calls are scattered through mutation handlers. These expose internal error shapes (including potential Supabase error codes and query details) in the browser console in production. The project convention uses `showError()` for user-facing errors; the raw console log is a debug artifact.

**Fix:** Remove the `console.error` lines. `showError()` is already called immediately after each one and is the correct error channel.

---

### IN-03: `exportParticipantiCSV` does not escape commas inside field values — malformed CSV for names containing commas

**File:** `components/Competitii/StagiiCompetitii.tsx:383-403`

**Issue:** `numeSportiv`, `dataInscriere`, `categorie`, and `statusPlata` are wrapped in double-quotes, which is correct for CSV. However, `taxa` (line 389) is emitted without quotes: `rand.taxa != null ? rand.taxa.toFixed(2) : ''`. If `taxa` is empty string, the CSV column is empty without quotes — this is fine. But if `rand.statusPlata` or `rand.categorie` contain internal double-quotes (e.g., a name with `"`), those quotes are not escaped (RFC 4180 requires `""` escaping). This is a low-risk issue in this specific data domain but is a latent correctness gap.

**Fix:** Use a helper that doubles internal quotes:

```typescript
const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
```

Apply to all string columns.

---

_Reviewed: 2026-06-16T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
