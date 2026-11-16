---
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
plan: 05
subsystem: testing
tags: [playwright, competitie-extern, docs, auth]

requires:
  - phase: 43-03
    provides: LoginParola in zona externa
  - phase: 43-04
    provides: contexte privilegiate ascunse fara MFA (Q2)
provides:
  - tests/ui_acces_extern_faza43.spec.ts (4 teste pe build de productie)
  - documentatie flux extern cu parola (fluxuri.md sectiunea 9, roluri-permisiuni.md)
affects: [43-06]

key-files:
  created:
    - tests/ui_acces_extern_faza43.spec.ts
  modified:
    - tests/ui_acces_extern_faza36.spec.ts
    - docs/fluxuri.md
    - docs/roluri-permisiuni.md

key-decisions:
  - "Test 2 compara mesajele dupa page.reload() intre incercari, ca sa nu compare mesajul vechi cu el insusi."

requirements-completed: [DEC-EXT, DEC-COD, Q2, Q3]

duration: 15min
completed: 2026-11-16
---

# Phase 43 Plan 05: Spec Playwright login extern + documentatie Summary

**Login-ul extern cu parola, mesajul generic la credentiale gresite, sesiunea temporara cu bifa debifata si prima setare a parolei prin cod sunt acoperite de 4 teste Playwright pe build-ul de productie, fara email real; docs aliniate cu Faza 43.**

## Accomplishments
- `tests/ui_acces_extern_faza43.spec.ts`: 4 teste, useri efemeri `zztest_faza43ui_*` fara roluri; `/auth/v1/recover` interceptat, codul din `admin.generateLink`; cleanup in afterAll (2 useri stersi, 0 erori).
- `ui_acces_extern_faza36.spec.ts`: asertiunea OTP din testul 2 inlocuita cu `#acx-parola` (diff de 1 linie).
- Docs: sectiunea 9 din `docs/fluxuri.md` (parola, cod, bifa, Q2, nota canal OTP in backend, prerechizit SMTP), `docs/roluri-permisiuni.md` (autentificare + risc parola partajata fara blocare per cont).

## Task Commits
1. Task 1: `8210194b` test(43-05): spec Playwright login extern cu parola pe build
2. Task 2: `96a57ac7` docs(43-05): flux extern cu parola, prima setare prin cod, Q2

## Verificare
- `npx playwright test tests/ui_acces_extern_faza43.spec.ts` (vite build + preview): 4/4 PASS.
- `ui_acces_extern_faza36.spec.ts` complet (informativ): teste 1, 2, 3, 6 PASS; teste 4 si 5 FAIL. Testele 4 si 5 injecteaza sesiune cu rol REPREZENTANT_COMPETITIE + grant legacy `acces_competitie_extern` (fara login prin LoginParola); esecul tine de modelul Faza 39 (granturile legacy nu mai dau acces), nu de Faza 43. Nu investigat (in afara scopului planului).
- `npm run lint`: exit 0.
- Grep docs: fara "cod OTP"/"loghează cu OTP"/"emailurile OTP"; "Faza 43" in ambele documente.
- NEVERIFICAT: nu s-a rulat revizuire separata de cod; testele nu ruleaza pe mobil.

## Deviations from Plan
None - plan executat conform scrisului. (Mica ajustare de test: `page.reload()` in testul 2, vezi key-decisions.)

## Deferred Issues
- faza36 teste 4-5 esueaza (legacy granturi, Faza 39); de reparat/refacut intr-o faza separata.

## Known Stubs
None

## Threat Flags
None

## Self-Check: PASSED
Fisierele si commit-urile 8210194b, 96a57ac7 exista.
