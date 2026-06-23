---
phase: 13-tracking-comenzi-produse
plan: "03"
subsystem: ui
tags: [react, typescript, supabase, state-machine, plati, notifications, comenzi]

# Dependency graph
requires:
  - phase: 13-02
    provides: comenziService de bază (fetchCereriClub, cerere sportiv), tab Echipamente sportiv, tip_produs
  - phase: 12-04
    provides: pattern createVanzare (INSERT plati + scădere stoc variantă)
provides:
  - Tab Comenzi în ProduseManagement: sumar agregat + detaliu expandabil + grupare cereri
  - comenziService extins: fetchComenziClub, grupeazaInComanda (guard duplicat), marcheazaStareCerere, marcheazaPredare, marcheazaPlatita, marcheazaBatchUrmatoarea, trimiteReminderPlata
  - ComenziProduse/index.tsx — secțiuni cereri noi + comenzi active
  - ComandaCard.tsx — card comandă cu avansare stări + buton Reminder plată condiționat
  - PredareModal.tsx — modal predare cu generare automată factură Neachitat
  - Flux A complet: cerere sportiv → grupare → CONFIRMATA → PLASATA → SOSITA → PREDATA + factură + stoc + notificări
affects:
  - 13-04 (fluxuri federație — poate refolosi grupeazaInComanda și marcheazaStareCerere)
  - 13-05 (export PDF bon predare + Excel furnizor — depinde de datele din comenziService)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "guard comandă duplicată — gasesteSauCreeazaComandaActiva() helper intern reutilizabil pentru fluxurile viitoare"
    - "lazy fetch pe tab activ — useEffect cu cancelled flag, fetch doar la activeTab === 'comenzi'"
    - "mașină de stări validată în service — marcheazaStareCerere/marcheazaPredare aruncă erori descriptive la ordine stări invalidă"
    - "scădere stoc condiționată tip_produs — NUMAI per_sportiv; per_club gestionat separat prin IntrareMarfaModal"
    - "buton reminder condiționat pe stare_cerere === 'PREDATA' AND user_id non-null — guard Pitfall 2"

key-files:
  created:
    - components/Produse/ComenziProduse/index.tsx
    - components/Produse/ComenziProduse/ComandaCard.tsx
    - components/Produse/ComenziProduse/PredareModal.tsx
  modified:
    - services/comenziService.ts
    - components/Produse/index.tsx

key-decisions:
  - "guard comandă duplicată — refolosire comandă activă existentă (nu creere a doua) dacă tip_comanda + club_id există cu stare NOT IN (FINALIZATA, ANULATA)"
  - "scădere stoc NUMAI pentru per_sportiv — per_club gestionat prin IntrareMarfaModal, nu prin predare"
  - "marcheazaPredare validează stare_cerere = SOSITA înainte de INSERT plati (T-13-08 mitigation)"
  - "sportivi.nume + prenume în loc de nome_complet — coloana nome_complet nu există în DB"

patterns-established:
  - "gasesteSauCreeazaComandaActiva: helper intern reutilizabil pentru guard duplicat comenzi"
  - "fetch lazy per tab — nu se face niciun query înainte ca user-ul să deschidă tab-ul Comenzi"
  - "notificări condiționate user_id — guard Pitfall 2 aplicat în service, nu în UI"

requirements-completed: [CMD-01, CMD-03, CMD-06]

# Metrics
duration: ~90min
completed: 2026-06-23
---

# Phase 13 Plan 03: Tab Comenzi admin — agregare, mașină de stări, predare + factură automată

**Tab Comenzi complet în ProduseManagement: grupare cereri, mașină de stări SOLICITATA→PREDATA validată în service, predare cu factură automată Neachitat + scădere stoc per_sportiv + notificări in-app, buton Reminder plată condiționat**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-06-23 (sesiune continuare după checkpoint 13-02)
- **Completed:** 2026-06-23
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify — PASSED)
- **Files modified:** 5

## Accomplishments

- comenziService.ts extins cu 7 funcții noi: fetchComenziClub, grupeazaInComanda (guard duplicat), marcheazaStareCerere (cu notificări CONFIRMATA/SOSITA), marcheazaPredare (factură + stoc + notificare), marcheazaPlatita, marcheazaBatchUrmatoarea, trimiteReminderPlata
- Tab Comenzi în ProduseManagement cu secțiunea "Cereri noi" (checkbox + grupare/amânare) și "Comenzi active" (ComandaCard cu sumar agregat + detaliu expandabil)
- Flux A verificat complet cu Playwright: 0 erori consolă, toate stările funcționează, factură generată corect cu 220 RON, stoc scăzut per_sportiv, notificări trimise

## Task Commits

1. **Task 1: Extindere comenziService** - `770e228` (feat)
2. **Task 2: Tab Comenzi + ComenziProduse + ComandaCard + PredareModal** - `e8749fb` (feat)
3. **Fix: sportivi.nume+prenume (bug coloană inexistentă)** - `6aed10b` (fix)
4. **Merge commit pe main** - `ab5af22` (merge)

## Files Created/Modified

- `services/comenziService.ts` — extins cu 7 funcții (fetchComenziClub, grupeazaInComanda cu guard duplicat, marcheazaStareCerere cu notificări, marcheazaPredare cu factură+stoc, marcheazaPlatita, marcheazaBatchUrmatoarea, trimiteReminderPlata)
- `components/Produse/index.tsx` — ActiveTab extins cu 'comenzi', TAB_LABELS, state lazy cereri/comenzi, render ComenziProduse
- `components/Produse/ComenziProduse/index.tsx` — secțiuni "Cereri noi" (checkbox + butoane grupare/amânare) și "Comenzi active" (lista ComandaCard) + sumar agregat cu useMemo
- `components/Produse/ComenziProduse/ComandaCard.tsx` — card cu header stare (Badge), sumar agregat "produs ×N", detaliu expandabil cu sportivi, butoane avansare stări, PredareModal, Reminder plată (condiționat PREDATA + user_id)
- `components/Produse/ComenziProduse/PredareModal.tsx` — modal predare: afișează sportiv, produs, sumă, mesaj "Neachitat"; apelează marcheazaPredare

## Decisions Made

- **Guard comandă duplicată:** gasesteSauCreeazaComandaActiva() verifică dacă există deja o comandă activă de același tip pentru club — o refolosește în loc să creeze a doua. Un club poate co-exista cu `club_furnizor` și `club_federatie` simultan, dar nu cu două de același tip.
- **Scădere stoc condiționată tip_produs:** NUMAI `per_sportiv` scade stocul la predare. `per_club` se gestionează separat prin IntrareMarfaModal (RESEARCH.md Open Question 1 — rezolvat).
- **Validare ordine stări:** marcheazaPredare refuză dacă stare curentă != SOSITA (T-13-08 mitigation). marcheazaStareCerere aruncă eroare descriptivă la ordine invalidă.
- **Notificări guard user_id:** notificările se trimit NUMAI dacă sportiv_user_id este non-null (Pitfall 2 din RESEARCH.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sportivi.nome_complet → sportivi(nume, prenume)**
- **Found during:** Verificare Playwright (Task 3 checkpoint)
- **Issue:** Query-ul din comenziService folosea `sportivi(nome_complet, user_id)` — coloana `nome_complet` nu există în schema DB (tabelul `sportivi` are coloane separate `nume` și `prenume`)
- **Fix:** Schimbat la `sportivi(nume, prenume, user_id)` în toate query-urile din comenziService; componenta ComandaCard actualizată să construiască `${cerere.sportiv.prenume} ${cerere.sportiv.nume}`
- **Files modified:** `services/comenziService.ts`, `components/Produse/ComenziProduse/ComandaCard.tsx`
- **Verification:** 0 erori consolă în Playwright după fix; datele sportivilor apar corect în UI
- **Committed in:** `6aed10b` (fix commit separat)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug coloană inexistentă în DB)
**Impact on plan:** Fix necesar pentru corectitudine — fără el query-ul eșua și ComenziProduse nu afișa niciun sportiv. Nicio modificare de scope.

## Issues Encountered

Verificarea Playwright a depistat erori de consolă cauzate de `nome_complet` inexistent. Fix aplicat imediat (Rule 1), re-verificare Playwright — 0 erori.

## User Setup Required

None - no external service configuration required.

## Verification Results (Playwright Automated Test)

- Tab Comenzi vizibil și se încarcă fără erori: OK
- Secțiunea "Cereri noi" afișează sportivii și produsele corect: OK
- Gruparea cererilor într-o comandă (grupeazaInComanda): OK
- Mașina de stări: SOLICITATA→CONFIRMATA→PLASATA→SOSITA→PREDATA: OK
- PredareModal afișează date corecte (sportiv, produs, sumă, mesaj Neachitat): OK
- După predare: stare=PREDATA, plată creată cu status=Neachitat, 220 RON: OK
- Stoc scăzut pentru produs per_sportiv: OK
- Notificări trimise: CONFIRMATA, SOSITA, predare, reminder plată: OK
- Buton Reminder plată vizibil NUMAI pe PREDATA (cu user_id): OK
- 0 erori consolă după fix: OK

## Next Phase Readiness

- Flux A (sportiv→club→furnizor) complet și verificat — gata pentru Phase 13-04
- gasesteSauCreeazaComandaActiva() helper disponibil pentru fluxurile federație din 13-04
- marcheazaStareCerere și marcheazaPredare reutilizabile în fluxurile B (top-down) și C (bottom-up) din 13-04
- Niciun blocaj pentru 13-04 (fluxuri federație) sau 13-05 (export PDF/Excel)

## Known Stubs

Niciun stub — toate datele sunt reale, conectate la DB via Supabase.

## Threat Flags

Nicio suprafață de securitate nouă față de modelul de amenințare din plan. T-13-08, T-13-09, T-13-17 mitigate complet:
- T-13-08: marcheazaPredare validează stare=SOSITA înainte de INSERT plati
- T-13-09: mașina de stări validată în service cu erori descriptive
- T-13-17: scădere stoc condiționată strict pe tip_produs === 'per_sportiv'

## Self-Check: PASSED

- `components/Produse/ComenziProduse/index.tsx` — existent (creat în task 2)
- `components/Produse/ComenziProduse/ComandaCard.tsx` — existent (creat în task 2)
- `components/Produse/ComenziProduse/PredareModal.tsx` — existent (creat în task 2)
- `services/comenziService.ts` — modificat (task 1 + fix)
- `components/Produse/index.tsx` — modificat (task 2)
- Commits verificate: 770e228, e8749fb, 6aed10b, ab5af22 — toate pe main

---
*Phase: 13-tracking-comenzi-produse*
*Completed: 2026-06-23*
