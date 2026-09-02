---
phase: 17-verifica-aplicare-live-migratie-deduplicare-sportivi-si-deci
plan: 03
subsystem: auth
tags: [supabase-auth, mfa, admin-api, service-role, audit-script]

# Dependency graph
requires:
  - phase: 17-02
    provides: "MFA enforcement guard (useMFAGuard.ts) + TOTP enrollment (SetupMFAPage.tsx), not yet confirmed safe to deploy"
provides:
  - "Reusable server-side MFA coverage audit script (scripts/audit-mfa-coverage.ts)"
  - "Real live-DB snapshot of who currently has verified MFA among ADMIN_CLUB/SUPER_ADMIN_FEDERATIE accounts"
affects: [auth, security-audit-followups, deploy-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rollout safety audit: query utilizator_roluri_multicont for privileged role rows, dedupe by user_id, cross-reference supabase.auth.admin.mfa.listFactors({ userId }) — service-role only, never client-side"

key-files:
  created:
    - scripts/audit-mfa-coverage.ts
  modified: []

key-decisions:
  - "Script role-detection reuses the exact roleName fallback (roluri?.nume || rol_denumire) used in usePermissions.ts/useAppLogic.ts, computed client-side after fetching all utilizator_roluri_multicont rows, rather than filtering server-side on rol_denumire alone — avoids Pitfall 5 (denormalized column drift) since it evaluates the same precedence as the rest of the codebase"
  - "scripts/ is project-gitignored (.gitignore line 21, 'Scripts de debug si interogari cu date specifice') — consistent with all 17 other files already in scripts/, none of which are tracked in git. audit-mfa-coverage.ts was NOT force-added; it lives on disk only, per existing project convention. No git commit exists for this file."

requirements-completed: []  # MFA-03 NOT marked complete — Task 2 (human checkpoint) is pending; requirement is not satisfied until end-to-end TOTP test + super-admin MFA confirmation is done by a human.

# Metrics
duration: ~15min (Task 1 only; Task 2 pending human action)
completed: 2026-09-02
---

# Phase 17 Plan 03: MFA Rollout Safety Audit Summary (PARTIAL — Task 2 pending human checkpoint)

**Server-side MFA coverage audit script built and run against the live production DB: reveals ALL 11 privileged accounts (including both SUPER_ADMIN_FEDERATIE accounts) currently have zero verified MFA factors — enforcement from Plan 17-02 would lock out every admin if deployed right now.**

## Performance

- **Duration:** ~15 min (Task 1 only)
- **Started:** 2026-09-02
- **Completed (Task 1 only):** 2026-09-02
- **Tasks:** 1/2 (Task 2 is `type="checkpoint:human-verify" gate="blocking"` — cannot be completed by an agent; requires a physical authenticator app, a real browser login, and DevTools network throttling)
- **Files created:** 1

## Accomplishments

- Created `scripts/audit-mfa-coverage.ts` — runnable via `npx tsx scripts/audit-mfa-coverage.ts`, service-role only (`SUPABASE_SERVICE_ROLE_KEY`), zero DB writes.
- Script queries `utilizator_roluri_multicont` (joined to `roluri.nume` and `club.nume`), computes the role name using the project's standard fallback (`roluri?.nume || rol_denumire`), filters to `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE`, dedupes by `user_id`, then calls `supabase.auth.admin.mfa.listFactors({ userId })` per account.
- Prints a per-account block (user_id, email, roluri, OK/RISK status, raw factor list) sorted with the highest-risk accounts (SUPER_ADMIN_FEDERATIE without MFA) first, plus an aggregate summary (total / with-MFA / without-MFA counts, and an explicit "RISC LOCKOUT" call-out listing every SUPER_ADMIN_FEDERATIE without MFA).
- Exit code is non-zero (1) whenever any SUPER_ADMIN_FEDERATIE account lacks a verified factor — a clear machine-readable "do not deploy enforcement yet" signal.
- **Ran the script against the live production DB** (see full real output below). Result: **0 of 11 privileged accounts have a verified MFA factor.** Both SUPER_ADMIN_FEDERATIE accounts (`girigan.alexandru@csphihau.ro` and `alin2u83@gmail.com`) are at risk of lockout if 17-02's enforcement is deployed as-is. `alin2u83@gmail.com` has a `totp:unverified` factor — i.e., enrollment was started at some point but never completed (likely stale from the June 6-7 window described in 17-RESEARCH.md).

## Task Commits

**Task 1: Creeaza scriptul de audit al acoperirii MFA** — NOT committed to git.

`scripts/audit-mfa-coverage.ts` was created and verified working, but the entire `scripts/` directory is gitignored by long-standing project convention (`.gitignore` line 21: `scripts/` — "Scripts de debug si interogari cu date specifice / date specifice / informatii sensibile despre structura DB"). All 17 other files in `scripts/` (e.g. `create-missing-users.js`, `audit_rls_faza25.ts`, `query_schema.ts`) are likewise untracked — `git ls-files scripts/` returns zero results. Per the destructive-git-operations policy, `git add -f` on gitignored content is forbidden (this is exactly the class of regression documented as #3678 — force-staging gitignored files leaks intentionally-excluded content into history). The file exists on disk, is fully functional, and was run successfully against the live DB (see output below), but there is no commit hash for it — this matches the project's existing pattern for every other script in this directory.

**Plan metadata (this file):** committed separately as `docs({phase}-{plan}): Task 1 complete, Task 2 checkpoint pending`.

## Files Created/Modified

- `scripts/audit-mfa-coverage.ts` (created, NOT committed — gitignored per project convention) - service-role, read-only audit of MFA coverage for `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE` accounts; non-zero exit when a SUPER_ADMIN_FEDERATIE lacks verified MFA.

## Live Audit Output (captured 2026-09-02, run twice — identical result both times)

```
--- Audit acoperire MFA: conturi ADMIN_CLUB / SUPER_ADMIN_FEDERATIE ---

Tabel acoperire MFA:

- user_id=7024ca87-0ef7-416a-8526-66f84d78149a
  email: girigan.alexandru@csphihau.ro
  roluri: ADMIN_CLUB @ Long Ho Cluj, SUPER_ADMIN_FEDERATIE @ Long Ho Cluj
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=f69fe240-32cb-45f1-a2a9-47ce27426712
  email: alin2u83@gmail.com
  roluri: SUPER_ADMIN_FEDERATIE @ C.S. Phi Hau, ADMIN_CLUB @ C.S. Phi Hau
  statut: RISK - no MFA factor
  factori: totp:unverified

- user_id=6f0ca486-c4a8-4258-a02d-59ed9b88d1db
  email: maxim.marius@gmail.com
  roluri: ADMIN_CLUB @ Kim Long Dao Falticeni
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=da4b8700-5be2-4e76-a4cf-70db0b030300
  email: diaconescu.alexandra@phihau.ro
  roluri: ADMIN_CLUB @ Thoi Son Brasov
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=1e876da9-c404-40f0-88d9-e74b02718601
  email: luca.mircea@phihau.ro
  roluri: ADMIN_CLUB @ C.S. Phi Hau
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=490e3bd1-1f30-4d9b-9ebd-d533a02cf2ec
  email: hongha.radauti@gmail.com
  roluri: ADMIN_CLUB @ Hong Ha
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=e6f3bcfe-437d-4d84-95c5-22e1140b1878
  email: vargolici.bogdan@phihau.ro
  roluri: ADMIN_CLUB @ Club Bogdan
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=e63de316-c318-4eeb-8a7d-df58d6de1ab0
  email: instructor@phihau.ro
  roluri: ADMIN_CLUB @ C.S. Phi Hau
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=7d9a83fd-96cf-434a-8358-c039cdd9c38a
  email: phuongbaobucuresti@gmail.com
  roluri: ADMIN_CLUB @ ACS Phuong Bao
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=ad3475e8-0970-41c1-b6af-aaa7fd4c5662
  email: ureche.anamaria@csphihau.ro
  roluri: ADMIN_CLUB @ Hâc Long Dao Brasov
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

- user_id=94e81a2e-6b96-45d6-a2ec-3705867229c9
  email: vartic.adrian@csphihau.ro
  roluri: ADMIN_CLUB @ Long Dao
  statut: RISK - no MFA factor
  factori: niciun factor inrolat

================================================================================
REZUMAT
================================================================================
Total conturi admin (ADMIN_CLUB/SUPER_ADMIN_FEDERATIE): 11
Conturi cu MFA verificat: 0
Conturi FARA MFA verificat: 11

!!! RISC LOCKOUT: urmatoarele conturi SUPER_ADMIN_FEDERATIE NU au MFA verificat:
  - girigan.alexandru@csphihau.ro (user_id=7024ca87-0ef7-416a-8526-66f84d78149a)
  - alin2u83@gmail.com (user_id=f69fe240-32cb-45f1-a2a9-47ce27426712)

NU deploya enforcement MFA (17-02) inainte ca aceste conturi sa isi configureze MFA.
exit=1
```

## Decisions Made

- Script fetches ALL `utilizator_roluri_multicont` rows and computes `roleName` client-side using the same `roluri?.nume || rol_denumire` fallback chain used throughout the codebase, rather than filtering server-side on `rol_denumire` — avoids missing accounts if the denormalized `rol_denumire` column ever drifts from the joined `roluri.nume` (RESEARCH.md Pitfall 5).
- Email lookup uses `supabase.auth.admin.getUserById(userId)` per account rather than `listUsers()` + client-side filter — simpler for a small (~11) admin account set, no pagination concerns.
- Did not attempt to commit `scripts/audit-mfa-coverage.ts` to git — it is gitignored by explicit, pre-existing project policy covering the entire `scripts/` directory. No git operation was forced.

## Deviations from Plan

None - Task 1 executed exactly as written. The gitignore situation for `scripts/` is a pre-existing project convention, not a deviation from the plan's action text (the plan never specified this file should be committed to git — it specified the file should exist and be runnable).

## Issues Encountered

None for Task 1. Task 2 cannot be performed by an automated agent — see below.

## Task 2: NOT EXECUTED — checkpoint:human-verify, gate="blocking"

Per the plan, Task 2 requires:
1. Physically scanning a QR code with a real authenticator app (Google Authenticator/Authy) — no such device/app is available to this agent.
2. Logging into the live application through a real browser session as an admin.
3. Testing render-gating with DevTools network throttling to visually confirm no flash of protected content.
4. Testing non-regression for INSTRUCTOR/SPORTIV role contexts via real login.

None of these are automatable without a physical device and a real browser session — this was explicitly called out in the plan itself (`<verify><automated>MISSING — checkpoint de verificare umana...</automated></verify>`).

**What the live audit output above already tells the human verifier, before they even start:**
- Neither SUPER_ADMIN_FEDERATIE account currently has verified MFA. If Plan 17-02's enforcement is merged/deployed as-is, **the next login by either super-admin account will hard-block them at `setup-mfa`** with no escape hatch (per CONTEXT.md's explicit "no feature flag" decision) — this is exactly the Pitfall 4 lockout scenario RESEARCH.md warned about.
- `alin2u83@gmail.com` has a stale `totp:unverified` factor already registered in Supabase Auth. This factor is NOT currently blocking anything (only `verified` factors count for `hasVerifiedMfa`), but the human should be aware it exists — `SetupMFAPage.tsx`'s cleanup-of-unverified-factors logic (per 17-02 SUMMARY, uses `listFactors().all`) should unenroll it automatically on next enrollment attempt, but this has not been observed working end-to-end yet.

## Next Phase Readiness — BLOCKED on human action

This plan (and Phase 17 as a whole) is **NOT complete**. Task 2's `<done>` condition ("Contul super-admin activ are MFA verificat; enforcement testat end-to-end...") is unmet. **Do not deploy/merge the 17-02 MFA enforcement changes to production until a human completes Task 2.**

---
*Phase: 17-verifica-aplicare-live-migratie-deduplicare-sportivi-si-deci*
*Status: PARTIAL — Task 1/2 complete, Task 2 pending human checkpoint*

## Self-Check: PASSED

- FOUND: scripts/audit-mfa-coverage.ts (on disk, gitignored, no commit hash — matches project convention for scripts/)
