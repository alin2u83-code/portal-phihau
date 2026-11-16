---
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
plan: 04
subsystem: auth
tags: [mfa, competitie-extern, rbac]

requires:
  - phase: 43-03
    provides: LoginParola in zona externa (parola nu mai dovedeste posesia emailului)
provides:
  - separaContexteDupaMfa (pura, testata)
  - ecran 'mfa_portal' si filtrare MFA in finalizeaza (zona externa)
affects: [43-05, 43-06]

tech-stack:
  added: []
  patterns: ["fail-closed la eroare/exceptie stareMfa; stareMfa apelat doar cu contexte privilegiate"]

key-files:
  modified:
    - utils/accesExtern.ts
    - utils/accesExtern.test.ts
    - components/CompetitieExterna/index.tsx

key-decisions:
  - "Q2 implementat doar in UI-ul zonei externe; useMFAGuard / MFA_REQUIRED_ROLES neatinse."
  - "T-43-19 ACCEPTAT (confirmat de utilizator): INSTRUCTOR ramane ascuns in zona externa fara MFA valid si intra prin portal, unde nu se cere cod (MFA_REQUIRED_ROLES = ADMIN_CLUB, SUPER_ADMIN_FEDERATIE; comportament existent)."

requirements-completed: [Q2, DEC-MGMT]

duration: 10min
completed: 2026-11-16
---

# Phase 43 Plan 04: Q2 contexte privilegiate fara MFA Summary

**In zona externa, ADMIN_CLUB/INSTRUCTOR se ascund pana cand MFA e valid (fereastra 12h sau dispozitiv de incredere); fara MFA contul e trimis la portal, unde dispozitivul nou primeste cod pe email.**

## Accomplishments
- `separaContexteDupaMfa(contexte, mfaValid)`: functie pura, ordine pastrata; 5 asserturi noi (38 PASS total, exit 0).
- `finalizeaza`: `stareMfa(user.id)` doar daca exista contexte privilegiate; exceptie sau 'eroare'/'invalid' => ascunse (fail-closed). Comutatorul din ShellExtern primeste doar contextele vizibile.
- Stare noua `mfa_portal` (text + "Mergi la portal" / "Deconectare") cand nu ramane niciun context vizibil.
- `deschideManagement` cauta ctxMgmt si in `ascunseRef.current`, deci contul de club cu management acordat e dus in portal (useMFAGuard cere codul pentru ADMIN_CLUB pe dispozitiv nou), nu in demonstratie.

## Task Commits
1. Task 1: `5e47c500` feat(43-04): separaContexteDupaMfa pura cu teste (Q2)
2. Task 2: `21767cef` feat(43-04): contexte privilegiate ascunse fara MFA in zona externa (Q2)

## Verificare
- `node --import tsx utils/accesExtern.test.ts`: exit 0, 38 PASS; fisierul ramane fara Supabase/React.
- `npm run lint` (tsc --noEmit): exit 0.
- Grep-uri Task 2: 7 potriviri (>= 5); fara `mfa_email_verificari` in index.tsx; `hooks/useMFAGuard.ts` neatins.
- NEVERIFICAT: UI in browser (ecranul mfa_portal, flux real cu cont ADMIN_CLUB pe dispozitiv nou/de incredere); nu s-a rulat revizuire separata de cod pe diff.

## Note
- T-43-17 (accept): poarta MFA e client-side (mfa_email_verificari scriibila de propriul user), acelasi nivel ca useMFAGuard; RLS neschimbat; candidat pentru o faza de hardening.
- T-43-19 (accept): vezi key-decisions; de consemnat in docs la 43-05.
- Dupa un reset de parola in zona externa se revoca dispozitivele de incredere (43-03, W2), deci un ADMIN_CLUB isi ascunde contextul pana la un nou cod in portal.
- Efect lateral: la un cont cu ADMIN_CLUB si fara MFA valid, contextul salvat in localStorage (daca era privilegiat) nu mai e potrivit si se ignora; se alege dintre cele vizibile.

## Deviations from Plan
None - plan executat conform scrisului. (Pasul RED al TDD nu a fost rulat separat: functia nu exista, importul ar fi picat evident.)

## Known Stubs
None

## Threat Flags
None

## Self-Check: PASSED
Commit-urile 5e47c500 si 21767cef exista; fisierele modificate exista.
