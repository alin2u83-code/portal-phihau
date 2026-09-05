# Phase 18: Fix suprascriere silențioasă grad în istoric_grade - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 4 frontend files (5 call sites) + 1 live DB migration (no new file)
**Analogs found:** 5 / 5 (all files ARE the analog target — this is a refactor-in-place phase, not new-file creation)

**Note on this phase's shape:** Unlike typical new-feature phases, Phase 18 does not create new files — it removes a duplicated anti-pattern from 4 existing files and consolidates DB logic into one trigger. There is no "new file" to find an analog for; instead, the correct analog (`services/sportivService.ts`) shows what the CORRECT already-existing pattern in this codebase looks like, and the other 4 files must be edited to match it (i.e., stop doing the extra step it doesn't do).

## File Classification

| File | Role | Data Flow | Correct Reference Pattern | Match Quality |
|------|------|-----------|---------------------------|---------------|
| `services/sportivService.ts` | service | CRUD (insert istoric_grade only, no direct grad_actual_id write in `adaugaSportiv`) | — (this IS the reference) | exact — canonical correct pattern already lives here |
| `components/GestiuneExamene/ManagementInscrieri.tsx` | component (event handlers) | CRUD, 3 call sites use `Promise.all` batch writes | `services/sportivService.ts` → `adaugaSportiv` | role-match (component vs service, but same DB write shape to remove) |
| `hooks/useExamManager.ts` | hook (mutation logic) | CRUD, sequential `await` per row in a `for` loop | `services/sportivService.ts` → `adaugaSportiv` | role-match |
| `components/GestiuneExamene/RapoarteExamen.tsx` | component (event handler) | CRUD, sequential `await` per row in a `for` loop | `services/sportivService.ts` → `adaugaSportiv` | role-match |
| `components/GestiuneExamene/ImportExamenModal.tsx` | component (batch import) | CRUD, batched with `Promise.all(batch.map(...))` | `services/sportivService.ts` → `adaugaSportiv` | role-match |
| DB migration (no file — live Supabase) | trigger/function consolidation | event-driven (AFTER INSERT/UPDATE/DELETE trigger) | Faza 25-04 pattern: leave old functions defined, DROP only triggers, CREATE-before-DROP ordering | exact — same migration methodology used successfully before in this project |

## Pattern Assignments

### `services/sportivService.ts` — THE CORRECT PATTERN (reference only, not modified unless needed)

**File:** `services/sportivService.ts`, function `adaugaSportiv`, lines 5-34.

**Correct pattern to replicate** (lines 17-25):
```typescript
// Inserăm în istoric_grade pentru a stabili gradul inițial
if (sportivData.grad_actual_id) {
    await supabase.from('istoric_grade').insert({
        sportiv_id: inserted.id,
        grad_id: sportivData.grad_actual_id,
        data_obtinere: new Date().toISOString().split('T')[0],
        observatii: 'Înregistrare inițială'
    });
}
```
Note: no follow-up `.from('sportivi').update({ grad_actual_id })` — the insert into `sportivi` already included `grad_actual_id` directly in the row being created (line 14, `insert(sportivData)`), so this is not actually a counterexample of "double write" — it's a single-row insert. The important structural lesson for the other 4 files is: **write to `istoric_grade` and let the trigger (post-fix) do the derivation — never call `.update({ grad_actual_id })` on `sportivi` after the fact.**

A closer in-file example of the target end-state exists in `actualizeazaSportiv` (lines 117-126) — it inserts into `istoric_grade` via `upsert` with `onConflict: 'sportiv_id,grad_id'` and **does NOT follow up with a `sportivi.update({ grad_actual_id })` call**. This is the exact shape all 5 call sites should converge to:
```typescript
// Dacă gradul s-a schimbat manual din interfață, îl adăugăm în istoric
if (grad_actual_id) {
    const { error: historyError } = await supabase.from('istoric_grade').upsert({
        sportiv_id: id,
        grad_id: grad_actual_id,
        data_obtinere: new Date().toISOString().split('T')[0],
        observatii: 'Actualizare manuală din profil'
    }, { onConflict: 'sportiv_id,grad_id' });
    if (historyError) throw historyError;
}
// NOTE: no supabase.from('sportivi').update({ grad_actual_id }) here — relies on trigger (post-fix)
```

---

### `components/GestiuneExamene/ManagementInscrieri.tsx` (component, CRUD) — 3 call sites to fix

**Site 1 — `handleResultChange`, lines 1113-1189.** The direct write is lines 1151-1157:
```typescript
const newGrade = grade.find(g => g.id === newGradId);
const currentGrade = grade.find(g => g.id === inscriere.grad_actual_id);
if ((newGrade?.ordine ?? 0) > (currentGrade?.ordine ?? -1)) {
    allPromises.push(
        supabase.from('sportivi')
            .update({ grad_actual_id: newGradId })
            .eq('id', inscriere.sportiv_id)
    );
}
```
**Fix:** delete this entire `if` block (lines 1148-1157, including comment on 1148). Keep the `istoric_grade` upsert above it (lines 1142-1147) and keep `sportiviUpdatesLocal.push(...)` (line 1158) for optimistic UI.

**Site 2 — `handleAdmitAllConfirmed`, lines 1200-1283.** The direct write is lines 1230-1239:
```typescript
// Actualizează grad_actual_id în DB dacă noul grad e superior celui curent
const newGrade = grade.find(g => g.id === inscriere.grad_sustinut_id);
const currentGrade = grade.find(g => g.id === inscriere.grad_actual_id);
if ((newGrade?.ordine ?? 0) > (currentGrade?.ordine ?? -1)) {
    allPromises.push(
        supabase.from('sportivi')
            .update({ grad_actual_id: inscriere.grad_sustinut_id })
            .eq('id', inscriere.sportiv_id)
    );
}
```
**Fix:** delete this block (lines 1230-1239). Keep `istoric_grade` upsert (lines 1224-1229) and `sportiviUpdates.push(...)` (line 1240).

**Site 3 — `handleForceSync`, lines 1298-1349.** The direct write is lines 1317-1326:
```typescript
// Actualizează grad_actual_id în DB (sincronizare forțată)
const newGrade = grade.find(g => g.id === newGradId);
const currentGrade = grade.find(g => g.id === inscriere.grad_actual_id);
if ((newGrade?.ordine ?? 0) > (currentGrade?.ordine ?? -1)) {
    syncPromises.push(
        supabase.from('sportivi')
            .update({ grad_actual_id: newGradId })
            .eq('id', inscriere.sportiv_id)
    );
}
```
**Fix:** delete this block (lines 1317-1326). Note: `handleForceSync`'s entire *purpose* is to sync desynced `grad_actual_id` — post-fix, this function becomes largely redundant since the trigger keeps `grad_actual_id` in sync automatically on every `istoric_grade` write. Planner should flag whether `handleForceSync` / the "Force Sync" button / `desyncedInscrieri` (lines 1285-1296, which reads `sportiv.grad_actual_id !== expectedGradId` client-side) should be simplified or removed entirely in this phase — RESEARCH.md does not explicitly address this UI element, treat as a plan-time decision.

**Data flow note (from RESEARCH.md):** All 3 sites in this file use `Promise.all(allPromises)` / `Promise.all(syncPromises)` — the `istoric_grade` write and the (soon-to-be-removed) `sportivi` write race concurrently. This is the file where the actual data-corruption race condition manifests today.

---

### `hooks/useExamManager.ts` (hook, CRUD, sequential await) — 1 call site

**Location:** lines ~110-176 (function body containing the exam finalization loop). Direct write at lines 158-173:
```typescript
// Actualizează grad_actual_id direct în DB.
// Trigger-ul SQL sync_grad_actual_on_exam_result protejează contra downgrade,
// dar dacă triggerul nu e activ, actualizăm oricum (cel mai mare grad obținut
// este garantat de ordinea for-loop și de validarea de mai jos).
const targetGrade = grade.find(g => g.id === targetGradId);
const currentGrade = grade.find(g => g.id === inscriere.grad_actual_id);
const targetOrdine = targetGrade?.ordine ?? 0;
const currentOrdine = currentGrade?.ordine ?? -1;
if (targetOrdine > currentOrdine) {
    const { error: gradUpdateError } = await supabase
        .from('sportivi')
        .update({ grad_actual_id: targetGradId })
        .eq('id', inscriere.sportiv_id);
    if (gradUpdateError) throw gradUpdateError;
    appliedGradeBySportiv.set(inscriere.sportiv_id, targetGradId);
}
```
**Fix:** remove the `supabase.from('sportivi').update(...)` call and its guard/comment (lines 158-171), but **keep `appliedGradeBySportiv.set(inscriere.sportiv_id, targetGradId)`** (move it to run unconditionally right after the `istoric_grade` insert succeeds, still gated by the same `targetOrdine > currentOrdine` check if the file wants to preserve "only optimistically bump UI when it's actually an upgrade" semantics — since the trigger doing the real work server-side does not care what the frontend computes, but the local state comment on lines 178-184 explicitly explains why this local guard exists for UI purposes). Comment block lines 178-184 references this behavior and should be updated to no longer claim "the trigger will handle the DB update" as a fallback scenario — it should say the trigger is now the ONLY source of truth.

**Note from RESEARCH.md:** this call site already awaits sequentially (`istoric_grade` insert then `sportivi` update), so it does NOT exhibit the live race condition today — but D-03/D-04 still requires removing the direct write for architectural consistency.

---

### `components/GestiuneExamene/RapoarteExamen.tsx` (component, CRUD, sequential await) — 1 call site

**Location:** function body around lines 210-300. Direct write at lines 261-273:
```typescript
// Actualizează grad_actual_id în DB dacă noul grad e superior celui curent
// Aceasta este pasul care lipsea și cauza bug-ul: sportivi.grad_actual_id
// rămânea la valoarea veche în baza de date după finalizarea examenului.
const newGrade = props.grade?.find(g => g.id === targetGradId);
const currentGrade = props.grade?.find(g => g.id === inscriere.grad_actual_id);
if ((newGrade?.ordine ?? 0) > (currentGrade?.ordine ?? -1)) {
    const { error: gradUpdateError } = await supabase
        .from('sportivi')
        .update({ grad_actual_id: targetGradId })
        .eq('id', inscriere.sportiv_id);
    if (gradUpdateError) throw gradUpdateError;
    sportiviGradMap.set(inscriere.sportiv_id, targetGradId);
}
```
**Fix:** remove the `.from('sportivi').update(...)` call and error-throw (the inner 5 lines), keep `sportiviGradMap.set(inscriere.sportiv_id, targetGradId)` for optimistic local UI, still gated by the ordine comparison for the same reason as `useExamManager.ts`. The inline comment ("Aceasta este pasul care lipsea și cauza bug-ul...") documents a prior ad-hoc patch attempt — should be replaced/removed since the phase is fixing the actual root cause (the DB trigger), not re-adding this frontend write.

---

### `components/GestiuneExamene/ImportExamenModal.tsx` (component, batch import) — 1 call site

**Location:** lines ~599-620, inside a `Promise.all(batch.map(async (row) => {...}))` block. Direct write at lines 607-611:
```typescript
if (row.Rezultat === 'Admis') {
    const { data: sportivCurent } = await supabase
        .from('sportivi')
        .select('grad_actual_id, grade(ordine)')
        .eq('id', finalSportivId)
        .single();
    const currentOrdine = (sportivCurent?.grade as any)?.ordine ?? -1;
    if (gradOrdine > currentOrdine) {
        await supabase.from('sportivi')
            .update({ grad_actual_id: gradId })
            .eq('id', finalSportivId);
    }
    await supabase.from('istoric_grade')
        .upsert({
            sportiv_id: finalSportivId,
            grad_id: gradId,
            data_obtinere: dataExamen,
            sesiune_examen_id: sessionId,
            club_id: sesiuneClubId,
        }, { onConflict: 'sportiv_id,grad_id' });
}
```
**Note the reversed order here vs. other 4 sites** — this is the ONLY call site where the direct `sportivi.update` happens **BEFORE** the `istoric_grade` upsert (awaited sequentially, so no live race, but architecturally the wrong order even pre-fix). **Fix:** delete the entire `select current grade + conditional update` block (lines 601-611, the `sportivCurent`/`currentOrdine`/`if (gradOrdine > currentOrdine) { update }` portion), keep only the `istoric_grade` upsert (lines 612-619). Also note line 554 and line 590 write `grad_actual_id` directly into the initial `insert()` payload for brand-new sportivi (`grad_actual_id: row.Rezultat === 'Admis' ? gradId : null`) — per D-04 ("cu excepția... inserării inițiale la creare sportiv nou, care rămâne insert normal"), these two are exempt from the fix and should NOT be touched, since they are the same "insert with correct value directly on row creation" pattern as `adaugaSportiv` in `sportivService.ts` line 11/14.

---

## Shared Patterns

### Pattern: "insert into istoric_grade, no follow-up update on sportivi"
**Canonical source:** `services/sportivService.ts`, `actualizeazaSportiv`, lines 117-126.
**Apply to:** all 5 call sites above. After the fix, the ONLY thing every one of these should do is insert/upsert into `istoric_grade` with the real event date; never touch `sportivi.grad_actual_id` directly (except brand-new-sportiv row creation, exempted per D-04).

### Pattern: optimistic local state without a DB write
**Source:** all 5 call sites already do this correctly for the optimistic-UI half (`sportiviUpdatesLocal.push(...)`, `setSportivi(prev => ...)`, `appliedGradeBySportiv.set(...)`, `sportiviGradMap.set(...)`) — keep these unchanged. Only the DB write (`.from('sportivi').update({ grad_actual_id })`) is being removed, not the local optimistic state update.

### Pattern: DB migration methodology (CREATE new trigger before DROP old ones)
**Source:** Faza 25-04 precedent (per RESEARCH.md "State of the Art" section) — old functions left defined without `DROP FUNCTION` after their triggers are removed; only the trigger objects are dropped, to avoid a "no active trigger" window.
**Apply to:** the single DB migration in this phase, per the exact `BEGIN...COMMIT` SQL block already drafted in RESEARCH.md (see "Recommended Migration Structure" — CREATE `sync_grad_actual_canonical()` + `trg_sync_grad_actual_canonical` trigger FIRST, then DROP the 4 old triggers `trg_after_history_change`, `trg_sync_grad_actual_from_istoric`, `trg_sync_grade_on_history_change`, `trg_sync_grad_actual_manual`, and `tr_sync_grad_history` on `sportivi`).
**Must-verify-live-first step (blocking):** run `pg_get_functiondef` + `pg_trigger` queries from RESEARCH.md "Open Questions #1" before writing/applying the final migration — RESEARCH.md confirms this was already done once (see "Live Verification" section — trigger/function names confirmed identical to CONTEXT.md, zero drift, `fn_sync_grad_to_history` confirmed to use `ON CONFLICT ... DO NOTHING` not `DO UPDATE`), so the plan can proceed directly to the migration without re-doing this step, per RESEARCH.md's own note that "Open Questions #1 is now RESOLVED."
**Must preserve:** `SECURITY DEFINER SET search_path = public` on the new canonical function (matches existing pattern from Faza 25-04 fix on `tr_automatizeaza_roluri`), and must continue to write `metoda_selectie_grad = 'automat'` (confirmed used by `components/UserProfile.tsx` lines 357/363 — do not drop this column write).

## No Analog Found

None — all 5 frontend call sites have `services/sportivService.ts` as a valid in-codebase reference for the target end-state, and the DB migration has the Faza 25-04 precedent for methodology (though the actual SQL trigger bodies are DB-only, not in any file — RESEARCH.md already captured them via live MCP verification).

## Metadata

**Analog search scope:** `services/`, `components/GestiuneExamene/`, `hooks/useExamManager.ts` — all explicitly named in CONTEXT.md/RESEARCH.md, no additional glob/grep search needed since RESEARCH.md already did exhaustive grep on `grad_actual_id\s*:` across 53 files and confirmed the write-sites subset = exactly these 5.
**Files scanned:** 5 (all read in full via targeted offset/limit ranges covering the relevant functions)
**Pattern extraction date:** 2026-09-06
