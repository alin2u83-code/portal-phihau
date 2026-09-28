---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 04
subsystem: auth
tags: [session, timeout, react-hooks]

requires: []
provides:
  - "utils/inactivitate.ts — calcul pur stare inactivitate (activ/avertizare/expirat)"
  - "hooks/useExpirareInactivitate.ts — delogare automata dupa 60min pt ADMIN_CLUB/SUPER_ADMIN_FEDERATIE"
affects: []

tech-stack:
  added: []
  patterns:
    - "Control client-side de sesiune per-rol, cand Supabase nu ofera setari per-rol (doar globale, doar planuri platite)"

key-files:
  created:
    - utils/inactivitate.ts
    - utils/inactivitate.test.ts
    - hooks/useExpirareInactivitate.ts
  modified:
    - App.tsx

key-decisions:
  - "Prag 60min inactivitate, avertizare la 55min, aplicat DOAR rolurilor din MFA_REQUIRED_ROLES (aceleasi ca Faza 17 MFA) — decizie de discretie documentata in plan"
  - "hooks/useMFAGuard.ts NU se modifica (D-09) — doar constanta MFA_REQUIRED_ROLES importata"
  - "Control client-side, nu bariera server — nu protejeaza impotriva refresh token furat, doar sesiuni lasate deschise pe calculatoare partajate"

patterns-established:
  - "utils/inactivitate.ts fara importuri, testabil pur"

requirements-completed: [D-08]

duration: ~25min
completed: 2026-09-28
---

# Phase 32 Plan 04: Delogare automată la inactivitate pentru roluri privilegiate (D-08)

**useExpirareInactivitate() deloghează automat ADMIN_CLUB/SUPER_ADMIN_FEDERATIE după 60 de minute fără interacțiune (avertizare la 55min), timestamp partajat între taburi, reutilizând handleLogout existent — SPORTIV/INSTRUCTOR neafectați.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `calculeazaUltimaActivitate`/`stareInactivitate` — 10/10 teste PASS, inclusiv cazul critic "login proaspăt peste timestamp vechi"
- Hook complet cu cleanup (removeEventListener + clearInterval), throttle 15s la scriere, verificare imediată la restaurarea sesiunii
- Mesaj explicativ post-delogare afișat pe pagina de login

## Task Commits

1. **Task 1: utils/inactivitate.ts — calcul pur (testat)** - `a04377f` (feat)
2. **Task 2: Hook + montare App.tsx + mesaj** - `3342f03` (feat)

## Files Created/Modified
- `utils/inactivitate.ts`, `.test.ts` - regula pura de timp
- `hooks/useExpirareInactivitate.ts` - hook complet
- `App.tsx` - montare + mesaj post-delogare

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written. Executat inline (fara subagent worktree), conform [[feedback_gsd_worktree_infra_esuata_execute_inline]].

## Issues Encountered
None.

## User Setup Required
None. Setarile globale Supabase (JWT expiry, refresh token reuse, time-box daca planul permite) raman de verificat/ajustat in 32-08.

## Next Phase Readiness
- Verificare umana ramasa (consemnata pt 32-08): manipulare localStorage in DevTools pt a confirma avertizarea si delogarea vizual, pe rol privilegiat vs SPORTIV.

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
