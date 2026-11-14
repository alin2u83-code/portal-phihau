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
