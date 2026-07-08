# Phase 17: Verifica migratie dedup live + decizie MFA - Research

**Researched:** 2026-07-08
**Domain:** (1) PostgreSQL/Supabase migration-state verification, (2) Supabase Auth MFA (TOTP/phone) re-enablement scoped to 2 roles in a client-only SPA
**Confidence:** HIGH

## Summary

This phase has two independent deliverables and both are now well understood at the code level.

**Deliverable 1 (dedup migration verification)** requires no new investigation — CONTEXT.md already contains a session-verified fact (via `pg_get_functiondef` run directly against the live production Supabase project `wuhidifzsutwgdfkwhmd`): `merge_sportivi()` and `find_similar_sportivi()` on production already have the new behavior. The only work is (a) correcting the stale "NU a fost aplicata live" header comment in `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql`, and (b) encoding the two verification queries as a reproducible, scripted acceptance check rather than a one-off claim.

**Deliverable 2 (MFA)** is more involved than CONTEXT.md's summary suggests, because git history reveals *why* MFA was disabled, and that reason is a hard technical constraint, not just a UX/friction judgment call: on 2026-06-07 the team briefly switched `SetupMFAPage.tsx` to enroll an `'email'` MFA factor type (commit `f3ccaea`), then 13 minutes later disabled the guard entirely (commit `f33c4cc`) with the message *"Email OTP not supported by Supabase."* This is confirmed independently in this research session: the installed `@supabase/auth-js` (v2.103.1, satisfies the project's `^2.98.0` dependency) type definitions declare `FactorTypes = ['totp', 'phone', 'webauthn']` — there is no `'email'` factor type in the Supabase Auth API. The `SetupMFAPage.tsx` file currently still calls `supabase.auth.mfa.enroll({ factorType: 'email' as any })` — this is dead-end code using a type-unsafe cast to call an API surface that does not exist. **Any plan for this phase must replace the email-OTP enrollment flow with TOTP** (confirmed via official Supabase docs: TOTP is free, enabled by default on all Supabase projects, requires zero Dashboard configuration — unlike phone MFA, which requires the same paid SMS provider setup as phone login).

The original pre-disable `useMFAGuard.ts` (recovered via `git show f33c4cc^:hooks/useMFAGuard.ts`) used the correct Supabase API (`supabase.auth.mfa.getAuthenticatorAssuranceLevel()`, checking `currentLevel`/`nextLevel`) and the correct role-check pattern (`activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire`, matching the exact pattern used in `hooks/usePermissions.ts` and `hooks/useAppLogic.ts`). This logic can be restored largely as-is, narrowed from 3 roles (`ADMIN_CLUB`, `SUPER_ADMIN_FEDERATIE`, `ADMIN`) to the 2 CONTEXT-locked roles (`ADMIN_CLUB`, `SUPER_ADMIN_FEDERATIE`) — note `'ADMIN'` does not appear to be a role in `docs/roluri-permisiuni.md`'s canonical 4-role list and should not be carried forward without confirming it's a real value in `roluri.nume`.

**Critical gap found in both the old and current wiring:** `useMFAGuard(activeRoleContext)` is called in `App.tsx` but its `{ mfaChecked }` return value has never been used anywhere to gate rendering (confirmed: `mfaChecked` appears in only one other place in the whole codebase — the hook's own source file). The original implementation only ever triggered `navigateTo('setup-mfa')` as a `useEffect` side effect; it did not prevent the current view from rendering during the async gap between mount and the MFA check resolving. This means the *original* implementation was never actually a "hard block" in the sense CONTEXT.md's locked decision now requires (no grace period, no flash of protected content) — the planner must design real render-gating (e.g., block `<AppLayout>` behind `mfaChecked` inside `App.tsx`'s `currentUser ? (...) : ...` branch, not just re-enable the old hook verbatim).

**Primary recommendation:** Re-enable `useMFAGuard.ts` using `getAuthenticatorAssuranceLevel()` scoped to `['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE']`, gate `AppLayout` rendering on `mfaChecked` (loading spinner until the async AAL check resolves, matching the existing `MartialArtsSkeleton`/loading pattern already used for `loading` in `App.tsx`), and switch `SetupMFAPage.tsx` from the broken `'email'` factor type to `'totp'` (QR code enrollment — already partially scaffolded as `AuthMFAEnrollTOTPResponse.totp.qr_code`/`.secret`/`.uri` in the installed SDK). Before flipping enforcement, audit which of the currently-active admin accounts already have a verified MFA factor (via `supabase.auth.admin.mfa.listFactors({ userId })`, service-role only, server-side) to avoid locking out the only `SUPER_ADMIN_FEDERATIE` account.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dedup migration state verification | Database / Storage | — | `pg_get_functiondef` is pure DB introspection; no app-tier code is involved in "is it live" |
| MFA factor enrollment (TOTP) | Browser / Client | API / Backend (Supabase Auth/GoTrue) | Enrollment UI runs client-side (`SetupMFAPage.tsx`), but Supabase Auth (GoTrue) is the source of truth for factor state and AAL — the client never stores or validates the TOTP secret itself |
| MFA enforcement gate (block app access) | Browser / Client | API / Backend (RLS `aal2` check, optional defense-in-depth) | `useMFAGuard` runs in the SPA and gates React rendering; CONTEXT.md's spec doesn't require a DB-level `aal2` RLS policy, but the original design doc (`2026-06-06-db-security-design.md`) proposed one as defense-in-depth — out of scope for this phase unless the planner explicitly adds it |
| Rollout safety check (who already has MFA) | API / Backend (server-side, service-role) | — | `supabase.auth.admin.mfa.listFactors()` requires the service-role key; must run in an `api/*.ts` handler or a one-off script, never client-side (per project convention: service-role key is backend-only) |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Migratie deduplicare — VERIFICAT DEJA** (in aceasta sesiune, direct pe DB live `wuhidifzsutwgdfkwhmd`):
- Rulat `pg_get_functiondef` pe `merge_sportivi()` si `find_similar_sportivi()` direct pe Supabase live.
- Confirmat: migratia ESTE aplicata live.
  - `merge_sportivi()` face `DELETE FROM public.sportivi WHERE id = p_secundar_id` dupa mutarea tranzactionala a FK-urilor (descoperite dinamic din `information_schema`, nu lista hardcodata) + guard `has_access_to_club()`.
  - `find_similar_sportivi()` NU mai exclude `status='Inactiv'`, exclude doar tombstone-uri (`propunere_modificare->>'merge_in' IS NOT NULL`), scope explicit pe club (`is_super_admin() OR club_id = context activ`).
- Nu mai e nevoie sa se ruleze migratia — doar sa se documenteze verificarea si sa se corecteze comentariul stale din `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql` care zice "NU a fost aplicata live" (dezinformare pentru viitor).
- Planul trebuie sa includa un task de verificare live reproductibil (aceleasi query-uri `pg_get_functiondef`) ca parte din acceptance criteria, nu doar sa preia afirmatia asta ca atare.

**MFA — obligatoriu pentru roluri admin:**
- Cine e obligat: `SUPER_ADMIN_FEDERATIE` + `ADMIN_CLUB`. `INSTRUCTOR` si `SPORTIV` raman cu MFA opțional (voluntar, cum e acum via view `setup-mfa`).
- Enforcement: blocare imediata — daca un user cu rol obligatoriu da login fara MFA configurat, e redirectionat fortat la `setup-mfa` si NU poate accesa restul aplicatiei pana nu configureaza. Fara perioada de gratie, fara banner de amanare.
- Ce nu se schimba: `INSTRUCTOR`/`SPORTIV` — comportament identic cu azi (MFA disponibil, nu fortat).
- Sursa actuala de dezactivat: `hooks/useMFAGuard.ts` — intoarce hardcodat `{ mfaChecked: true }`. Planul trebuie sa reactiveze logica reala de verificare si sa o restranga la cele 2 roluri, nu la toti userii.

### Claude's Discretion

Not explicitly separated in CONTEXT.md, but implied discretion areas (per this research):
- Which Supabase MFA factor type to use for enrollment (TOTP vs phone vs email) — CONTEXT.md does not lock this; research strongly recommends **TOTP** (see Summary — email is not a supported API factor type, phone requires paid SMS provider config).
- Exact render-gating mechanism in `App.tsx` (loading spinner vs conditional render) — CONTEXT.md specifies the *behavior* (immediate hard block) but not the *implementation*.
- Whether to keep the `'ADMIN'` string in the role-check array — not a canonical role per `docs/roluri-permisiuni.md`; recommend dropping it unless a grep of `roluri.nume` values in the DB confirms it's used.

### Deferred Ideas (OUT OF SCOPE)

- MFA obligatoriu pentru toti userii (inclusiv sportivi) — respins pentru acum, friction prea mare la 3500+ sportivi; poate revenit in discutie daca adoptia MFA creste organic.
- Perioada de gratie / banner de avertizare — respins, enforcement e blocare imediata.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` (incl. `@supabase/auth-js`) | 2.103.1 installed (declared `^2.98.0`) [VERIFIED: `node_modules/@supabase/supabase-js/package.json`, `node -e "require(...)"` ] | Auth session, MFA enroll/challenge/verify/AAL check | Already the project's sole auth client; no new dependency needed |

No new packages are required for either deliverable — both are: (1) a documentation/comment fix + a verification SQL snippet, and (2) re-wiring existing, already-installed Supabase Auth MFA APIs. **Package Legitimacy Audit is not applicable — this phase installs zero new external packages.**

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| none | — | — | — |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TOTP factor type | Phone (SMS) factor type | Requires configuring an SMS provider (Twilio/MessageBird/Vonage) in Supabase Dashboard → Auth → Phone, which is a *separate* config from this project's existing custom `SMS_PROVIDER`/`ANDROID_GATEWAY_URL` (those are used for the app's own notification SMS, not Supabase Auth's phone-login/MFA subsystem) [CITED: supabase.com/docs/guides/auth/auth-mfa/phone]. Adds cost + setup friction with no benefit over TOTP for this phase's scope (2 technical-enough roles: ADMIN_CLUB, SUPER_ADMIN_FEDERATIE) |
| TOTP factor type | WebAuthn (passkeys/hardware keys) | Officially supported third option per installed SDK types, but far higher UX complexity (needs platform authenticator or security key) than justified for ~35 club admins; no existing project code references it |
| Email OTP | N/A | **Not a valid option** — confirmed not supported by Supabase Auth MFA API (only `totp`, `phone`, `webauthn` exist in `FactorTypes`). Do not reintroduce; this is exactly what broke last time |

**Installation:**
No install needed — SDK already present.

**Version verification:** `node -e "console.log(require('@supabase/supabase-js/package.json').version)"` → `2.103.1`. `grep -n "FactorTypes" node_modules/@supabase/auth-js/dist/main/lib/types.d.ts` → `declare const FactorTypes: readonly ["totp", "phone", "webauthn"];` [VERIFIED: local node_modules type definitions, cross-checked against official docs at supabase.com/docs/reference/javascript/auth-mfa-api]

## Package Legitimacy Audit

Not applicable — this phase installs zero new external packages (both deliverables use already-installed `@supabase/supabase-js` APIs and existing project files).

## Architecture Patterns

### System Architecture Diagram

```
Login (session established, AAL=aal1)
        │
        ▼
App.tsx: useAppLogic() resolves activeRoleContext
        │
        ▼
useMFAGuard(activeRoleContext)                     <-- Browser/Client tier
        │
        ├─ role NOT in ['ADMIN_CLUB','SUPER_ADMIN_FEDERATIE']?
        │       └─ mfaChecked = true immediately (no MFA check performed)
        │
        └─ role IS admin/super-admin:
                │
                ▼
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()   <-- calls Supabase Auth (GoTrue) API/Backend tier
                │
                ├─ error (network) → fail-open: mfaChecked = true (documented tradeoff, see Pitfall 3)
                │
                ├─ nextLevel === 'aal2' && currentLevel === 'aal2' → mfaChecked = true, render app normally
                │
                └─ nextLevel !== currentLevel (MFA not verified this session)
                        │
                        ▼
                navigateTo('setup-mfa')  +  mfaChecked stays false until view === 'setup-mfa'
                        │
                        ▼
        App.tsx render gate: while mfaChecked === false AND activeView !== 'setup-mfa'
                        │  → render loading/blocking screen INSTEAD of <AppLayout> (NEW — must be added)
                        ▼
        activeView === 'setup-mfa' → <SetupMFAPage /> (TOTP enroll/verify flow)
                        │
                        ▼
        On successful verify(): session AAL upgraded to aal2 → navigateTo('dashboard')
```

### Recommended Project Structure

No new files/folders — modify in place:
```
hooks/
├── useMFAGuard.ts          # restore real check, scope to 2 roles, keep fail-open on network error
components/
├── SetupMFAPage.tsx        # switch enroll({factorType: 'email'}) -> enroll({factorType: 'totp'}), add QR code render
App.tsx                     # use mfaChecked to gate AppLayout render, not just call the hook
sql/fixes/
├── fix_deduplicare_include_inactivi_merge_delete.sql   # correct stale header comment only
```

### Pattern 1: Role-scoped MFA guard (restore + narrow)

**What:** A hook that checks the *active* role context (not any role the user holds) against a fixed admin-roles list, and only then queries Supabase Auth's AAL.
**When to use:** Any app-level enforcement that must respect the project's "active role context, not global user roles" convention (per `docs/roluri-permisiuni.md` and `CLAUDE.md`).
**Example (recovered from `git show f33c4cc^:hooks/useMFAGuard.ts`, narrowed per CONTEXT.md):**
```typescript
// hooks/useMFAGuard.ts
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigation } from '../contexts/NavigationContext';

// CONTEXT.md locked scope: doar aceste 2 roluri, NU 'ADMIN' (nu e rol canonic, vezi docs/roluri-permisiuni.md)
const MFA_REQUIRED_ROLES = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'];

export function useMFAGuard(activeRoleContext: any | null) {
    const { navigateTo, activeView } = useNavigation();
    const [mfaChecked, setMfaChecked] = useState(false);

    useEffect(() => {
        if (!activeRoleContext) return;
        if (activeView === 'setup-mfa') {
            setMfaChecked(true);
            return;
        }

        const roleName = activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire;
        const isPrivilegedRole = MFA_REQUIRED_ROLES.includes(roleName);

        if (!isPrivilegedRole) {
            setMfaChecked(true);
            return;
        }

        supabase?.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
            if (error) {
                // Fail-open documentat: eroare retea nu blocheaza accesul (vezi Pitfall 3)
                console.error('[useMFAGuard] MFA level check failed:', error.message);
                setMfaChecked(true);
                return;
            }
            const currentLevel = data?.currentLevel;
            const nextLevel = data?.nextLevel;
            if (!nextLevel || nextLevel === 'aal1' || (nextLevel === 'aal2' && currentLevel !== 'aal2')) {
                navigateTo('setup-mfa');
                return; // NU seta mfaChecked=true aici — vezi App.tsx gating
            }
            setMfaChecked(true);
        });
    }, [activeRoleContext, activeView]);

    return { mfaChecked };
}
```
*Source: recovered from git history (`git show f33c4cc^:hooks/useMFAGuard.ts`), cross-checked API shape against official docs (supabase.com/docs/reference/javascript/auth-mfa-api).*

### Pattern 2: TOTP enrollment (replaces broken email-OTP flow)

**What:** Standard 3-step TOTP enrollment: `enroll({factorType:'totp'})` → render QR + secret → `challenge()` → `verify()`.
**When to use:** `SetupMFAPage.tsx`'s `init()` and `sendCode()`/`verifyCode()` equivalents.
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/auth-mfa/totp
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  issuer: 'PhiHau', // shown in authenticator app
});
// data.id -> factorId
// data.totp.qr_code -> prefix with 'data:image/svg+xml;utf-8,' to render as <img src=...>
// data.totp.secret -> fallback manual-entry secret

// user scans QR, opens Google Authenticator/Authy, gets 6-digit code
const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
const { error: verifyErr } = await supabase.auth.mfa.verify({
  factorId,
  challengeId: challenge.id,
  code: userEnteredCode,
});
// on success, session AAL is upgraded to aal2
```
Note the current `SetupMFAPage.tsx` already has the right *shape* (factorId/challengeId/code state machine, `listFactors()` cleanup of unverified factors) — only the `factorType` value and the UI copy ("Îți trimitem un cod de verificare pe adresa de email" → needs to become "Scaneaza codul QR cu Google Authenticator") need to change, plus rendering the QR code image which the email flow never needed.

### Pattern 3: Reproducible dedup migration verification (scriptable acceptance check)

**What:** Turn the ad-hoc `pg_get_functiondef` queries already run in the CONTEXT-gathering session into a checked acceptance criterion the plan can reference by name.
**Example:**
```sql
-- Run via Supabase MCP execute_sql or SQL Editor; expected assertions below
SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'merge_sportivi';
-- ASSERT: def LIKE '%DELETE FROM public.sportivi%'
-- ASSERT: def LIKE '%has_access_to_club%'  -- club guard present

SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'find_similar_sportivi';
-- ASSERT: def NOT LIKE '%status <> ''Inactiv''%'
-- ASSERT: def NOT LIKE '%status = ''Activ''%'
-- ASSERT: def LIKE '%merge_in%'  -- tombstone exclusion still present
```
A plan task should encode these as literal grep/pattern assertions against the query output (not just "eyeball it"), so the phase's verification step is reproducible by anyone re-running it, and by `/gsd-verify-work` later.

### Anti-Patterns to Avoid

- **Reintroducing `factorType: 'email'`:** Not a real Supabase Auth API surface. The `as any` cast in the current `SetupMFAPage.tsx` is masking this — any TypeScript-honest refactor will immediately surface the type error if the cast is removed. Do not "fix" the type error by re-adding a cast; fix it by switching to `'totp'`.
- **Checking `userRoles` (all roles) instead of `activeRoleContext`:** Per CONTEXT.md and project convention, the check MUST be against the *active* role context. A user who is `SPORTIV` at club A and `ADMIN_CLUB` at club B must only be blocked when `ADMIN_CLUB`@B is the currently active context — not merely because they *hold* an admin role somewhere.
- **Calling the hook without using its return value:** Both the current disabled hook and (per this research) the *original* pre-disable hook are called in `App.tsx` (`useMFAGuard(activeRoleContext);`) without ever consuming `{ mfaChecked }` to gate rendering. Re-enabling the hook's internal logic without also wiring `mfaChecked` into the render tree reproduces the exact same "soft redirect with a flash of protected content" gap that existed before — this does not satisfy CONTEXT.md's "no grace period" requirement.
- **Running `supabase.auth.admin.mfa.listFactors()` client-side:** Requires the service-role key; must run server-side only (`api/*.ts` handler or one-off Node script), per this project's established convention (service-role key is backend-only, confirmed via `grep -rl SUPABASE_SERVICE_ROLE_KEY api/`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOTP secret generation / QR code rendering | Custom TOTP library (e.g., `otplib`) + QR generator | `supabase.auth.mfa.enroll({factorType:'totp'})` — returns ready-made `qr_code` (SVG string) and `secret` | Supabase Auth (GoTrue) already generates and stores the TOTP secret server-side and validates codes on `verify()`; a custom implementation would need to independently manage secret storage/rotation and duplicate what the platform already does for free |
| "Is this user's session MFA-verified" check | Custom flag on `public.users` table (e.g., `mfa_verified boolean`) updated manually | `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` (reads live session JWT claims) | A hand-rolled boolean column can go stale (e.g., user removes their authenticator app, or session is from a different device) — AAL is derived from the actual signed session, not a mutable app-level flag |
| Admin visibility into "who has MFA enrolled" | Custom SQL query against `auth.mfa_factors` via direct Postgres connection | `supabase.auth.admin.mfa.listFactors({ userId })` (official Admin API, service-role) | Using the Admin API avoids depending on internal Supabase Auth schema table names/shapes, which are not a public contract and can change between Supabase platform versions |

**Key insight:** Every part of this MFA re-enablement is "wire existing, already-verified APIs back together correctly" — the risk in this domain is not "what library to use" (there is only one, already installed) but "which of the 3 real factor types to pick" and "does the render-gating actually block, or just redirect-after-render."

## Common Pitfalls

### Pitfall 1: Reintroducing the exact bug that caused the June 7 disable
**What goes wrong:** Someone re-enables `useMFAGuard.ts` from the design doc (`docs/superpowers/specs/2026-06-06-db-security-design.md` §4.3) verbatim, which still shows the *original* TOTP-based hook example correctly, but if `SetupMFAPage.tsx` isn't also fixed, the guard will force every admin to `setup-mfa`, where enrollment will fail because `factorType: 'email'` is not a valid API call.
**Why it happens:** The design doc's hook example (§4.3, line ~206) is TOTP-correct, but the design doc's `SetupMFAPage.tsx` was never written to match — the actual implementation (git commit `89e9b82`) started with TOTP but was mutated to `'email'` in `f3ccaea` before being fully disabled.
**How to avoid:** Verify with a manual TOTP enrollment test (scan QR with an actual authenticator app, enter code, confirm `verify()` succeeds and AAL becomes `aal2`) before considering the guard "done."
**Warning signs:** `enrollErr` from `supabase.auth.mfa.enroll()` referencing an invalid/unrecognized factor type, or TypeScript errors on `factorType: 'email'` once the `as any` cast is removed.

### Pitfall 2: Render-gating gap ("hard block" not actually hard)
**What goes wrong:** `useMFAGuard` correctly detects "no MFA, must redirect" and calls `navigateTo('setup-mfa')`, but because this happens inside a `useEffect` (post-render), the *first* render of the protected view (`<AppLayout>` with real sportivi/financiar data) still mounts and briefly renders before the effect fires and the navigation takes effect. For financial/medical data this is a real, if brief, exposure — and does not satisfy CONTEXT.md's explicit "fara perioada de gratie" requirement.
**Why it happens:** React effects run after paint; `mfaChecked` starts `false` but nothing in `App.tsx` currently branches on it (confirmed: only one reference to `mfaChecked` exists project-wide, inside the hook itself).
**How to avoid:** In `App.tsx`, change the `currentUser ? (<AIAssistantProvider>...<AppLayout/>...) : ...` branch so that when `isPrivilegedRole && !mfaChecked && activeView !== 'setup-mfa'`, it renders a loading screen (reuse the existing `MartialArtsSkeleton` used for `loading`) instead of `<AppLayout>`.
**Warning signs:** Manual test — log in as an admin without MFA configured, and check (e.g., via React DevTools or a deliberate slow network throttle) whether any sensitive view flashes before the redirect to `setup-mfa` fires.

### Pitfall 3: Fail-open on network errors is a deliberate, documented tradeoff — don't "fix" it into fail-closed without discussion
**What goes wrong:** A well-meaning security review might see `if (error) { setMfaChecked(true); ... }` (fail-open on network error) and "fix" it to fail-closed (block access on any error). This would mean any transient Supabase Auth network hiccup locks out every admin, all the time — including possibly during an outage where speed of response matters.
**Why it happens:** The original implementation (recovered from git history) explicitly chose fail-open with the comment "eroare de rețea nu trebuie să blocheze accesul" — this was a considered tradeoff, not an oversight.
**How to avoid:** Preserve fail-open behavior unless CONTEXT.md or the user explicitly revisits this tradeoff; do not silently invert it during "hardening."
**Warning signs:** None currently — flagging proactively since this phase's theme (security hardening) makes it a tempting "improvement" to make unprompted.

### Pitfall 4: Locking out the only SUPER_ADMIN_FEDERATIE account
**What goes wrong:** Enforcement goes live; the SUPER_ADMIN_FEDERATIE account (likely singular or very small in number, per project scale — 7 clubs live currently) has never enrolled MFA; on next login they are redirected to `setup-mfa` and (per Pitfall 2, once fixed) cannot access anything else — including the DB/dashboard needed to disable enforcement again if something goes wrong with enrollment itself (e.g., a bug in the new TOTP flow).
**Why it happens:** No pre-flight check of who currently has a verified MFA factor before flipping enforcement live.
**How to avoid:** Before merging/deploying the enforcement change, run a one-off server-side script (using `SUPABASE_SERVICE_ROLE_KEY`, per existing `api/*.ts` convention) that calls `supabase.auth.admin.listUsers()` + `supabase.auth.admin.mfa.listFactors({ userId })` for every user holding `ADMIN_CLUB` or `SUPER_ADMIN_FEDERATIE`, and confirm at least the acting admin's own account (and ideally all of them) already has a `verified` factor, OR have that admin complete enrollment via the *voluntary* `setup-mfa` flow (already live today, unaffected by this phase) immediately before the enforcement change ships.
**Warning signs:** Deploying enforcement and then being unable to log in as super-admin to verify it worked — this is the failure mode to explicitly test against in this phase's acceptance criteria (a rollback plan / feature flag is recommended, e.g., an env var or Zustand-persisted override, though CONTEXT.md doesn't ask for one — flag as an open question for the planner).

### Pitfall 5: Assuming `activeRoleContext.roluri.nume` is always present
**What goes wrong:** The role-check line `activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire` depends on which query populated `activeRoleContext` (a join-shaped object with `.roluri.nume` vs a flat object with `.rol_denumire`) — if a future refactor of `useRoleManager`/`useAppLogic` changes which shape is used without updating this fallback chain, MFA enforcement could silently degrade to "never matches, never enforced."
**Why it happens:** TypeScript strict mode is disabled project-wide (`tsconfig.json`), so `activeRoleContext: any` — no compile-time safety here.
**How to avoid:** Reuse the exact same fallback expression already used in `hooks/usePermissions.ts` line 29 and `hooks/useAppLogic.ts` line 23 (both use the identical `activeRoleContext.roluri?.nume || activeRoleContext.rol_denumire` pattern) rather than inventing a new one — this keeps all three role-checks in sync with a single failure mode if the shape ever changes.
**Warning signs:** `usePermissions` and `useMFAGuard` disagreeing about whether the current context "is admin" (e.g., menu shows admin-only items but MFA guard never fires).

## Code Examples

### Rollout safety check (server-side, run once before enabling enforcement)
```typescript
// One-off script or api/ handler — service role required, NEVER client-side
// Source: https://supabase.com/docs/reference/javascript/auth-admin-mfa-listfactors
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function auditAdminMfaCoverage(adminUserIds: string[]) {
  for (const userId of adminUserIds) {
    const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
    if (error) { console.error(userId, error.message); continue; }
    const hasVerified = data.factors.some(f => f.status === 'verified');
    console.log(userId, hasVerified ? 'OK - has MFA' : 'RISK - no MFA factor');
  }
}
```

### App.tsx render-gating (new — the piece that was always missing)
```typescript
// App.tsx — inside the currentUser ? (...) branch, before rendering <AppLayout>
const roleName = activeRoleContext?.roluri?.nume || activeRoleContext?.rol_denumire;
const isPrivilegedRole = ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'].includes(roleName);
const blockedByMfa = isPrivilegedRole && !mfaChecked && activeView !== 'setup-mfa';

// ...
currentUser ? (
  blockedByMfa ? (
    <MartialArtsSkeleton />  // reuse existing loading screen; no protected content mounts
  ) : (
    <AIAssistantProvider ...>
      <AppLayout ... />
    </AIAssistantProvider>
  )
) : ( /* ... */ )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Email OTP as MFA factor | TOTP (or phone) as MFA factor | Was never actually "current" — attempted 2026-06-07, reverted same day (13 min later) | Confirms email is not a supported Supabase Auth MFA factor type; do not re-attempt |
| `useMFAGuard` redirect-only (soft) | Render-gated block (hard) | Being introduced by this phase, per CONTEXT.md's "no grace period" requirement | New; no prior implementation in this codebase actually did this |

**Deprecated/outdated:**
- `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql` header comment claiming "NU a fost aplicata live" — stale as of this session's verification; must be corrected as part of this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The dedup migration verification performed in the CONTEXT-gathering session (via `pg_get_functiondef` against `wuhidifzsutwgdfkwhmd`) is accurate and the production DB has not changed since | Summary, User Constraints | If someone rolled back or re-applied an older version of these functions between context-gathering and plan execution, the plan's "just document + fix comment" scope would be wrong; the plan should re-run the verification queries itself, not just trust the prior session's output |
| A2 | `'ADMIN'` (present in the original 3-role `ADMIN_ROLES` array) is not a real value ever stored in `roluri.nume` / `rol_denumire` | Summary, Pattern 1 | If some legacy rows do use `'ADMIN'` as a role name, dropping it from the required-roles list could under-enforce MFA for those users. Recommend a quick `SELECT DISTINCT nume FROM roluri` check as a plan task before finalizing the role list |
| A3 | No existing admin accounts currently have a verified MFA factor (the entire feature was disabled before any admin completed real enrollment) | Pitfall 4 | If some admins DID complete the brief TOTP window (commit `89e9b82` → `f3ccaea`, ~1 day) before it was switched to email and disabled, the rollout audit script (Code Examples) will reveal this — treated as an open question, not a certainty, since this research did not query the live `auth.mfa_factors` data (no DB write/read access in this session beyond what CONTEXT.md already recorded) |

## Open Questions

1. **Should a rollback/feature-flag exist for MFA enforcement?**
   - What we know: CONTEXT.md's decision is "immediate hard block, no grace period" — a strict requirement.
   - What's unclear: Whether the planner should add an emergency override (e.g., an env var like `MFA_ENFORCEMENT_DISABLED=true`) in case enrollment has a bug in production and locks out all admins simultaneously.
   - Recommendation: Given production impact scope (currently 7 clubs live, and the account doing the discuss-phase session is itself a SUPER_ADMIN_FEDERATIE), recommend adding a minimal escape hatch (e.g., a Supabase-side toggle or short-lived env flag) even though CONTEXT.md doesn't explicitly ask for it — flag this to the user during planning/discuss rather than silently deciding either way.

2. **Does any admin currently have a verified MFA factor?**
   - What we know: The feature was live and functional (TOTP-based, matching Pattern 1) for roughly 1 day (2026-06-06 to 2026-06-07) before being switched to the broken email flow and then disabled.
   - What's unclear: Whether any real admin account enrolled during that window, and whether that enrollment (if any) is still `verified` and usable, or whether it was for the (now-abandoned) email factor type and needs to be unenrolled/cleaned up first.
   - Recommendation: The plan's rollout-safety task (Code Examples, "Rollout safety check") will surface this empirically — treat as a plan-time discovery step, not a research-time assumption.

## Environment Availability

Skipped — no external tools/services/CLIs are required beyond the already-installed and already-configured `@supabase/supabase-js` SDK and the existing live Supabase project. TOTP MFA requires zero additional Supabase Dashboard configuration (confirmed: "enabled on all Supabase projects by default").

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes | Supabase Auth MFA (TOTP), `getAuthenticatorAssuranceLevel()` AAL check — this phase directly implements ASVS V2.5 (MFA) requirements for privileged accounts |
| V3 Session Management | yes (existing, not modified) | Supabase Auth JWT/session handling — unchanged by this phase; MFA upgrades session AAL claim, does not change session lifetime/refresh logic |
| V4 Access Control | yes (existing, not modified) | RLS + `activeRoleContext` header pattern — this phase does not add a DB-level `aal2` RLS policy (CONTEXT.md scopes this to app-tier enforcement only); flagged in Architectural Responsibility Map as an optional future defense-in-depth layer, out of scope here |
| V5 Input Validation | yes (minor) | 6-digit numeric code input in `SetupMFAPage.tsx` — already has `inputMode="numeric"`, `maxLength={6}`, `.replace(/\D/g, '')` sanitization; no change needed |
| V6 Cryptography | no (delegated) | TOTP secret generation/storage is entirely delegated to Supabase Auth (GoTrue) — never hand-roll |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Stolen admin password, no second factor | Spoofing | This phase's core deliverable — TOTP MFA enforcement for `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE` |
| Client-side-only enforcement bypass (user tampers with SPA state to skip `setup-mfa` redirect) | Tampering / Elevation of Privilege | App-tier gating is UX-only, not a security boundary by itself (per project's own documented pattern: "FE checks don't prevent access... RLS is the gate," `docs/roluri-permisiuni.md`-adjacent convention). Since this phase does not add an `aal2`-checking RLS policy, a sufficiently technical attacker with a stolen session JWT could still call Supabase directly and RLS would not additionally require aal2 — this is a residual risk explicitly out of this phase's locked scope (flagged in Open Questions / Architectural Responsibility Map, not silently accepted) |
| Service-role key misuse to query `auth.mfa_factors`/list users | Information Disclosure | Confirmed convention followed: service-role key only used server-side in `api/*.ts` (grep-verified); the rollout audit script in this research must follow the same rule |

## Sources

### Primary (HIGH confidence)
- Local repository: `hooks/useMFAGuard.ts`, `components/SetupMFAPage.tsx`, `App.tsx`, `components/AppRouter.tsx`, `types.ts`, `hooks/usePermissions.ts`, `hooks/useAppLogic.ts`, `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql` — direct read
- `git show f33c4cc` / `git show f33c4cc^:hooks/useMFAGuard.ts` / `git log --all` — recovered original pre-disable implementation and exact disable rationale
- `node_modules/@supabase/auth-js/dist/main/lib/types.d.ts` (installed v2.103.1) — `FactorTypes`, `MFAEnrollTOTPParams`, `AuthMFAGetAuthenticatorAssuranceLevelResponse` — direct inspection of installed SDK type contract
- https://supabase.com/docs/guides/auth/auth-mfa/totp — official TOTP enrollment flow, confirms "enabled by default, no config needed, free"
- https://supabase.com/docs/reference/javascript/auth-mfa-api — official JS API reference for enroll/challenge/verify/getAuthenticatorAssuranceLevel/admin.mfa.listFactors

### Secondary (MEDIUM confidence)
- `docs/superpowers/specs/2026-06-06-db-security-design.md` — original design doc; its TOTP hook example matches what was actually shipped (verified via git history), but its SQL `aal2` RLS policy example (§4.3) was never implemented and is out of this phase's locked scope
- `.planning/quick/20260606-db-security-hardening/PLAN.md` / `SUMMARY.md` — confirms what shipped vs what remained manual (Dashboard MFA activation, SQL migrations)

### Tertiary (LOW confidence)
- None — all claims in this research were either directly verified against local files/installed packages/git history, or cited from official Supabase documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing SDK inspected directly
- Architecture: HIGH — exact wiring points read directly from `App.tsx`/`AppRouter.tsx`/hooks; original implementation recovered via git history, not guessed
- Pitfalls: HIGH — Pitfall 1 (email factor type) is independently confirmed via installed SDK types, not just inferred from the commit message; Pitfall 2 (render-gating gap) is confirmed by grepping for all `mfaChecked` usages project-wide

**Research date:** 2026-07-08
**Valid until:** 30 days (stable domain — Supabase Auth MFA API surface, and this project's own code, are not expected to change rapidly; re-verify if `@supabase/supabase-js` is upgraded past a major version before this phase executes)
