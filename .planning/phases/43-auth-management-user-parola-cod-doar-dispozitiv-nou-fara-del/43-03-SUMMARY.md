---
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
plan: 03
subsystem: auth
tags: [supabase, gotrue, parola, competitie-extern]

requires:
  - phase: 43-02
    provides: trimiteCodResetParola si reseteazaParolaCuCod in authService
provides:
  - LoginParola (zona externa de competitie: email + parola, prima autentificare/reset prin cod, bifa dispozitiv personal)
  - loginParolaAcces si clasificaEroareAuth (inlocuiesc fluxul OTP)
affects: [43-04, 43-05, 43-06]

tech-stack:
  added: []
  patterns: ["mesaj unic de credentiale in zona externa, 'limita' separat"]

key-files:
  created:
    - components/CompetitieExterna/LoginParola.tsx
  modified:
    - utils/accesExtern.ts
    - utils/accesExtern.test.ts
    - services/accesExternService.ts
    - components/CompetitieExterna/index.tsx
    - components/CompetitieExterna/SolicitaContForm.tsx
    - api/_contCompetitieClub.ts
    - api/_aprobaCerereAcces.ts
    - components/Competitii/index.tsx
  deleted:
    - components/CompetitieExterna/LoginOtp.tsx

key-decisions:
  - "loginParolaAcces nu scrie in mfa_email_verificari: parola nu dovedeste MFA (contextele privilegiate: 43-04)."
  - "Rezidual T-43-11 acceptat (DEC-EXT): fara blocare per cont pe contul de club partajat; bariere = rate limit GoTrue per IP, parola min 12 + HIBP, notificaIncercareLogin."

requirements-completed: [DEC-EXT, DEC-COD, Q3]

duration: 20min
completed: 2026-11-16
---

# Phase 43 Plan 03: LoginParola in zona externa Summary

**Zona externa de competitie intra acum cu email + parola; prima autentificare / parola uitata trimite un cod de 8 cifre pe email si seteaza parola, dupa care utilizatorul intra direct; LoginOtp si serviciul OTP extern au fost eliminate.**

## Accomplishments
- `clasificaEroareAuth` (ok/credentiale/limita/alta) cu 11 asserturi noi (RED apoi GREEN); fluxul OTP scos din `accesExternService.ts`.
- `loginParolaAcces`: `signInWithPassword` + `notificaIncercareLogin` (acelasi control anti brute-force ca managementul), fara scriere MFA.
- `LoginParola.tsx` pe 3 pasi (login / trimite cod / cod + parola noua), `valideazaParola` + `checkLeakedPassword`, cooldown 60 s, bifa `acx-dispozitiv` implicit bifata (Q3), id `acx-email` pastrat.
- Texte/comentarii (SolicitaContForm, api/_contCompetitieClub, api/_aprobaCerereAcces, Competitii/index) nu mai promit OTP.

## Task Commits
1. Task 1: `ca273a8b` feat(43-03): clasificaEroareAuth si loginParolaAcces, fara OTP in serviciul extern
2. Task 2: `86226e78` feat(43-03): LoginParola inlocuieste LoginOtp in zona externa
3. Task 3: `9f118830` docs(43-03): texte si comentarii aliniate la login extern cu parola

## Verificare
- `node --import tsx utils/accesExtern.test.ts`: exit 0, 33 PASS (11 noi, cele vechi pastrate).
- `npm run lint` (tsc --noEmit): exit 0 dupa Task 2 si Task 3.
- Grep-urile din cele 3 taskuri: trec (fara OTP in fisierele vizate, 8 apeluri la functiile cerute, 5 id-uri `acx-*`, un `<LoginParola`, LoginOtp.tsx sters).
- NEVERIFICAT: UI-ul in browser (niciun test Playwright rulat); fluxul live exista doar prin bateria din 43-02.

## Note importante
- **Plan-checker W2:** dupa un reset reusit in zona externa, `reseteazaParolaCuCod` ruleaza `revocaDispozitiveIncredere`, deci si conturile privilegiate (ADMIN_CLUB etc.) pierd dispozitivul de incredere si vor primi cod MFA in portal la urmatoarea intrare. Comportament acceptat; tratarea contextelor privilegiate ramane la 43-04.
- Canalul OTP ramane activ in backend Supabase (T-43-12 accept; documentat in 43-05).

## Deviations from Plan
- Linii din fisierele de la Task 3 erau usor decalate fata de numerele din plan (continut identic); schimbate dupa text, nu dupa numar de linie.
- In Task 1, comentariul din `loginParolaAcces` a fost reformulat ca sa nu contina sirul `mfa_email_verificari` (grep-ul de verificare ar fi picat); commit amendat local inainte de Task 2.

## Issues Encountered
- `tests/ui_acces_extern_faza36.spec.ts` (Playwright, Faza 36) contine pasi pe fluxul OTP vechi (`acx-cod`, "Trimite codul") si va trebui actualizat; neatins aici (in afara `files_modified`).

## Known Stubs
None

## Threat Flags
None

## Self-Check: PASSED
LoginParola.tsx exista, LoginOtp.tsx sters; commit-urile ca273a8b, 86226e78, 9f118830 exista.
