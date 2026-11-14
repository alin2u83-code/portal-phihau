---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 02
subsystem: ui
tags: [typescript, competitii, categorii, preview, rpc-wrapper]
requires:
  - phase: 41-01
    provides: "RPC categorii_aplica_operatie (migrare scrisa, neaplicata)"
provides:
  - "types.ts: OperatieCategorii, CategorieNouaInput, MutareCategorie, RezultatOperatieCategorii (+ campuri optionale pe EchipaCompetitie)"
  - "services/categoriiAdminService.ts: aplicaOperatieCategorii -> { data, error }"
  - "components/Competitii/constants.tsx: SELECT_INSCRIERI_COMPETITIE, SELECT_ECHIPE_COMPETITIE (gen, status, quyen)"
  - "utils/categoriiAdmin.ts: preview-uri pure anulare / mutare / fuziune / impartire"
affects: [41-04, 41-05, 41-06, 41-07]
tech-stack:
  added: []
  patterns: ["preview pur peste starea deja incarcata (zero query-uri noi)", "categorie virtuala (id = cheie) pentru reutilizarea verificaEligibilitate", "test assert-based cu npx tsx"]
key-files:
  created:
    - services/categoriiAdminService.ts
    - utils/categoriiAdmin.ts
    - utils/categoriiAdmin.test.ts
  modified:
    - types.ts
    - components/Competitii/constants.tsx
key-decisions:
  - "Reguli de eligibilitate/taxa/activ reutilizate (verificaEligibilitate, calculeazaTaxa*, categorieActiva), nimic reimplementat"
  - "Sugestia la mutare doar daca exista exact o tinta valida (compatibila, activa, fara rand existent, eligibila)"
  - "Echipa primeste sugestie doar daca toti titularii indica aceeasi tinta; la gen, echipa cu ambele genuri merge in copilul Mixt"
  - "Rezultatul fuziunii are asteptat = null (acoperirea completa o verifica RPC-ul); asteptat doar la anulare"
requirements-completed: [D-02, D-03, D-04, D-05, D-07, D-08, D-10]
duration: ~35min
completed: 2026-11-14
---

# Phase 41 Plan 02: Contracte client si preview-uri pure Summary

Tipurile, wrapperul RPC, select-urile comune (cu gen/status/quyen) si un modul pur `utils/categoriiAdmin.ts` care calculeaza client-side preview-ul pentru anulare, mutare, fuziune si impartire (varsta/grad/gen), acoperit de 24 de teste.

## Ce s-a livrat
- **Task 1** (`a601171d`): 4 tipuri noi in `types.ts` (+ `inlantuire_id`, `inlantuire`, `echipa_sportivi` optionale pe `EchipaCompetitie`), `aplicaOperatieCategorii` (nu arunca, garda reala e `is_super_admin()` in RPC), cele doua constante SELECT. NU sunt conectate in `index.tsx` (face 41-07); verificarea live a select-urilor (embed `inlantuiri!inlantuire_id`) ramane la 41-04.
- **Task 2** (`117a8c47` RED, `7d1cf38d` GREEN): `cheieRand`, `compatibile`, `categorieDinInput`, `participanti`, `participantiFaraCategorie`, `sportiviInscrisi`, `verificaTinta`, `planAnulare`, `planMutare`, `mutariDinPlan`.
- **Task 3** (`864244dc` RED, `c9046000` GREEN): `definitieFuziune`, `planFuziune`, `copiiImpartire`, `planImpartire`, `CriteriuImpartire`.

## Verificare
- `npx tsx utils/categoriiAdmin.test.ts`: 24 PASS, exit 0 (RED confirmat inainte de fiecare implementare: modulul / exporturile lipseau).
- `npx tsc --noEmit`: 0 erori pe intregul proiect.

## Deviations from Plan
Niciuna de fond. Mici alegeri de interpretare acolo unde planul era neprecizat:
- Nume afisat in preview e `NUME Prenume` cu NUME majuscule (cum cere planul); testul initial pentru duplicate a fost corectat sa caute `NUME1`.
- `planImpartire` adauga si blocajul `Categoria nu este activă.` (nu era in plan).
- Echipa: grad afisat = cel mai mare grad efectiv dintre titulari; varsta/gen = null. `areEchipeMixte` se aplica la orice `tip_participare !== 'individual'`.
- `verificaTinta` pentru echipe nu verifica "rand existent in tinta" (unicitatea pe (categorie, sportiv) priveste doar inscrierile individuale).

## Limitari de verificare
- Nu am rulat `/code-review` separat pe diff (recomandat inainte de 41-05/41-07).
- Select-urile SELECT_* nu au fost rulate pe Supabase live (task 41-04); wrapperul RPC nu a fost apelat (migrarea 41-01 e neaplicata).
- Testele sunt unitare pe fixture-uri; fara test in browser (nu exista UI in acest plan). Regula gradului la competitie depinde de data de azi (bump 7/13 ani): fixture-urile evita pragurile.

## Known Stubs
None (module neconectate inca la UI prin design: consumate de 41-05/06/07).

## Threat Flags
None beyond plan threat model (T-41-09..12: wrapperul doar transmite; garda este server-side).

## Self-Check: PASSED
- services/categoriiAdminService.ts, utils/categoriiAdmin.ts, utils/categoriiAdmin.test.ts: FOUND
- commits a601171d, 117a8c47, 7d1cf38d, 864244dc, c9046000: FOUND
