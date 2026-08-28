---
phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha
plan: 02
subsystem: ui
tags: [react, typescript, tailwind, empty-state, design-system, ux]

# Dependency graph
requires:
  - phase: 25-01
    provides: audit RLS live (context de faza, fisiere disjuncte — fara dependinta functionala directa)
provides:
  - Componenta reutilizabila EmptyState in components/ui.tsx (icon, title, description, actionLabel, onAction, className)
  - Empty state cu CTA "Adaugă Grupă" pe ecranul principal Grupe
  - Empty state cu CTA "Creează prima grupă" pe tabul Grupe din Prezenta (navigheaza catre modulul Grupe)
  - Empty state cu CTA "Adaugă Tip Abonament" pe ambele variante (mobil + desktop) ale Tipuri Abonament
affects: [25-03, 25-04, 26-wizard-onboarding-club-nou]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EmptyState component in ui.tsx: Card centrat, buton actiune randat doar cand actionLabel SI onAction sunt ambele definite — reutilizabil si pe ecrane read-only fara CTA"
    - "CTA catre focus formular existent (nu modal nou): useRef + scrollIntoView({behavior:'smooth'}) + focus() pe inputul relevant, cand nu exista un handler de deschidere dedicat (cazul TipuriAbonament)"

key-files:
  created: []
  modified:
    - components/ui.tsx
    - components/Grupe/index.tsx
    - components/Prezenta/GrupeList.tsx
    - components/Plati/TipuriAbonament.tsx

key-decisions:
  - "EmptyState primeste variant=\"info\" pentru butonul de actiune (consistent cu butoanele primare de \"Adauga X\" deja existente in aceste module, ex. handleOpenAdd din Grupe)"
  - "GrupeList.tsx a fost convertit din component-expresie (arrow function cu return implicit) in component cu body explicit, ca sa poata folosi hook-ul useNavigation() — signature-ul props ramane neschimbat"
  - "TipuriAbonament: CTA nu deschide un modal nou (nu exista unul dedicat) — face focus + scrollIntoView pe inputul de denumire din formularul deja existent \"Definește Abonament Nou\", pastrand fluxul actual de adaugare"

patterns-established:
  - "EmptyState: pattern standard pentru orice ecran-lista viitor cu zero date (mesaj + descriere + CTA opțional), reutilizat direct din ui.tsx fara duplicare JSX"

requirements-completed: [MCLB-07]

# Metrics
duration: ~7min
completed: 2026-08-28
---

# Phase 25 Plan 02: Empty States Grupe/Prezenta/Abonamente Summary

**Componenta EmptyState noua in design system-ul intern (components/ui.tsx) aplicata pe 3 ecrane-lista (Grupe, tabul Grupe din Prezenta, Tipuri Abonament — mobil si desktop), inlocuind textele italic fara actiune cu mesaj explicativ + buton CTA functional pentru cluburile noi cu zero date.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-08-28T16:28:00Z (imediat dupa finalizarea 25-01)
- **Completed:** 2026-08-28T16:34:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Componenta `EmptyState` reutilizabila adaugata in `components/ui.tsx`, co-locata dupa `Card`, pur prezentationala (fara stare, fara fetch)
- Modulul Grupe: ecranul principal afiseaza empty state cu CTA "Adaugă Grupă" legat de `handleOpenAdd` (aceeasi functie ca butonul din header)
- Modulul Prezenta, tabul Grupe (`GrupeList.tsx`): empty state cu CTA "Creează prima grupă" care navigheaza catre modulul Grupe via `navigateTo('grupe')` din `NavigationContext`
- Modulul Plati, Tipuri Abonament: empty state pe ambele layout-uri (mobil + desktop) cu CTA "Adaugă Tip Abonament" care face focus + scroll pe inputul de denumire din formularul existent

## Task Commits

Each task was committed atomically:

1. **Task 1: Adauga componenta EmptyState in components/ui.tsx** - `f042f9e` (feat)
2. **Task 2: Aplica EmptyState pe Grupe si pe lista de grupe din Prezenta** - `61d6496` (feat)
3. **Task 3: Aplica EmptyState pe Tipuri Abonament (mobil + desktop)** - `8004de4` (feat)

**Plan metadata:** (commit ulterior, docs)

_Note: Toate cele 3 task-uri au fost non-TDD (`tdd="false"`), un singur commit `feat` per task._

## Files Created/Modified
- `components/ui.tsx` - adauga `EmptyStateProps` (interfata) si `EmptyState` (componenta), dupa `Card`; foloseste tokenii de tema `var(--t-text)` / `var(--t-text-muted)` deja folositi in fisier
- `components/Grupe/index.tsx` - importa `EmptyState`, inlocuieste fallback-ul `Card` cu text italic cu `EmptyState` + CTA `handleOpenAdd`; elimina importul `Card` devenit neutilizat
- `components/Prezenta/GrupeList.tsx` - importa `EmptyState` si `useNavigation`; converteste componenta din arrow-return-implicit in body explicit pentru a folosi hook-ul; randeaza `EmptyState` cand `grupe.length === 0`, CTA apeleaza `navigateTo('grupe')`
- `components/Plati/TipuriAbonament.tsx` - importa `EmptyState`, adauga `useRef` pe inputul de denumire + `focusNewAbonamentForm()`; inlocuieste ambele fallback-uri text (mobil si desktop) cu `EmptyState`

## Decisions Made
- Butonul CTA din `EmptyState` foloseste `variant="info"`, consistent cu variant-ul deja folosit de butoanele principale "Adaugă X" din aceleasi module (evita introducerea unui variant nou doar pentru acest component)
- `GrupeList` a trecut de la `React.FC<...> = (props) => (...)` la `= (props) => { const {...} = useNavigation(); return (...); }` — schimbare minima de sintaxa, necesara pentru a consuma contextul de navigare; props-urile componentei raman identice
- Pentru `TipuriAbonament`, CTA-ul nu deschide un modal (nu exista unul dedicat pentru "adaugare rapida") — in schimb face focus + `scrollIntoView` pe inputul deja existent din formularul "Definește Abonament Nou", pastrand fluxul actual neschimbat

## Deviations from Plan

None - plan executat exact conform specificatiei.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `EmptyState` este disponibil in `components/ui.tsx` pentru orice alt ecran-lista viitor (inclusiv wizard-ul de onboarding din Phase 26, daca e nevoie de mesaje similare)
- `components/Prezenta/index.tsx` a ramas neatins, conform constrangerii planului — nicio interferenta cu 25-03 (aceeasi unda de executie)
- Verificarea vizuala consolidata (client ADMIN_CLUB pe club fara date) e programata pentru 25-04, conform planului

---
*Phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha*
*Completed: 2026-08-28*

## Self-Check: PASSED

All 4 modified files and the SUMMARY.md verified present on disk. All 3 task commits (`f042f9e`, `61d6496`, `8004de4`) verified in git log.
