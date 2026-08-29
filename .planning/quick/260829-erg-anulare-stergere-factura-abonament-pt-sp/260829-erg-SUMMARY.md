---
phase: quick/260829-erg
plan: 01
subsystem: payments
tags: [react-query, supabase, rls, plati, abonament]

requires: []
provides:
  - status 'Anulat' pe plati.status (soft-cancel reversibil) propagat în tipuri, badge-uri și în toate agregările financiare
  - servicii facturaService: anuleazaFacturaAbonament / reactiveazaFacturaAbonament / stergeFacturaAbonament (cu guard-uri server-side)
  - hook usePrezenteLunare (o singură interogare paginată, fără N+1) + cheiePrezenta
  - raport nou "Facturi fără Prezență" (view facturi-fara-prezenta)
  - indicator "0 prezențe" + acțiuni Anulează/Reactivează/Șterge definitiv în PlatiScadente și profilul sportivului (tab Financiar)
affects: [plati, gestiune-facturi, raport-financiar, aging-report, profil-sportiv]

tech-stack:
  added: []
  patterns:
    - "esteDeIncasat/esteAnulata (utils/paymentStatus.ts) — sursă unică de adevăr pentru orice agregare financiară care trebuie să excludă facturile anulate"
    - "usePrezenteLunare — o singură interogare React Query pentru un set de {luna, an}, paginată explicit, în loc de N interogări per rând"
    - "funcții de serviciu cu client Supabase injectabil opțional (implicit clientul aplicației) — permite testare end-to-end fără sesiune de autentificare, fără să schimbe apelurile existente din UI"

key-files:
  created:
    - hooks/usePrezenteLunare.ts
    - services/facturaService.test.ts
    - components/Plati/FacturiFaraPrezenta.tsx
  modified:
    - types.ts
    - utils/paymentStatus.ts
    - services/facturaService.ts
    - supabaseClient.ts
    - components/Plati/PlatiScadente.tsx
    - components/Plati/GestiuneFacturi.tsx
    - components/Plati/AgingReport.tsx
    - components/Plati/RaportFinanciar.tsx
    - components/Plati/FamilyPaymentCard.tsx
    - components/Plati/FacturiPersonale.tsx
    - components/Sportivi/RaportCompletSportiv.tsx
    - components/AdminMasterMap.tsx
    - components/UserProfile.tsx
    - components/UserProfile/FinanciarTab.tsx
    - components/LazyComponents.tsx
    - components/AppRouter.tsx
    - components/Header.tsx
    - components/menuConfig.ts

key-decisions:
  - "supabaseClient.ts primește un fallback pe process.env (URL + anon key) și un guard pe localStorage, activ doar când import.meta.env nu există (context Node/tsx) — nu schimbă nimic în build-ul browser, dar permite scripturilor Node să importe module care depind de client fără să crape la import"
  - "cele 3 funcții noi din facturaService.ts acceptă un al doilea parametru opțional `client` (implicit clientul aplicației) — dependency injection minimală care permite testului end-to-end să bypasseze RLS cu un client service-role dedicat, fără să schimbe niciun apel existent din UI"
  - "acțiunile Anulează/Reactivează sunt restricționate la facturi tip='Abonament' în toate cele 3 suprafețe UI (FacturiFaraPrezenta, PlatiScadente, FinanciarTab), consistent cu numele funcțiilor de serviciu și cu obiectivul planului"

requirements-completed: [ANL-01, ANL-02, ANL-03, ANL-04, ANL-05, ANL-06]

duration: ~95min (Task 2-6; Task 1 executat separat de orchestrator)
completed: 2026-08-29
---

# Quick 260829-erg: Anulare / ștergere factură Abonament pentru sportivi fără prezență

**Status `'Anulat'` (soft-cancel reversibil) propagat exhaustiv în agregările financiare + 3 suprafețe UI (raport nou, listă Plăți, profil sportiv) cu guard-uri server-side anti-race-condition și test automat 16/16 pe DB real**

## Performance

- **Task 1 (migrație SQL):** executat de orchestrator, nu de acest agent — vezi secțiunea dedicată mai jos
- **Task 2-6:** ~95 min, 5 commit-uri atomice
- **Tasks:** 5 (2, 3, 4, 5, 6) — Task 1 (orchestrator) și Task 7 (checkpoint uman, rămâne pentru user)
- **Fișiere create:** 3
- **Fișiere modificate:** 15

## Task 1 — Migrație SQL (executat de orchestrator, nu de acest agent)

Conform instrucțiunilor primite, Task 1 a fost deja finalizat și verificat live **înainte** de această execuție:

- Fișier: `supabase/migrations/20260829_add_status_anulat_plati.sql` — există pe disc, dar folderul `supabase/migrations/` este **gitignored intenționat din iulie 2026**, deci fișierul **nu are commit git** (`git log` pe cale confirmă zero istoric) — comportament așteptat, nu o omisiune.
- Constraint-ul `plati_status_check` a fost extins live să accepte `'Anulat'`, verificat de orchestrator prin `pg_constraint` + test round-trip UPDATE (la `'Anulat'` reușește, la o valoare inventată eșuează).
- Politicile RLS `rbv_plati_update` / `rbv_plati_delete` au fost confirmate scopate corect pe club (reparate în Faza 25) — **nu s-au adăugat politici noi**, per instrucțiune explicită.

Acest agent **nu a atins** folderul `supabase/migrations/` și nu a încercat să aplice nicio migrare SQL.

## Accomplishments

- Status `'Anulat'` propagat în cele 3 union-uri de status (`Plata`, `VizualizarePlata`, `IstoricPlataDetaliat`) și în badge-ul canonic (`STATUS_DISPLAY_CONFIG`), cu helperi `esteAnulata`/`esteDeIncasat` ca sursă unică de adevăr.
- `esteDeIncasat` aplicat la **19 situri** de agregare financiară (aging, raport financiar — inclusiv tab-urile Restanțe/Familii/KPI omise din grep-ul literal al planului, restanțe familie/sportiv, sold portofel, badge deconturi examen din AdminMasterMap) — nu doar cele enumerate explicit în plan, ca să respecte efectiv must-have-ul "nu apare în niciun total de încasat".
- 3 funcții noi de serviciu (`anuleazaFacturaAbonament`, `reactiveazaFacturaAbonament`, `stergeFacturaAbonament`) cu guard server-side (re-citire status din DB înainte de UPDATE/DELETE) și un guard nou, absent anterior în `GestiuneFacturi.handleDelete`: refuz dacă factura e referențiată în `tranzactii.plata_ids`.
- Hook `usePrezenteLunare` — o singură interogare paginată pe `vedere_prezenta_sportiv` pentru un set de luni, folosit o singură dată per ecran în toate cele 3 suprafețe UI (verificat prin grep, nu per rând).
- Script de test end-to-end (`services/facturaService.test.ts`) — 16 scenarii rulate live pe DB real cu un client service-role dedicat, exit code 0.
- Raport nou "Facturi fără Prezență" — interoghează direct `rbv_plati_club` filtrat server-side (nu `filteredData.plati`, trunchiat la 1000 rânduri de `hooks/usePlati.ts`).
- Indicator "0 prezențe" + acțiuni Anulează/Reactivează în lista de facturi din Plăți și în tab-ul Financiar al profilului sportivului, cu 2 modale de confirmare distincte (reversibil vs. ireversibil) în fiecare din cele 3 suprafețe.

## Task Commits

1. **Task 2: Propagă statusul 'Anulat'** — `68f3840` (feat)
2. **Task 3: Serviciu + hook usePrezenteLunare** — `ec304fb` (feat)
3. **Task 4: Raport "Facturi fără Prezență" + wiring** — `eb826b9` (feat)
4. **Task 5: Indicator + acțiuni în PlatiScadente** — `4a2c35d` (feat)
5. **Task 6: Indicator + acțiuni în profil sportiv** — `9f7cfa7` (feat)

_Task 1 nu are commit — vezi secțiunea dedicată mai sus. Task 7 (checkpoint:human-verify) rămâne pentru user, nu a fost executat._

## Files Created/Modified

- `hooks/usePrezenteLunare.ts` — hook nou, o singură interogare paginată + `cheiePrezenta`
- `services/facturaService.test.ts` — script tsx executabil, 16 scenarii pe DB real
- `components/Plati/FacturiFaraPrezenta.tsx` — raport nou dedicat lună+an
- `types.ts` — status `'Anulat'` + view `'facturi-fara-prezenta'`
- `utils/paymentStatus.ts` — badge Anulat + `esteAnulata`/`esteDeIncasat`
- `services/facturaService.ts` — 3 funcții noi cu client injectabil opțional
- `supabaseClient.ts` — fallback process.env pentru context Node/tsx (fără schimbare în browser)
- `components/Plati/PlatiScadente.tsx` — indicator + acțiuni + guard selecție/sold
- `components/Plati/GestiuneFacturi.tsx` — buton Încasează ascuns pe Anulat + dropdown status
- `components/Plati/AgingReport.tsx`, `RaportFinanciar.tsx`, `FamilyPaymentCard.tsx`, `FacturiPersonale.tsx`, `components/Sportivi/RaportCompletSportiv.tsx`, `components/AdminMasterMap.tsx` — `esteDeIncasat` la siturile de agregare
- `components/UserProfile.tsx`, `components/UserProfile/FinanciarTab.tsx` — indicator + acțiuni în profil sportiv
- `components/LazyComponents.tsx`, `AppRouter.tsx`, `Header.tsx`, `menuConfig.ts` — wiring vedere nouă

## Decisions Made

- **`supabaseClient.ts` fallback pe `process.env`**: modulul arunca eroare la import în orice script Node/tsx (inclusiv testul cerut de Task 3), pentru că citea exclusiv `import.meta.env` (populat doar de Vite). Am adăugat un fallback minimal (`process.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) activ doar când `import.meta.env` lipsește, plus un guard pe `localStorage` (inexistent în Node). Zero schimbare de comportament în browser — Vite injectează mereu `import.meta.env.VITE_*` acolo.
- **Client Supabase injectabil în cele 3 funcții noi**: fără el, testul automat ar fi rulat prin clientul anon-key fără sesiune de autentificare, iar RLS ar fi blocat tăcut UPDATE/DELETE (0 rânduri afectate, fără eroare) — ar fi testat RLS-ul (deja verificat separat în Task 1), nu logica de business. Parametrul e opțional cu default clientul aplicației, deci niciun apel existent din UI nu s-a schimbat.
- **Restricție `tip === 'Abonament'`** aplicată consecvent în toate cele 3 suprafețe UI pentru acțiunile Anulează/Reactivează, chiar dacă textul Task 6 nu o menționează explicit (doar Task 5 o cerea) — pentru consistență cu obiectivul planului și cu numele funcțiilor de serviciu.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `esteDeIncasat` aplicat la situri de agregare neenumerate explicit în Task 2**
- **Found during:** Task 2
- **Issue:** Grep-ul planului pentru `status !== 'Achitat'` a ratat trei situri echivalente scrise cu logica inversată (`if (p.status === 'Achitat') return false;`) în `RaportFinanciar.tsx`: tab-ul Restanțe (`restanteRows`), KPI-ul "Plăți Scadente" (`nrScadente`). O factură anulată ar fi rămas greșit în aceste totaluri, contrazicând must-have-ul planului.
- **Fix:** Aplicat `esteDeIncasat` la ambele situri.
- **Files modified:** `components/Plati/RaportFinanciar.tsx`
- **Verification:** `npm run lint` + `npm run build` trec; verificare manuală a codului rezultat.
- **Committed in:** `68f3840` (Task 2 commit)

**2. [Rule 2 - Missing Critical] `totalRestante` din `UserProfile.tsx` ignora complet statusul**
- **Found during:** Task 6
- **Issue:** Cardul "Total de achitat" din tab-ul Financiar (profil sportiv) calculează restanța din diferența `suma_datorata - totalIncasat`, derivată din `vizualizarePlati`, **fără să verifice deloc câmpul `status`**. O factură abia anulată (fără nicio încasare asociată) ar fi rămas greșit inclusă în total — contrazice must-have-ul "restanțe sportiv" din threat model (T-ERG-07). Fișierul nu era în lista de fișiere a Task 2 (doar `FinanciarTab.tsx`), dar era în scope-ul Task 6.
- **Fix:** Adăugat guard `esteAnulata` în reduce-ul care calculează `totalRestante`.
- **Files modified:** `components/UserProfile.tsx`
- **Verification:** `npm run lint` + `npm run build` trec.
- **Committed in:** `9f7cfa7` (Task 6 commit)

**3. [Rule 1 - Bug] `handleAnuleazaPlata`/`handleReactiveazaPlata` actualizează și `vizualizarePlati`, nu doar `plati`**
- **Found during:** Task 6
- **Issue:** Planul specifica doar `setPlati(prev => prev.map(...))` la succes, dar `istoricFacturi` (sursa listei din `FinanciarTab`) e derivat exclusiv din `vizualizarePlati`, nu din `plati`. Fără actualizarea și a acestui state, badge-ul/statusul nu s-ar fi reflectat imediat în UI după anulare/reactivare (ar fi rămas stale până la reload) — exact pattern-ul deja folosit de `handleSavePlataEdit` existent, aplicat aici pentru consistență.
- **Fix:** Ambii handleri actualizează atât `setPlati` cât și `setVizualizarePlati`.
- **Files modified:** `components/UserProfile.tsx`
- **Verification:** `npm run lint` + `npm run build` trec; logica e simetrică cu `handleSavePlataEdit`.
- **Committed in:** `9f7cfa7` (Task 6 commit)

**4. [Rule 3 - Blocking] `supabaseClient.ts` fallback pe `process.env` (necesar pentru rularea testului cerut de Task 3)**
- **Found during:** Task 3
- **Issue:** `services/facturaService.test.ts`, cerut explicit de plan ca script `tsx`, importă (indirect) `supabaseClient.ts`, care citea exclusiv `import.meta.env.VITE_*` — inexistent în Node/tsx. Importul modulului arunca `throw new Error(...)` la evaluare, blocând complet rularea testului.
- **Fix:** Fallback pe `process.env` + guard `localStorage`, activ doar în afara contextului Vite (vezi Decisions Made pentru detalii de risc).
- **Files modified:** `supabaseClient.ts`
- **Verification:** `npx tsx services/facturaService.test.ts` rulează și iese cu exit code 0; `npm run build` (Vite) neafectat.
- **Committed in:** `ec304fb` (Task 3 commit)

---

**Total deviations:** 4 auto-fixate (2 Rule 2 — corectitudine financiară, 1 Rule 1 — bug UI stale, 1 Rule 3 — blocaj de execuție a testului cerut de plan)
**Impact on plan:** Toate patru sunt necesare pentru corectitudine (bani) sau pentru a putea livra deliverable-ul de test cerut explicit de Task 3. Zero scope creep — niciuna nu extinde funcționalitatea dincolo de obiectivul planului.

## Known Stubs

Niciun stub — toate cele 3 suprafețe UI sunt legate la date reale (React Query / Supabase), fără valori goale hardcodate.

## Threat Flags

Nimic de raportat — toate suprafețele de securitate noi (guard-uri server-side, client injectabil în funcțiile de serviciu) sunt acoperite de threat model-ul planului (T-ERG-01 — T-ERG-09) și nu introduc endpoint-uri, căi de autentificare sau scheme noi în afara acestuia.

## Issues Encountered

- **Risc rezidual, NU reparat aici (menționat explicit ca out-of-scope în plan):** `hooks/usePlati.ts` face `supabase.from('rbv_plati_club').select('*')` **fără paginare** — cache-ul global de plăți (`filteredData.plati`, folosit de `PlatiScadente`, `RaportFinanciar`, `AgingReport`, profilul sportivului etc.) se trunchiază tăcut la limita implicită PostgREST de 1000 rânduri pentru cluburi cu istoric lung. Raportul nou (`FacturiFaraPrezenta.tsx`) ocolește problema prin interogare filtrată server-side direct pe `rbv_plati_club`, dar **restul ecranelor financiare rămân expuse** — pentru un club cu peste 1000 de plăți istorice, sume/rapoarte agregate din `filteredData.plati` pot fi incomplete fără nicio eroare vizibilă. Merită un todo separat de paginare (pattern `fetchAllPages` deja există în `hooks/useDataProvider.ts:373`, ar putea fi reutilizat/extras pentru `usePlati.ts`).
- **Discrepanță documentată în done-criteria literal al Task 5:** grep-ul `from('plati').update` inline în `PlatiScadente.tsx` întoarce 1 rezultat — dar acela e `handleSaveEdit` (formularul generic "Editează", editare directă status/sumă/dată), **pre-existent, neschimbat, în afara scope-ului Task 5**. Cele 3 acțiuni noi (Anulează/Reactivează/Șterge) folosesc exclusiv serviciile din `facturaService.ts`, fără niciun UPDATE inline nou.

## User Setup Required

None — nicio configurare de serviciu extern necesară pentru Task 2-6. Migrația SQL (Task 1) a fost deja aplicată live de orchestrator.

## Next Phase Readiness

- Flux complet funcțional în cele 3 suprafețe UI, `npm run lint` și `npm run build` trec după fiecare task, script de test 16/16 pe DB real.
- **Task 7 (checkpoint:human-verify) rămâne pentru user** — necesită `npm run dev` + verificare manuală conform pașilor din `260829-erg-PLAN.md` (raport nou, cross-check prezențe, anulare/reactivare, excludere din totaluri, guard-uri, ștergere definitivă, ambele suprafețe UI, mobil, diacritice).
- Todo recomandat pentru viitor: paginare `hooks/usePlati.ts` (risc rezidual documentat mai sus).

---
*Plan: quick/260829-erg*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: hooks/usePrezenteLunare.ts
- FOUND: services/facturaService.test.ts
- FOUND: components/Plati/FacturiFaraPrezenta.tsx
- FOUND: .planning/quick/260829-erg-anulare-stergere-factura-abonament-pt-sp/260829-erg-SUMMARY.md
- FOUND commit: 68f3840
- FOUND commit: ec304fb
- FOUND commit: eb826b9
- FOUND commit: 4a2c35d
- FOUND commit: 9f7cfa7
