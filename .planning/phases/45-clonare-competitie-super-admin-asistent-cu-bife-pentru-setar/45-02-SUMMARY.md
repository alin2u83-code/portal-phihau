---
phase: 45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar
plan: 02
subsystem: competitii
tags: [clonare, typescript, service, unit-tests]
requires: ["45-01 (contract RPC competitie_cloneaza)"]
provides:
  - "utils/clonareCompetitie.ts: structuraInitiala, avertismenteTip, numeImplicit, valideazaClonare, TIPURI_CLONARE"
  - "services/clonareCompetitieService.ts: cloneazaCompetitie() -> { data, error }"
  - "types.ts: AvertismentClonare, RezultatClonareCompetitie"
affects: [45-03, 45-04]
key-files:
  created:
    - services/clonareCompetitieService.ts
    - utils/clonareCompetitie.ts
    - utils/clonareCompetitie.test.ts
  modified:
    - types.ts
key-decisions:
  - "Reconstructia structurii initiale exista o singura data (TS); RPC-ul doar valideaza si copiaza id-urile"
  - "Fuziunea veche (autoreferinta / sursa lipsa / array gol) pastreaza varianta activa + avertisment; Faza 41 exclude rezultatul si pastreaza sursele"
  - "Acelasi tip la clonare nu produce avertismente de compatibilitate (A7)"
requirements-completed: [D-03, D-06, D-07, D-08, D-11, D-12, D-14]
duration: 15min
completed: 2026-11-19
---

# Phase 45 Plan 02: Contracte client clonare competitie Summary

Modul pur care reconstruieste structura initiala a categoriilor (ambele forme de fuziune, impartiri, anulate), avertismentele de tip, numele implicit si validarea, plus serviciul `{ data, error }` peste RPC-ul `competitie_cloneaza`.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1. Tipuri + serviciu | 13db65a1 | AvertismentClonare, RezultatClonareCompetitie, cloneazaCompetitie (9 chei p_*) |
| 2 (RED). Teste | 56900473 | 16 teste, esuau (modul lipsa) |
| 2 (GREEN). Implementare | 0e3e45f4 | structuraInitiala, avertismenteTip, numeImplicit, valideazaClonare, TIPURI_CLONARE |

## Teste (16, toate PASS, `npx tsx utils/clonareCompetitie.test.ts`)

Doar active; anulata inclusa; impartire Faza 41; fuziune Faza 41; fuziune veche autoreferinta; fuziune cu sursa lipsa; fuziune cu array gol/NULL; parinte impartit fara copii identificabili; rezultat de fuziune impartit ulterior; lant (copil impartit fuzionat prin RPC); forma datelor reale; avertismenteTip acelasi tip; avertismenteTip tehnica->cvd (thao_quyen_individual + sincron incompatibile, song_luyen compatibil, numara doar categoriile selectate); numeImplicit; valideazaClonare valid; valideazaClonare cate un mesaj per regula.

Forma datelor reale (84 randuri generate in bucla): 72 id-uri, 2 avertismente, 9 anulate, 12 excluse.

## Deviations from Plan

None - plan executat ca scris. TDD: RED (modul lipsa, ERR_MODULE_NOT_FOUND) commit separat, apoi GREEN.

## Verificari rulate
`npx tsx utils/clonareCompetitie.test.ts` (exit 0), `npx tsc --noEmit` (exit 0, fara output), zero referinte la supabase in utils/clonareCompetitie.ts. NU rulat: apelul real al RPC-ului (migrarea 45-01 neaplicata), code-review separat, nimic in browser.

## Known Stubs
None.

## Threat Flags
None (T-45-09..12 acoperite: validare membru server-side in RPC, o singura implementare, fixtures sintetice).

## Self-Check: PASSED
- services/clonareCompetitieService.ts, utils/clonareCompetitie.ts, utils/clonareCompetitie.test.ts exista; commit-uri 13db65a1, 56900473, 0e3e45f4 prezente.
