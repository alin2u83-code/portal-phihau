---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 07
subsystem: ui
tags: [react, competitii, fram, echipe, service]
requires: [42-02]
provides:
  - "services/echipeCompetitieService.ts: sincronizeazaMembriEchipa (insert noi -> update rol -> delete scosi, fara throw)"
  - "Pas4Sumar: echipele existente se re-sincronizeaza pe diferenta (nu mai delete-all + insert-all)"
  - "InscriereModal: bloc FRAM + exceptie super admin confirmata, edit echipa pe diferenta, Giao Dau doar arme eligibile pe grad"
affects: [42-09]
key-files:
  created: [services/echipeCompetitieService.ts]
  modified:
    - components/Competitii/InscriereModal.tsx
    - components/Competitii/InscriereClubWizard/Pas4Sumar.tsx
key-decisions:
  - "Membrii echipei editate nu sunt blocati de FRAM (stareFram ii coboara la 'avertisment'); DB verifica doar membri noi"
  - "ConfirmModal 'Excepție FRAM' randat in afara Modal (fragment): bubbling prin portal ar inchide modalul principal la click pe fundal"
  - "Rezumatul FRAM din modal: blocat={fram_obligatoriu && !esteSuperAdmin} (planul avea doar fram_obligatoriu) ca super adminul cu exceptie confirmata sa nu vada 'nu se poate inscrie'"
requirements-completed: [D-04, D-05, D-08, D-09, D-11]
duration: 20min
completed: 2026-11-15
---

# Phase 42 Plan 07: Editare sigura membri echipa + FRAM in modal Summary

**`sincronizeazaMembriEchipa` scrie diferenta (adauga, rol, scoate) cu verificarea numarului de randuri, folosita de Pas4Sumar si InscriereModal; modalul aplica regula FRAM (bloc pentru club, exceptie confirmata pentru super admin) si filtreaza armele Giao Dau pe grad.**

## Accomplishments
- Service nou, ordine insert -> update rol -> delete; 0 randuri (RLS dupa inchidere) => `Înscrierile s-au închis; doar federația poate modifica.`; erorile DB (ex. refuzul FRAM) ajung la utilizator; nu arunca.
- Pas4Sumar: citeste membrii curenti, sincronizeaza prin service; ramura echipa noua neschimbata; taxele neatinse (D-09).
- InscriereModal: `statusFram` per sportiv (individual, titulari, rezerve), checkbox dezactivat la `blocat`, `ConfirmModal` "Excepție FRAM" la adaugarea unui sportiv cu stare `exceptie`, select-all sare 'blocat'/'exceptie', salvare echipa editata prin service apoi update `echipe_competitie` cu `.select('id')` (0 randuri => mesaj inchis).
- Giao Dau: `ArmePermiseGiaoDau eligibile=` din `arme.drepturi` la gradul efectiv (undefined cand drepturile nu sunt incarcate = fara filtru).

## Task Commits
1. Task 1 (service + Pas4Sumar): e696976d
2. Task 2 (InscriereModal): faff25ad

## D-05 gate (rezultate)
- (a) insert/upsert pe `inscrieri_competitie`/`echipa_sportivi`: doar Pas4Sumar.tsx (342, 432), InscriereModal.tsx (277, 330), echipeCompetitieService.ts (27). Niciun alt fisier in components/services/hooks/utils/api. Verificare suplimentara pe tot repo-ul (fara node_modules/.planning): celelalte fisiere care mentioneaza tabelele nu fac insert/upsert (Deduplicare face doar `update sportiv_id`, fuzionare de duplicate, nu inscriere noua); scripts/ si tests/ sunt in afara browserului.
- (b) `status: 'inscris'`: Pas4Sumar.tsx (330, 351) + doua fixture-uri `*.test.ts` (ignorate).
- (c) `sincronizeazaMembriEchipa(`: apelanti doar InscriereModal.tsx:287 si Pas4Sumar.tsx:383 (+ definitia).
- (d) `insert into (echipa_sportivi|inscrieri_competitie)` in supabase/migrations: 0 rezultate.
Niciun site suplimentar; nu a fost nevoie de confirmare noua in alt fisier.

## Deviations from Plan
- [Rule 1 - Bug] ConfirmModal in afara `Modal` (vezi key-decisions): ca copil al Modal, un click pe fundalul confirmarii ar fi inchis modalul principal (React propaga evenimentele prin portal).
- Rezumat FRAM cu `blocat` conditionat de `!esteSuperAdmin` (vezi key-decisions). Altfel planul urmat.

## Verification
- `npx tsc --noEmit -p .`: 0 erori.
- `npx tsx utils/editareCompetitie.test.ts`: toate testele trec (diferentaMembri/statusFram din 42-02).
- Greps din verify (statusFram x1, sincronizeazaMembriEchipa x1, "Excepție FRAM" x1, eligibile= x1, `.delete()` x1 = doar retragerea individuala) OK; gate D-05 OK.
- NOT verified: browser/vizual (bloc, ConfirmModal, select-all, edit echipa, Giao Dau), comportament cu DB reala; nu exista teste de componenta; `sincronizeazaMembriEchipa` nu are test automat (ruleaza doar contra Supabase; DB acoperit de 42-04). Migrarea 20261115b nu e aplicata live, deci `fram_obligatoriu` e undefined si regula FRAM e efectiv oprita pana la aplicare. Revizuirea separata de cod (code-review) NU a rulat. Escape pe ConfirmModal inchide si modalul principal (handler Escape global din Modal, neschimbat).

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Commits e696976d, faff25ad exista; services/echipeCompetitieService.ts exista; InscriereModal.tsx si Pas4Sumar.tsx modificate.
