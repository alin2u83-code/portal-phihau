---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 01
subsystem: payments
tags: [typescript, navigation, tdd, react, hub-pattern]

# Dependency graph
requires: []
provides:
  - "components/Plati/hub/platiHubConfig.ts — contract de tipuri + gruparea D-01..D-05 + rezolvitor pur de pozitie"
  - "components/Plati/hub/platiHubConfig.test.ts — suite de 19 teste tsx"
  - "Literal View 'plati-hub' in types.ts"
  - "Harta props/fluxuri verificata pe codul real pentru cele 14 view-uri financiare (0 divergente)"
affects: [31-02, 31-03, 31-04, 31-05, 31-06, 31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rezolvitor pur de pozitie hub (functie fara React/Supabase/localStorage), testat cu conventia tsx a proiectului (utils/perioadaGratie.test.ts)"
    - "Constante derivate programatic (TAB_PENTRU_SECTIUNE, SECTIUNE_IMPLICITA) din sursa unica SECTIUNI_PE_TAB — nu duplicat manual"

key-files:
  created:
    - components/Plati/hub/platiHubConfig.ts
    - components/Plati/hub/platiHubConfig.test.ts
  modified:
    - types.ts

key-decisions:
  - "Literal View nou 'plati-hub' (nu reutilizare 'plati-scadente') — intrare unica cu identitate proprie; toate cele 12 literale vechi raman in uniune ca alias-uri (localStorage + favorite AdminMasterMap le folosesc)"
  - "Precedenta rezolvaPozitieHub: viewParams.sectiune > viewParams.tab > literal vechi din activeView > fallback implicit facturi/plati-scadente, cu suprascriere finala taxe-anuale->tipuri-abonament cand poateVedeaTaxeAnuale e false"
  - "Singura modificare types.ts din toata faza 31: adaugarea aditiva a literalului 'plati-hub'"

patterns-established:
  - "Contract de props comun PlatiHubTabProps consumat de toate componentele de tab din wave 2/3 (31-04/05/06/08)"

requirements-completed: [D-01, D-02, D-03, D-04, D-05]

# Metrics
duration: ~15min
completed: 2026-09-26
---

# Phase 31 Plan 01: Fundatia hub-ului Plati & Facturi Summary

**Contract TypeScript (`platiHubConfig.ts`) cu gruparea D-01..D-05 codificata intr-o singura sursa, rezolvitor pur `rezolvaPozitieHub` testat cu 19 cazuri tsx, si literalul View `'plati-hub'` — fundatia pentru consolidarea celor 14 view-uri financiare in 4 tab-uri.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 3 (2 create, 1 modificat)

## Accomplishments

- Auditul complet al hartii de props/fluxuri (14 view-uri, 6 fluxuri F1-F6) verificat linie cu linie pe codul real din `AppRouter.tsx`, `App.tsx`, `AppLayout.tsx`, `NavigationContext.tsx`, `JurnalIncasari.tsx`, `PlatiScadente.tsx`, `GestiuneFacturi.tsx`, `GrupaDetailView.tsx`, `GestiuneExamene/index.tsx`, `UserProfile.tsx`, `SportivDashboard/index.tsx` — **zero divergente**, harta din plan e exacta.
- Contract de tipuri (`TabHub`, `SectiuneHub`, `PozitieHub`, `TabProfilSportiv`, `PlatiHubTabProps`) creat in `components/Plati/hub/platiHubConfig.ts`, gata de consumat de planurile de tab (31-04/05/06) si de shell (31-08).
- Gruparea D-01..D-04 si excluderea D-05 (familii, deconturi-federatie) codificate intr-o singura sursa (`SECTIUNI_PE_TAB`), cu `TAB_PENTRU_SECTIUNE`/`SECTIUNE_IMPLICITA` derivate programatic — nu pot diverge unele de altele.
- Rezolvitor pur `rezolvaPozitieHub` cu precedenta clara (viewParams.sectiune > viewParams.tab > literal vechi > fallback) plus fallback dedicat pentru guard-ul `taxe-anuale`.
- Ciclu TDD complet: test scris si rulat inainte de implementare (RED — a picat cu `SyntaxError` pe exporturi lipsa), apoi implementare (GREEN — 19 PASS, 0 FAIL).
- Literalul aditiv `'plati-hub'` adaugat in uniunea `View` din `types.ts`; toate cele 14 literale financiare vechi raman neschimbate.

## Task Commits

Fiecare task a fost commis atomic (Task 2 a folosit ciclul TDD RED->GREEN, deci 2 commit-uri):

1. **Task 1: Audit harta props/fluxuri + contractul de tipuri** - `2ffcb24` (docs)
2. **Task 2 (RED): test rezolvaPozitieHub + gruparea D-01..D-05** - `7fc65e8` (test)
3. **Task 2 (GREEN): implementare rezolvaPozitieHub + literal View plati-hub** - `a5ea8e8` (feat)

**Plan metadata:** (commit final, vezi mai jos)

## Files Created/Modified

- `components/Plati/hub/platiHubConfig.ts` - Antet JSDoc "Harta props verificata" + tipuri (`TabHub`, `SectiuneHub`, `PozitieHub`, `TabProfilSportiv`, `PlatiHubTabProps`) + constante (`TABURI_HUB`, `ETICHETE_TABURI`, `SECTIUNI_PE_TAB`, `ETICHETE_SECTIUNI`, `SECTIUNE_IMPLICITA`, `TAB_PENTRU_SECTIUNE`, `VEDERI_HUB`) + functii (`esteTabHub`, `esteSectiuneHub`, `esteVedereHub`, `rezolvaPozitieHub`)
- `components/Plati/hub/platiHubConfig.test.ts` - 19 cazuri `run()`, `runTests()` exportat, garda `process.argv[1]`, conventia proiectului (fara vitest/jest)
- `types.ts` - literalul aditiv `'plati-hub'` in uniunea `View` (linia unde apare `'plati-scadente'`)

## Harta props verificata

Toate cele 14 randuri din tabelul "HARTA DE PROPS" al planului au fost verificate linie cu linie pe codul real si **confirmate identice** — nu a fost necesara nicio corectie. Tabelul complet e reprodus ca antet JSDoc in `components/Plati/hub/platiHubConfig.ts` (sectiunea "Harta props verificata (Faza 31, plan 01)"), impreuna cu toate fluxurile F1-F6.

Trei fapte critice confirmate explicit pe cod (necesare planurilor 31-04/05/06/08):
1. `JurnalIncasari.tsx:493-494` invoca automat `onIncasareProcesata()` apoi `setTimeout(() => onBack(), 1500)` dupa orice incasare reusita — `onBack` poate veni si fara interactiune manuala.
2. `GestionareNomenclatoare` primeste `plati` NEFILTRAT (linia 265: `plati={plati}`, nu `filteredData.plati`); `ReduceriManagement` si `JurnalIncasari` primesc `reduceri` NEFILTRAT (linia 263, respectiv 239).
3. `istoric-plati` (AppRouter.tsx:284-285) nu are `renderProtected`/guard si e folosit de rolul SPORTIV (`SportivDashboard/index.tsx:588,700` — `onNavigate('istoric-plati')`).

## Divergente harta props

Niciuna. Toate cele 14 randuri (props, sursa filteredData vs nefiltrat, guard) si toate cele 6 fluxuri F1-F6 corespund exact codului real verificat in Task 1.

## Decisions Made

- Literal View nou `'plati-hub'` (nu reutilizare `'plati-scadente'`) — motivat de persistenta localStorage (`phi-hau-active-view`) si favoritele AdminMasterMap care refera literalele vechi direct.
- `rezolvaPozitieHub` e o functie pura, fara React/Supabase/localStorage — testabila izolat cu `npx tsx`, fara mock-uri.
- `TAB_PENTRU_SECTIUNE` si `SECTIUNE_IMPLICITA` derivate programatic din `SECTIUNI_PE_TAB` (nu scrise de mana) — elimina riscul ca cele trei structuri sa diverga la o modificare viitoare.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Contractul `platiHubConfig.ts` e gata de import pentru planurile 31-04 (TabFacturi), 31-05 (TabIncasari/TabRapoarte), 31-06 (TabConfigurare) si 31-08 (shell PlatiHub + rutare AppRouter).
- Niciun blocker cunoscut. Harta de props verificata elimina riscul ca planurile urmatoare sa transmita props gresite componentelor existente.

## Self-Check: PASSED

- FOUND: components/Plati/hub/platiHubConfig.ts
- FOUND: components/Plati/hub/platiHubConfig.test.ts
- FOUND: commit 2ffcb24 (Task 1)
- FOUND: commit 7fc65e8 (Task 2 RED)
- FOUND: commit a5ea8e8 (Task 2 GREEN)
