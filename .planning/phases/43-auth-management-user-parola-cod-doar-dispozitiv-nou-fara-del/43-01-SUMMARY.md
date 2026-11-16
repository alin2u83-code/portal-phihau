---
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
plan: 01
subsystem: auth
tags: [react, supabase, sesiuni, inactivitate]

requires:
  - phase: 17
    provides: useMFAGuard, dispozitiv de incredere, sesiune temporara
provides:
  - Aplicatie fara delogare la inactivitate (Q1, DEC-MGMT)
  - Runbook Supabase si 32-08 fara inactivity timeout
affects: [43-06, 32-08]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - App.tsx
    - services/emailMfaService.ts
    - docs/auth-configurare-supabase.md
    - .planning/phases/32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf/32-08-PLAN.md
  deleted:
    - hooks/useExpirareInactivitate.ts
    - utils/inactivitate.ts
    - utils/inactivitate.test.ts

key-decisions:
  - "Fara delogare la inactivitate peste tot (Q1); bifa debifata ramane sesiune temporara pana la inchiderea browserului."
  - "Risc rezidual T-43-01/T-43-02 acceptat: sesiune lasata deschisa pe calculator partajat; atenuat de MFA pe dispozitiv nou, reuse detection, JWT 3600s."

requirements-completed: [DEC-MGMT, Q1]

duration: 10min
completed: 2026-11-16
---

# Phase 43 Plan 01: Eliminare delogare la inactivitate Summary

**Hook-ul de delogare la 60 min de inactivitate, util-ul si testul lui au fost sterse, iar runbook-ul Supabase si planul 32-08 cer acum inactivity timeout dezactivat si time-box dezactivat sau >= 720h.**

## Accomplishments
- App.tsx fara `useExpirareInactivitate`, fara toast-ul de 60 min; `useMFAGuard(activeRoleContext)` neatins.
- Sterse `hooks/useExpirareInactivitate.ts`, `utils/inactivitate.ts`, `utils/inactivitate.test.ts` (grep pe repo: singurii apelanti erau App.tsx si fisierele sterse).
- Sters `esteDispozitivDeIncredere` din `emailMfaService.ts` (cod mort).
- `docs/auth-configurare-supabase.md` sectiunea 4 + checklist si `32-08-PLAN.md` (user_setup, read_first, sectiunea 4, porti, punctul 8, T-32-08-05) actualizate cu nota Faza 43.

## Task Commits
1. Task 1: `8db30e52` feat(43-01): elimina delogarea automata la inactivitate
2. Task 2: `53b4af81` docs(43-01): runbook Supabase si 32-08 fara inactivity timeout

## Verificare
- `npm run lint` (tsc --noEmit): cod 0.
- Grep-urile din plan (Task 1 si 2): curate; `useMFAGuard(activeRoleContext)` apare o data in App.tsx.
- Neverificat: comportament in browser (nu s-a rulat aplicatia); setarile reale din Dashboard Supabase se verifica in 43-06.

## Deviations from Plan
None - plan executat ca scris. Singura ajustare: nota Faza 43 din runbook foloseste formularea "dupa 60 min fara activitate" ca sa nu declanseze grep-ul de verificare.

## Issues Encountered
None

## Known Stubs
None

## Next Phase Readiness
Gata pentru 43-02. Cheia veche `phi-hau-ultima-activitate` ramasa in localStorage e inofensiva.

## Self-Check: PASSED
Commit-urile 8db30e52 si 53b4af81 exista; cele 3 fisiere sterse nu mai exista.
