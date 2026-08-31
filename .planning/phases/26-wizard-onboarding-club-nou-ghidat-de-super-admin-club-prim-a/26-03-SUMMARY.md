---
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
plan: 03
subsystem: auth
tags: [security-fix, elevation-of-privilege, react-rules-of-hooks, gap-closure, uat]

# Dependency graph
requires:
  - phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
    plan: 01
    provides: "api/creare-cont.ts cu gărzile inițiale (autentificare, anti-escaladare globală, scoping club) — găsite ineficace de code review și verificare (CR-01, CR-02)"
  - phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
    plan: 02
    provides: "components/CluburiManagement.tsx — wizard club+admin, retry D-07 UI, dependent de api/creare-cont.ts fiind retry-safe"
provides:
  - "api/_permisiuniCont.ts — gardă de autorizare pură, testabilă, care compară greutatea apelantului per club țintă (închide CR-01)"
  - "api/creare-cont.ts cu rollback auth.users la eșec de RPC, gardat de flag userNouCreat (închide CR-02)"
  - "components/AppRouter.tsx cu hook-uri declarate necondiționat (închide CR-03)"
  - "26-UAT.md — 12 teste consolidate de verificare umană end-of-phase"
affects: [user-management, onboarding-club-nou, orice-flux-viitor-care-cheama-api-creare-cont]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gardă de autorizare extrasă în modul pur fără I/O (api/_permisiuniCont.ts) — testabilă complet cu asserții simple, fără mock-uri Supabase"
    - "Comparație de greutate PER CLUB ȚINTĂ (Map<club_id, greutate>), nu maxim global — pattern de aplicat la orice altă gardă multi-club din proiect"
    - "Rollback compensator pe auth.users gardat de flag boolean setat exact o dată, imediat după crearea efectivă a rândului — oglindește api/genereaza-magic-link.ts"

key-files:
  created: [api/_permisiuniCont.ts, api/_permisiuniCont.test.ts, .planning/phases/26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a/26-UAT.md]
  modified: [api/creare-cont.ts, components/AppRouter.tsx]

key-decisions:
  - "Garda de autorizare extrasă complet din api/creare-cont.ts într-un modul separat (api/_permisiuniCont.ts) — testabilă fără server, deoarece tsconfig.json nu include api/ (fără type-check automat pe acel folder)"
  - "Rollback auth.users aplicat DOAR pe ramura rpcError și DOAR când userNouCreat=true — nu pe alte căi de eroare (sportivFetchError, forceParolaError), unde RPC-ul deja a reușit și rândul din sportivi există"
  - "26-UAT.md consolidează cele 9 teste amânate din 26-01/26-02 cu 3 teste noi pentru CR-01/CR-02/CR-03 — un singur fișier de verificare umană pentru toată faza"

requirements-completed: [D-02, D-04, D-07]

# Metrics
duration: ~35min
completed: 2026-08-31
---

# Phase 26 Plan 03: Închidere gap-uri blocante — escaladare cross-club, rollback retry, Rules of Hooks Summary

**Gardă de autorizare per club extrasă în `api/_permisiuniCont.ts` (14 teste, 0 FAIL) care închide escaladarea de privilegii cross-club (CR-01), rollback pe `auth.users` la eșec de RPC care repară retry-ul D-07 (CR-02), și `useState`-uri mutate deasupra return-urilor timpurii în `AppRouter.tsx` (CR-03) — plus `26-UAT.md` consolidat cu 12 teste de verificare umană.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3
- **Files modified:** 5 (3 create, 2 modificate)

## Accomplishments

- `api/_permisiuniCont.ts` — modul pur fără I/O care exportă `ROLE_WEIGHTS`, `GREUTATE_MINIMA_CREARE_CONT`, `GREUTATE_FEDERATIE`, `greutateMaximaGlobala`, `greutatePerClub`, `verificaPermisiuneCreareCont`. Fixul CR-01: comparația de greutăți la pasul de anti-escaladare se face acum împotriva `gClub` (greutatea apelantului ÎN CLUBUL ȚINTĂ), nu împotriva maximului global — un `ADMIN_CLUB` în Club A + `SPORTIV` în Club B nu mai poate crea `ADMIN_CLUB` în Club B.
- `api/_permisiuniCont.test.ts` — 14 cazuri de test colocate (pattern `utils/parola.test.ts`), rulează cu `node --import tsx api/_permisiuniCont.test.ts`, 0 FAIL. Acoperă escaladarea cross-club, regresia fluxurilor legitime (SUPER_ADMIN_FEDERATIE oriunde, ADMIN_CLUB/INSTRUCTOR în clubul propriu), roluri necunoscute, payload invalid.
- `api/creare-cont.ts` rescris pe garda unică `verificaPermisiuneCreareCont` (elimină `callerMaxWeight`, `cluburiApelant`, `ROLE_WEIGHTS` locale) + validare payload timpurie (WR-02) + rollback `auth.admin.deleteUser(userId)` gardat de flag `userNouCreat`, aplicat doar în ramura `if (rpcError)` și doar când user-ul a fost creat în cererea curentă (CR-02).
- `components/AppRouter.tsx` — cele două `useState` (`sportivIdPentruRaport`, `sportivProfilTab`) mutate deasupra celor două return-uri timpurii (`@frqkd.ro`, `trebuie_schimbata_parola`), fără schimbare de comportament vizibil (CR-03).
- `.planning/.../26-UAT.md` — 12 teste `[pending]`, format identic cu `07-UAT.md`: testele 1-9 sunt verificările amânate din 26-01/26-02, testele 10-12 verifică fix-urile CR-01/CR-02/CR-03 din acest plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Gardă de autorizare per club (CR-01) — extrage în api/_permisiuniCont.ts, testează, rewire api/creare-cont.ts** - `e0968b5` (feat)
2. **Task 2: Rollback auth.users la eșec de RPC (CR-02) + hook-uri necondiționate în AppRouter (CR-03)** - `6fcfec6` (fix)
3. **Task 3: Consolidează verificarea umană amânată în 26-UAT.md** - `b2267ea` (docs)

**Plan metadata:** commit separat, vezi mai jos (final_commit)

## Files Created/Modified

- `api/_permisiuniCont.ts` - gardă pură nouă: `ROLE_WEIGHTS`, `GREUTATE_MINIMA_CREARE_CONT`, `GREUTATE_FEDERATIE`, `RolApelant`, `RezultatPermisiune`, `greutateMaximaGlobala`, `greutatePerClub`, `verificaPermisiuneCreareCont`
- `api/_permisiuniCont.test.ts` - test colocat nou, 14 cazuri, `ruleazaTeste()` exportată, auto-run
- `api/creare-cont.ts` - import + apel `verificaPermisiuneCreareCont`, validare payload WR-02, flag `userNouCreat` + rollback `deleteUser` pe ramura `rpcError`
- `components/AppRouter.tsx` - cele două `useState` mutate deasupra return-urilor timpurii
- `.planning/phases/26-.../26-UAT.md` - fișier nou, 12 teste `[pending]`

## Decisions Made

- Comparația de greutate la pasul de anti-escaladare folosește exclusiv `gClub` (Map per club), niciodată maximul global — elimină clasa de bug CR-01 la sursă, nu doar cazul raportat.
- Rollback-ul pe `auth.users` NU se extinde la alte căi de eroare din try (`sportivFetchError`, `forceParolaError`) — acolo RPC-ul deja a reușit și rândul din `sportivi` există; ștergerea ar produce exact inconsistența pe care CR-02 o repară.
- `26-UAT.md` documentează explicit că testul 10 (simulare eșec RPC) modifică temporar codul (redenumire RPC) și NU se rulează pe producție.

## Deviations from Plan

None - plan executed exactly as written. Toate cele 3 task-uri, toate criteriile de acceptare grep-abile și `npm run lint` au trecut fără ajustări.

## Issues Encountered

None.

## User Setup Required

None - nicio configurare de serviciu extern necesară. Zero `npm install` (confirmat de threat T-26-SC din plan) — toate modificările folosesc module deja prezente.

## Human Verification Pending (end-of-phase)

`26-UAT.md` conține acum 12 teste `[pending]` care trebuie rulate manual de dezvoltator înainte ca truths #6, #10, #12 și #14 din `26-VERIFICATION.md` să poată trece de la UNCERTAIN/PARTIAL la VERIFIED:
- Testele 1-4: fluxuri User Management existente (26-01) — cont staff, cont sportiv existent, `MandatoryPasswordChange`, token Bearer fără expunere parolă.
- Testele 5-9: wizard „Adaugă Club Nou" (26-02) — formular unificat, validare inline, submit unic, secțiune admin ascunsă la editare, login noul admin.
- Testele 10-12 (noi în acest plan): retry D-07 după eșec simulat de RPC (CR-02), escaladare cross-club blocată prin `fetch` direct din DevTools (CR-01), absența crash-ului „Rendered fewer hooks" după navigare (CR-03).

## Next Phase Readiness

- Cele 2 gap-uri blocante identificate de `26-VERIFICATION.md` (CR-01, CR-02) sunt închise la nivel de cod, dovedite de suita de 14 teste automate cu 0 FAIL.
- CR-03 (Rules of Hooks) e închis, verificat prin `npm run lint` + comparație de linii.
- Faza 26 poate trece la re-verificare (`/gsd-verify-phase`); după re-verificare pozitivă, `26-UAT.md` trebuie executat de dezvoltator pentru a confirma comportamentul end-to-end înainte de a considera faza complet livrată.
- Nu există blocker rezidual de implementare pentru acest plan.

---
*Phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a*
*Completed: 2026-08-31*

## Self-Check: PASSED

All created/modified files found on disk; all 3 task commits (`e0968b5`, `6fcfec6`, `b2267ea`) found in git log.
