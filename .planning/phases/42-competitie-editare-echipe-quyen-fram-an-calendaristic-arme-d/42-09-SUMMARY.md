---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 09
subsystem: competitii-ui
tags: [editare-inscrieri, quyen, categorie, de-rezolvat, audit-log, docs]
requires: [42-02, 42-04, 42-05, 42-06, 42-07, 42-08]
provides:
  - "components/Competitii/EditareInscriereModal.tsx: quyen 1/2 + mutare in categorie compatibila (individual), mutare categorie (echipa)"
  - "utils/editareCompetitie.ts: taxaParticipare, taxeDeReglatDupaMutari (D-09)"
  - "FinanciarView: banner «De rezolvat» pentru taxe schimbate prin mutari de categorie"
  - "index.tsx canEditEchipe -> InscrieriView poateEdita (D-07)"
affects: [components/Competitii/InscrieriView.tsx, components/Competitii/index.tsx, components/Competitii/FinanciarView.tsx, docs/ARHITECTURA_COMPETITII.md]
key-files:
  created: [components/Competitii/EditareInscriereModal.tsx]
  modified: [utils/editareCompetitie.ts, utils/editareCompetitie.test.ts, components/Competitii/InscrieriView.tsx, components/Competitii/index.tsx, components/Competitii/FinanciarView.tsx, docs/ARHITECTURA_COMPETITII.md]
decisions:
  - "Scrieri directe (fara RPC nou): RLS 20261106e + triggerele 42-01 sunt poarta; UI doar ascunde butoanele"
  - "D-09 calculat din audit_log (UPDATE cu categorie_id diferit), fara tabel nou; afiseaza si mutarile Faza 41 care schimba taxa"
  - "Butonul «Editeaza componenta» a fost conditionat suplimentar cu poateEdita (era vizibil si cu inscrieri inchise)"
metrics:
  tasks: 3
  files: 7
  completed: 2026-11-15
---

# Phase 42 Plan 09: Editare quyen/categorie, De rezolvat taxe, documentatie Summary

Quyen-ul si categoria unei inscrieri (si categoria unei echipe) se pot edita din tab-ul Inscrieri, cu drepturile D-07 in UI, iar mutarile care schimba taxa calculata ajung la super admin in «De rezolvat» din Financiar, fara recalculare sau refacturare.

## Commits
- bbd413d5: feat(42-09) EditareInscriereModal + helperi D-09 cu teste
- 201b71a4: feat(42-09) poateEdita/canEditEchipe, butoane in InscrieriView, De rezolvat in FinanciarView
- c01a99e9: docs(42-09) sectiunea 7.10 in docs/ARHITECTURA_COMPETITII.md (+ linia FRAM din sectiunea 6)

## Ce s-a facut
- `taxaParticipare` (0 pe categorie neactiva, altfel taxa individuala/echipa ca in `construiesteRanduriPlata`) si `taxeDeReglatDupaMutari` (grupare pe (tip,id), categorie initiala = cea veche din prima mutare, rand curent din ctx, sare retrase/lipsa, pastreaza doar taxaVeche !== taxaNoua, sortat descrescator dupa data). 12 cazuri noi de test.
- `EditareInscriereModal`: optiuni de categorie doar active + `compatibile()`, fiecare cu `verificaTinta(...,'mutare')` (blocajele dezactiveaza optiunea, avertismentele apar in lista amber, linia de taxa cand difera). Quyen: `inlantuiri_grade` filtrat pe tip_proba + grad efectiv la data competitiei; Q2 doar daca categoria finala are `doua_quyenuri` si diferit de Q1; `inlantuire_id_2` devine null cand categoria finala nu are doua quyenuri; quyen-ul actual ramane optiune cu eticheta «nu mai e in programa». Ascuns la categorii cu arma. Salvare: update cu doar campurile schimbate + `.select('id')`; 0 randuri -> «Inscrierile s-au inchis; doar federatia poate modifica.». Nicio scriere pe taxe.
- `index.tsx`: `canEditEchipe` exact ca in plan (super admin portal federatie pana la finalizata; altii: inscrieri_deschise + termen nedepasit in ziua calendaristica Bucuresti + nu istoricExtern + admin club/federatie + nu INSTRUCTOR extern) -> `poateEdita`.
- `InscrieriView`: «Editeaza» (individual, ne-retras, club propriu sau super admin), «Mută categoria» (echipa), «Editeaza componenta» conditionat cu `poateEdita`.
- `FinanciarView`: `useQuery(['taxe-de-reglat', competitie.id])` pe `audit_log` paginat cate 1000, `BannerDeRezolvat` cu «Vezi clubul» (extinde clubul + scrollIntoView); eroare de interogare -> linie rosie, restul vederii se afiseaza.
- Docs: sectiunea 7.10 acopera D-01..D-15; linia FRAM din sectiunea 6 actualizata.

## Verificare (rulata)
| Verificare | Rezultat |
|---|---|
| `npx tsc --noEmit -p .` | exit 0, zero erori (si in afara fisierelor Fazei 42) |
| `npx tsx utils/editareCompetitie.test.ts` | exit 0, 27 PASS |
| `npx tsx tests/armeCvd_reguli.ts` | exit 0, «armeCvd_reguli: OK» |
| `npx tsx tests/armeCvdLipsuri.ts` | exit 0, «OK» |
| `npx tsx utils/categoriiAdmin.test.ts` | exit 0, 31 PASS |
| `npx tsx utils/taxeCompetitie.test.ts` | exit 0, 8 PASS |
| `npx vite build` | OK (built in 14.49s) |
| greps din `<verify>` (poateEdita x5 in InscrieriView, `poateEdita={canEditEchipe}`, `taxeDeReglatDupaMutari(`, `date_vechi->>categorie_id`) | toate prezente |
| Baterie live DB 42-04 (21/21), inclusiv sursa audit D-09 | din 42-04, nereluata aici |

## Deviations from Plan
- **Ordinea TDD:** implementarea `taxaParticipare`/`taxeDeReglatDupaMutari` a fost scrisa inaintea testelor (nu test-first), apoi cele 12 cazuri din `<behavior>` au fost adaugate si au trecut din prima. Un singur commit pentru Task 1 (fara commit RED separat); planul nu e `type: tdd`.
- Alte abateri: niciuna. Nicio modificare SQL, nicio cheie service role folosita.

## Known Stubs
Niciunul.

## Threat Flags
Niciunul nou fata de T-42-35..41. T-42-41 (citire audit_log in Financiar) acceptat: `audit_log` e citit cu `date_vechi->>categorie_id`, doar in tab-ul vizibil federatiei.

## Revizuire
Nu a existat o revizuire independenta (`/code-review`) in aceasta executie: subagentul nu poate lansa alt agent. Doar auto-verificare: tsc, teste, build. Revizuirea pe diff-ul `bbd413d5..c01a99e9` ramane de rulat de apelant.

## NEVERIFICAT (fara browser)
Nimic din UI nu a fost vazut sau rulat in browser/mobil. In particular neverificat: aspectul si utilizabilitatea `EditareInscriereModal` pe latime de telefon; dropdown-ul de categorii cu optiuni dezactivate pe mobil (`<option disabled>`); incarcarea reala a quyen-urilor pe un sportiv din DB; apasarea «Vezi clubul» (expand + scroll); aparitia/disparitia butoanelor dupa inchiderea inscrierilor sau pe competitie finalizata; comportamentul cu un cont real de reprezentant extern; verificarea ca banner-ul «De rezolvat» afiseaza date reale dupa o mutare reala (sursa de date audit e insa dovedita live in 42-04). Verificarea umana de la sfarsit de faza (8 puncte) ramane pentru utilizator.

## Verificari umane in asteptare (neefectuate de executor)
1. Super admin: competitie noua, optiunea FRAM debifata implicit; activare in draft; dupa «Deschide Inscrierile» optiunea e read-only cu motiv; antetul arata «Doar cu FRAM {an}».
2. Cont club (zona externa, reprezentant): Pas 1 cu sportivi fara FRAM dezactivati + badge rosu «Fara FRAM {an}»; platitii selectabili; «Selecteaza toti» sare peste blocati; «Detalii» extern explica regula.
3. Super admin pentru un club: sportiv fara FRAM -> «Exceptie FRAM»; dupa salvare, Jurnal Audit arata randul de exceptie.
4. Inscrieri, club propriu, inscrieri deschise: «Editeaza» schimba Q1/Q2 si muta in categorie compatibila (incompatibile nu apar, linia de taxa cand difera); «Muta categoria» la echipa; «Editeaza componenta» cu inlocuirea unui membru pastreaza ceilalti membri daca salvarea esueaza.
5. Dupa inchiderea inscrierilor: reprezentantul nu vede butoane de editare; super adminul inca da; pe competitie finalizata nimeni; marcarea taxei achitate in Financiar merge.
5b. Muta o echipa senior in categorie junior (sau un individ intr-o categorie cu alta taxa); in Financiar ca super admin «De rezolvat» listeaza mutarea cu taxa veche -> noua, iar «Vezi clubul» deschide clubul.
6. Competitie CVD: Pas Arme explica «Nicio arma»; arma implicita fara drept nu mai blocheaza Finalizeaza; Giao Dau listeaza doar arme de lupta eligibile pe grad; «De rezolvat» listeaza arma inscrisa devenita neeligibila si sportivii fara arma (ca avertismente).
7. Latime telefon: `EditareInscriereModal` si dialogul de exceptie sunt utilizabile.

## Self-Check: PASSED
Fisiere create/modificate prezente; commit-urile bbd413d5, 201b71a4, c01a99e9 exista.
