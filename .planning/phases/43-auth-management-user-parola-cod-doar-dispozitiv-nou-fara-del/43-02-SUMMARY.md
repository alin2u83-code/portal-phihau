---
phase: 43-auth-management-user-parola-cod-doar-dispozitiv-nou-fara-del
plan: 02
subsystem: auth
tags: [supabase, gotrue, recovery-otp, parola]

requires:
  - phase: 43-01
    provides: aplicatie fara delogare la inactivitate
provides:
  - trimiteCodResetParola si reseteazaParolaCuCod in services/authService.ts (reset parola prin cod = prima setare a parolei)
  - tests/auth_extern_parola_faza43.ts (baterie live GoTrue)
affects: [43-03]

tech-stack:
  added: []
  patterns: ["un singur flux cod-recovery pentru reset si prima setare a parolei"]

key-files:
  created:
    - tests/auth_extern_parola_faza43.ts
  modified:
    - services/authService.ts
    - components/LoginPage.tsx

key-decisions:
  - "Reset si prima setare a parolei folosesc acelasi flux (cod recovery), fara flag/tabel nou."
  - "Serviciul nu face signOut la succes: LoginPage il face, zona externa (43-03) pastreaza sesiunea."

requirements-completed: [DEC-COD, DEC-EXT, DEC-MGMT]

duration: 15min
completed: 2026-11-16
---

# Phase 43 Plan 02: Serviciu comun reset parola prin cod Summary

**Resetul de parola prin cod pe email e acum o singura implementare in `authService.ts`, folosita de LoginPage, si dovedita live pe GoTrue pentru un cont fara parola (cod -> parola -> login).**

## Accomplishments
- `trimiteCodResetParola(email)` (normalizare, `inregistreazaEmailAuth`, nu arunca) si `reseteazaParolaCuCod(email, cod, parola)` cu `etapa` 'cod' | 'parola' | null; la succes revoca dispozitivele de incredere.
- LoginPage apeleaza serviciul; JSX, texte si mesajul neutru raman neschimbate; importurile nefolosite sterse.
- Baterie live: 10 verificari PASS, "Reziduuri: 0".

## Task Commits
1. Task 1: `513a123c` feat(43-02): serviciu comun reset parola prin cod, LoginPage pe serviciu
2. Task 2: `17625712` test(43-02): baterie live GoTrue pentru parola cont extern fara parola

## Verificare
- `npm run lint` (tsc --noEmit): cod 0.
- Grep-uri Task 1: 2 functii exportate, 2 apeluri in LoginPage, zero `resetPasswordForEmail|verifyOtp|updateUser` in LoginPage.
- Live `npx tsx tests/auth_extern_parola_faza43.ts`: exit 0. Rezultat fara PII:
  - 1 cont fara parola creat: PASS
  - 2 login pe cont fara parola: PASS (400 invalid_credentials)
  - 3 email inexistent: PASS (aceeasi eroare 400 invalid_credentials, fara enumerare)
  - 4 trimiteCodResetParola pe email inexistent: PASS (fara eroare, nu 429)
  - 5 cod recovery -> parola setata, acelasi user: PASS
  - 6 reutilizare cod: PASS (403 otp_expired, etapa 'cod')
  - 7 login cu parola setata / parola gresita respinsa: PASS
  - 8 Pitfall 6: parola identica (422 same_password) => etapa 'parola' si sesiune null: PASS
  - Reziduuri: 0; grep "@example.test|Aa1" pe iesire: 0
- Neverificat: LoginPage in browser (UI neatins, dar neexecutat); revocarea dispozitivelor la succes nu e acoperita de test live (RPC `revoca_dispozitive_incredere` apelat in contextul sesiunii de recovery).

## Deviations from Plan
- Functiile sunt `export const` (stilul fisierului), nu `export async function`; grep-ul literal din verificarea planului pe "export async function" nu le-ar numara, dar ambele sunt exportate cu semnaturile din contract.
- Singura schimbare de comportament in LoginPage (acceptata de plan, Pitfall 6): la esecul `updateUser` dupa cod valid, sesiunea de recovery se inchide local.

## Issues Encountered
None

## Known Stubs
None

## Threat Flags
None

## Self-Check: PASSED
Fisiere create/modificate exista; commit-urile 513a123c si 17625712 exista.
