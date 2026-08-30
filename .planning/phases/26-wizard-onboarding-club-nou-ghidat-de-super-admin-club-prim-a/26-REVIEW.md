---
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
reviewed: 2026-08-31T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - api/creare-cont.ts
  - components/AppRouter.tsx
  - components/CluburiManagement.tsx
  - hooks/useRoleAssignment.ts
  - utils/parola.test.ts
  - utils/parola.ts
findings:
  critical: 3
  warning: 3
  info: 2
  total: 8
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-08-31T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the club-onboarding wizard (`CluburiManagement.tsx` + `useRoleAssignment.ts`), its server-side guard (`api/creare-cont.ts`), the password generator (`utils/parola.ts` + test), and `AppRouter.tsx`.

The password generator (`utils/parola.ts`) is solid: real `crypto.getRandomValues`-based rejection sampling (no modulo bias, verified by tracing the `0xFFFFFFFF` threshold math), Fisher-Yates shuffle, and forced-class-presence logic that the test file actually exercises correctly.

The server-side guard in `api/creare-cont.ts`, however, has a genuine authorization bug: it computes the caller's privilege weight and club membership *independently* instead of *per club*, which lets a multi-role user (e.g. `ADMIN_CLUB` in club A + `SPORTIV` in club B — a completely normal situation per this app's multi-role model) create a high-privilege account in a club where they have no real authority. Separately, the endpoint has no rollback path when the account-creation RPC fails after the `auth.users` row is created — this directly breaks the "retry" UX that `CluburiManagement.tsx` was explicitly built to support (comments reference D-07), turning a recoverable failure into a permanent dead end. `AppRouter.tsx` also has a Rules-of-Hooks violation (hooks declared after early `return` statements) that can crash the whole app under specific state transitions.

## Critical Issues

### CR-01: Club-scoping check is not tied to the caller's per-club role weight — cross-club privilege escalation

**File:** `api/creare-cont.ts:53-91`

**Issue:** The endpoint computes `callerMaxWeight` as the maximum role weight across *all* of the caller's roles regardless of club (line 64), and separately builds `cluburiApelant` as the set of *any* club where the caller holds *any* role (line 87). The role-weight check (lines 76-83) and the club-scoping check (lines 86-91) are then evaluated independently, not jointly per club.

Concretely: a user who is `ADMIN_CLUB` (weight 3) in Club A and merely `SPORTIV` (weight 1) in Club B — a normal, expected configuration in this multi-role/multi-club app (see CLAUDE.md: "Un utilizator poate avea roluri multiple la cluburi diferite") — passes both checks when creating an `ADMIN_CLUB` account **in Club B**:
- `callerMaxWeight = 3` (from Club A) → role check `ROLE_WEIGHTS['ADMIN_CLUB'] (3) > callerMaxWeight (3)` is false → passes.
- `cluburiApelant = {A, B}` (any club with any role) → `userData.club_id = B` is in the set → passes.

The caller ends up able to grant `ADMIN_CLUB` in a club where their actual role is only `SPORTIV`. This is exactly the class of bug the surrounding comments (T-26-01/T-26-02) claim to defend against.

**Fix:** Compute weight *per club* and require the requested role's weight to be `<=` the caller's weight *in the target club specifically* (skip this when `callerMaxWeight >= 5`, i.e. true federation admin):

```ts
if (callerMaxWeight < 5) {
  const perClubWeight = new Map<string, number>();
  for (const r of callerRoles) {
    if (!r.club_id) continue;
    const w = ROLE_WEIGHTS[r.rol_denumire] || 0;
    perClubWeight.set(r.club_id, Math.max(perClubWeight.get(r.club_id) || 0, w));
  }
  const clubWeight = userData?.club_id ? (perClubWeight.get(userData.club_id) || 0) : 0;
  if (!userData?.club_id || clubWeight === 0) {
    return res.status(403).json({ error: 'Nu puteți crea conturi în alt club.' });
  }
  for (const roleName of roles) {
    if (ROLE_WEIGHTS[roleName] > clubWeight) {
      return res.status(403).json({ error: 'Nu puteți acorda un rol cu privilegii mai mari decât rolul dvs. în acest club.' });
    }
  }
}
```

---

### CR-02: No rollback of orphaned `auth.users` row when the account RPC fails — permanently breaks the retry flow it was built for

**File:** `api/creare-cont.ts:93-150`, `components/CluburiManagement.tsx:169-234`

**Issue:** When `supabaseAdmin.auth.admin.createUser(...)` succeeds (line 97-102) but the subsequent `supabaseAdmin.rpc('refactor_create_user_account', ...)` fails (line 131-150), the code does `if (rpcError) throw rpcError;` with **no cleanup of the just-created auth user**. Compare with the sibling endpoint `api/genereaza-magic-link.ts:97-100`, which correctly does:
```ts
if (rpcError) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
  throw rpcError;
}
```
`creare-cont.ts` omits this.

This leaves an `auth.users` row with **no corresponding `sportivi` row** (the RPC is what creates it). On any subsequent attempt to create an account for the same email — including the exact "Reîncearcă Crearea Contului Admin" retry button in `CluburiManagement.tsx` (`handleRetryAdmin`, lines 212-222) which was built specifically to recover from this scenario (see comments referencing D-07) — the flow hits the `isAlreadyRegistered` branch (`creare-cont.ts:104-125`), looks up the user by `sportivi.email` (which doesn't exist), and throws: *"Emailul ... există în autentificare dar nu are un profil sportiv asociat. Contactați administratorul."*

Worse: `handleCloseModal` (`CluburiManagement.tsx:227-234`) tells the SUPER_ADMIN they can fall back to creating the account from **User Management** instead — but that fallback goes through the exact same `/api/creare-cont` endpoint and email-lookup logic, so it fails identically. There is currently **no UI-driven recovery** once this happens; only a manual database fix (deleting the orphaned `auth.users` row) resolves it. This defeats the entire purpose of the retry mechanism this phase implemented.

**Fix:** Mirror `genereaza-magic-link.ts`'s cleanup — delete the auth user on RPC failure when it was newly created in this request (do not delete when `userId` came from the "already registered → existing sportiv" branch):

```ts
let userId: string;
let justCreatedAuthUser = false;

// ...
if (authError) {
  // ... existing lookup path (userId = existingSportiv.user_id)
} else {
  userId = authData.user.id;
  justCreatedAuthUser = true;
}

// ...
if (rpcError) {
  if (justCreatedAuthUser) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
  }
  throw rpcError;
}
```
Additionally, consider making the "already registered but no `sportivi` row" lookup check `auth.users` directly (e.g. via `listUsers`/admin API) so a partially-created account can still be resumed even without this fix.

---

### CR-03: `useState` hooks declared after conditional early returns — Rules-of-Hooks violation, crash risk

**File:** `components/AppRouter.tsx:91-104`

**Issue:** `AppRouter` calls two `useState` hooks (lines 103-104, `sportivIdPentruRaport` / `sportivProfilTab`) **after** two conditional `return` statements (lines 91-97):

```tsx
if (currentUser && currentUser.email?.endsWith('@frqkd.ro')) {
    return <OnboardingCompletare ... />;
}
if (currentUser && currentUser.trebuie_schimbata_parola) {
    return <MandatoryPasswordChange ... />;
}
// ...
const [sportivIdPentruRaport, setSportivIdPentruRaport] = useState<string | null>(null);
const [sportivProfilTab, setSportivProfilTab] = useState(...);
```

If `currentUser.trebuie_schimbata_parola` (or the `@frqkd.ro` email condition) changes value on a re-render of this *same mounted component instance* — e.g. `currentUser` is refreshed via `setCurrentUser` from `AccountSettings` (line 271) or any other context update, without a full `window.location.reload()` — the number of hooks called on that render differs from the previous render. React will throw its hard invariant error ("Rendered fewer/more hooks than during the previous render"), crashing the entire view. Today this is only masked because both current call sites of `onCompleted`/`onPasswordChanged` happen to call `window.location.reload()`, which remounts the whole tree — but that is incidental, not structural, protection, and any future code path that flips `trebuie_schimbata_parola` without a full reload will crash.

**Fix:** Move both `useState` calls above the early `return` statements (order relative to other hooks doesn't matter, only that they're unconditional):

```tsx
const [sportivIdPentruRaport, setSportivIdPentruRaport] = useState<string | null>(null);
const [sportivProfilTab, setSportivProfilTab] = useState<...>(undefined);

if (currentUser && currentUser.email?.endsWith('@frqkd.ro')) {
    return <OnboardingCompletare ... />;
}
if (currentUser && currentUser.trebuie_schimbata_parola) {
    return <MandatoryPasswordChange ... />;
}
```

## Warnings

### WR-01: Server never validates password strength — client-side policy is not enforced

**File:** `api/creare-cont.ts:70-102`

**Issue:** `password` is taken directly from `req.body` and passed to `supabaseAdmin.auth.admin.createUser` with no length/complexity check. The app's actual password policy (`LUNGIME_MINIMA_PAROLA = 12`, defined in `utils/parola.ts`) is enforced only by the client (`genereazaParolaTemporara()` in `CluburiManagement.tsx`). Any caller with an `INSTRUCTOR`+ weight token (weight ≥ 2, the minimum required to reach this endpoint) can call `/api/creare-cont` directly with an arbitrary weak password (e.g. `"a"`), bypassing D-05 entirely.

**Fix:** Re-validate on the server:
```ts
import { LUNGIME_MINIMA_PAROLA } from '../utils/parola';
if (typeof password !== 'string' || password.length < LUNGIME_MINIMA_PAROLA) {
  return res.status(400).json({ error: `Parola trebuie să aibă cel puțin ${LUNGIME_MINIMA_PAROLA} caractere.` });
}
```

### WR-02: Missing validation of required body fields before use

**File:** `api/creare-cont.ts:70, 97-148`

**Issue:** `email`, `userData`, and nested fields (`userData.nume`, `userData.prenume`) are used without checking they exist. If `userData` is omitted or malformed, the code fails deep inside the try block (e.g. `userData.nume` on line 132 throws `Cannot read properties of undefined`) and the client receives a raw, unhelpful 500 instead of a clear 400. Note the inconsistency: `userData?.club_id` (line 88) is defensively optional-chained, but the same object's other fields (lines 132-146) are not.

**Fix:** Add an early guard right after destructuring:
```ts
if (!email || typeof email !== 'string' || !userData?.nume || !userData?.prenume) {
  return res.status(400).json({ error: 'Date lipsă sau invalide pentru crearea contului.' });
}
```

### WR-03: `ROLE_WEIGHTS` duplicated with no shared source of truth

**File:** `api/creare-cont.ts:7-13`, `hooks/useRoleAssignment.ts:11-17`

**Issue:** The exact same role-weight map is hand-copied into two files, linked only by a code comment ("Oglindește exact roleWeights din hooks/useRoleAssignment.ts"). There is no compile-time or runtime guarantee the two stay in sync. If a role is added/renamed in one location and not the other, the drift can either lock out legitimate operations (client thinks a role is available, server rejects it) or — worse — silently reopen the privilege-escalation class of bug this file exists to prevent (e.g. if a new high-weight role is added client-side but omitted server-side, `ROLE_WEIGHTS[roleName] || 0` on the server evaluates to `0`, and the loop at `creare-cont.ts:76-83` would then treat that role as weight 0, letting *anyone* with weight ≥ 2 grant it).

**Fix:** Extract `ROLE_WEIGHTS` into a single shared module (e.g. `constants/roleWeights.ts`) importable from both the API handler and the hook, since `api/` and root-level modules already share the same TS project.

## Info

### IN-01: `utils/parola.test.ts` is not wired into any automated test run

**File:** `utils/parola.test.ts:1-9`

**Issue:** `package.json`'s `"test"` script runs `playwright test` only; this file must be run manually (`node --import tsx utils/parola.test.ts`). It follows an existing project convention (`utils/luniLipsa.test.ts`), so this isn't new, but it does mean a regression in the password generator (e.g. someone "simplifying" `indexAleator` back to `Math.random()`) would not be caught by CI.

**Fix:** Consider adding a `"test:unit": "node --import tsx utils/*.test.ts"` script (or equivalent glob runner) invoked in CI, covering this file and its siblings.

### IN-02: Inconsistent return type from `updateRoles`

**File:** `hooks/useRoleAssignment.ts:99-191`

**Issue:** `updateRoles` returns `false` on every early-exit/error path but `Rol[]` (via `allRoles.filter(...)`) on success (line 174), with no explicit return type annotation on the function. Callers must inspect the runtime type of the result to know whether the call succeeded, which is easy to get wrong (e.g. `if (!result)` accidentally treating an empty-but-valid `Rol[]` array as falsy is not currently a risk since `finalRoleIds` is never empty by line 123-125, but the pattern is fragile against future changes).

**Fix:** Return a discriminated result, e.g. `{ success: true, roles: Rol[] } | { success: false }`, and add an explicit return type to the function signature.

---

_Reviewed: 2026-08-31T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
