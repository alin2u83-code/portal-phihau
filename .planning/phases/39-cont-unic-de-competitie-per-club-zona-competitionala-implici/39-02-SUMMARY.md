---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 02
subsystem: api
tags: [supabase-auth, vercel, competitii, cont-club, proprietar]
requires:
  - phase: 39-01
    provides: conturi_competitie_club, proprietari_aplicatie (contracte DB, neaplicate live)
  - phase: 36-acces-extern-competitie
    provides: rol REPREZENTANT_COMPETITIE, RPC user_id_dupa_email, endpoint aproba-cerere-acces
provides:
  - api/_contCompetitieClub.ts (valideazaCerereContClub, esteProprietarApelant, creeazaContClub, schimbaEmailContClub)
  - POST /api/aproba-cerere-acces?action=cont-club {operatie, club_id, email} (doar proprietar)
  - aprobarea cererilor de acces = creare cont de club, doar proprietar
affects: [39-04, 39-15]
tech-stack:
  added: []
  patterns: ["dispecer ?action= pe endpoint existent (limita 12 functii Vercel Hobby; raman 11)"]
key-files:
  created:
    - api/_contCompetitieClub.ts
    - api/_contCompetitieClub.test.ts
  modified:
    - api/aproba-cerere-acces.ts
    - api/_aprobaCerereAcces.ts
    - api/_aprobaCerereAcces.test.ts
key-decisions:
  - "Cont de club = identitate auth dedicata (email nou, fara parola); email existent -> 409, conturile ADMIN_CLUB/INSTRUCTOR nu sunt atinse"
  - "Schimbare email: UPDATE conturi_competitie_club ... WHERE user_id=vechi (concurenta), apoi ban 876000h + stergere dispozitive de incredere; randul de rol al vechiului user ramane (este_doar_extern)"
  - "Aprobare cerere: club cu cont existent -> 409 cu mesaj dedicat, cererea ramane in_asteptare"
requirements-completed: [D-01, D-13, D-14, D-15]
duration: 20min
completed: 2026-11-11
---

# Phase 39 Plan 02: Server cont de competitie per club Summary

Modul server pentru crearea si schimbarea emailului contului de competitie al unui club (doar proprietarul aplicatiei, verificat server-side), plus aprobarea cererilor de acces mutata pe contul de club.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1 RED | 4b47349 | test pur (validare + garda proprietar) |
| 1 GREEN | 96bdae3 | `api/_contCompetitieClub.ts` |
| 2 | 4221892 | dispecer `?action=cont-club`, aprobare pe cont de club |

## Ce s-a livrat
- `creeazaContClub`: 404 club inexistent, 409 club cu cont, 409 email apartinand unui user existent, createUser fara parola (doar OTP), rand de rol REPREZENTANT_COMPETITIE (club_id/sportiv_id NULL), insert in `conturi_competitie_club`; rollback complet la orice esec dupa createUser (inclusiv 23505 concurent).
- `schimbaEmailContClub`: identitate noua + UPDATE conditionat pe vechiul `user_id`; esec/0 randuri -> rollback identitate noua; apoi ban vechi + sterge `mfa_dispozitive_incredere`/`mfa_email_verificari`; esec ban -> ok cu `avertisment: 'ban_esuat'`.
- Handler: `callerId` doar din token; `?action=cont-club` cere `esteProprietarApelant` (403 altfel, esueaza inchis); aprobarea cere proprietar, respingerea ramane `esteFederatie`.
- `proceseazaCerereAcces`: ramura de aprobare inlocuita cu `creeazaContClub`; 0 referinte executabile la `acces_competitie_extern`.

## Verificare (rulata)
- `node --import tsx api/_contCompetitieClub.test.ts` ALL PASSED (12 asertiuni); `api/_aprobaCerereAcces.test.ts` ALL PASSED.
- Acceptanta: 4 exporturi, `ban_duration` x1, `password` x0, `cont-club` x2, `esteProprietarApelant` x3 in handler, 11 fisiere-functie in api/ (neschimbat), `tsc --noEmit` fara erori in fisierele atinse.
- NERULATE: creare/schimbare email/aprobare pe DB real (tabelele nu sunt aplicate; se testeaza live in 39-04); handler-ul HTTP nu a fost apelat; nu s-a rulat review separat de cod.

## Deviations from Plan
None - plan executat ca scris. Detalii minore: la schimbarea emailului cererea de `cluburi` se face dupa verificarea contului existent (nume club necesar pentru cache-ul rolului); UPDATE-ul foloseste `.select()` ca sa detecteze 0 randuri afectate.

## Riscuri / de stiut
- `proceseazaCerereAcces` inca citeste `competitie_id`/`nume` din cerere (necesare doar pentru schema veche); inofensiv.
- Daca marcarea cererii esueaza dupa crearea contului, cererea ramane in_asteptare iar reincercarea da 409 "club are deja cont"; proprietarul o respinge manual.
- UI-ul (`CereriAccesAdmin.tsx`, `accesExternService.ts`) are modificari necomise ale altcuiva in working tree; nu au fost atinse. Ele apeleaza inca aprobarea cu rol de federatie: un SUPER_ADMIN non-proprietar va primi acum 403 la aprobare (intentionat, D-01).

## Self-Check: PASSED
Fisierele create exista; commit-urile 4b47349, 96bdae3, 4221892 exista.
