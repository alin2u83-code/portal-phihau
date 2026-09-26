---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 08
subsystem: payments
tags: [typescript, react, navigation, hub-pattern, routing]

# Dependency graph
requires:
  - phase: 31-01
    provides: "platiHubConfig.ts (rezolvaPozitieHub, TABURI_HUB, SECTIUNI_PE_TAB, PlatiHubTabProps)"
  - phase: 31-04
    provides: "components/Plati/hub/TabFacturi.tsx"
  - phase: 31-05
    provides: "components/Plati/hub/TabIncasari.tsx, TabRapoarte.tsx"
  - phase: 31-06
    provides: "components/Plati/hub/TabConfigurare.tsx"
provides:
  - "components/Plati/hub/PlatiHub.tsx — shell-ul hub-ului: header, bara de tab-uri, pastile de sectiune, fluxul de incasare multipla F1-F4"
  - "components/LazyComponents.tsx — export lazy PlatiHub"
  - "components/AppRouter.tsx — case 'plati-hub' + 11 alias-uri legacy grupate, ramura istoric-plati (hub/standalone), platiHubElement"
affects: [31-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pozitie hub (tab+sectiune) citita din NavigationContext.viewParams via rezolvaPozitieHub — nu useState local, ca goBack() sa restaureze pozitia dupa navigare spre profil-sportiv"
    - "schimbaPozitie() foloseste setViewParams (fara intrare in history) pentru tab/pastila; navigateTo() doar pentru fluxul de incasare multipla (F1), ca 'inapoi' sa revina exact pe Facturi"
    - "Un singur element JSX (platiHubElement) construit o singura data in AppRouter si returnat din toate cele 12 ramuri financiare + ramura canManageFinances a istoric-plati"

key-files:
  created:
    - components/Plati/hub/PlatiHub.tsx
  modified:
    - components/LazyComponents.tsx
    - components/AppRouter.tsx

key-decisions:
  - "handleJurnalBack/handleIncaseazaMultiple/handleIncasareProcesata mutate identic (oglinda 1:1) din AppRouter.tsx in PlatiHub.tsx — zero schimbare de comportament pe fluxul F1-F4"
  - "istoric-plati NU e inclus in grupul de 12 case-uri aliasate — are ramura proprie (ternary canManageFinances ? platiHubElement : IstoricPlati standalone) pentru ca e singura vedere financiara fara guard, folosita de rolul SPORTIV"
  - "Comentariul din AppRouter care mentiona literal \"case 'plati-hub'\" a fost reformulat ('vederea hub') ca sa nu produca fals-pozitiv la gardul grep care numara aparitiile case-ului real"

patterns-established:
  - "Shell de hub cu 4 tab-uri + pastile de sectiune (Tailwind, fara librarii noi), pattern replicabil pentru orice alt modul cu view-uri fragmentate (dupa exemplul Competitii)"

requirements-completed: [D-01, D-02, D-03, D-04, D-05]

# Metrics
duration: ~20min
completed: 2026-09-26
---

# Phase 31 Plan 08: Shell-ul hub-ului Plăți & Facturi + comutarea rutării Summary

**`PlatiHub.tsx` (header + 4 tab-uri + pastile de secțiune + fluxul de încasare multiplă F1-F4) montat prin `case 'plati-hub'` în `AppRouter.tsx`, cu toate cele 11 literale vechi ca alias-uri către același element și `istoric-plati` păstrat standalone pentru rolul SPORTIV.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 3 (1 creat, 2 modificate)

## Accomplishments

- `components/Plati/hub/PlatiHub.tsx` creat: header cu buton "Meniu", bară de 4 tab-uri (pattern vizual identic modulului Competiții — `role="tablist"`, iconițe `FileTextIcon`/`BanknotesIcon`/`ChartBarIcon`/`CogIcon`), pastile de secțiune (ascunse când tab-ul are o singură secțiune), și montarea condiționată a `TabFacturi`/`TabIncasari`/`TabRapoarte`/`TabConfigurare` în funcție de `pozitie.tab`.
- Poziția curentă (tab + secțiune) e derivată din `NavigationContext.viewParams` prin `rezolvaPozitieHub` (31-01) — nu un `useState` local — astfel încât `goBack()` din `profil-sportiv` restaurează exact tab-ul/secțiunea de dinainte.
- Fluxul de încasare multiplă (F1-F4) mutat identic din `AppRouter.tsx:72-89` în `PlatiHub.tsx`: `handleIncaseazaMultiple` (folosește `navigateTo('plati-hub', { tab: 'incasari', sectiune: 'jurnal-incasari' })` ca să pună poziția curentă în history), `handleJurnalBack` (oglindă exactă: `setPlatiPentruIncasare([])` + `canGoBack ? goBack() : schimbaPozitie('facturi', 'plati-scadente')`), `handleIncasareProcesata`.
- Efect nou care golește `platiPentruIncasare` când utilizatorul părăsește secțiunea `jurnal-incasari` prin tab/pastilă (nu prin fluxul F1), cu comentariu care explică de ce nu golește la intrarea prin `handleIncaseazaMultiple` (batching React 18).
- `components/LazyComponents.tsx`: export lazy `PlatiHub` adăugat, toate exporturile anterioare neatinse.
- `components/AppRouter.tsx`: cele 12 literale financiare (`plati-hub` + `plati-scadente`, `gestiune-facturi`, `facturi-fara-prezenta`, `jurnal-incasari`, `raport-financiar`, `financial-dashboard`, `tipuri-abonament`, `configurare-preturi`, `reduceri`, `taxe-anuale`, `nomenclatoare`) montează acum același `platiHubElement` (construit o singură dată, după return-urile timpurii `OnboardingCompletare`/`MandatoryPasswordChange`, fără hook-uri noi) cu guard `canManageFinances` — echivalent confirmat în 31-01 cu vechiul `isAtLeastClubAdmin`.
- `istoric-plati` păstrat cu ramură dedicată: `canManageFinances ? platiHubElement : <Lazy.IstoricPlati ... />` — ramura non-admin e identică cu codul vechi, rolul SPORTIV își vede în continuare propriul istoric fără acces la hub.
- `deconturi-federatie` și `familii` (D-05) rămân complet neatinse — confirmat prin `git diff` (liniile lor apar identic, doar mutate lângă noua grupare de case-uri).
- `handleIncaseazaMultiple`, `handleJurnalBack`, `handleIncasareProcesata` și destructurarea `viewParams` eliminate din `AppRouter.tsx` (logica trăiește exclusiv în `PlatiHub`); `goBack`/`canGoBack` păstrate (folosite de `profil-sportiv`).

## Task Commits

Fiecare task a fost comis atomic:

1. **Task 1: Componenta PlatiHub (shell cu tab-uri, pastile, fluxul de incasare multipla)** - `b0dbd57` (feat)
2. **Task 2: Comutarea rutarii in AppRouter + exportul lazy** - `e4d51db` (feat)

## Files Created/Modified

- `components/Plati/hub/PlatiHub.tsx` - `PlatiHub`, `PlatiHubProps`, harta locală `ICONITE_TABURI` — shell-ul complet al hub-ului
- `components/LazyComponents.tsx` - `export const PlatiHub = lazy(...)`
- `components/AppRouter.tsx` - `platiHubElement`, `case 'plati-hub'` + 11 alias-uri grupate, ramura `istoric-plati` dublă, eliminarea handlerelor F1-F4 mutate în PlatiHub

## Decisions Made

- `handleJurnalBack`/`handleIncaseazaMultiple`/`handleIncasareProcesata` mutate 1:1 (fără modificări de logică) din `AppRouter.tsx` în `PlatiHub.tsx` — zero risc de regresie pe fluxul financiar live.
- `istoric-plati` exclus explicit din grupul de 12 case-uri aliasate (are ramură ternară proprie) — singura vedere financiară fără guard, folosită de rolul SPORTIV.
- Comentariul introductiv al `platiHubElement` a fost reformulat pentru a nu conține literal șirul `case 'plati-hub'` (evită un fals-pozitiv la garda `grep -c "case 'plati-hub'"` care trebuia să găsească exact 1 aparitie — cea reală, din switch).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Primul grep de verificare (`grep -c "case 'plati-hub'"`) a raportat 2 în loc de 1, din cauza unui comentariu care menționa literal același șir de caractere. Reformulat comentariul (fără a schimba semnificația) — garda a trecut la 1 după corecție. Nu a fost o eroare de logică, doar coliziune text/comentariu.

## User Setup Required

None - no external service configuration required.

## Verification Results

- `npm run lint` (`tsc --noEmit`): cod 0, de două ori (după fiecare task).
- `npm run build`: cod 0, chunk nou `PlatiHub-B6SIMj93.js` generat.
- `npx tsx components/Plati/hub/platiHubConfig.test.ts`: 19 PASS, 0 FAIL (neatins de acest plan, rulat ca gardă de regresie).
- Toate gardele grep din acceptance criteria (Task 1 și Task 2) confirmate manual: `rezolvaPozitieHub(` = 1, `navigateTo('plati-hub'` = 1, `onJurnalBack={handleJurnalBack}` = 1, `role="tablist"` = 1, `supabase` = 0, `@mui|shadcn` = 0; cele 11 literale legacy + `plati-hub` = exact 1 aparitie fiecare ca `case '<literal>':`; `handleIncaseazaMultiple|handleJurnalBack|handleIncasareProcesata` = 0 în AppRouter; `setActiveView('jurnal-incasari')` = 0; `renderProtected(platiHubElement, canManageFinances)` = 1; `canManageFinances ? platiHubElement :` = 1.
- `git diff --diff-filter=D` pe ambele commit-uri: nicio ștergere neașteptată.
- Liniile `case 'deconturi-federatie'` și `case 'familii'` confirmate identice (byte-cu-byte) cu versiunea dinaintea acestui plan.

## Known Stubs

Niciunul. `PlatiHub` montează exclusiv componentele reale existente (TabFacturi/TabIncasari/TabRapoarte/TabConfigurare), fără date mock sau placeholder.

## Threat Flags

Nicio suprafață nouă în afara celor deja documentate în `<threat_model>`-ul planului (T-31-08-01..04, T-31-08-SC) — toate mitigate conform planului: guard unic `canManageFinances` echivalent guard-urilor vechi, ramura `istoric-plati` neschimbată pentru SPORTIV, golire `platiPentruIncasare` pe toate căile de ieșire din Jurnal, toate cele 12 literale mapate explicit (fără "Lipsește Vizualizarea").

## Next Phase Readiness

- Cele 14 view-uri financiare vechi sunt reduse la un singur hub navigabil (`plati-hub`) cu 4 tab-uri interne — D-01..D-05 complete.
- `familii` și `deconturi-federatie` rămân ecrane separate, complet neatinse.
- Planul 31-09 (verificarea live RLS/trigger D-09, amânată din 31-07 din lipsa accesului Supabase MCP) rămâne următorul pas — fără blocker introdus de acest plan.
- Verificare vizuală manuală (browser) a fluxului complet (schimbare tab/pastilă, încasare multiplă, revenire din profil sportiv, reload pe literal vechi) NU a fost efectuată în această sesiune (execuție non-interactivă) — recomandat înainte de a considera Faza 31 complet verificată vizual.

## Self-Check: PASSED

- FOUND: components/Plati/hub/PlatiHub.tsx
- FOUND: commit b0dbd57 (Task 1)
- FOUND: commit e4d51db (Task 2)
- FOUND: export const PlatiHub = lazy( in components/LazyComponents.tsx
- FOUND: case 'plati-hub' in components/AppRouter.tsx (exact 1 aparitie reala)

---
*Phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa*
*Completed: 2026-09-26*
