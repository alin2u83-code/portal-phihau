---
phase: quick-260901-l8j
plan: 01
subsystem: competitii
tags: [competitii, categorii, sabloane, supabase, taxe]

# Dependency graph
requires: []
provides:
  - "Competitie unica pentru Campionatul National QKD Juniori 1/Seniori/Veterani (31.10-01.11.2026), id 3d2187dc-ffa8-464d-9bf9-b585b58004c7"
  - "74 categorii unificate (58 tehnica + 16 giao_dau, renumerotate 1-74) sub 4 probe: thao_quyen_individual, sincron, song_luyen, giao_dau"
  - "O singura inscriere de club pentru tot evenimentul (nu 2 fluxuri separate)"
  - "generateTemplateTehnnicaJ1SV() + generateTemplateGiaoDauJ1SV() in utils/competitiiTemplates.ts, reutilizabile la editia viitoare"
  - "GenerareSabloaneModal.tsx ofera ambele seturi de sabloane J1SV indiferent de competitie.tip (marker pe denumire, MARKER_J1SV)"
  - "config_taxe completat (100 lei individual / 150 lei echipa-pereche), consumat real in Pas4Sumar.tsx si FinanciarView.tsx"
  - "Fix buildCategorieDenumire: afisa 'N-N ani' in loc de 'N ani' cand varsta_min===varsta_max"
affects: [competitii, inscriere-club-wizard, financiar-competitii]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminare intre competitii cu acelasi Competitie.tip prin marker pe denumire (MARKER_J1SV), fara extindere de schema/types.ts"
    - "Scripturi one-off in scripts/ (gitignored) cu SUPABASE_SERVICE_ROLE_KEY, garda read-only repetata inline inainte de orice mutatie pe date live"
    - "Renumerotare neconditionata a numar_categorie/ordine_afisare la mutarea categoriilor intre competitii, ca sa evite coliziuni fara constrangere UNIQUE verificabila prin PostgREST"

key-files:
  created: []
  modified:
    - utils/competitiiTemplates.ts
    - components/Competitii/GenerareSabloaneModal.tsx

key-decisions:
  - "O singura competitie (tip='tehnica', cosmetic) in loc de 2 legate prin denumire — userul a cerut explicit o singura inscriere pentru ambele probe"
  - "Renumerotare fortata 59-74 pt categoriile giao_dau mutate, pentru ca ambele functii de sablon J1SV numeroteaza independent de la 1"
  - "Mapare grad circulara: '1-4 CAP' generic = Cap Albastru (ordine 15-18); C.N. fara Dang = ordine 19; C.N. N Dang = ordine 19+N — confirmat explicit de user, nu doar din dictionarul hardcodat"
  - "Categoriile 39/40/41/42 (posibil de divizat 'in urma inscrierilor' conform circularei) adaugate ca in tabelul original — divizarea ramane manuala, ulterioara, din Admin"

patterns-established:
  - "Pentru evenimente cu mai multe tipuri de proba sub aceeasi competitie reala, se foloseste UN singur rand `competitii` cu toate probele/categoriile aferente, niciodata 2 randuri legate doar prin denumire"

requirements-completed: [QT-260901-l8j]

# Metrics
duration: ~35min
completed: 2026-09-01
---

# Quick Task 260901-l8j: Unifica cele 2 competitii J1SV Summary

**Campionatul National QKD Juniori1/Seniori/Veterani adaugat ca o singura competitie cu 74 categorii pe 4 probe (tehnica + giao_dau), o singura inscriere de club, taxe 100/150 lei configurate real, plus fix cosmetic la denumirea categoriilor cu varsta unica.**

## Performance

- **Duration:** ~35 min (creare initiala 2 competitii separate + delegare merge + executie manuala dupa blocaj permisiuni pe subagent + fix bonus denumire)
- **Started:** 2026-09-01T15:0X (sesiune curenta)
- **Completed:** 2026-09-01T16:0X
- **Tasks:** 6 (garda, migrare, finalizare, verificare, fix cod, lint+build) + 1 fix bonus (denumire varsta unica)
- **Files modified:** 2 (cod) + scripturi one-off in scripts/ (gitignored, nu apar in commit)

## Accomplishments
- Creata initial ca 2 competitii separate (tehnica/giao_dau, cerinta schemei `Competitie.tip` unic), apoi unificate la cererea explicita a userului intr-o singura competitie cu id `3d2187dc-ffa8-464d-9bf9-b585b58004c7`.
- 74 categorii corecte, extrase integral din circulara oficiala FRAM/QwanKiDo (58 tehnica: Thao Quyen Individual grade+CN, Sincron, Song Luyen; 16 giao_dau: A-J grade, K-P centuri negre).
- Gardă de siguranță (0 înscrieri/echipe) verificată de 2 ori (inspect + inline în migrate) înainte de orice mutație pe date live.
- Migrare + renumerotare 59-74 pentru categoriile giao_dau, ștergerea competiției orfane, redenumire unificată, `config_taxe` completat (era `null`, mergea pe fallback).
- Verificare finală cu 8 asertiuni: 1 competiție, 74 categorii unice 1-74, 4 probe distincte, toate `proba_id` valide, taxe corecte, 0 înscrieri accidentale — toate PASS.
- `GenerareSabloaneModal.tsx` reparat să ofere ambele seturi de șabloane la o regenerare viitoare, indiferent de `competitie.tip`.
- Verificat vizual în browser (Chrome, localhost:5173): 1 card competiție, tab Categorii (74), ecran înscriere club cu 4 carduri probă sub aceeași înscriere.
- Fix bonus găsit la verificarea vizuală: `buildCategorieDenumire` afișa "16-16 ani" în loc de "16 ani" quando vârsta min=max — reparat în cod + reparate cele 16 denumiri deja salvate în DB pentru competiția curentă.

## Task Commits

Commit unic (task-urile de DB au rulat prin scripturi one-off gitignored, nu generează commit-uri per task):

1. **feat(competitii): adauga CN QKD Juniori1/Seniori/Veterani, 74 categorii unificate** - `3757574` (feat) — include fix-ul cod pentru ambele seturi de șabloane și fix-ul `buildCategorieDenumire`

_Notă: mutațiile pe date live (creare inițială, merge, fix denumiri) au rulat prin scripturi `scripts/*.ts` cu `SUPABASE_SERVICE_ROLE_KEY` — directorul `scripts/` e gitignored, deci scripturile one-off nu apar în commit, doar efectul lor (starea finală din DB) și fișierele de cod modificate._

## Files Created/Modified
- `utils/competitiiTemplates.ts` - Funcții noi `generateTemplateTehnnicaJ1SV()`, `generateTemplateGiaoDauJ1SV()`; fix `buildCategorieDenumire` pentru vârstă unică
- `components/Competitii/GenerareSabloaneModal.tsx` - Discriminare pe `MARKER_J1SV` (denumire), ambele seturi de șabloane concatenate + renumerotate pentru competiția unificată

## Decisions Made
- 1 competiție (nu 2 legate) — cerință explicită a userului, `competitie.tip` nefiind folosit nicăieri în fluxul de înscriere (doar la badge display + generare șabloane), deci merge sigur.
- Mapare grad "CAP" generic din circulară = Câp Albastru — confirmată explicit de user, nu asumată din dicționarul hardcodat `ordineToLabel`.
- Categoriile 39/40/41/42 adăugate ca-n tabel, divizarea ulterioară rămâne operațiune manuală din Admin.

## Deviations from Plan

### Auto-fixed Issues

**1. Subagentul de merge a fost blocat de clasificatorul de permisiuni auto-mode**
- **Found during:** Task delegat "Merge cele 2 competiții J1SV într-una"
- **Issue:** Execuția scripturilor de mutație pe date live a fost refuzată la nivel de subagent (fără worktree isolation, necesar pt `.env`)
- **Fix:** Am cerut confirmare explicită userului, apoi am rulat scripturile direct eu (nu prin subagent), pas cu pas, cu raport după fiecare
- **Verificare:** Toate cele 4 scripturi (inspect/migrate/finalize/verify) au rulat cu exit 0, verificare finală PASS

**2. Denumire categorii cu vârstă unică afișată incorect ("N-N ani")**
- **Found during:** Verificare vizuală în browser, cerută de user după finalizarea planului
- **Issue:** `buildCategorieDenumire` genera range chiar și când `varsta_min === varsta_max` (16 categorii afectate: 1-16, thao quyen individual 16/17 ani)
- **Fix:** Condiție nouă în `buildCategorieDenumire` + script one-off de corectare a denumirilor deja salvate în DB pentru cele 16 categorii afectate
- **Verificare:** Reverificat vizual în browser — "16 ani"/"17 ani" corect
- **Committed in:** `3757574` (parte din commit-ul unic al task-ului)

---

**Total deviations:** 2 (1 blocaj de permisiuni rezolvat prin execuție directă confirmată de user, 1 fix bonus la cerere)
**Impact on plan:** Ambele necesare pentru finalizarea corectă; fix-ul de denumire a fost cerut explicit de user după verificare vizuală, nu scope creep.

## Issues Encountered
- Subagentul competitii nu a putut rula scripturile de mutație direct (permisiuni auto-mode) — rezolvat prin execuție manuală confirmată.

## User Setup Required

None - nicio configurare externă necesară. Migrațiile au folosit `SUPABASE_SERVICE_ROLE_KEY` deja existent în `.env`.

## Next Phase Readiness

- Competiția e completă și funcțională, verificată atât prin scripturi de verificare (8 asertiuni PASS) cât și vizual în browser.
- Cluburile pot acum face o singură înscriere pentru toate cele 4 probe (Thao Quyen Individual, Sincron, Song Luyen, Giao Dau).
- Niciun blocker pentru task-uri viitoare. Deadline înscrieri: 23.10.2026.

---
*Quick Task: 260901-l8j*
*Completed: 2026-09-01*

## Self-Check: PASSED

All created/modified files found on disk:
- FOUND: utils/competitiiTemplates.ts
- FOUND: components/Competitii/GenerareSabloaneModal.tsx

Commit found in git log:
- FOUND: 3757574
