---
phase: 13-tracking-comenzi-produse
plan: 05
subsystem: ui
tags: [react, typescript, jspdf, xlsx, export, comenzi, raport]

# Dependency graph
requires:
  - phase: 13-03
    provides: ComandaCard, PredareModal, CerereProdusFull, comenziService de bază
  - phase: 13-04
    provides: FederatieComandaView, comenziService extins
provides:
  - utils/exportBonPredare.ts (exportBonPredare + exportExcelFurnizor)
  - Export PDF bon predare A5 per sportiv (PredareModal + ComandaCard)
  - Export Excel furnizor (ComandaCard, stare PLASATA)
  - RaportProduse extins cu metrici comenzi + sheet Excel "Comenzi"
affects:
  - Niciun plan următor — plan 13-05 este ultimul din faza 13

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Import dinamic jsPDF + jspdf-autotable pentru PDF browser-side
    - Import dinamic xlsx pentru Excel browser-side
    - Export utilitar separat (utils/) refolosit de mai multe componente UI
    - Agregare cereri → rânduri Excel cu map/reduce (fără query Supabase noi)

key-files:
  created:
    - utils/exportBonPredare.ts
  modified:
    - components/Produse/ComenziProduse/PredareModal.tsx
    - components/Produse/ComenziProduse/ComandaCard.tsx
    - components/Produse/RaportProduse.tsx
    - components/Produse/index.tsx

key-decisions:
  - "exportBonPredare în utils/ separat (nu inline în componentă) — refolosit din PredareModal și ComandaCard"
  - "Format A5 portrait pentru bon predare — dimensiune potrivită pentru tipărire la imprimantă termică"
  - "Agregare Excel furnizor: prioritate comanda.iteme, fallback reduce(cereri) per varianta_id"
  - "Metrici comenzi afișate condiționat (cereri.length > 0) — fără secțiune goală în UI"

patterns-established:
  - "Pattern export dinamic: await import('jspdf') + await import('jspdf-autotable') — identic cu RaportProduse.tsx"
  - "Pattern bon predare: header bold + subtext + autoTable cu headStyles fillColor [30,41,59]"
  - "Pattern sheet suplimentar Excel: utils.aoa_to_sheet → utils.book_append_sheet → writeFile"

requirements-completed: [CMD-07, CMD-08]

# Metrics
duration: ~30min (Task 1+2 pre-executate; Task 3 completat în această sesiune)
completed: 2026-06-23
---

# Phase 13 Plan 05: Export Documente + Raport Extins Summary

**Export PDF bon predare A5 per sportiv și Excel furnizor cu produse+cantități, cablareat în PredareModal/ComandaCard; RaportProduse extins cu metrici comenzi (totalCereri/totalPredate/totalPlatite/valoareRestanta) și sheet Excel "Comenzi"**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-23T10:00:00Z
- **Completed:** 2026-06-23T10:30:00Z
- **Tasks:** 3 auto
- **Files modified:** 5 (1 creat, 4 modificate)

## Accomplishments

- `utils/exportBonPredare.ts` creat cu două funcții exportate: `exportBonPredare` (PDF A5 portrait) și `exportExcelFurnizor` (Excel cu sheet "Comenzi Furnizor") — ambele folosind import dinamic pentru bundle splitting
- `PredareModal.tsx` cablat: după predarea reușită apare buton "Descarcă bon predare (PDF)" cu try/catch și toast pe eroare; prop `clubNume` propagat
- `ComandaCard.tsx` cablat cu două butoane noi: (1) "Export furnizor (Excel)" vizibil când `comanda.stare === 'PLASATA'`, (2) "Bon predare" vizibil pe cereri cu stare PREDATA/PLATITA; butonul "Reminder plată" din 13-03 păstrat intact
- `RaportProduse.tsx` extins: prop `cereri?: CerereProdusFull[]` adăugat, filtrare pe perioadă cu useMemo, calcule metrici (totalCereri/totalPredate/totalPlatite/valoareRestanta), secțiune UI "Comenzi Echipamente" cu 4 StatItem-uri, export Excel cu sheet suplimentar "Comenzi"
- `components/Produse/index.tsx` actualizat: `cereri={cereri}` pasat la `RaportProduse`
- `npx tsc --noEmit` trece fără erori după toate modificările

## Task Commits

1. **Task 1: utils/exportBonPredare.ts — PDF bon predare A5 + Excel furnizor** - `6c21c96` (feat)
2. **Task 2: Cablare export în PredareModal + ComandaCard** - `c28954a` (feat)
3. **Task 3: RaportProduse extins cu metrici comenzi + sheet Excel Comenzi** - `9574024` (feat)

## Files Created/Modified

- `utils/exportBonPredare.ts` — **creat**: exportBonPredare (jsPDF A5, autoTable headStyles dark) + exportExcelFurnizor (xlsx, agregare iteme/cereri per varianta_id)
- `components/Produse/ComenziProduse/PredareModal.tsx` — **modificat**: import exportBonPredare, state bonDescarcabil, buton PDF post-predare, prop clubNume
- `components/Produse/ComenziProduse/ComandaCard.tsx` — **modificat**: import exportBonPredare + exportExcelFurnizor, buton "Export furnizor" pe PLASATA, buton "Bon predare" pe PREDATA/PLATITA (coexistă cu Reminder plată)
- `components/Produse/RaportProduse.tsx` — **modificat**: prop cereri, filtrare cereriFiltrate, metrici (4 valori), secțiune UI condiționată, sheet Excel "Comenzi"
- `components/Produse/index.tsx` — **modificat**: cereri={cereri} pasat la RaportProduse

## Decisions Made

- `exportBonPredare` separat în `utils/` (nu inline) — permite refolosire din PredareModal și ComandaCard fără duplicare
- Format A5 portrait pentru bon — mai mic decât A4, potrivit pentru bon tipărit sau trimis sportivului
- Agregare Excel furnizor: `comanda.iteme` prioritar, fallback `reduce(comanda.cereri)` per varianta_id — robustețe indiferent de starea comenzii
- Secțiunea "Comenzi Echipamente" afișată condiționat pe `cereri.length > 0` — raportul nu afișează secțiune goală dacă nu există cereri

## Deviations from Plan

### Auto-adăugate (nu în plan, necesare pentru funcționalitate completă)

**1. [Rule 2 - Missing UI] Secțiune vizuală metrici comenzi în RaportProduse**
- **Found during:** Task 3
- **Issue:** Planul specifica calculele și export-ul Excel dar nu conținea explicit secțiunea de render UI cu StatItem-uri pentru metrici comenzi
- **Fix:** Adăugat secțiune "Comenzi Echipamente" cu 4 StatItem-uri (totalCereri, totalPredate, totalPlatite, valoareRestanta) condiționată pe `cereri.length > 0`
- **Files modified:** `components/Produse/RaportProduse.tsx`
- **Commit:** `9574024`

## Issues Encountered

- Task 1 și Task 2 erau deja commise (6c21c96, c28954a) dintr-o sesiune anterioară; Task 3 avea modificările în working tree dar necommise (RaportProduse.tsx modificat, index.tsx fără cereri prop) — continuare corectă

## User Setup Required

None — nu sunt servicii externe de configurat. Export PDF/Excel rulează in-browser.

## Known Stubs

None — datele sunt reale (Supabase), nu mock/placeholder.

## Threat Flags

Implementat conform threat model-ului din PLAN.md:
- T-13-15 (Information Disclosure): datele exportate provin exclusiv din fetch-uri RLS-filtrate (cereri/comenzi club curent) — mitigat
- T-13-16 (Tampering): suma din bon derivată din pret_vanzare*cantitate, aceeași sursă ca factura — acceptat

## Self-Check: PASSED

- utils/exportBonPredare.ts: FOUND
- components/Produse/ComenziProduse/PredareModal.tsx: FOUND
- components/Produse/ComenziProduse/ComandaCard.tsx: FOUND
- components/Produse/RaportProduse.tsx: FOUND
- Commit 6c21c96: FOUND
- Commit c28954a: FOUND
- Commit 9574024: FOUND
- npx tsc --noEmit: PASSED (0 erori)

---
*Phase: 13-tracking-comenzi-produse*
*Completed: 2026-06-23*
