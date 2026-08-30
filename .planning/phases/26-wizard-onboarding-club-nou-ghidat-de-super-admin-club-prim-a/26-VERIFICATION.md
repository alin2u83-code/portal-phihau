---
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
verified: 2026-08-30T23:09:41Z
status: gaps_found
score: 8/14 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Un apelant autentificat nu poate crea un cont cu rol mai privilegiat decât rolul propriu (per club) / Un apelant care nu e SUPER_ADMIN_FEDERATIE nu poate crea un cont într-un club în care nu are rol de nivel suficient"
    status: failed
    reason: "CR-01 (code review, confirmed by independent read of api/creare-cont.ts:53-91): callerMaxWeight (line 64) is computed as the MAX role weight across ALL of the caller's roles/clubs, and cluburiApelant (line 87) is the set of ANY club where the caller holds ANY role — the two checks run independently, not jointly per-club. A user who is ADMIN_CLUB (weight 3) in Club A and only SPORTIV (weight 1) in Club B passes both checks and can grant ADMIN_CLUB in Club B, where their real privilege is SPORTIV. This directly contradicts the threat model's own disposition for T-26-02 ('mitigate') in 26-01-PLAN.md and the must_have truth text taken verbatim from that plan's frontmatter."
    artifacts:
      - path: "api/creare-cont.ts"
        issue: "Lines 64 and 86-91: role-weight guard and club-scoping guard are computed globally/independently instead of per-club, allowing cross-club privilege escalation for any multi-role/multi-club user (a supported, expected configuration per CLAUDE.md)."
    missing:
      - "Compute weight per club (map club_id -> max role weight for that club from callerRoles) and require ROLE_WEIGHTS[requestedRole] <= perClubWeight[userData.club_id] for any caller with callerMaxWeight < 5, per the fix already spelled out in 26-REVIEW.md CR-01."
  - truth: "Dacă inserarea clubului reușește dar crearea contului eșuează, clubul rămâne creat, modalul rămâne deschis cu banner de eroare și buton de reîncercare — iar reîncercarea reușește (nu doar 'nu duplică')"
    status: failed
    reason: "CR-02 (code review, confirmed by independent read of api/creare-cont.ts:93-181 and components/CluburiManagement.tsx:212-234): when auth.admin.createUser succeeds but the subsequent RPC refactor_create_user_account fails, the code does `if (rpcError) throw rpcError;` with no cleanup of the just-created auth.users row (contrast with the sibling endpoint api/genereaza-magic-link.ts, which calls auth.admin.deleteUser on the same failure). The next call for the same email — including the exact 'Reîncearcă Crearea Contului Admin' retry button this phase built for D-07 — hits the isAlreadyRegistered branch, looks up sportivi.email (which does not exist because the RPC never ran), and throws an unrecoverable error every time. The UI-level retry mechanism (creeazaAdminClub/handleRetryAdmin) is correctly wired and does not duplicate the club, but for this realistic failure mode it can never succeed — there is no UI-driven recovery path, only a manual DB fix. This breaks the explicit 26-02 success criterion 'permite retry care nu duplică nici clubul, nici user-ul, nici parola' (retry that does not just avoid duplication, but actually completes the account creation)."
    artifacts:
      - path: "api/creare-cont.ts"
        issue: "Lines 97-150: no auth.users rollback/cleanup when refactor_create_user_account RPC fails after a newly-created auth user; orphans the auth.users row and permanently poisons the isAlreadyRegistered lookup path for that email."
      - path: "components/CluburiManagement.tsx"
        issue: "handleRetryAdmin (lines 212-222) and handleCloseModal (lines 227-234) are correctly implemented but rely on api/creare-cont.ts being retry-safe, which it is not for this failure mode; the guided fallback ('creați contul din User Management') routes through the same broken endpoint and fails identically."
    missing:
      - "Mirror api/genereaza-magic-link.ts:97-100 — call supabaseAdmin.auth.admin.deleteUser(userId) when rpcError fires and the auth user was newly created in this request (not when userId came from the pre-existing isAlreadyRegistered lookup)."
human_verification:
  - test: "Fluxurile existente de creare cont (UserManagement -> Adaugă Membru Staff, UserManagement -> sportiv -> Creează Cont) continuă să funcționeze după adăugarea gărzilor de autentificare pe api/creare-cont.ts"
    expected: "Ambele fluxuri creează contul cu succes, fără eroare 401; CredentialeContModal apare"
    why_human: "Necesită sesiune de browser autentificată reală și interacțiune UI end-to-end; nu poate fi verificat static din cod"
  - test: "Contul nou creat prin oricare flux forțează MandatoryPasswordChange la primul login"
    expected: "Ecranul de schimbare obligatorie a parolei apare imediat după login cu contul nou"
    why_human: "Necesită logout/login real cu credențialele generate"
  - test: "Wizard 'Adaugă Club Nou' end-to-end: submit valid produce club + cont ADMIN_CLUB, ecran de credențiale cu buton copiere, iar noul admin se poate autentifica cu acele credențiale și ajunge în contextul clubului nou"
    expected: "Toate cele 4 comportamente descrise se produc secvențial fără eroare"
    why_human: "Flux multi-pas cu scriere reală în auth.users + DB, verificabil doar prin interacțiune UI reală; nu are probă automată în repo"
  - test: "Simulare eșec pasul 2 (block /api/creare-cont din DevTools Network) urmată de retry"
    expected: "Per plan: clubul rămâne creat, banner + retry, retry reușește fără duplicare"
    why_human: "Cere manipulare DevTools live; totuși pentru scenariul specific documentat în CR-02 (auth.users creat, RPC eșuat) analiza statică arată deja că retry-ul NU poate reuși — acest human-check ar confirma regresia, nu ar înlocui fix-ul necesar"
---

# Phase 26: Wizard onboarding club nou ghidat de SUPER_ADMIN — Verification Report

**Phase Goal:** SUPER_ADMIN_FEDERATIE creeaza un club nou impreuna cu primul lui administrator (cont + rol ADMIN_CLUB legat de clubul nou) intr-un singur submit, cu parola temporara generata automat si afisata pe ecran pentru transmitere manuala.

**Verified:** 2026-08-30T23:09:41Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

This verification factors in `.planning/phases/26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a/26-REVIEW.md`, which found 3 CRITICAL findings. Two of them (CR-01, CR-02) were independently re-confirmed by reading `api/creare-cont.ts` and `components/CluburiManagement.tsx` directly during this verification — they are not merely review opinion, they are observable in the current code. Per the escalation instructions for this verification, CR-01 and CR-02 are treated as direct contradictions of this phase's own must_haves/success_criteria and drive the status to `gaps_found`.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Parola temporară generată criptografic aleator, diferită la fiecare apel, imposibil de ghicit din numele adminului | ✓ VERIFIED | `utils/parola.ts` uses `crypto.getRandomValues` + rejection sampling + Fisher-Yates; `grep -c "Math.random"` = 0; `node --import tsx utils/parola.test.ts` run independently during verification → `7 PASS, 0 FAIL` |
| 2 | POST /api/creare-cont fără token de sesiune valid respins cu 401, fără a crea niciun cont | ✓ VERIFIED | `api/creare-cont.ts:42-50` — early-return 401 before any `auth.admin.createUser` call |
| 3 | Un apelant autentificat nu poate crea un cont cu rol mai privilegiat decât rolul propriu | ✗ FAILED | CR-01: `callerMaxWeight` (line 64) is global across all clubs, not scoped to the target club |
| 4 | Un apelant care nu e SUPER_ADMIN_FEDERATIE nu poate crea un cont într-un club în care nu are rol suficient (de nivelul cerut) | ✗ FAILED | CR-01: club-scoping check (lines 86-91) only verifies membership in *any* role in the target club, independent of the role-weight check — a SPORTIV-only member of Club B can be granted an ADMIN_CLUB account in Club B by an ADMIN_CLUB-of-Club-A caller |
| 5 | Contul nou creat are `trebuie_schimbata_parola = true` | ✓ VERIFIED | `api/creare-cont.ts:159-166` — UPDATE executed after successful RPC, before the final `sportivi` select |
| 6 | Fluxurile existente de creare cont (UserManagement, Sportivi) continuă să funcționeze | ? UNCERTAIN | Never executed — no `26-UAT.md` exists in the phase directory; both 26-01-SUMMARY.md and 26-02-SUMMARY.md explicitly defer this to "Human Verification Pending (end-of-phase)" which was never consolidated/run |
| 7 | La 'Adaugă Club' SUPER_ADMIN vede secțiunea 'Date Club' și secțiunea 'Date Prim Administrator' în același formular | ✓ VERIFIED | `components/CluburiManagement.tsx:100-127` — both sections rendered with exact copy from UI-SPEC |
| 8 | La 'Editează' pe un club existent secțiunea de admin NU apare deloc | ✓ VERIFIED | `components/CluburiManagement.tsx:112` — `{!clubToEdit && (...)}` guards the entire admin section |
| 9 | Submit cu date admin lipsă/invalide e blocat inline, fără a insera clubul | ✓ VERIFIED | `components/CluburiManagement.tsx:53-66` — validation runs and `return`s before `onSave` (and thus before any DB insert) is ever called |
| 10 | Un singur click pe 'Creează Club și Admin' creează clubul ȘI contul ADMIN_CLUB legat de acel club | ⚠️ PARTIAL | Orchestration code path exists and is correctly sequenced (`handleSave` → insert `cluburi` → `creeazaAdminClub` → `createAccountAndAssignRole`), but the underlying account-creation call is subject to CR-01 (wrong-club escalation) and, on RPC failure, CR-02 (unrecoverable). Happy-path code is present; end-to-end success was never human-verified (see truth 6/14) |
| 11 | După succes SUPER_ADMIN vede pe ecran emailul și parola generată, cu buton de copiere pentru fiecare | ✓ VERIFIED | `components/ui.tsx:480-493` `CredentialeContModal` has `copiaza()` with separate copied-state for email and parola; wired via `credentiale` state in `CluburiManagement.tsx:485-493` |
| 12 | Dacă inserarea clubului reușește dar crearea contului eșuează, clubul rămâne creat, modalul rămâne deschis cu banner de eroare și buton de reîncercare care efectiv reușește | ✗ FAILED | UI mechanism (banner + retry button, club retained, no second club insert) is correctly implemented in `CluburiManagement.tsx`, but CR-02 proves the retry can never succeed for the realistic "auth user created, RPC failed" scenario — `api/creare-cont.ts` has no `auth.users` rollback, so retry hits the `isAlreadyRegistered` branch and throws a permanent, unrecoverable error every time |
| 13 | Reîncercarea creează doar contul de admin — nu inserează al doilea club | ✓ VERIFIED (code-level, moot given #12) | `handleRetryAdmin` (`CluburiManagement.tsx:212-222`) calls only `creeazaAdminClub`, never touches `cluburi`; `grep -cE "from\('cluburi'\)[\s\S]{0,40}\.delete"` = 1 (only pre-existing `confirmDelete`) — no duplicate club insert exists in the retry path, though per #12 the retry itself may never reach success in the CR-02 failure scenario |
| 14 | Noul admin se poate autentifica cu credențialele afișate și e forțat să-și schimbe parola | ? UNCERTAIN | Never executed — requires live login; no `26-UAT.md` exists |

**Score:** 8/14 truths verified (2 FAILED as blockers, 1 PARTIAL, 2 UNCERTAIN, 1 verified-but-moot)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `utils/parola.ts` | `genereazaParolaTemporara()`, crypto-based | ✓ VERIFIED | 81 lines, exports present, test passes 0 FAIL |
| `utils/parola.test.ts` | Colocated test | ✓ VERIFIED | Runs standalone, 7 PASS / 0 FAIL |
| `api/creare-cont.ts` | 5 server-side guards, `auth.getUser` | ⚠️ STUB-ADJACENT (logic bug) | All 5 guard code paths exist and are reachable, but the club-scoping guard (CR-01) and the RPC-failure path (CR-02) do not achieve their stated security/reliability intent |
| `hooks/useRoleAssignment.ts` | `Authorization: Bearer`, club_id fail-fast | ✓ VERIFIED | Lines 34-51: fail-fast on missing `club_id`/session, `Authorization` header sent |
| `components/CluburiManagement.tsx` | Extended `ClubFormModal` + orchestration + retry + `CredentialeContModal` | ✓ VERIFIED (wiring) / ⚠️ (relies on broken endpoint) | All required symbols present (`ClubSaveData`, `pendingAdmin`, `creeazaAdminClub`, `handleRetryAdmin`, `CredentialeContModal` usage); correctly calls into `api/creare-cont.ts`, which has the CR-01/CR-02 defects |
| `components/AppRouter.tsx` | `allRoles={allRoles}` to `CluburiManagement` | ✓ VERIFIED | Line 236: `allRoles={allRoles}` present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `hooks/useRoleAssignment.ts` | `api/creare-cont.ts` | `Authorization: Bearer` fetch header | ✓ WIRED | `getSession()` → header set on every call |
| `api/creare-cont.ts` | `utilizator_roluri_multicont` | caller role read for privilege guard | ⚠️ WIRED BUT LOGIC FLAWED | Query executes correctly; the resulting data is then misused (global max instead of per-club max) — see CR-01 |
| `api/creare-cont.ts` | `sportivi.trebuie_schimbata_parola` | UPDATE after RPC | ✓ WIRED | Confirmed at lines 159-166 |
| `components/CluburiManagement.tsx` | `utils/parola.ts` | `genereazaParolaTemporara` import | ✓ WIRED | Single call site (line 298), matches T-26-13 mitigation intent |
| `components/CluburiManagement.tsx` | `hooks/useRoleAssignment.ts` | `createAccountAndAssignRole` | ✓ WIRED | Called from `creeazaAdminClub` |
| `components/CluburiManagement.tsx` | `components/ui.tsx CredentialeContModal` | conditional render on `credentiale` state | ✓ WIRED | Confirmed lines 485-493 |
| `components/AppRouter.tsx` | `components/CluburiManagement.tsx` | `allRoles` prop | ✓ WIRED | Confirmed line 236 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `api/creare-cont.ts` | 64, 86-91 | Global-instead-of-per-club privilege check (CR-01) | 🛑 BLOCKER | Cross-club privilege escalation for any multi-role/multi-club caller below SUPER_ADMIN_FEDERATIE |
| `api/creare-cont.ts` | 150 | `if (rpcError) throw rpcError;` with no `auth.users` cleanup (CR-02) | 🛑 BLOCKER | Orphaned `auth.users` row permanently poisons retry/re-attempt for that email; defeats the D-07 retry UX this phase built |
| `components/AppRouter.tsx` | 91-104 | `useState` hooks declared after conditional early `return`s (CR-03, Rules-of-Hooks) | ⚠️ WARNING | Confirmed present in file this phase modified (added `allRoles` prop); crash risk if `trebuie_schimbata_parola`/`@frqkd.ro` condition flips without a full remount — currently masked by `window.location.reload()` at both call sites, so not immediately triggered by this phase's own flows, but a latent risk in a file this phase touched |
| `api/creare-cont.ts` | 70-102 | No server-side password length/complexity validation (WR-01) | ⚠️ WARNING | Any INSTRUCTOR+ caller can bypass D-05's 12-char minimum by calling the endpoint directly with an arbitrary weak password |
| `api/creare-cont.ts` | 70, 97-148 | Missing validation of required body fields (`email`, `userData.nume`, `userData.prenume`) (WR-02) | ⚠️ WARNING | Malformed requests produce raw 500s instead of clear 400s |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| D-01 | 26-02 | Extend `ClubFormModal`, no separate wizard | ✓ SATISFIED | Section-based form in same modal, gated on `!clubToEdit` |
| D-02 | 26-02 | Single submit → sequential club + account creation | ⚠️ SATISFIED (wiring) / undermined by CR-01/CR-02 | Sequential call chain exists; underlying account creation is not reliably safe or retry-capable |
| D-03 | 26-02 | Admin fields required at creation, inline validation | ✓ SATISFIED | `handleSubmit` field validation before `onSave` |
| D-04 | 26-02 | Fixed role ADMIN_CLUB, no role selector in form | ✓ SATISFIED | `rolAdminClub = allRoles.find(r => r.nume === 'ADMIN_CLUB')`, no role `Input` in JSX |
| D-05 | 26-01 | Auto-generated temporary password | ✓ SATISFIED | `utils/parola.ts` |
| D-06 | 26-02 | Password shown once on screen, with copy | ✓ SATISFIED | `CredentialeContModal` |
| D-07 | 26-01 + 26-02 | No rollback on club; retry on admin step without duplication | ✗ BLOCKED | Retry mechanism exists in UI but is unusable for the realistic auth-user-created/RPC-failed scenario (CR-02); the "no rollback" half of D-07 is satisfied, but the retry-succeeds half is not |

**Note:** As instructed, D-01..D-07 are confirmed NOT present in the milestone-scoped `.planning/REQUIREMENTS.md` (only `GRD-01..04` for Phase 10 appear there) — this is a pre-existing gap in requirements tracking, not a defect introduced by this phase, and is not counted against phase 26's score.

### Gaps Summary

Two blocker-level findings from the code review were independently re-confirmed by direct code inspection during this verification and are not resolved in the codebase:

1. **CR-01 — cross-club privilege escalation.** The server-side guard in `api/creare-cont.ts` computes the caller's maximum role weight globally (across all clubs) and checks club membership independently of that weight. A caller who is `ADMIN_CLUB` in one club and merely `SPORTIV` in another can grant `ADMIN_CLUB` in the second club. This directly contradicts the phase's own threat model disposition for T-26-02 ("mitigate") and must_have truth #3/#4 from the 26-01 plan.

2. **CR-02 — no rollback on RPC failure, breaking the D-07 retry flow.** When `auth.admin.createUser` succeeds but the subsequent RPC fails, the orphaned `auth.users` row permanently breaks any later attempt (including the dedicated retry button `CluburiManagement.tsx` was built to support) for that email — the retry hits the "already registered, no sportiv profile" dead end every time. The frontend retry UX (banner, button, no duplicate club) is correctly implemented, but it cannot succeed in this failure mode with the current server code. This directly contradicts the 26-02 success criterion that retry must not merely "avoid duplication" but must actually complete the account creation.

Both are unresolved code defects, not documentation/reporting gaps — they were verified by direct line-by-line reading of `api/creare-cont.ts` during this session, independent of `26-REVIEW.md`'s narrative.

Additionally, no `26-UAT.md` exists for this phase — the human-verification items explicitly deferred by both `26-01-SUMMARY.md` and `26-02-SUMMARY.md` ("Human Verification Pending (end-of-phase)") were never consolidated or executed. This leaves truths #6 and #14 (regression on existing account-creation flows; new admin can actually log in) unverified even independent of the CR-01/CR-02 blockers.

Given the decision tree (gaps_found takes priority when any must-have is FAILED), phase status is **gaps_found**. This phase should not be considered complete until CR-01 and CR-02 are fixed and re-verified; the human verification items should also be executed once the fixes land, since they exercise the exact code paths CR-01/CR-02 affect.

---

_Verified: 2026-08-30T23:09:41Z_
_Verifier: Claude (gsd-verifier)_
