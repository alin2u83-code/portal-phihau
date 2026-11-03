---
phase: 34
plan: 14
gap_closure: true
completed: 2026-11-03
---

# Phase 34 Plan 14: Tab-uri noi in plati-hub (gap UAT 6, partea A)

Deconturi Federatie, Vacante Antrenamente, Echipamente si Vanzari sunt tab-uri in `plati-hub` (7 tab-uri; Echipamente/Vanzari doar ADMIN_CLUB). View-urile vechi raman alias-uri si deschid hub-ul pe tab-ul lor.

## Commit
- 4c655c6

## Verificare
- `npx tsx components/Plati/hub/platiHubConfig.test.ts`: 23 PASS, 0 FAIL (TDD: RED pe T13-T22, apoi GREEN)
- `npx tsx tests/ui_faza34_menu_parity.ts`: OK
- `npx tsc --noEmit`: 0 erori

## Neverificat
- Randarea vizuala a celor 4 tab-uri si absenta dublului buton de intoarcere (verificare umana).
