---
phase: 34
plan: 15
gap_closure: true
completed: 2026-11-03
---

# Phase 34 Plan 15: Meniu 8/8/8/4, Stagii separat, Plati simplu, card "Necesita atentie"

- Stagii = intrare de nivel 1 in meniurile de staff; hub Competitii = Competitii | Activitati Nationale | Template Probe.
- Financiar (submeniu) -> "Plati" simplu catre plati-hub (adminMenu, adminClubMenu); bottom nav federatie "Plati".
- Card "De rezolvat" -> "Necesita atentie" (titlu + aria-label); UI-SPEC are sectiunea "Corectii post-UAT".
- Teste: parity 8/8/8/4 + Test 3b nou; shell spec asteapta 8.

## Rezultate comenzi
- `npm run build`: OK (35.8 s)
- `npx tsx tests/ui_faza34_menu_parity.ts`: Testele 1, 2, 3, 3b, 4, 4b OK
- `npx tsx components/Plati/hub/platiHubConfig.test.ts`: 23/23
- `npx tsc --noEmit`: 0 erori
- Playwright shell spec: NERULAT (necesita TEST_EMAIL/TEST_PASSWORD + MFA)

## Deviatii
- Niciuna de la plan.

## Acceptare umana (re-test UAT 3, 4, 6)
1. Sidebar: 8 intrari, "Plati" fara submeniu, "Stagii" sub "Competitii" (admin club, federatie, instructor).
2. Plati-hub: 7 tab-uri ADMIN_CLUB, 5 federatie; fiecare tab nou se randeaza fara al doilea buton de intoarcere.
3. Competitii: fara tab Stagii; "Stagii" din sidebar nu marcheaza "Competitii" activ.
4. Dashboard: card "Necesita atentie (N)".
5. Mobil 390x844: fara scroll orizontal de pagina; bottom nav federatie "Plati".
