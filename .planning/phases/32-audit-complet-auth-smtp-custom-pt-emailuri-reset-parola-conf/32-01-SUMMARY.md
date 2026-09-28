---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 01
subsystem: auth
tags: [password-policy, validation, react, typescript]

requires: []
provides:
  - "valideazaParola() + MESAJ_CERINTE_PAROLA — sursa unica regula parola D-07 (min 12, majuscula+minuscula+cifra)"
  - "10 puncte client aliniate la aceeasi regula de parola"
  - "genereazaParolaTemporara() in loc de 'Parola123!' in UserManagement"
affects: [32-05, 32-06, 32-08]

tech-stack:
  added: []
  patterns:
    - "valideazaParola(parola) -> { valid, mesaj } — functie pura fara importuri, reutilizabila client + server (Vercel api/*.ts)"

key-files:
  created: []
  modified:
    - utils/parola.ts
    - utils/parola.test.ts
    - components/ResetPasswordPage.tsx
    - components/MandatoryPasswordChange.tsx
    - components/AccountSettings.tsx
    - components/OnboardingCompletare.tsx
    - components/UserManagement.tsx
    - hooks/useAuthForm.ts
    - utils/validation.ts
    - utils/error.ts
    - components/Sportivi/SportivFormFields.tsx

key-decisions:
  - "Login (useAuthForm formType='login') NU verifica lungimea parolei — conturile vechi cu parole 6-11 caractere trebuie sa se poata autentifica in continuare"
  - "Simbolurile NU sunt obligatorii in valideazaParola (doar majuscula+minuscula+cifra), aliniat cu api/creare-cont.ts existent"

patterns-established:
  - "utils/parola.ts ramane fara importuri la nivel de modul — poate fi importat si server-side in api/*.ts (Vercel) fara probleme de runtime"

requirements-completed: [D-07]

duration: ~35min
completed: 2026-09-28
---

# Phase 32 Plan 01: Validator unic de parola client-side (D-07)

**valideazaParola() unic in utils/parola.ts, aplicat in 10 puncte client (4 fluxuri self-service + UserManagement + useAuthForm + validation.ts + error.ts + placeholder SportivFormFields), inlocuind regulile divergente min 6/8 caractere si parola implicita 'Parola123!'.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Sursa unica de adevar pentru regula de parola (D-07): `valideazaParola()` + `MESAJ_CERINTE_PAROLA` in `utils/parola.ts`, testata cu 15 cazuri (0 FAIL)
- 4 fluxuri self-service (ResetPasswordPage, MandatoryPasswordChange, AccountSettings, OnboardingCompletare) aliniate, afiseaza mesajul cerintelor
- UserManagement: parola implicita previzibila `'Parola123!'` inlocuita cu `genereazaParolaTemporara()`
- Login nu mai impune lungime minima — conturile vechi raman functionale

## Task Commits

1. **Task 1: Validator unic valideazaParola + MESAJ_CERINTE_PAROLA (cu teste)** - `8f38831` (feat)
2. **Task 2: Aliniere D-07 in cele 4 fluxuri self-service** - `54b9d7d` (feat)
3. **Task 3: Aliniere D-07 in UserManagement, useAuthForm, validation, error** - `4f5b5ad` (feat)

## Files Created/Modified
- `utils/parola.ts` - adauga valideazaParola() + MESAJ_CERINTE_PAROLA
- `utils/parola.test.ts` - 8 teste noi pentru valideazaParola
- `components/ResetPasswordPage.tsx`, `MandatoryPasswordChange.tsx`, `AccountSettings.tsx`, `OnboardingCompletare.tsx` - folosesc valideazaParola, afiseaza MESAJ_CERINTE_PAROLA
- `components/UserManagement.tsx` - valideazaParola + genereazaParolaTemporara() in loc de 'Parola123!'
- `hooks/useAuthForm.ts` - login fara verificare lungime, register foloseste valideazaParola
- `utils/validation.ts`, `utils/error.ts` - aliniate la regula unica
- `components/Sportivi/SportivFormFields.tsx` - placeholder actualizat

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written. Executat inline (fara subagent worktree), conform fallback validat in [[feedback_gsd_worktree_infra_esuata_execute_inline]].

## Issues Encountered
None.

## User Setup Required
None - bariera reala de securitate (politica de parola la nivel Supabase) se aplica in 32-08.

## Next Phase Readiness
- `valideazaParola()`/`MESAJ_CERINTE_PAROLA` gata de reutilizat server-side in 32-05 (api/reset-parola-sportiv.ts) si 32-06.
- Niciun blocker.

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
