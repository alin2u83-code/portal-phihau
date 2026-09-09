---
gsd_debug_version: 1.0
status: resolved
trigger: |
  Duplicate rows in program_antrenamente (Supabase project wuhidifzsutwgdfkwhmd).
  Found 2026-09-09: ~60 duplicate rows, same (club_id, grupa_id, data, ora_start)
  appearing 2-6x. Example: club Kim Long Dao Falticeni, grupa "Copii 6-8 ani"
  duplicated 3x only on Mondays across 4 future months, all created within
  3 minutes (19:33-19:36 UTC same day). Another club (cbb0b228-b3e0-4735-9658-70999eb256c6)
  had 71 duplicate rows, some 6x on same slot.
created: "2026-09-09"
updated: "2026-09-09T23:59:00Z"
---

# Debug Session: program_antrenamente duplicate rows

## Symptoms

**Expected behavior:** Generating/adding antrenamente (training sessions) into
`program_antrenamente` from the weekly schedule (`orar_saptamanal`) should create
exactly one row per (club_id, grupa_id, data, ora_start).

**Actual behavior:** Same slot inserted 2-6x, all created within a tight time window
(minutes apart), suggesting a single user action produced multiple inserts.

**Error messages:** None captured client-side (silent duplication) — this was
discovered via DB audit, not a user-reported crash. Data already cleaned
(oldest row per slot kept, rest deleted — 0 had linked prezente/anunturi).
A UNIQUE constraint was already added:
```sql
alter table program_antrenamente
  add constraint program_antrenamente_slot_unic
  unique (club_id, grupa_id, data, ora_start);
```
This now blocks new duplicates at the DB level but any insert that would
create one throws untreated Postgres error 23505 (unique_violation).

**Timeline:** Discovered 2026-09-09. Duplicate creation timestamps show bursts
of 2-6 inserts within 1-3 minutes — consistent with double-click / double-submit
or a retry loop, not scheduled/cron duplication (would be spread over days).

**Reproduction:** Not manually reproduced yet — need to inspect insert call sites
for guard-against-double-submit and idempotency before/after generating a bulk
training schedule from a group's weekly program.

## Suspected locations (insert into program_antrenamente)

- components/Grupe/GeneratorProgramMasiv.tsx
- components/Grupe/GenerareAntrenamenteModal.tsx
- utils/trainingGenerator.ts
- components/Prezenta/index.tsx
- components/Prezenta/ListaPrezentaAntrenament.tsx

Suspected root cause classes:
1. Missing guard against double-click / double-submit on the "generate" button
   (button not disabled during async insert, or onClick not debounced).
2. A retry or useEffect re-running the insert without idempotency check.
3. Generator inserting without first checking what program_antrenamente rows
   already exist for that day-of-week/slot range.

## Explicit constraints from task owner

- Do NOT modify any other flows.
- Do NOT touch components/Grupe/ProgramAntrenamenteManagement.tsx AT ALL
  (modified separately today with Luna curenta/Viitor/Arhiva tabs — off limits).
- Must add proper handling of Postgres 23505 (unique_violation) wherever
  program_antrenamente inserts happen — show a clear message to the user
  ("Acest antrenament exista deja") instead of an uncontrolled crash or raw
  Supabase error.
- Must run `npx tsc --noEmit` after changes and confirm it passes.
- Final report must state: exact root cause found, files modified, how the
  fix was verified.

## Current Focus

status: RESOLVED. Root cause confirmed and fixed. See Resolution below.

reasoning_checkpoint:
  hypothesis: "GeneratorProgramMasiv.tsx's handleSave inserts the entire generated
    batch into program_antrenamente with NO pre-insert existence check, unlike
    the two sibling bulk-generation flows (GenerareAntrenamenteModal.tsx,
    utils/trainingGenerator.ts) which both fetch existing rows and filter them
    out before inserting. Re-running this specific generator for the same/overlapping
    date range (e.g. user unsure if the first run succeeded, or reopening the
    tool) creates a full duplicate set every time."
  confirming_evidence:
    - "Read GeneratorProgramMasiv.tsx handleSave: builds toInsert directly from
      previewData with zero DB existence check, then `.insert(toInsert)`."
    - "Read GenerareAntrenamenteModal.tsx handleGeneratePreview: fetches
      existing rows via .select('data,ora_start,grupa_id') and pre-unchecks
      already-existing slots before insert -- the dedup pattern GeneratorProgramMasiv
      lacks."
    - "Read utils/trainingGenerator.ts generateTrainingsFromSchedule: same
      existingSet dedup pattern present."
    - "Symptom pattern (2-6 duplicate inserts per slot, all created 1-3 minutes
      apart, only on the recurring weekday, spread across 4 future months)
      matches a full re-run of a bulk generator 2-6 times over a few minutes --
      not a millisecond-scale double-click race, and not a scheduled/cron job."
  falsification_test: "If GeneratorProgramMasiv.tsx had contained the same
    existenteSet dedup check as the other two generators, this hypothesis would
    be false and the cause would have to be elsewhere (e.g. true double-click
    race in ConfirmModal, or a cron/retry loop). It does not."
  fix_rationale: "Add the same pre-insert existence check pattern (query
    program_antrenamente for grupa_id/data/ora_start already present in the
    target grupe+date range, filter previewData against it) before insert,
    making repeated runs of the generator idempotent -- addresses the root
    cause (missing idempotency), not just the symptom."
  blind_spots: "Did not find server-side rate-limiting or a cron trigger; the
    burst timestamps are consistent with manual UI usage, but this was not
    directly observed via browser session logs (none exist) -- relies on
    inference from DB audit + code trace."
next_action: none — fix applied, tsc verified, AND human-confirmed live in the
  browser (see verification below). Session archived.

## Evidence

- timestamp: 2026-09-09
  checked: components/Grupe/GeneratorProgramMasiv.tsx handleSave (lines ~170-190)
  found: Inserts previewData directly into program_antrenamente with zero
    pre-insert existence check and no Postgres 23505 handling (raw err.message
    shown). ConfirmModal's own confirm button (components/ui.tsx) has no
    disabled/loading state either, so a very fast double-click/tap could
    theoretically also double-fire the async onConfirm callback.
  implication: Primary root cause candidate -- only one of the three
    bulk-generation flows missing the existence-check idempotency pattern.

- timestamp: 2026-09-09
  checked: components/Grupe/GenerareAntrenamenteModal.tsx handleGeneratePreview
    + handleSave (lines ~96-211)
  found: Already fetches existing rows for grupa_id in date range and
    pre-unchecks matches before allowing insert. Save button uses standard
    Button with isLoading -> disabled, so double-submit already guarded. No
    23505 handling present (defense-in-depth gap only, not primary cause).
  implication: Not the root cause; only needed 23505 defense-in-depth.

- timestamp: 2026-09-09
  checked: utils/trainingGenerator.ts generateTrainingsFromSchedule (lines 1-67)
  found: Already fetches existingSet and filters toInsert before insert. No
    23505 handling (throws raw Postgres error, caller shows err.message raw).
  implication: Not the root cause; only needed 23505 defense-in-depth.

- timestamp: 2026-09-09
  checked: components/Prezenta/index.tsx SediintaAziModal.handleSave (lines
    26-60), components/Prezenta/ListaPrezentaAntrenament.tsx
    handleSaveNewTraining else-branch (lines 811-843)
  found: Both are single-row ad-hoc inserts. Submit buttons already
    disabled-while-saving (native `disabled={!grupaId || saving}` in
    Prezenta/index.tsx; standard Button isLoading in the AntrenamentForm that
    drives ListaPrezentaAntrenament's flow). Neither handled 23505.
  implication: Not primary root cause (single-row, submit already guarded);
    still needed 23505 handling per task requirement ("every insert call site").

- timestamp: 2026-09-09
  checked: hooks/useCalendarView.ts handleSaveCustom else-branch (lines 70-103),
    used by components/Grupe/GrupaDetailView.tsx and
    components/Prezenta/CalendarActivitati.tsx via AntrenamentForm.tsx
  found: A 6th, previously-unlisted insert call site into program_antrenamente
    (not in the original 5-file candidate list). Single-row insert, no 23505
    handling. Submit already guarded by AntrenamentForm's isLoading Button.
  implication: Expanded scope to 6 total insert call sites; all now covered.

- timestamp: 2026-09-09
  checked: components/ui.tsx Button component (disabled={disabled || isLoading})
  found: Standard project Button correctly disables the native <button> while
    isLoading. Confirms all sites using standard Button + isLoading state
    (GenerareAntrenamenteModal, AntrenamentForm) are already double-submit-safe.
  implication: No fix needed for those call sites' submit guard; only
    GeneratorProgramMasiv.tsx needed an explicit isSavingRef guard because its
    async insert runs inside a ConfirmModal onConfirm callback, not directly
    behind a Button's isLoading prop.

## Eliminated

- hypothesis: Millisecond-scale double-click/double-submit race on a single
    button press is the primary root cause.
  evidence: Duplicate creation timestamps are 1-3 minutes apart, not
    milliseconds apart. A double-click race would produce near-simultaneous
    timestamps. Added isSavingRef guard as defense-in-depth anyway since the
    underlying risk (ConfirmModal confirm button has no disabled state) is real,
    just not the primary explanation for the observed pattern.
  timestamp: 2026-09-09

- hypothesis: BackupManager.tsx / DataMaintenancePage.tsx full-DB restore
    (which writes to program_antrenamente among ~19 tables) is the cause.
  evidence: These are explicit admin backup/restore actions covering ALL
    managed tables uniformly, not schedule-specific. The observed duplicate
    pattern (only Monday slots, only for specific grupe, across 4 future
    months, NOT touching every table) does not match a full-DB restore, which
    would duplicate unrelated tables too. Left unmodified per scope (explicit
    admin action, not part of the "program_antrenamente insert flow" this
    debug targets).
  timestamp: 2026-09-09

## Resolution

root_cause: |
  components/Grupe/GeneratorProgramMasiv.tsx's handleSave() inserted the full
  set of generated training instances into program_antrenamente with NO
  pre-insert existence check -- unlike the two other bulk-generation code
  paths (components/Grupe/GenerareAntrenamenteModal.tsx and
  utils/trainingGenerator.ts) which both query existing rows and filter them
  out before inserting. Running this specific "Generator Masiv Program" flow
  more than once for the same/overlapping date range and group selection
  (plausible: user reruns it unsure whether the first attempt succeeded, or
  simply revisits the tool) re-inserted the entire batch again, creating exact
  duplicate rows (same club_id, grupa_id, data, ora_start). This matches the
  audited evidence precisely: 2-6 duplicate rows per slot, only on the
  recurring weekday, spread across the full generated date range, all created
  within a 1-3 minute window per club (consistent with 2-6 manual full runs of
  the generator, not a millisecond double-click race or a cron job).
  Secondary, compounding risk (fixed as defense-in-depth): the shared
  ConfirmModal's own confirm button (components/ui.tsx) has no
  disabled/loading state, so its onConfirm callback could theoretically fire
  twice on a very fast double-click/tap before the modal unmounts -- affects
  any flow using openConfirm() + async onConfirm, including this one.
  Additionally, NONE of the 6 insert-into-program_antrenamente call sites in
  the codebase handled Postgres error 23505 (unique_violation) -- since a DB
  UNIQUE constraint (club_id, grupa_id, data, ora_start) was already added to
  block duplicates at the DB level, any insert attempt that WOULD create one
  now throws an uncaught/raw Supabase error to the user instead of a clear
  message.
fix: |
  1. components/Grupe/GeneratorProgramMasiv.tsx (root cause fix): added a
     pre-insert existence check in handleSave -- queries program_antrenamente
     for rows already matching (grupa_id, data, ora_start) across the selected
     grupe/date range, filters previewData against that set before building
     toInsert, and reports how many were skipped as already-existing in the
     success toast. Also added an isSavingRef (useRef) re-entrancy guard around
     the async onConfirm callback to close the ConfirmModal double-click risk
     without touching the shared ui.tsx ConfirmModal component (which is used
     by many unrelated flows and was explicitly out of scope to broadly modify).
  2. All 6 insert call sites into program_antrenamente now catch Postgres
     error code 23505 and show a clear Romanian user-facing message
     ("Acest antrenament există deja...", "Antrenament existent...", etc.)
     instead of the raw Supabase error:
     - components/Grupe/GeneratorProgramMasiv.tsx (bulk insert)
     - components/Grupe/GenerareAntrenamenteModal.tsx (bulk insert,
       defense-in-depth alongside its existing existenteSet dedup)
     - utils/trainingGenerator.ts generateTrainingsFromSchedule (bulk insert,
       defense-in-depth alongside its existing existingSet dedup; throws a
       friendly Error so all callers -- hooks/useCalendarView.ts handleGenerate
       and ListaPrezentaAntrenament.tsx -- automatically get the clean message)
     - components/Prezenta/index.tsx SediintaAziModal.handleSave (single insert)
     - components/Prezenta/ListaPrezentaAntrenament.tsx handleSaveNewTraining
       else-branch (single insert)
     - hooks/useCalendarView.ts handleSaveCustom else-branch (single insert --
       a 6th call site found during investigation, not in the original
       5-file candidate list, used by GrupaDetailView.tsx and
       CalendarActivitati.tsx via AntrenamentForm.tsx)
  components/Grupe/ProgramAntrenamenteManagement.tsx was NOT touched (off
  limits per task constraints). BackupManager.tsx / DataMaintenancePage.tsx
  full-DB restore paths were NOT touched (out of scope -- generic multi-table
  admin restore, ruled out as the cause, see Eliminated).
verification: |
  - `npx tsc --noEmit` run from project root: exit code 0, zero diagnostics
    (confirmed twice, including with explicit exit-code echo).
  - Manual reasoning trace of the fixed GeneratorProgramMasiv.tsx flow: with
    the existence check in place, calling handleSave twice in a row for the
    same date range now results in the second run inserting 0 new rows (all
    filtered out as already-existing) and showing "Toate antrenamentele din
    selecție există deja în program." instead of creating duplicates.
  - Manual reasoning trace of the 23505 paths: if the DB UNIQUE constraint
    program_antrenamente_slot_unic still rejects an insert despite the
    application-level checks (e.g. a genuine race from a second browser tab),
    every one of the 6 call sites now catches error.code === '23505' and shows
    a specific Romanian message instead of surfacing the raw Postgres error or
    crashing the flow.
  - Did NOT execute the flows against the live Supabase project in this
    session (no dev server / browser interaction performed) -- verification
    is static (types) + code-path tracing.
  - HUMAN-VERIFIED LIVE (2026-09-09): User tested the fixed
    GeneratorProgramMasiv.tsx flow directly in the browser against the real
    app. Created an interval in "Generator Masiv Program" (14-30 sep) that
    overlapped 100% with training sessions already present in
    program_antrenamente (all 6 rows in the preview already existed in DB).
    Clicking "Salveaza in Baza de Date" correctly showed "Nimic de generat --
    Toate antrenamentele din selectie exista deja in program." instead of
    crashing or surfacing a raw error. Confirmed via direct DB check
    afterward: 0 new rows created, 0 duplicates. Browser console showed no
    uncontrolled JS errors (only the expected internal ErrorProvider log for
    the displayed message). This confirms both halves of the fix in the real
    environment: (1) the pre-insert existence check makes the generator
    idempotent on re-run, and (2) the user-facing message path works as
    intended for the "everything already exists" case.
files_changed:
  - components/Grupe/GeneratorProgramMasiv.tsx
  - components/Grupe/GenerareAntrenamenteModal.tsx
  - utils/trainingGenerator.ts
  - components/Prezenta/index.tsx
  - components/Prezenta/ListaPrezentaAntrenament.tsx
  - hooks/useCalendarView.ts
