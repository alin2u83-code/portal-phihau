---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 03
subsystem: payments
tags: [typescript, react, tdd, supabase, financial-ui]

# Dependency graph
requires: []
provides:
  - "utils/facturaDetaliu.ts — logica pura (sumar sume, istoric tranzactii, plan achitare rapida, payload whitelist)"
  - "components/Plati/FacturaDetaliu.tsx — modal reutilizabil de detaliu factura (plataId, onClose)"
affects: [31-04, 31-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plan de actiune (PlanAchitare discriminated union: invalid|direct|cu_corectie) calculat pur, apoi executat prin RPC existent — decizie de business separata de efectul de retea"
    - "round2() aplicat si pe diferenta (nu doar pe operanzi) inainte de comparatia cu toleranta — evita artefacte de precizie float (100.01-100 = 0.010000000000005116, nu 0.01 exact)"
    - "Deduplicare istoric tranzactii pe Map<tranzactieId> intre doua surse de legatura (tranzactii.plata_ids si view_plata_sportiv.tranzactie_id) — sursa 'ambele' cand ambele contin acelasi id"

key-files:
  created:
    - utils/facturaDetaliu.ts
    - utils/facturaDetaliu.test.ts
    - components/Plati/FacturaDetaliu.tsx

key-decisions:
  - "planificaAchitareRapida foloseste round2(Math.abs(X - rest)) <= TOLERANTA (nu Math.abs direct) — bug de precizie float descoperit in GREEN (testul T16 pica desi matematica era corecta), fix aplicat inainte de commit"
  - "Actiunea rapida cu_corectie: intai update literal { suma_initiala, suma } (2 chei whitelist), abia apoi RPC proceseaza_plata_factura — daca RPC-ul esueaza dupa corectie, mesajul de eroare specifica explicit ca suma facturata a fost deja schimbata (repudiere/T-31-03-03)"
  - "Corectia manuala foloseste EXCLUSIV construiestePayloadEditareFactura (5 chei testate), niciodata spread din plata sau din forma — verificat cu garda grep 0 rezultate"
  - "sumar!/istoric calculate cu useMemo inainte de early-return-ul '!plata' (necesar pentru Rules of Hooks); non-null assertion in JSX e sigura pentru ca JSX-ul respectiv e randat doar dupa ce plata a fost confirmata"

patterns-established:
  - "Whitelist explicit + payload literal cu 2 chei pentru corectia de suma_initiala din fluxul cu_corectie — extensie a pattern-ului D-07 deja stabilit in 31-02, aplicat si la un update partial (nu doar la editarea completa)"

requirements-completed: [D-06, D-07, D-08, D-09]

# Metrics
duration: ~40min
completed: 2026-09-26
---

# Phase 31 Plan 03: Ecran detaliu factura (D-06..D-09) Summary

**Modal reutilizabil `FacturaDetaliu` (sume separate, istoric tranzactii deduplicat, actiune rapida cu corectie automata a sumei facturate, corectie manuala whitelist) construit pe o logica pura complet testata (33 cazuri tsx) — livrat ca fundatie pentru tab-ul Facturi (31-04) si profilul sportivului (31-07).**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 3 (toate create)

## Accomplishments

- Ciclu TDD complet si verificat manual (nu doar declarativ): implementarea a fost mutata temporar deasupra (`.bak`) pentru a confirma RED real (`ERR_MODULE_NOT_FOUND`), apoi restaurata pentru GREEN — evita falsul-pozitiv "am scris testul dupa cod si a mers din prima".
- `utils/facturaDetaliu.ts`: 4 functii pure + `CAMPURI_EDITABILE_PLATA`, zero dependinte React/Supabase (`grep -c "supabase\|from 'react'"` = 0), 9 exporturi (contractul complet din plan).
- 2 bug-uri gasite si reparate in timpul GREEN, ambele documentate ca deviatii mai jos (Rule 1 — logica pura, Rule 1 — testul propriu).
- `components/Plati/FacturaDetaliu.tsx`: modal de 406 linii care afiseaza context complet (platitor, club, tip taxa, perioada, status, descriere, reducere), 3 casete de sume separate, istoric tranzactii cu marcaj "tranzactie comuna pentru N facturi", actiune rapida gated D-09, corectie manuala pliabila gated D-09.
- Toate gardele grep din `<verification>`/`<acceptance_criteria>` verificate explicit inainte de commit (whitelist, zero spread in update, <=2 `select('*')` fiecare urmat de `.eq('id'`, zero Shadcn/MUI/Radix).

## Task Commits

Task 1 a folosit ciclul TDD complet RED→GREEN (2 commit-uri), Task 2 a fost un singur commit:

1. **Task 1 (RED): test facturaDetaliu logica pura** - `ecf040d` (test) — confirmat FAIL real (modul lipsa) inainte de commit
2. **Task 1 (GREEN): implementeaza facturaDetaliu.ts + fix precizie float + fix test T32** - `d8b0f35` (feat) — 33 PASS, 0 FAIL
3. **Task 2: modal FacturaDetaliu** - `e8bd712` (feat)

## Files Created/Modified

- `utils/facturaDetaliu.ts` - `CAMPURI_EDITABILE_PLATA`, `calculeazaSumarFactura`, `construiesteIstoricTranzactii`, `planificaAchitareRapida`, `construiestePayloadEditareFactura` + tipurile `SumarFactura`, `RandIstoricTranzactie`, `PlanAchitare`, `FormEditareFactura`
- `utils/facturaDetaliu.test.ts` - 33 cazuri `run()`, `runTests()` exportat, conventia `perioadaGratie.test.ts` (fara vitest/jest)
- `components/Plati/FacturaDetaliu.tsx` - `FacturaDetaliu` (props `plataId: string | null`, `onClose: () => void`), interfata locala `FacturaDetaliuProps`

## Decizia de proiectare: actiunea rapida (direct vs cu_corectie)

Per obiectivul planului: `suma_initiala` = total facturat, `suma` = rest de plata recalculat de trigger-ul DB (`recalculare_stare_plata`, `sql/refactor/REFACTOR_FINANCIAL.sql:1-47`).

- **X == rest (±0.01):** doar RPC `proceseaza_plata_factura` — identic cu butonul "Încasează Rapid" deja existent in `PlatiScadente.tsx:518` si `GestiuneFacturi.tsx:427`. Zero logica noua de business.
- **X < rest:** clientul a platit mai putin decat restul si factura trebuie inchisa acum — intai un update whitelist cu 2 chei `{ suma_initiala: veche - (rest - X), suma: X }` (corectie explicita, previzualizata in UI inainte de click), apoi acelasi RPC cu X; trigger-ul DB aduce restul la 0 si statusul la 'Achitat'.
- **X > rest:** blocat explicit ("Pentru avans folosiți Jurnal Încasări") — avansurile au flux dedicat, in afara scopului acestui ecran.
- Dupa orice incercare (succes sau esec RPC dupa ce corectia a fost deja scrisa), se face refetch pe id (`select('*').eq('id')`) + merge `{...p, ...proaspata}`, urmat de invalidare React Query pe `['plati']` si `['facturi-abonament-luna']` — pattern identic cu fix-urile din 31-02.
- Daca statusul real dupa refetch nu e 'Achitat', utilizatorul vede un avertisment explicit cu statusul si restul reale din DB — protectie fata de diferente intre migratiile din repo si DB live (risc deja documentat in 31-02 ca "risc rezidual").

## Risc acceptat: T-31-03-04

RPC-ul `proceseaza_plata_factura` (SECURITY DEFINER) nu verifica rolul apelantului — insera in `tranzactii` ocolind RLS indiferent de cine il apeleaza. Acest risc e **pre-existent** (acelasi RPC e deja folosit de `PlatiScadente.tsx` si `GestiuneFacturi.tsx` dinainte de aceasta faza) si in afara domeniului fazei 31 (per `31-CONTEXT.md`: "Nu intra in scope: logica de business a platilor... RLS, triggere DB"). Poarta reala de securitate ramane RLS pe tabela `plati` insasi (raspunsul `data === null` la update e tratat explicit ca refuz de permisiune in ambele handlere din `FacturaDetaliu.tsx`), verificata separat (read-only) in planul 31-07. Consemnat aici ca follow-up, neschimbat in acest plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Precizie float in planificaAchitareRapida (comparatia cu toleranta)**
- **Found during:** Task 1, rularea GREEN (test T16: `{ suma: 100 }, 100.005` trebuia sa dea `direct`, a dat `cu_corectie`)
- **Issue:** `round2(100.005)` = `100.01`, dar `Math.abs(100.01 - 100)` in JS = `0.010000000000005116` (nu exact `0.01`) din cauza reprezentarii binare a floaturilor — comparatia `<= TOLERANTA` (0.01) esua fals.
- **Fix:** aplicat `round2()` si pe diferenta, nu doar pe operanzi: `round2(Math.abs(X - rest)) <= TOLERANTA`.
- **Files modified:** `utils/facturaDetaliu.ts`
- **Commit:** `d8b0f35`

**2. [Rule 1 - Bug] Testul T32 (facturaDetaliu.test.ts) viola propria regula de business testata**
- **Found during:** Task 1, rularea GREEN (test T32: date invalide → eroare neasteptata)
- **Issue:** testul verifica trunchierea datei (`'2026-09-26T10:00:00'` → `'2026-09-26'`) dar folosea `status: 'Achitat', suma: 50` — combinatie care violeaza regula deja testata separat in T29 ("status Achitat cu suma > 0 → eroare"), deci testul insusi era incorect, nu implementarea.
- **Fix:** schimbat `suma: 50` → `suma: 0` in scenariul de test (consistent cu regula: status Achitat necesita rest 0).
- **Files modified:** `utils/facturaDetaliu.test.ts`
- **Commit:** `d8b0f35`

## TDD Gate Compliance

Gate sequence verificata in `git log`:
1. RED: `ecf040d` — `test(31-03): add failing test for facturaDetaliu logica pura`
2. GREEN: `d8b0f35` — `feat(31-03): implementeaza logica pura facturaDetaliu (D-06, D-07, D-08)`

Ambele gate-uri prezente si in ordinea corecta. Fara commit REFACTOR separat (nu a fost necesara curatare dupa GREEN).

## Issues Encountered

Niciunul in afara celor 2 bug-uri documentate mai sus (ambele descoperite si reparate in interiorul ciclului GREEN al Task 1, inainte de commit).

## User Setup Required

None - no external service configuration required.

## Known Stubs

Niciunul. Modalul e complet functional: citeste live din `filteredData` (fara interogari de lista noi), scrie prin RPC-ul existent si prin `.update()` whitelist, refetch pe id dupa fiecare scriere.

## Threat Flags

Niciuna in afara celor deja documentate in `<threat_model>`-ul planului (T-31-03-01..05, T-31-03-SC) — nicio suprafata noua de retea/auth/schema in afara celor descrise acolo.

## Next Phase Readiness

- Contractul `utils/facturaDetaliu.ts` si componenta `components/Plati/FacturaDetaliu.tsx` sunt gata de import pentru planul 31-04 (tab Facturi — punct de intrare din lista de facturi) si 31-07 (profilul sportivului pentru instructori — al doilea punct de intrare, verificare RLS read-only).
- Niciun blocker cunoscut. Verificarea vizuala in browser (deschiderea efectiva a modalului cu date reale, click pe "Marchează Achitat", corectie manuala) ramane de facut cand modalul e montat dintr-un punct de intrare real (31-04/31-07) — acest plan a livrat doar componenta izolata, fara punct de montare inca.

## Self-Check: PASSED

- FOUND: utils/facturaDetaliu.ts
- FOUND: utils/facturaDetaliu.test.ts
- FOUND: components/Plati/FacturaDetaliu.tsx
- FOUND: commit ecf040d (Task 1 RED)
- FOUND: commit d8b0f35 (Task 1 GREEN)
- FOUND: commit e8bd712 (Task 2)
- FOUND: .planning/phases/31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa/31-03-SUMMARY.md
