---
phase: 260704-x9p-sistem-istoric-activitate-super-admin-fe
reviewed: 2026-07-05T00:00:00Z
depth: quick
files_reviewed: 9
files_reviewed_list:
  - components/AppRouter.tsx
  - components/JurnalAudit.tsx
  - components/LazyComponents.tsx
  - components/menuConfig.ts
  - hooks/useAppLogic.ts
  - hooks/useAuth.ts
  - hooks/useRoleManager.ts
  - services/auditLogService.ts
  - types.ts
findings:
  critical: 3
  warning: 3
  info: 2
  total: 8
status: issues_found
---

# Phase 260704-x9p: Code Review Report

**Reviewed:** 2026-07-05T00:00:00Z
**Depth:** quick (escalated to targeted-standard for the specific concerns requested)
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the new SUPER_ADMIN_FEDERATIE audit log feature: `services/auditLogService.ts`, `components/JurnalAudit.tsx`, the `jurnal-audit` route wiring (`AppRouter.tsx`, `LazyComponents.tsx`, `menuConfig.ts`, `types.ts`), and the three audit-logging call sites (`useAuth.ts`, `useAppLogic.ts`, `useRoleManager.ts`).

Good news first: the route-level gate for `jurnal-audit` in `AppRouter.tsx:130` correctly uses `permissions.isSuperAdmin` (strictly `roleName === 'SUPER_ADMIN_FEDERATIE'`, confirmed in `hooks/usePermissions.ts:31`), not the broader `isFederationAdmin`. The DB-side RLS policy (`sql/migrations/extend_audit_log_260705.sql`) was also correctly tightened to `SUPER_ADMIN_FEDERATIE` only. `components/IstoricActivitate.tsx` and the `istoric-activitate` view are untouched by this diff (verified via `git diff d6a2b24 HEAD`) — the unrelated feature is safe.

However, the LOGOUT audit-logging call in `hooks/useAppLogic.ts` has a genuine, provable bug (stale closure + wrong field) that means LOGOUT events will essentially never log the correct user, and the `audit_log` INSERT policy allows any authenticated user to forge arbitrary audit rows including impersonating other users' `user_id` — both undermine the integrity/purpose of a security audit trail. There is also a menu-visibility inconsistency: the "Jurnal Audit" entry is added to `adminMenu`, which is shared by both `SUPER_ADMIN_FEDERATIE` and the legacy `ADMIN` role, so `ADMIN` users will see a menu item that always leads to an Access Denied screen.

## Critical Issues

### CR-01: LOGOUT audit log uses a stale closure and the wrong user id field — LOGOUT events will log `user_id: null` almost always

**File:** `hooks/useAppLogic.ts:29-41`
**Issue:**
```ts
const handleLogout = useCallback(async () => {
    try {
        logAuditEvent({ operatie: 'LOGOUT', userId: currentUser?.id ?? null });
        ...
    } ...
}, []);   // <-- empty deps array
```
Two compounding bugs:
1. **Stale closure:** `useCallback(..., [])` memoizes `handleLogout` permanently using whatever `currentUser` was bound to at the very first render of the component that calls `useAppLogic()`. `currentUser` is populated asynchronously after auth/data load (see `hooks/useDataProvider.ts:300`), so at the time the closure is created it is typically `null`/`undefined`. Because the deps array never includes `currentUser`, the callback never picks up the later, populated value — `currentUser?.id` will evaluate to `undefined` on virtually every real logout, so `logAuditEvent` is called with `userId: null` regardless of who is actually logged in.
2. **Wrong field even if the closure were fixed:** the rest of the codebase consistently uses `currentUser?.user_id` (or `session?.user?.id`) as the actual `auth.users.id` — e.g. `useAppLogic.ts:21` itself (`currentUser?.user_id || session?.user?.id`), `components/AdminConsole.tsx:137`, `components/Grupe/index.tsx:153/189`. `currentUser.id` is the *profile/sportiv row id* (`hooks/useDataProvider.ts:292/300-302`, `types.ts` `User.id` vs `User.user_id`), not the `auth.users.id`. `audit_log.user_id` is `REFERENCES auth.users(id)`, so even in the rare case `currentUser` were fresh, passing `currentUser.id` would frequently violate the FK constraint and the insert would fail — silently, because `logAuditEvent` swallows all errors.

Net effect: the LOGOUT audit trail this feature was built to provide is broken from day one, and the failure is invisible (no console warning, no thrown error) because of the fail-silent design combined with this bug.

**Fix:**
```ts
const handleLogout = useCallback(async () => {
    try {
        logAuditEvent({ operatie: 'LOGOUT', userId: currentUser?.user_id ?? session?.user?.id ?? null });
        ...
    } ...
}, [currentUser, session]);
```

### CR-02: `audit_log` INSERT policy allows any authenticated user to forge arbitrary audit entries, including impersonating another user's `user_id`

**File:** `services/auditLogService.ts:11-25` (enabled by `sql/migrations/create_audit_log.sql:26-29`, still in effect after `sql/migrations/extend_audit_log_260705.sql`)
**Issue:** `logAuditEvent` performs a direct client-side `supabase.from('audit_log').insert(...)` call using the logged-in user's own session (no server-side/SECURITY DEFINER indirection). The RLS INSERT policy is:
```sql
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
```
This policy was written under the assumption that only a SECURITY DEFINER trigger inserts rows (per the comment in `create_audit_log.sql:25`). By adding a legitimate, unauthenticated-payload client call path (`logAuditEvent`), any authenticated user — including a plain `SPORTIV` — can now call the same underlying Supabase table directly (e.g. from browser devtools) with **any** `user_id`, `club_id`, `operatie` (as long as it matches the CHECK list), `tabel`, and `date_noi`. Since the SELECT policy is now locked to `SUPER_ADMIN_FEDERATIE` only, this doesn't leak data, but it critically undermines the tamper-evidence/integrity guarantee of an audit log: any user can inject fake LOGIN/LOGOUT/ROL_SCHIMBAT (or even fake INSERT/UPDATE/DELETE) rows attributed to *other* `user_id`s, pollute the trail SUPER_ADMIN relies on for security review, or flood it with noise. There is no `DELETE`/`UPDATE` policy, so forged rows can never be corrected once inserted.
**Fix:** Restrict the INSERT policy so the client can only insert rows attributed to itself, and only for the client-triggerable operations:
```sql
DROP POLICY IF EXISTS audit_log_insert ON public.audit_log;
CREATE POLICY "audit_log_insert_self_auth_events"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND operatie IN ('LOGIN', 'LOGOUT', 'ROL_SCHIMBAT')
        AND sursa = 'auth'
    );
```
and keep a separate SECURITY DEFINER path (existing triggers) for INSERT/UPDATE/DELETE/SELECT_SENSIBIL audit rows that must not be client-forgeable.

### CR-03: ROL_SCHIMBAT audit event is racing `window.location.reload()` and can be silently dropped

**File:** `hooks/useRoleManager.ts:36-38`
**Issue:**
```ts
setActiveRoleContextId(newContextId);
logAuditEvent({ operatie: 'ROL_SCHIMBAT', userId, roleContextId: newContextId });
window.location.reload();
```
`logAuditEvent` is not awaited (by design, per the "fail-silent, non-blocking" requirement), but it is immediately followed — on the very next line, with no intervening `await` — by a full page reload. The underlying `supabase.from('audit_log').insert(...)` fetch is frequently still in flight when `window.location.reload()` tears down the page context, and browsers commonly cancel in-flight requests on navigation/reload. This means ROL_SCHIMBAT events (a security-relevant action) can be silently lost most of the time, defeating the purpose of logging them. The same pattern exists for LOGOUT in `useAppLogic.ts:31-36` (mitigated slightly there because `await supabase.auth.signOut()` introduces a network round-trip before the `window.location.href = '/'` navigation, giving the audit insert more time to complete, but it is still not guaranteed).
**Fix:** Await the audit call (it already fail-silences internally, so awaiting it does not risk throwing) before triggering navigation:
```ts
await logAuditEvent({ operatie: 'ROL_SCHIMBAT', userId, roleContextId: newContextId });
window.location.reload();
```

## Warnings

### WR-01: "Jurnal Audit" menu entry is visible to the legacy `ADMIN` role, not just `SUPER_ADMIN_FEDERATIE`

**File:** `components/menuConfig.ts:90`, `components/Sidebar.tsx:85-91`
**Issue:** The new menu item was added to `adminMenu`, which `Sidebar.tsx` selects for **both** `ROLES.SUPER_ADMIN_FEDERATIE` and `ROLES.ADMIN` (`case ROLES.SUPER_ADMIN_FEDERATIE: case ROLES.ADMIN: menu = adminMenu;`). The actual route gate in `AppRouter.tsx:130` is correctly `permissions.isSuperAdmin` (strict), so an `ADMIN`-role user cannot actually view audit data — but they will see a "Jurnal Audit" link in Setări & Admin that always resolves to the `AccessDenied` screen when clicked. This directly contradicts the stated design goal ("strictly SUPER_ADMIN_FEDERATIE-only, not the broader isFederationAdmin") at the UX/discoverability layer, and is confusing/looks broken to `ADMIN` users.
**Fix:** Either conditionally filter the item out of the rendered menu for non-super-admins (e.g. computed menu based on `permissions.isSuperAdmin` rather than a static role→menu map), or move the entry into a small super-admin-only menu fragment appended only when `permissions.isSuperAdmin` is true.

### WR-02: `fetchAuditLog` performs no client-side validation on the free-text `userId` filter

**File:** `services/auditLogService.ts:40`, `components/JurnalAudit.tsx:126-131`
**Issue:** The "ID utilizator" input accepts arbitrary text and is passed straight to `.eq('user_id', filters.userId)`. Not a SQL-injection risk (PostgREST parameterizes this), but a malformed (non-UUID) value will surface as a raw Postgres error message to the admin via the generic error card, which is a poor UX and could leak internal error text.
**Fix:** Validate/trim the value as a UUID before including it in filters, or catch invalid-input errors and show a friendlier message ("ID utilizator invalid").

### WR-03: Timezone ambiguity in "Până la data" filter

**File:** `components/JurnalAudit.tsx:57`
**Issue:** `dataEnd: dataEnd ? \`${dataEnd}T23:59:59\` : undefined` builds a timestamp with no timezone qualifier, which is interpreted by Postgres/PostgREST relative to the connection/session timezone (or as UTC depending on driver defaults), while `created_at` is stored in UTC. Depending on server/client timezone configuration, records near local midnight could be off by up to the UTC offset (e.g. excluded/included incorrectly for a full hour range in Romania's UTC+2/+3).
**Fix:** Build the boundary explicitly in UTC (e.g. via `date-fns` `endOfDay` + `toISOString()`), consistent with how `created_at` is stored.

## Info

### IN-01: Magic number `50` duplicated for page size

**File:** `components/JurnalAudit.tsx:9`, `services/auditLogService.ts:45`
**Issue:** `PAGE_SIZE = 50` in the component and the `?? 50` default in `fetchAuditLog` must be kept in sync manually; if one changes, pagination will misbehave.
**Fix:** Export a single shared constant (e.g. `AUDIT_LOG_PAGE_SIZE`) from `auditLogService.ts` and import it in `JurnalAudit.tsx`.

### IN-02: Fail-silent catch block gives zero observability

**File:** `services/auditLogService.ts:22-24`
**Issue:** The blanket `catch {}` (by design, to avoid blocking auth flows) means failures such as CR-02's FK violation are completely invisible, including in development. This makes bugs like CR-01 much harder to notice.
**Fix:** Add a `console.warn('[audit] logAuditEvent failed', err)` (dev-only or always) inside the catch — this keeps the fail-silent behavior for the auth flow itself while making regressions discoverable.

---

_Reviewed: 2026-07-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
