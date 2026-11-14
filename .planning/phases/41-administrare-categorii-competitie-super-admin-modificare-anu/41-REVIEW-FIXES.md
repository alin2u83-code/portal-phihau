# Faza 41: corecturi dupa code review (14.11.2026)

Doar client-side; RPC `categorii_aplica_operatie` si migrarea `20261114a` neatinse.

| # | Sev | Fix | Fisiere | Commit |
|---|-----|-----|---------|--------|
| 1 | MEDIUM | Randurile clubului ramase pe categorii anulate/fuzionate/impartite sunt afisate (banner «Fara categorie - de realocat» in hub si sumar) si un sportiv cu rand orfan nu mai poate fi reinscris la aceeasi proba+arma (Pas4 nu salveaza randul, `InscriereModal` arunca eroare). Prop optional `categoriiToate`; selectia ramane pe categoriile active. Echipele orfane sunt doar afisate, nu blocate. | `utils/categoriiAdmin.ts` (`randuriFaraCategorieClub`, `cheieOrfan`), `InscriereClubWizard/{index,Pas4Sumar,types}`, `InscriereModal.tsx`, `index.tsx` | d74963db |
| 2 | MEDIUM | `AdminPanel` paseaza `areInscrieri` la `CategorieForm` (blocarea proba/tip nu mai e mereu inactiva). | `AdminPanel.tsx` | 22f07116 |
| 3 | MEDIUM | Avertisment (nebloc.) in `CategorieForm` cand `varsta_max`/`arma` se schimba pe categorie cu inscrieri (taxa derivata). | `CategorieForm.tsx` | 22f07116 |
| 4 | LOW | Rand retras in tinta: mesaj clar in preview (`verificaTinta`) si mesajul serverului «ar aparea de doua ori» e rescris in `aplicaOperatieCategorii`. Calea de rezolvare ramane «alege alta tinta»; nu exista UI de reactivare/stergere a randului retras. | `categoriiAdmin.ts`, `categoriiAdminService.ts` | 326bf20c |
| 5 | LOW | Selectia se goleste la schimbarea tab-ului; `Fuzioneaza` actioneaza doar pe selectia vizibila dupa filtre (`selectieVizibila`). | `index.tsx` | 35a32960 |
| 6 | LOW | (a) `blocajeDefinitie` oglindeste limitele RPC (grad 1..100, varsta 0..120, min<=max) ca blocaj in preview pentru impartire si fuziune; (b) avertisment la intervale de varsta neadiacente (`goluriVarsta`); (c) avertisment cand sursele fuziunii au setari diferite (`setariDiferiteFuziune`). 7 teste noi. | `categoriiAdmin.ts`, `categoriiAdmin.test.ts` | 326bf20c |
| 7 | LOW | `CategorieOperatieModal` rezolva sursele din `categorii` (live) dupa id, cu fallback pe snapshot. | `CategorieOperatieModal.tsx` | 35a32960 |
| 8 | LOW | `fetchDataSilent` are try/catch, nu mai suprascrie listele cu `[]` la eroare Supabase si afiseaza eroarea prin `showError`; `onDone` are si el try/catch. Efect secundar: toti apelantii lui `fetchDataSilent` beneficiaza. | `index.tsx` | 35a32960 |

## Verificare
- `npx tsc --noEmit`: 0 erori.
- `npx tsx utils/categoriiAdmin.test.ts`: toate trec (inclusiv 7 teste noi). `npx tsx utils/taxeCompetitie.test.ts`: toate trec.
- NU testat in browser; wizardul, `InscriereModal`, banner-ul «Fara categorie» si avertismentele din `CategorieForm` sunt verificate doar prin tipuri si logica pura testata.

## Ramase / limite
- Blocajul de reinscriere (1) e la sumar/submit, nu in Pas1; sportivul poate fi selectat, dar nu se salveaza (mesaj in sumar). Echipele orfane nu blocheaza formarea unei echipe noi.
- `CategorieForm` din `AdminPanel` nu primeste `inscrisi`/`dataCompetitie` (avertismentul de eligibilitate exista doar din tab-ul Categorii).

## Runda 2 (14.11.2026, punctele 2-5 din al doilea review)
Doar client-side; RPC si migrarea `20261114a` neatinse.

| # | Fix | Fisiere |
|---|-----|---------|
| 2 | `InscrieriView` primeste `categoriiToate` (optional, fallback pe `categorii`) si il paseaza la `InscriereModal` (mod editEchipa), altfel garda de rand orfan disparea silentios. `index.tsx` il paseaza. Prop-ul din `InscriereModal` ramane optional, documentat. | `InscrieriView.tsx`, `InscriereModal.tsx`, `index.tsx` |
| 3 | Mesajul rescris pentru «ar aparea de doua ori» e neutru (rand existent, posibil retras, SAU doua randuri selectate cu aceeasi tinta); regex ancorat pe `^Sportivul ... ar apărea de două ori în categoria țintă`. | `categoriiAdminService.ts` |
| 4 | `blocajeDefinitie` reproduce si verificarile serverului pentru denumire (trim 1..200), gen (Feminin/Masculin/Mixt) si `varsta_min` obligatorie; comentariul «oglindite» corectat (reproduse, nu partajate). 1 test nou grupat. | `categoriiAdmin.ts`, `categoriiAdmin.test.ts` |
| 5 | `fetchDataSilent`: try/catch mort scos din `onDone`; `showError` din `ErrorProvider` e deja stabil (`useCallback([])`), deci ramane in deps fara ref; toast limitat la unul / 10 s (`useRef` timestamp). `CategorieForm.schimbaTaxa`: `''` si `null` la `arma` sunt egale (fals pozitiv). | `index.tsx`, `CategorieForm.tsx` |

Verificare: `npx tsc --noEmit` 0 erori; `categoriiAdmin.test.ts` 31 PASS / 0 FAIL; `taxeCompetitie.test.ts` 0 FAIL. NU testat in browser.
