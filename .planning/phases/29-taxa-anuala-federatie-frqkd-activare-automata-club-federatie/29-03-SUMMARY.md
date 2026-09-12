---
phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie
plan: 03
subsystem: ui
tags: [react, typescript, supabase, forms]

requires:
  - phase: 29-01
    provides: "coloanele noi pe deconturi_federatie, taxa_anuala_config"
  - phase: 29-02
    provides: "trigger-ul care leaga automat decont_sportivi — motivul pentru care selectia manuala devine cod mort"
provides:
  - "utils/anFiscal.ts (getAnFiscalFederatie, formatSezon) folosit acum si de FederationInvoices"
  - "types.ts: DecontFederatie extins, TaxaAnualaFederatieConfig, MetodaPlataDecont"
  - "useData().taxaAnualaFederatieConfig + setTaxaAnualaFederatieConfig"
  - "FederationInvoices.tsx rescris: lista automata din decont_sportivi + metoda de plata obligatorie"
affects: [29-04]

tech-stack:
  added: []
  patterns:
    - "Lista read-only incarcata direct din DB la deschiderea modalului (nu din starea filtrata a aplicatiei) cand admin de federatie poate deschide date ale altui club"

key-files:
  created: []
  modified:
    - types.ts
    - utils/anFiscal.ts
    - hooks/useDataProvider.ts
    - components/FederationInvoices.tsx
    - components/AppRouter.tsx

key-decisions:
  - "PaymentConfirmationModal interogheaza decont_sportivi direct (nu prin filteredData.sportivi) pentru ca un SUPER_ADMIN_FEDERATIE care deschide decontul altui club nu are acei sportivi in starea filtrata pe propriul club"
  - "sportivi si setDecontSportivi eliminate din props FederationInvoicesProps — deveneau nefolosite odata ce lista e automata"
  - "Butonul Confirma Plata verifica (isAdminClub || isFederationAdmin), nu doar isAdminClub"

patterns-established: []

requirements-completed: [TAF-06, TAF-07]

duration: ~30min
completed: 2026-09-12
---

# Phase 29 Plan 03: Contracte TS + ecran deconturi pe schema reala

**Tipurile TypeScript aliniate cu schema reparata in 29-01, iar `FederationInvoices.tsx` inlocuieste selectia manuala de sportivi cu lista automata din `decont_sportivi` si cere metoda de plata la confirmare.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments
- `utils/anFiscal.ts` nou, oglindind exact regula SQL din 29-02 (comentariu de sincronizare explicit)
- `DecontFederatie` extins + `TaxaAnualaFederatieConfig` nou, fara sa atinga `TaxaAnualeConfig`/`taxe_anuale_config` (tabela veche, distincta)
- `useData()` expune acum `taxaAnualaFederatieConfig` incarcat deferred din `taxa_anuala_config`
- `FederationInvoices.tsx` rescris: cod mort de selectie manuala eliminat, lista sportivilor vine dintr-un query live pe `decont_sportivi`, camp obligatoriu "Metoda Plata", update simultan pe 4 coloane la confirmare, tabel cu coloanele Sezon si Metoda, buton de confirmare vizibil si pentru federatie

## Task Commits

1. **Task 1: Contracte TS + stare app** - `c5ca06d` (feat)
2. **Task 2: FederationInvoices rescris** - `2c9c7ba` (feat)

## Files Created/Modified
- `utils/anFiscal.ts` - nou, `getAnFiscalFederatie` + `formatSezon`
- `types.ts` - `DecontFederatie` extins, `TaxaAnualaFederatieConfig`, `MetodaPlataDecont`
- `hooks/useDataProvider.ts` - `taxaAnualaFederatieConfig` in `AppData` + deferred query + setter
- `components/FederationInvoices.tsx` - modal si tabel rescrise
- `components/AppRouter.tsx` - props `setDecontSportivi`/`sportivi` eliminate din apel

## Decisions Made
Vezi `key-decisions`. Cea mai importanta: query live pe `decont_sportivi` in loc de starea filtrata a aplicatiei, ca sa functioneze corect pentru SUPER_ADMIN_FEDERATIE care deschide deconturi ale altor cluburi.

## Deviations from Plan
None - plan executat exact cum a fost scris.

## Issues Encountered
None.

## User Setup Required

None - nicio configurare externa necesara.

## Next Phase Readiness

29-04 (tab admin pret sezon in `TaxeAnuale.tsx`) poate porni: `utils/anFiscal.ts`, `TaxaAnualaFederatieConfig` si `useData().taxaAnualaFederatieConfig`/`setTaxaAnualaFederatieConfig` sunt disponibile exact cum a fost specificat in contractul de iesire.

**Ramas de facut la finalul fazei:** verificarea umana din `29-03-PLAN.md` (Task 2) — deschidere ecran Deconturi ca SUPER_ADMIN_FEDERATIE si ADMIN_CLUB, confirmare plata cu upload real, verificare persistenta dupa reload. Nu a fost efectuata in aceasta sesiune (executie non-interactiva).

---
*Phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie*
*Completed: 2026-09-12*
