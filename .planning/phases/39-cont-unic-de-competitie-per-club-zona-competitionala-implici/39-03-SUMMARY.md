---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 03
subsystem: frontend-logic
tags: [competitii, cont-club, acces-extern, tdd]
requires:
  - phase: 39-01
    provides: conturi_competitie_club, este_proprietar(), regula SQL competitie_vizibila_cont_club (neaplicate live)
  - phase: 39-02
    provides: POST /api/aproba-cerere-acces?action=cont-club
provides:
  - utils/accesExtern.ts (construiesteContexte(roluri, contClub), clasificaCompetitiiClub, esteZonaCompetitie, esteListaZona, RandContClub)
  - services/accesExternService.ts (incarcaContexteEligibile(userId), incarcaCompetitiiClub, esteProprietar, listaConturiCluburi, creeazaContClub, schimbaEmailContClub)
  - hooks/useEsteProprietar.ts
  - types.ts (ContCompetitieClub, CompetitiiClubClasificate)
affects: [39-05, 39-06, 39-15]
key-files:
  created:
    - hooks/useEsteProprietar.ts
  modified:
    - utils/accesExtern.ts
    - utils/accesExtern.test.ts
    - services/accesExternService.ts
    - types.ts
key-decisions:
  - "REPREZENTANT_COMPETITIE se pune primul in lista de contexte (intrarea implicita a contului de club)"
  - "Participarea clubului = 2 citiri (inscrieri, echipe) cu !inner si limit(1) pe tabela referita: o linie per competitie, limita max-rows nu taie istoricul"
requirements-completed: [D-02, D-03, D-09, D-12, D-13, D-14, D-15]
duration: 15min
completed: 2026-11-11
---

# Phase 39 Plan 03: Logica pura + servicii client pe contul de club Summary

Contextul extern se construieste din randul de rol REPREZENTANT_COMPETITIE + contul de club (fara competitie in parametri), competitiile se clasifica active/istoric cu aceeasi regula ca SQL-ul din 39-01, iar proprietarul are apeluri client pentru creare si schimbare email.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1 (TDD, RED confirmat local, GREEN) | 99508fa | utils/accesExtern.ts + test + types.ts |
| 2 | ad1a1fb | services/accesExternService.ts + hooks/useEsteProprietar.ts |

## Verificare (rulata)
- `node --import tsx utils/accesExtern.test.ts`: toate asertiunile PASS (zona, contexte, clasificare active/istoric, permisiuni).
- RED rulat inainte de implementare (import lipsa) apoi GREEN; testul si implementarea sunt intr-un singur commit (99508fa), fara commit separat `test(...)`.
- `tsc --noEmit`: 0 erori in utils/accesExtern, services/accesExternService, hooks/useEsteProprietar, types.ts.
- Erori tsc temporare asteptate: `components/CompetitieExterna/index.tsx(80)` (apelant incarcaContexteEligibile cu 2 argumente, 39-05) si `components/Competitii/CereriAccesAdmin.tsx` (importa functiile per grant sterse, 39-06).
- grep acceptanta: functii T2 / `acces_competitie_extern` in serviciu = 0; `action=cont-club` = 1; `RandGrant` = 0. `referencedTable` apare doar 1 data (acceptanta cerea >=2): cele doua interogari de participare folosesc acelasi helper local `participare(tabela)`, deci limita pe tabela referita se aplica ambelor.
- NERULATE: apelurile reale pe Supabase/endpoint (tabelele nu sunt aplicate live, se testeaza in 39-04); nu s-a rulat review separat de cod; `GrantAccesExtern` ramas in types.ts (inca importat de CereriAccesAdmin.tsx, se sterge in 39-06).

## Deviations from Plan
None - plan executat ca scris (singura nota: acceptanta `referencedTable >= 2` interpretata semantic, vezi mai sus).

## Note commit services/accesExternService.ts
Commit-ul ad1a1fb include si editarile necomise anterioare din acel fisier (estePropietar, incarcaAccesManagement, acordaAccesManagement, revocaAccesManagement, RolManagementAcordabil): planul le inlocuieste, deci in diff-ul fata de HEAD ele nu apar deloc (nu au fost niciodata comise). `components/Competitii/CereriAccesAdmin.tsx` nu a fost atins.

## Riscuri / de stiut
- Pana la 39-05/39-06 `tsc` global are 6 erori in cele doua componente de mai sus.
- `esteProprietar` intoarce false la RPC lipsa, deci UI-ul ramane ascuns pana la aplicarea migrarii.

## Self-Check: PASSED
Fisierele exista (hooks/useEsteProprietar.ts creat); commit-urile 99508fa si ad1a1fb exista.
