---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 06
subsystem: auth
tags: [password-policy, react, admin-flows]

requires:
  - phase: 32-01
    provides: "valideazaParola/MESAJ_CERINTE_PAROLA/genereazaParolaTemporara din utils/parola.ts"
  - phase: 32-02
    provides: "obtineHeadereAutentificare din services/apiAutentificat.ts"
  - phase: 32-05
    provides: "endpoint-uri reset-parola-sportiv/account securizate (401 fara Bearer)"
provides:
  - "Reset parola admin (SportivModals) si schimbare email/username trimit Bearer"
  - "Zero parole implicite previzibile ramase in aplicatie"
affects: []

tech-stack:
  added: []
  patterns:
    - "Apel API care poate fi refuzat server-side (403) mutat INAINTEA update-ului local — evita desincronizare intre sursa de adevar (auth.users) si tabela sportivi"

key-files:
  created: []
  modified:
    - components/Sportivi/SportivModals.tsx
    - services/sportivService.ts
    - components/Sportivi/index.tsx
    - components/UserProfile/CreateAccountModal.tsx

key-decisions:
  - "Ordinea operatiilor la schimbarea emailului inversata: /api/account?action=email ACUM se apeleaza inaintea update-ului sportivi.email, nu dupa — un refuz de autoritate (403, din garda noua 32-05) nu mai lasa emailul din tabela desincronizat de emailul real de login"

patterns-established: []

requirements-completed: [D-07]

duration: ~25min
completed: 2026-09-28
---

# Phase 32 Plan 06: Client-side pentru endpoint-urile securizate (D-07)

**SportivModals (reset parolă admin) și sportivService (schimbare email/username) trimit acum Bearer către endpoint-urile securizate în 32-05; toate parolele implicite previzibile din aplicație au fost înlocuite cu genereazaParolaTemporara().**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Reset parolă admin folosește `valideazaParola` (D-07) și trimite Bearer — altfel ar primi 401 după 32-05
- Schimbarea emailului de login e apelată ÎNAINTE de update-ul local `sportivi.email`, eliminând riscul de desincronizare la un refuz 403
- Zero parole implicite previzibile rămase în toată aplicația (`grep -rn "Parola123|\.1234!"` gol)

## Task Commits

1. **Task 1: Reset parola admin + apeluri /api/account cu Bearer si D-07** - `d41fe3f` (feat)
2. **Task 2: Parole implicite generate criptografic** - `1770218` (feat)

## Files Created/Modified
- `components/Sportivi/SportivModals.tsx` - valideazaParola + Bearer
- `services/sportivService.ts` - Bearer + ordine operatii inversata (email)
- `components/Sportivi/index.tsx` - genereazaParolaTemporara() (2 locuri)
- `components/UserProfile/CreateAccountModal.tsx` - genereazaParolaTemporara()

## Decisions Made
Vezi key-decisions.

## Deviations from Plan
None - plan executed exactly as written. Executat inline (fara subagent worktree), conform [[feedback_gsd_worktree_infra_esuata_execute_inline]].

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- Impreuna cu 32-05, toate fluxurile admin de modificare cont functioneaza end-to-end cu autentificare + autorizare.
- Ramase pt 32-07: instrumentarea celor 4 fluxuri de email cu inregistrareaEmailAuth (D-06).

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
