---
status: incomplete
---
# Quick 261102-cv1 — CN Co Vo Dao Roman 2026 (5-6.12.2026)

Executat inline (fara subagenti). Commit af2dfbb pe main. Inainte: a9a408e + 84fdb66 (schimbare abonament in FinanciarTab, flag sportivi.scutit_abonament, migrare 20261102a).

## Facut
1. utils/competitiiTemplates.ts generateTemplateCVD(): arme Song Luyen (grade + CN) dupa circulara, Moc Can la Thao Lo peste 50, Giao Dau 13 si 14 ani separate 1-4 CAP, scos Giao Dau CN 50-59. 88 categorii (44 Thao Lo / 24 Song Luyen / 20 Giao Dau).
2. Competitie creata live (draft, tip cvd, club_id null, deadline 22.11.2026, taxe 100/100/150, observatii cu conditii+echipament+arme+stagii). id 80363db1-63a4-47bf-9adc-6337d571f331. Denumiri categorii cu scara CVD (1 CAP..C.N. 5 Dang), nu buildCategorieDenumire (scara gresita pt CVD). max_membri_echipa=2 la Song Luyen.
3. Migrare 20261102b: sterse 15 placeholdere "Forma Bong/Dao/Guom N"; 50 forme reale Anexa 1 in inlantuiri (+ inlantuiri_grade, grade.ordine 15=1CAP..24=5Dang). Categorie noua thao_lo_alte (+ MatriceGradePanel).
4. Migrare 20261102c: tabel cerinte_stagii_cvd (4 intervale grad), informativ, fara validare.

## Verificat
tsc OK; counts DB; competitia apare in Competitii ca Schita (UI). Categoriile din UI si wizard-ul de inscriere NETESTATE.

## Test local (2.11.2026) + fix scara grade
- Wizard arata 0 sportivi: categoriile foloseau scara 1..10, iar verificaEligibilitate compara cu grade.ordine DB (15..24). Fix: sablon +14 (generateTemplateCVD) + UPDATE live pe cele 88 categorii. Dupa fix: 4 eligibili in Phi Hau, auto-categorie corecta (BORS -> 18-39 F 1-4 CAP Bong; LUNGU -> 40-49 M CN2-5 Dang Bong). Categorii (88) OK in UI.
- Pas2Quyen: optiunile Q1.. vin din thao_quyen_individual (cat.proba nu e join-at in Competitii/index.tsx) => formele CVD noi (thao_lo_individual / song_luyen) NU apar in wizard. Preexistent, wizard neatins.
- Competitia 2025 CVD (finalizata) ramane pe scara 1..10.

## Ramas / de stiut
- Cele 12 arme (categorie arma_cvd) nelegate de grade: Pas2Quyen nu filtreaza dupa categorie, ar apare ca forme in dropdown.
- Tam Thiet Gian/Nhuyen Tien legate de la 1 Dang (tabel arme permise); programa zice CN-5 Dang.
- "Long Gian Doc Luyen" (3-4 CAP) pastrat ca in PDF, posibil typo.
- max_membri_echipa default DB 3, sabloanele nu il seteaza (afecteaza alte tipuri).
- Competitia e Draft: userul o deschide la inscrieri. Sabin (Phi Hau) inca are abonament vechi: de setat din Istoric Financiar.
