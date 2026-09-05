---
phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-
plan: 03
subsystem: ui
tags: [react, supabase]

requires:
  - phase: 27-01
    provides: "Grupa.tip_grupa/sezon_id/arhivat, hooks/useSezoane.ts, CopyIcon"
  - phase: 27-02
    provides: "SezoaneView (sursa reala de sezoane si arhivare automata)"
provides:
  - "Selector Tip Grupă + Sezon in GrupaFormModal"
  - "Badge-uri Permanentă/Per Sezon/Arhivată + actiune Dublează în sezon nou in GrupaCard"
  - "Clonare manuala grupa arhivata in sezonul activ, fara sportivi, in Grupe/index.tsx"
affects: []

tech-stack:
  added: []
  patterns:
    - "Grupa arhivata ramane read-only (fara Gestionează/meniul ...) dar cu Detalii mereu vizibil — starea de arhivare comunicata prin opacity + Badge, nu prin ascundere completa"

key-files:
  modified:
    - components/Grupe/GrupaFormModal.tsx
    - components/Grupe/GrupaCard.tsx
    - components/Grupe/index.tsx

key-decisions:
  - "Payload-ul GrupaFormModal nu contine niciodata campul arhivat — flagul e gestionat exclusiv de fluxul de activare sezon (27-02) si de clonare, ca sa nu reactiveze accidental o grupa la editare"

patterns-established: []

requirements-completed: [SEZ-04, SEZ-05, SEZ-07]

duration: ~30min
completed: 2026-09-06
---

# Phase 27 Plan 03: Grupe permanent/per-sezon + dublare Summary

**GrupaFormModal cu selector Tip Grupă + Sezon presetat, GrupaCard cu badge-uri de stare si buton de dublare, handler de clonare in sezonul activ fara copierea sportivilor.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `GrupaFormModal`: selector `tip_grupa` (permanent/per_sezon) + selector conditional de sezon presetat pe sezonul activ, validare inainte de salvare, `sezon_id: null` garantat pentru grupele permanente
- `GrupaCard`: badge-uri `Permanentă`/`Per Sezon`/`Arhivată`, card estompat (`opacity-60`) si read-only (fara Gestionează/meniul `...`) cand arhivata, buton `Dublează în sezon nou` cand aplicabil
- `Grupe/index.tsx`: `handleDubleaza` cloneaza grupa + orarul saptamanal in sezonul activ, explicit fara `from('sportivi')`; lista afiseaza grupele arhivate ultimele

## Task Commits

1. **Task 1: GrupaFormModal selector** - `5d8e2f7` (feat)
2. **Task 2: GrupaCard badge-uri + dublare** - `cc764c1` (feat)
3. **Task 3: handleDubleaza in Grupe/index.tsx** - `8543519` (feat)

## Files Created/Modified
- `components/Grupe/GrupaFormModal.tsx` - campuri tip_grupa/sezon_id + validare
- `components/Grupe/GrupaCard.tsx` - badge-uri, gate read-only, buton dublare
- `components/Grupe/index.tsx` - handleDubleaza, ordonare grupe arhivate ultimele, ConfirmModal dublare

## Decisions Made
- Niciuna in afara celor deja fixate in plan.

## Deviations from Plan

None - plan executat conform specificatiei (numerele de linie citate in plan nu s-au potrivit exact cu fisierele reale, dar structura si continutul erau identice — editările s-au ancorat pe conținut, nu pe numere de linie).

## Issues Encountered
- Niciuna. Executat inline (fara subagent) — infra de worktree din mediu s-a dovedit nefunctionala in aceasta sesiune (vezi 27-02-SUMMARY.md).

## Next Phase Readiness
- 27-04/27-05 (regula de rezolvare tip abonament activ + legare tipuri de abonament la sezon) pot incepe independent — nu depind de acest plan.

---
*Phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-*
*Completed: 2026-09-06*
