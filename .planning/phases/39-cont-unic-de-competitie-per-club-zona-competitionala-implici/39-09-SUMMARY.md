---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 09
subsystem: ui
tags: [competitie-externa, actor, declarativ, react-query]
requires:
  - phase: 39-08
    provides: rpc instructori_club_cont / deschide_sesiune_actor / sesiune_actor_curenta / inchide_sesiune_actor (aplicate in 39-11)
provides:
  - services/autorModificariService.ts (4 functii { data, error })
  - AlegeActorModal ("Cine lucrează?")
  - ShellExtern cu badge actor + Schimbă
affects: [39-11]
key-files:
  created:
    - services/autorModificariService.ts
    - components/CompetitieExterna/AlegeActorModal.tsx
  modified:
    - types.ts
    - components/CompetitieExterna/ShellExtern.tsx
    - components/CompetitieExterna/index.tsx
requirements-completed: [D-06, D-07, D-19, D-20]
duration: ~15min
completed: 2026-11-11
---

# Phase 39 Plan 09: UI alegere autor (contul de club) Summary

Dialog obligatoriu "Cine lucrează?" la intrarea contului de club (REPREZENTANT_COMPETITIE) într-o competiție, cu badge "Lucrează: {nume}" și buton "Schimbă" în antet; reapare la expirarea sesiunii de actor.

## Realizări
- Serviciu `autorModificariService` (incarcaInstructoriClub, deschideSesiuneActor, sesiuneActorCurenta, inchideSesiuneActor), tipuri `SesiuneActor`, `InstructorClub` în `types.ts`.
- `AlegeActorModal`: Modal persistent când e obligatoriu, listă radio persoane + "Altcineva" (nume 2..120), text explicit declarativ/neverificat/jurnal (D-06, D-20), mesaj pentru listă goală, eroare în dialog.
- `index.tsx`: starea 'activ' mutată în componenta `EcranActiv` (hook-urile nu pot sta în `switch`). `useQuery(['extern','sesiune-actor', roleRowId])` cu `refetchOnWindowFocus` + `refetchInterval` 5 min; `CompetitieDetail` nu se randează până la alegere; sesiune cu alt `competitie_id` => se re-declară. Conturile ADMIN_CLUB/INSTRUCTOR: fără query, dialog sau badge.
- Deconectarea din 'lista'/'activ' apelează `inchideSesiuneActor()` best effort (doar pentru contul de club), apoi `deconecteaza()`.
- `ShellExtern`: props `actor`, `onSchimbaActor`; sufix "(nume liber)" când `!actor_din_lista`.

## Commits
- c67986a feat(39-09): serviciu autor + dialogul 'Cine lucrează?'
- 02d5962 feat(39-09): dialog obligatoriu de actor la intrarea in competitie, badge + Schimba

## Deviații
Niciuna față de intenția planului. Detalii de implementare: extragere `EcranActiv`; `key={ctx.roleRowId}` mutat de pe `ExternDataProvider` pe `EcranActiv` (același efect de remount la schimbarea contextului).

## Verificat / neverificat
- `npx tsc --noEmit`: 0 erori; toate criteriile de acceptare grep trec; `npx tsx utils/accesExtern.test.ts`: PASS.
- NEVERIFICAT: browser (nu s-a rulat UI), RPC-urile reale (migrarea 39-08 se aplică în 39-11; până atunci `sesiune_actor_curenta` dă eroare => `data` null => dialogul apare și "Continuă" afișează eroare).
- Comportament de știut: la expirare (refetch întoarce null) dialogul apare și `CompetitieDetail` se demontează (starea locală necomisă din formulare se pierde).

## Self-Check: PASSED
