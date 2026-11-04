---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 05
subsystem: auth
tags: [otp, supabase-auth, react, external-access]
requires:
  - phase: 36-02
    provides: RPC get_competitie_publica, trimite_cerere_acces; tabele acces_competitie_extern, cereri_acces_competitie
provides:
  - utils/accesExtern.ts (extrageCompetitieId, clasificaEroareOtp, construiesteContexte, construiestePermisiuniExtern)
  - services/accesExternService.ts (teaser, OTP, contexte eligibile, context activ, cerere cont, cluburi, deconectare)
  - components LoginOtp si SolicitaContForm
  - DataContext exportat; tipuri noi in types.ts
affects: [36-09]
key-files:
  created:
    - utils/accesExtern.ts
    - utils/accesExtern.test.ts
    - services/accesExternService.ts
    - components/CompetitieExterna/LoginOtp.tsx
    - components/CompetitieExterna/SolicitaContForm.tsx
  modified:
    - types.ts
    - contexts/DataContext.tsx
    - components/ui.tsx
    - components/UserManagement.tsx
    - components/Sportivi/SportivAccountSettingsModal.tsx
key-decisions:
  - "Login exclusiv email + cod OTP de 8 cifre (signInWithOtp shouldCreateUser:false + verifyOtp type:'email'), fara parola si fara link"
  - "clasificaEroareOtp: 429/over_*_rate_limit/'rate limit' => limita; otp_disabled/422/'signups not allowed' => fara_cont (DEC-8)"
  - "seteazaContextActiv scrie aceeasi cheie localStorage ca portalul principal (suprascrie contextul activ pe acelasi browser)"
requirements-completed: [ACX-01, ACX-02, ACX-03]
completed: 2026-11-05
---

# Phase 36 Plan 05: Auth OTP si cerere cont pentru zona externa Summary

**Strat de login email+OTP (8 cifre) si formular Solicita cont pentru competitia externa, cu logica pura testata (21 asertii) si serviciu Supabase fara exceptii aruncate.**

## Commits
- 5ba2a29: tipuri, export DataContext, functii pure + teste
- eda2f8a: accesExternService
- 77b15c5: LoginOtp + SolicitaContForm

## Verificare
- `node --import tsx utils/accesExtern.test.ts` : toate PASS
- `npx tsc --noEmit` : 0 erori
- grep: LoginOtp are `one-time-code`, fara `type="password"`, link permanent "Solicită acces"; niciun fisier din CompetitieExterna/ nu importa useData/useNavigation/DataProvider.
- NU s-a testat in browser si nici contra DB live (embed-urile `club:club_id(...)` si `cluburi(nume)` din incarcaContexteEligibile nu au fost rulate live; ecranele nu sunt montate pana la 36-09).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extinderea `Rol.nume` a rupt trei `Record<Rol['nume'], ...>` exhaustive**
- **Found during:** Task 1 (`tsc --noEmit`)
- **Issue:** adaugarea lui `'REPREZENTANT_COMPETITIE'` (cerut de plan) producea 4 erori TS2741 in fisiere in afara listei `files_modified`.
- **Fix:** cate o intrare adaugata: `roleWeights` (0) in `UserManagement.tsx` si `SportivAccountSettingsModal.tsx`; `displayNameMap` si `colorClasses` in `RoleBadge` (`ui.tsx`).
- **Commit:** 5ba2a29

## Known Stubs
None.

## Threat Flags
None (T-36-18..22 acoperite conform planului; T-36-19 enumerare conturi acceptata, DEC-8).

## Self-Check: PASSED
Fisierele create exista, commit-urile 5ba2a29/eda2f8a/77b15c5 prezente.
