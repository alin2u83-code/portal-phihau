---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 07
subsystem: auth
tags: [monitoring, mfa, email]

requires:
  - phase: 32-03
    provides: "inregistreazaEmailAuth() din services/authEmailAuditService.ts"
provides:
  - "Toate cele 4 fluxuri de email Auth din aplicatie alimenteaza contorul D-06"
affects: [32-08]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - components/LoginPage.tsx
    - services/authService.ts
    - services/emailMfaService.ts
    - components/OnboardingCompletare.tsx
    - components/AccountSettings.tsx

key-decisions:
  - "emailMfaService.ts atins minimal: doar 2 linii adaugate (import + apel), 0 linii sterse — verificat cu git diff --numstat, respecta D-09 (fara schimbari implementare MFA)"
  - "Al 4-lea flux (schimbare email, gasit prin grep de planner, nu in D-03 original) contorizat ca 'schimbare_email' — acelasi canal SMTP, consum real al pragului"
  - "Mesajul anti-enumerare din LoginPage.handleForgotPassword ramane identic pe try/catch — contorizarea nu influenteaza UI-ul"

patterns-established: []

requirements-completed: [D-03, D-06, D-09]

duration: ~20min
completed: 2026-09-28
---

# Phase 32 Plan 07: Instrumentare completă a celor 4 fluxuri de email Auth (D-06)

**inregistreazaEmailAuth() fire-and-forget adăugat în 5 puncte de apel (reset parolă, confirmare cont, cod MFA, schimbare email ×2), fără nicio schimbare de comportament — emailMfaService.ts atins cu doar 2 linii adăugate, zero șterse.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Toate cele 4 tipuri de email Auth (reset_parola, confirmare_cont, cod_mfa, schimbare_email) sunt acum contorizate
- `git diff --numstat -- services/emailMfaService.ts` confirmă 0 ștergeri — D-09 respectat literal, nu doar declarativ
- Mesajul anti-enumerare din LoginPage neschimbat pe ambele ramuri

## Task Commits

1. **Task 1: Instrumentare reset parola, confirmare cont, cod MFA** - `f3a1875` (feat)
2. **Task 2: Instrumentare schimbare email (Onboarding + Setari cont)** - `f5818c9` (feat)

## Files Created/Modified
- `components/LoginPage.tsx` - reset_parola (try+catch)
- `services/authService.ts` - confirmare_cont
- `services/emailMfaService.ts` - cod_mfa (2 linii adaugate, 0 sterse)
- `components/OnboardingCompletare.tsx` - schimbare_email
- `components/AccountSettings.tsx` - schimbare_email (conditionat de authUpdates.email)

## Decisions Made
Vezi key-decisions.

## Deviations from Plan
None - plan executed exactly as written. Executat inline (fara subagent worktree), conform [[feedback_gsd_worktree_infra_esuata_execute_inline]].

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- Contorul D-06 e acum complet alimentat — cardul din Jurnal Audit (32-03) va reflecta trafic real dupa deploy.
- Verificare umana ramasa pt 32-08: "Am uitat parola" -> +1 la "Ultima ora"/"Resetare parola" in Jurnal Audit; login ADMIN_CLUB cu MFA -> +1 la "Cod MFA".
- Ramas pt 32-08: re-rulare scripts/audit-mfa-coverage.ts (D-09), runbook SMTP, praguri reale, verificare politica parola/sesiuni la nivel Supabase.

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
