---
phase: 13-tracking-comenzi-produse
plan: "02"
subsystem: comenzi-produse
tags: [service, cereri, notificari, sportiv-dashboard, tip_produs, ui]
dependency_graph:
  requires: [13-01]
  provides: [comenziService, CerereProdusFull-UI, tip_produs-selector]
  affects: [services/comenziService.ts, components/Produse/ProdusFormModal.tsx, components/SportivDashboard/index.tsx, services/produseService.ts, types.ts]
tech_stack:
  added: []
  patterns: [silent-catch-useEffect, sendBulkNotifications, guard-isViewingOwnProfile, inline-modal-form]
key_files:
  created:
    - services/comenziService.ts
  modified:
    - types.ts
    - components/Produse/ProdusFormModal.tsx
    - services/produseService.ts
    - components/SportivDashboard/index.tsx
decisions:
  - "cereriMele fetch cu silent catch — tab secundar, nu blochează UI principal dacă Supabase returnează eroare RLS"
  - "produseCatalog filtrat pe tip_produs='per_sportiv' în form cerere — sportivul nu poate cere produse de club"
  - "fetchAdminClubUserIds query pe utilizator_roluri_multicont (tabel existent verificat în codebase)"
  - "sendBulkNotifications apelat cu silent catch în createCerere — notificarea nu blochează inserarea cererii"
metrics:
  completed_date: "2026-06-22"
  tasks_completed: 3
  tasks_total: 3
  duration_estimate: "~50 min"
---

# Phase 13 Plan 02: Service Comenzi + UI Cerere Sportiv + tip_produs Summary

**One-liner:** Service CRUD cereri produse cu notificare admin (sendBulkNotifications), secțiune "Comenzile mele" în tab Echipamente sportiv cu form de plasare cerere, și selector tip_produs în formularul de produs.

## What Was Built

### Task 1: Service comenziService.ts — fetch + createCerere + notificare

Creat `services/comenziService.ts` cu 4 funcții exportate:

- `fetchCereriClub(clubId)` — select cu nested join `varianta:produse_variante(*, produs:produse(denumire, tip_produs)), sportiv:sportivi(nume_complet, user_id)`, mapează `sportiv_nume` din join
- `fetchCereriSportiv(sportivId)` — select cu join la varianta+produs, filtrat pe `sportiv_id`
- `createCerere(input)` — INSERT în `cereri_produse` cu `stare_cerere='SOLICITATA'`, filtrează null/undefined din `adminClubUserIds` (T-13-07), apelează `sendBulkNotifications` cu silent catch (notificarea nu blochează inserarea)
- `fetchAdminClubUserIds(clubId)` — query pe `utilizator_roluri_multicont` WHERE `club_id = clubId AND rol_denumire = 'ADMIN_CLUB'`

De asemenea, sincronizat `types.ts` din worktree cu tipurile adăugate în Phase 13 Plan 01 pe main (worktree era creat din commit anterior merge-ului 13-01): tip_produs pe ProdusDB, StareCerereProdusTip, TipComandaProdusTip, StareComandaProdusTip, CerereProdusBD, ComandaProduseBD, ComandaProduseItemBD, ComandaProduseClubBD, CerereProdusFull, ComandaProduseiFull.

### Task 2: Selector tip_produs în ProdusFormModal

Modificat `components/Produse/ProdusFormModal.tsx`:
- State `tipProdus` cu default `'per_sportiv'`, preluat din `produs?.tip_produs` la editare
- `Select` UI cu 2 opțiuni: `per_sportiv` ("Per sportiv — se distribuie individual") și `per_club` ("Per club — rămâne la club")
- `tip_produs` inclus în payload `createProdus` și `updateProdus`
- `useEffect` de sync extins cu `setTipProdus(produs.tip_produs ?? 'per_sportiv')`

Modificat `services/produseService.ts`:
- `createProdus` Pick extins cu `tip_produs`
- `updateProdus` Partial Pick extins cu `tip_produs`

### Task 3: Tab Echipamente sportiv — Comenzile mele + form cerere

Modificat `components/SportivDashboard/index.tsx`:
- Import `fetchCereriSportiv`, `createCerere`, `fetchAdminClubUserIds` din `comenziService`
- Import `Select` din `ui`, `toast` din `react-hot-toast`, `CerereProdusFull` și `ProdusVariantaDB` din `types`
- State nou: `cereriMele`, `cerereModalOpen`, `selectedProdusId`, `selectedVariantaId`, `cantitate`, `submittingCerere`
- `fetchCereriMele()` helper apelat în `useEffect` pe `viewedUser.id` (silent catch)
- `handlePlasareCerere()` cu guard `isViewingOwnProfile`, fetch admin IDs, `createCerere`, toast succes, refetch
- Secțiune "Comenzile mele" cu badge colorat per stare_cerere + empty state
- Modal "Solicită produs": Select produs (filtrat pe `per_sportiv`), Select variantă (active), input cantitate
- Buton "Solicită produs" vizibil numai dacă `isViewingOwnProfile && viewedUser.club_id`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] types.ts din worktree era în urma main-ului (branch creat înainte de merge Phase 13-01)**

- **Found during:** Task 1 — import CerereProdusFull din types.ts eșua (tipul nu exista)
- **Issue:** Worktree-ul a fost creat din commit `1310a50` (anterior merge-ului 13-01 pe main, care a adăugat tipurile Phase 13). Worktree-ul avea `types.ts` cu 887 linii; main-ul cu 983 linii.
- **Fix:** Adăugat `tip_produs` pe `ProdusDB` și toate tipurile Phase 13 în `types.ts` din worktree, sincronizând cu conținutul din `main` (commit `cff6487`). Modificare inclusă în commit-ul Task 1.
- **Files modified:** types.ts (worktree)
- **Commit:** 09f0a33

**2. [Rule 2 - Missing Critical] produseService nu accepta tip_produs în createProdus/updateProdus**

- **Found during:** Task 2 — `createProdus` și `updateProdus` aveau `Pick<ProdusDB, ...>` fără `tip_produs`, TypeScript refuza payload-ul din formular
- **Fix:** Extins `Pick` în ambele funcții cu `tip_produs`
- **Files modified:** services/produseService.ts
- **Commit:** 3e094d5

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 09f0a33 | Task 1 | feat(13-02): comenziService.ts + tipuri Phase 13 în types.ts |
| 3e094d5 | Task 2 | feat(13-02): selector tip_produs în ProdusFormModal + updateProdus/createProdus accept tip_produs |
| ab248ef | Task 3 | feat(13-02): tab Echipamente sportiv — Comenzile mele + form cerere produs |

## Verification

- `grep -q "export async function fetchCereriClub" services/comenziService.ts` → OK
- `grep -q "export async function createCerere" services/comenziService.ts` → OK
- `grep -q "sendBulkNotifications" services/comenziService.ts` → OK
- `grep -q "tip_produs" components/Produse/ProdusFormModal.tsx` → OK
- `grep -q "per_club" components/Produse/ProdusFormModal.tsx` → OK
- `grep -q "fetchCereriSportiv" components/SportivDashboard/index.tsx` → OK
- `grep -q "createCerere" components/SportivDashboard/index.tsx` → OK
- `grep -q "cereriMele" components/SportivDashboard/index.tsx` → OK
- `npx tsc --noEmit` → 0 erori

## Known Stubs

Niciun stub — fluxul end-to-end este complet: sportivul plasează cerere → se inserează în DB → admini primesc notificare badge.

## Threat Flags

Nicio suprafață nouă de securitate detectată față de threat model-ul planului:
- T-13-05 (spoofing sportiv_id): RLS pe cereri_produse implementat în Phase 13-01 (migrare DB)
- T-13-06 (notificare admin greșit): `fetchAdminClubUserIds` filtrat pe `club_id` exact
- T-13-07 (sportiv fără user_id): filtru `id.length > 0` în `createCerere` și `fetchAdminClubUserIds`

## Self-Check: PASSED

- services/comenziService.ts: FOUND
- types.ts modificat (tip_produs + Phase 13 types): FOUND
- components/Produse/ProdusFormModal.tsx modificat (tip_produs selector): FOUND
- services/produseService.ts modificat (Pick extins): FOUND
- components/SportivDashboard/index.tsx modificat (cereriMele + modal): FOUND
- Commit 09f0a33: FOUND
- Commit 3e094d5: FOUND
- Commit ab248ef: FOUND
- tsc --noEmit: PASSED (0 erori)
