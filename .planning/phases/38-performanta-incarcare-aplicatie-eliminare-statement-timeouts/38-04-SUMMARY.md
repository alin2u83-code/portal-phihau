---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 04
subsystem: frontend-loading
tags: [mfa-gate, data-provider, lazy-loading, concurrency, attendance-window]

requires: [38-02, 38-03]
provides:
  - useAppStore.mfaContextId / setMfaContextId
  - poarta MFA (poatePorniDate) peste toate cererile de date si realtime
  - useData(): incarcaLaCerere, cheiIncarcate, attendanceLoading, attendanceError
  - hooks/useDateLaCerere.ts -> { seIncarca }
affects: [38-05, 38-06, 38-07]

key-files:
  created: [hooks/useDateLaCerere.ts]
  modified: [hooks/useDataProvider.ts, hooks/useMFAGuard.ts, hooks/useClubAccess.ts, src/store/useAppStore.ts]

key-decisions:
  - "Coada seriala pentru cererile la cerere (nu doar ruleazaCuLimita per apel): doua ecrane nu pot depasi 3 in zbor impreuna"
  - "setMfaContextId ignora aceeasi valoare (guard-ul ruleaza la fiecare schimbare de view)"
  - "fetchAppData nu mai depinde de userRoles/session (currentUser s-a mutat in efect propriu)"

requirements-completed: [D-01, D-02, D-03, D-04]
completed: 2026-11-16
---

# Phase 38 Plan 04: Poarta MFA, incarcare la cerere, fereastra prezenta Summary

**Nicio cerere de date nu porneste inainte de MFA pentru contextul activ; la pornire raman doar 10 tabele mici (max 4 in zbor), restul se incarca la cerere (coada seriala, max 3), prezenta e azi-90..azi+30 si iese din loading/error global.**

## Task Commits

1. Task 1 (poarta MFA + prezenta decuplata + guard-uri) - `822719d1` (src/store/useAppStore.ts, hooks/useMFAGuard.ts, hooks/useClubAccess.ts, hooks/useDataProvider.ts)
2. Task 2 (set limitat, la cerere, fereastra, pastrare date la eroare) - `a7235c6e` (hooks/useDataProvider.ts, hooks/useDateLaCerere.ts)

## Implementat

**Set de pornire (ruleazaCuLimita, 4):** clubs, allRoles, grade, tipuriPlati (cu cache), tipuriAbonament, sesiuniExamene, familii, locatii, evenimente, taxeAnualeConfig. Plus, din hook-urile lor: sportivi, grupe, prezenta (fereastra), toate dupa poarta MFA.

**Chei la cerere (`incarcaLaCerere`):**
- prin coada (max 3 in zbor): tranzactii, istoricPlatiDetaliat, reduceri, rezultate, preturiConfig, vizeSportivi, decontSportivi, deconturiFederatie, taxaAnualaFederatieConfig, istoricGrade (paginat, aceleasi ramuri SPORTIV/club/federatie), inscrieriExamene
- 'plati' -> activeaza usePlati; 'antrenamenteIstoricComplet' -> useAttendanceData fara filtre (cheiIncarcate il include cand `filtreIncarcate === 'null'`)

**Poarta MFA:** `poatePorniDate = activeRoleContext && mfaContextId === activeRoleContext.id && rol != REPREZENTANT_COMPETITIE`. useMFAGuard seteaza mfaContextId doar la cele trei treceri (rol neprivilegiat, MFA valid/dispozitiv de incredere, fail-open documentat) printr-un helper local `treceMfa()` (un singur apel in sursa, trei cai); scurtatura `setup-mfa` seteaza doar mfaChecked. getUser inlocuit cu getSession. currentUser se construieste din roluri intr-un efect propriu (pagina MFA se poate randa fara date). `loading` = loadingData || rolesLoading || accessLoading; cat se asteapta MFA, loadingData e false.

**Erori:** cheie esuata ramane absenta din merge (datele anterioare raman) si da un singur toast `date-partiale`; niciodata `setError`. Retry 57014 = zero (din 38-02).

**Altele:** useFetchAllowedClubs(userId) cu cheie de cache per utilizator si fara RPC fara sesiune; istoricPrezenta nu se mai incarca la pornire; fetchAllPages inline si Promise.allSettled eliminate din provider.

## Verificare

- `npx tsc --noEmit -p .`: 0 erori (dupa fiecare task).
- `npx tsx utils/incarcareDate.test.ts` si `utils/supabaseHelpers.test.ts`: "Toate testele au trecut".
- `npm run build`: reusit.
- grep: 0 `Promise.allSettled`, 0 `const fetchAllPages`; `view_istoric_plati_detaliat`, `vedere_istoric_grade_sportiv`, `vedere_detalii_examen` apar doar in construiesteCereriLaCerere.
- NU verificat: orice rulare in browser (flux MFA end-to-end, ca setup-mfa -> dashboard porneste datele, toast, cererile reale la cerere, rolurile SPORTIV/INSTRUCTOR/federatie). Fara teste unitare noi pentru provider (logica e in efecte React, fara infrastructura de test in proiect). Fara review separat de cod (nu aveam agent disponibil); recomandat inainte de push.

## Deviations from Plan

None - planul executat ca scris. Doua alegeri de detaliu: (1) coada seriala in loc de ruleazaCuLimita independent per apel (mai strict decat cerinta); (2) `setMfaContextId` din store ignora valoarea identica, ca sa nu re-randeze App la fiecare navigare.

## Atentie pentru 38-05 / 38-06 (nu o regresie a acestui plan, dar vizibila pana atunci)

Dupa acest plan, ecranele care citesc din useData() `plati`, `tranzactii`, `istoricPlatiDetaliat`, `reduceri`, `rezultate`, `preturiConfig`, `vizeSportivi`, `decontSportivi`, `deconturiFederatie`, `taxaAnualaFederatieConfig`, `istoricGrade`, `inscrieriExamene` primesc liste goale pana apeleaza `useDateLaCerere([...])`. Deci aplicatia e functional incompleta pana aterizeaza 38-05/38-06 (nu face push intre ele). Prezenta in afara ferestrei azi-90..azi+30 la fel (cheia 'antrenamenteIstoricComplet').

Alte riscuri: la deschiderea portii pornesc concurent setul critic (4) + sportivi + grupe + prezenta (hook-uri React Query, nelimitate de ruleazaCuLimita), deci varful real la pornire poate depasi 4; de masurat in 38-07.

## Known Stubs

Niciunul.

## Threat Flags

Niciunul. T-38-11/13/14 mitigate (poarta pe context id, limitatoare, cache per utilizator); T-38-15 mitigat prin cheiIncarcate/seIncarca (consumatorii in 38-05/06).

## Self-Check: PASSED

Fisiere create/modificate prezente, commit-urile 822719d1 si a7235c6e exista. STATE.md/ROADMAP.md neatinse (le actualizeaza orchestratorul).
