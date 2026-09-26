---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 09
subsystem: payments
tags: [typescript, react, navigation, hub-pattern, dashboard, menu, ai-assistant]

# Dependency graph
requires:
  - phase: 31-08
    provides: "case 'plati-hub' + 11 alias-uri legacy in AppRouter.tsx, PlatiHub.tsx montat"
  - phase: 31-07
    provides: "Punct de intrare INSTRUCTOR (FacturaDetaliu) + 4 interogari SQL D-09 documentate pentru verificare live"
provides:
  - "Punct unic de intrare 'Plăți & Facturi' pe AdminMasterMap, menuConfig (adminMenu+adminClubMenu), UnifiedDashboard"
  - "Deep-link ReportsDashboard → hub tab Rapoarte / sectiune raport-financiar"
  - "Etichete/harti auxiliare (Header, NavMenu, orchestrator, financiarAgent, claudeService) care cunosc 'plati-hub'"
  - "Verificare finala de faza: lint+build+teste+garda D-07+garda de rutare — toate PASS"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ReportsDashboard.tsx foloseste useNavigation().navigateTo cu params opționale per-card (report.params), pastrand onNavigate simplu pentru restul cardurilor — extensie minimala fara schimbare de props"

key-files:
  created: []
  modified:
    - components/AdminMasterMap.tsx
    - components/menuConfig.ts
    - components/UnifiedDashboard.tsx
    - components/ReportsDashboard.tsx
    - components/Header.tsx
    - components/NavMenu.tsx
    - services/agents/orchestrator.ts
    - services/agents/financiarAgent.ts
    - services/claudeService.ts

key-decisions:
  - "Icons TrendingUpIcon, MinusCircleIcon, ExclamationTriangleIcon eliminate din import-ul AdminMasterMap.tsx dupa ce cele 11 carduri financiare au fost reduse la 1 — grep -c '<NumeIcon' = 0 pentru fiecare, conform regulii explicite din plan"
  - "Eticheta veche 'plati-scadente': 'Facturi & Plăți' pastrata intentionat in labelMap (AdminMasterMap.tsx) — necesara pentru favoritele/topViews salvate cu literalul vechi (QuickAccess)"
  - "'Verificare live D-09' din 31-07 (NEVERIFICAT) actualizata partial pe baza unei verificari live rulate de orchestrator inaintea acestui plan (vezi sectiunea dedicata mai jos) — punctul (a) SELECT confirmat DA pentru INSTRUCTOR; punctul UPDATE ramane in lista de verificare umana"

patterns-established: []

requirements-completed: [D-01, D-02, D-03, D-04, D-05]

# Metrics
duration: ~35min
completed: 2026-09-26
---

# Phase 31 Plan 09: Punctul unic de intrare in hub + verificare finala de faza Summary

**Cele 11 carduri/intrari financiare fragmentate din AdminMasterMap, menuConfig (adminMenu+adminClubMenu) și UnifiedDashboard au fost înlocuite cu o singură intrare "Plăți & Facturi" (`plati-hub`), ReportsDashboard trimite acum "Raport Financiar" direct pe tab-ul Rapoarte al hub-ului, iar etichetele/hărțile auxiliare (Header, NavMenu, orchestrator AI, financiarAgent, claudeService) recunosc noua vedere — toate cele 5 verificări finale de fază (lint, build, 2 teste tsx, gărzile grep D-07/rutare) trec cu cod 0.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 9

## Accomplishments

### Task 1 — Dashboard-uri și meniu

- `components/AdminMasterMap.tsx`: `AccordionItem id="financiar"` redus de la 11 `ItemCard`-uri la exact 2 — `Plăți & Facturi` (`view="plati-hub"`, `WalletIcon`) și `Deconturi Federație` (neschimbat, `badge={pendingDeconturi}`). `labelMap` primește `'plati-hub': 'Plăți & Facturi'`, toate etichetele vechi rămân pentru favorite/topViews. Import-urile `TrendingUpIcon`, `MinusCircleIcon`, `ExclamationTriangleIcon` eliminate (verificat `grep -c` = 0 după editare pentru fiecare).
- `components/menuConfig.ts`: submeniul `Financiar & Plăți` în `adminMenu` și `adminClubMenu` redus la exact 3 intrări — `Plăți & Facturi` (`plati-hub`), `Vacanțe Antrenamente` (`perioade-vacanta`, neschimbat), `Deconturi Federație` (neschimbat). `Nomenclatoare` eliminat din `Setări & Admin` în ambele meniuri (nomenclatorul tipurilor de plată e acum secțiune în tab-ul Configurare al hub-ului, per D-04). `Familii`, `instructorMenu`, `sportivMenu` (inclusiv `Istoric Plăți` → `istoric-plati` pentru SPORTIV) neatinse.
- `components/UnifiedDashboard.tsx`: cele două `navItems` financiare vechi (`Dashboard Financiar` / `financial-dashboard`, `Facturi & Plăți` / `plati-scadente`) unificate într-un singur item `Plăți & Facturi` → `plati-hub`. `Deconturi Federație` neschimbat.
- `components/ReportsDashboard.tsx`: import `useNavigation`; cardul `Raport Financiar` primește `view: 'plati-hub'` + `params: { tab: 'rapoarte', sectiune: 'raport-financiar' }`; `onClick` ramifică `report.params ? navigateTo(...) : onNavigate(...)`. Celelalte 3 carduri (`raport-prezenta`, `raport-lunar-prezenta`, `rapoarte-examen`) neschimbate, fără `params`. `ReportsDashboardProps` neschimbat.
- `components/AdminDashboard.tsx`: confirmat neatins (`git diff --stat` gol) — conține doar `familii` (D-05), în afara scope-ului.

### Task 2 — Etichete și hărți auxiliare + verificare finală de fază

- `components/Header.tsx` `VIEW_TITLES`: adăugat `'plati-hub': 'Plăți & Facturi'`. Titlurile vechi (`plati-scadente`, `financial-dashboard`, etc.) rămân — se afișează când hub-ul e deschis printr-un alias vechi cu istoric în breadcrumb.
- `components/NavMenu.tsx`: `VIEW_TO_NOTIF_TYPE['plati-hub'] = 'plata'`; condiția `tutorialAttr` extinsă la `item.view === 'plati-scadente' || item.view === 'plati-hub' ? 'nav-plati'` — pasul de tutorial `nav-plati` continuă să aibă țintă indiferent de literalul din `menuConfig.ts`.
- `services/agents/orchestrator.ts`: `VIEW_TO_AGENT_ID['plati-hub'] = 'financiar'`.
- `services/agents/financiarAgent.ts`: `'plati-hub'` adăugat în array-ul `views`.
- `services/claudeService.ts` `VIEW_DESCRIPTIONS['plati-hub']`: `'Hub Plăți & Facturi (facturi, încasări, rapoarte, configurare financiară)'`.

## Task Commits

1. **Task 1: Dashboard-uri si meniu — intrare unica 'Plăți & Facturi'** - `9097fd8` (feat)
2. **Task 2: Etichete si harti auxiliare (Header, NavMenu, asistent AI) + verificarea finala a fazei** - `3de4cae` (feat)

## Files Created/Modified

- `components/AdminMasterMap.tsx` - card unic hub + labelMap + import-uri de iconițe curățate
- `components/menuConfig.ts` - submeniu Financiar & Plăți redus (adminMenu, adminClubMenu) + Nomenclatoare eliminat din Setări & Admin
- `components/UnifiedDashboard.tsx` - navItems unificate pentru intrarea financiară principală
- `components/ReportsDashboard.tsx` - deep-link `navigateTo` cu params pentru Raport Financiar
- `components/Header.tsx` - `VIEW_TITLES['plati-hub']`
- `components/NavMenu.tsx` - `VIEW_TO_NOTIF_TYPE['plati-hub']` + tinta tutorial `nav-plati`
- `services/agents/orchestrator.ts` - `VIEW_TO_AGENT_ID['plati-hub']`
- `services/agents/financiarAgent.ts` - `views` include `plati-hub`
- `services/claudeService.ts` - `VIEW_DESCRIPTIONS['plati-hub']`

## Verificare finală de fază (Task 2, pasul 5 din plan)

Toate verificările automate cerute de `<verification>`-ul planului au fost rulate și au trecut:

1. **`npm run lint`** (`tsc --noEmit`): cod 0.
2. **`npm run build`**: cod 0 — chunk `PlatiHub-BSSsu3nh.js` prezent în output, fără erori.
3. **`npx tsx components/Plati/hub/platiHubConfig.test.ts`**: 19 PASS, 0 FAIL.
4. **`npx tsx utils/facturaDetaliu.test.ts`**: 33 PASS, 0 FAIL.
5. **Garda D-07 repo-wide** (`grep -rnE "from\('plati'\)\.update\(updates\)" components services hooks utils`): 0 rezultate — niciun update needatilat pe tabela `plati` rămas în cod.
6. **Garda de rutare AppRouter**: pentru fiecare din cele 13 literale (`plati-scadente`, `gestiune-facturi`, `facturi-fara-prezenta`, `jurnal-incasari`, `raport-financiar`, `financial-dashboard`, `tipuri-abonament`, `configurare-preturi`, `reduceri`, `taxe-anuale`, `nomenclatoare`, `istoric-plati`, `plati-hub`) există exact 1 `case '<literal>':` în `components/AppRouter.tsx` — confirmat individual, toate = 1.
7. **Grep etichete auxiliare**: `'plati-hub'` prezent ≥1 în `Header.tsx` (1), `NavMenu.tsx` (2), `orchestrator.ts` (1), `financiarAgent.ts` (1), `claudeService.ts` (1); `item.view === 'plati-hub'` = 1 în `NavMenu.tsx`.

## Verificare live D-09 (preluată din 31-07-SUMMARY.md + actualizare din verificarea live rulată de orchestrator înaintea acestui plan)

**Status din 31-07: NEVERIFICAT** (sesiunea de execuție a acelui plan nu avea acces la Supabase MCP `execute_sql`).

**Actualizare disponibilă pentru acest plan** — orchestratorul a rulat live, înaintea acestei execuții, interogarea (1) din lista celor 4 cerute de 31-07 (`pg_policies` pe `plati`, `tranzactii`, `tranzactie_plata`). Rezultat relevant pentru întrebarea (a) din 31-07 ("Poate INSTRUCTOR face UPDATE pe `plati` din clubul său?"):

- Politicile **SELECT** pe `plati` sunt `rbv_plati_admin_club` (`has_access_to_club`), `rbv_plati_own` (`sportiv_id = get_own_sportiv_id()`), `rbv_plati_super_admin`. `has_access_to_club(p_club_id)` include explicit `INSTRUCTOR`: `rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN') OR (club_id = p_club_id AND rol_denumire IN ('ADMIN_CLUB','INSTRUCTOR'))`, gated pe header-ul `active-role-context-id`.
- **Concluzie confirmată: citirea (SELECT) facturilor clubului propriu de către INSTRUCTOR prin `FacturaDetaliu` funcționează la nivel de DB — D-09 e RLS-safe pentru partea de vizualizare.**
- **Rămâne neconfirmat explicit**: dacă există și o politică **UPDATE/ALL** pe `plati` care acoperă INSTRUCTOR (necesară pentru butonul de acțiune rapidă "Marchează Achitat cu suma X" / corecție). Interogarea live rulată a vizat comenzile SELECT; o politică UPDATE separată (posibil restrânsă la `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE`) nu a fost confirmată nici pozitiv, nici negativ în acest ciclu.
- Nu se declanșează blocul obligatoriu pentru "(a) = NU" — răspunsul rămâne parțial (DA pentru citire, NEVERIFICAT pentru scriere).
- `tranzactii` are politici RLS multiple/suprapuse (legacy) — confirmat ca risc rezidual preexistent, în afara scope-ului acestei faze (nu s-a atins).
- Nu există live o funcție `proceseaza_incasare`; funcția reală e `proceseaza_incasare_normalizata` (+ `incasare_club_id`) — informație de context, fără impact asupra gărzilor grep din acest plan (niciun grep din plan referă acest nume de RPC).

**Consecință pentru lista de verificare umană**: pasul 10 din `<human-check>`-ul planului ("Login INSTRUCTOR → profil sportiv → 'Istoric Financiar' → 'Detalii' pe o factură → ... o corecție de test fie reușește, fie afișează 'Verificați permisiunile.'") rămâne necesar și suficient ca ultimă confirmare practică a permisiunii de UPDATE — comportamentul UI e deja defensiv (`FacturaDetaliu.tsx` tratează `data === null` ca refuz de permisiune), deci indiferent de rezultat nu există risc de crash sau de scriere silențioasă greșită.

## Lista de verificare umană end-of-phase (workflow.human_verify_mode = end-of-phase)

Nu a fost automatizată în această sesiune (execuție non-interactivă, fără sesiune de browser autentificată disponibil). Pașii 1-12 din `<human-check>`-ul `31-09-PLAN.md` rămân de rulat manual (sau via skill-ul `playwright-portal-test`) de către utilizator/sesiunea următoare, pe un club de test:

1. Dashboard ADMIN_CLUB → secțiunea "Financiar & Plăți" arată DOAR "Plăți & Facturi" + "Deconturi Federație"; click → hub cu 4 tab-uri, un singur buton "Meniu".
2. Tab Facturi: pastilele comută ecranele corect, fără al doilea buton "Meniu".
3. Selecție 2 facturi → "Încasează 2 facturi selectate" → Jurnal cu "Încasare Colectivă (2 facturi)" → salvare → revenire pe Facturi după ~1.5s → Jurnal gol la redeschidere.
4. Buton "Detalii" pe o factură → modal complet (context, sume separate, istoric, acțiune rapidă) → test corecție sumă pe factură Neachitat.
5. "Corectează manual" doar pe Sumă facturată → fără eroare PGRST204.
6. Click nume sportiv → profil → înapoi → revenire pe același tab/pastilă.
7. Tab Configurare: Taxe Anuale vizibil pt ADMIN_CLUB; Nomenclatoare funcțional; meniul lateral nu mai are Nomenclatoare la Setări.
8. Rapoarte → Raport Financiar → hub pe tab Rapoarte/Raport Financiar.
9. Favorită veche (ex. Jurnal Încasări) deschide hub-ul pe secțiunea corectă.
10. **Login INSTRUCTOR** → profil sportiv → Istoric Financiar → Detalii → corecție de test (vezi secțiunea D-09 de mai sus — READ confirmat live, UPDATE rămâne de confirmat aici).
11. Login SPORTIV → "Istoric Plăți" deschide ecranul personal vechi, nu hub-ul.
12. "Familii" și "Deconturi Federație" rămân ecrane separate neschimbate.

## Decisions Made

- Import-urile de iconițe rămase fără utilizare (`TrendingUpIcon`, `MinusCircleIcon`, `ExclamationTriangleIcon`) eliminate explicit din `AdminMasterMap.tsx`, conform regulii din plan (`grep -c '<NumeIcon'` = 0).
- `ReportsDashboardProps` nu a fost modificat — `navigateTo` e obținut direct din `useNavigation()` în interiorul componentei, fără prop nou.

## Deviations from Plan

None - plan executat exact conform specificației. Verificarea live D-09 a fost extinsă cu rezultatul interogării (1) deja rulate de orchestrator înaintea acestei execuții (furnizat explicit în contextul de sesiune) — nu a necesitat interogări SQL suplimentare, dar nici nu a schimbat nimic din codul livrat de acest plan.

## Issues Encountered

Niciunul. Toate gărzile grep au trecut din prima încercare.

## User Setup Required

None pentru cod. Pentru finalizarea verificării live D-09 (punctul UPDATE rămas neconfirmat) și pentru lista de verificare umană end-of-phase de mai sus, e nevoie de o sesiune de browser autentificată (ADMIN_CLUB + INSTRUCTOR + SPORTIV) pe un club de test.

## Known Stubs

Niciunul. Toate modificările sunt configurare/etichetare pe componente și servicii existente, fără date mock sau placeholder.

## Threat Flags

Nicio suprafață nouă față de `<threat_model>`-ul planului (T-31-09-01..03, T-31-09-SC):
- T-31-09-01 (Elevation of Privilege): guard-ul `canManageFinances` din `AppRouter.tsx` (31-08) și RLS rămân poarta reală; meniurile modificate în acest plan sunt doar `adminMenu`/`adminClubMenu` — `instructorMenu`/`sportivMenu` neatinse, confirmat prin grep (`view: 'istoric-plati'` = 1, neschimbat).
- T-31-09-02 (Information Disclosure): descrierea `plati-hub` din `VIEW_DESCRIPTIONS` e text static generic, aceeași clasă de conținut ca descrierile existente.
- T-31-09-03 (DoS via literale vechi): mitigat — `labelMap` păstrează etichetele vechi, `AppRouter` păstrează alias-urile (31-08); verificarea vizuală rămâne în lista de verificare umană (pas 9).
- T-31-09-SC: zero pachete npm noi.

## Next Phase Readiness

- Faza 31 (Hub Plăți și Facturi) e completă din perspectiva codului: toate cele 9 planuri (31-01..31-09) au fost executate, toate gărzile automate trec, punctul unic de intrare e livrat.
- Rămân 2 clase de itemi neînchise, ambele necesitând o sesiune de browser autentificată reală (nu pot fi automatizate fără acces interactiv la aplicație în această sesiune de execuție):
  1. Lista de verificare umană end-of-phase (12 pași, detaliați mai sus) — recomandat înainte de a considera faza 100% verificată vizual.
  2. Confirmarea explicită a politicii UPDATE pe `plati` pentru INSTRUCTOR (D-09, acțiunea rapidă) — comportamentul UI e deja defensiv indiferent de rezultat, deci nu blochează livrarea, dar rămâne un item de verificat pentru acuratețea UX ("butonul există, acțiunea fie reușește, fie eșuează cu mesaj clar").
- Aceasta este ultima execuție a fazei 31 — STATE.md/ROADMAP.md marchează faza ca finalizată (vezi actualizările de stare de mai jos).

## Self-Check: PASSED

- FOUND: components/AdminMasterMap.tsx (modificat)
- FOUND: components/menuConfig.ts (modificat)
- FOUND: components/UnifiedDashboard.tsx (modificat)
- FOUND: components/ReportsDashboard.tsx (modificat)
- FOUND: components/Header.tsx (modificat)
- FOUND: components/NavMenu.tsx (modificat)
- FOUND: services/agents/orchestrator.ts (modificat)
- FOUND: services/agents/financiarAgent.ts (modificat)
- FOUND: services/claudeService.ts (modificat)
- FOUND: commit 9097fd8 (Task 1)
- FOUND: commit 3de4cae (Task 2)
- FOUND: .planning/phases/31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa/31-09-SUMMARY.md

---
*Phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa*
*Completed: 2026-09-26*
