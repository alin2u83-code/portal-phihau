---
status: complete
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
source: [41-01-SUMMARY.md, 41-02-SUMMARY.md, 41-03-SUMMARY.md, 41-04-SUMMARY.md, 41-05-SUMMARY.md, 41-06-SUMMARY.md, 41-07-SUMMARY.md]
started: 2026-11-14T22:30:00Z
updated: 2026-11-14T22:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Actiuni categorii vizibile doar super admin
expected: Super admin vede Editeaza/Cloneaza/Imparte/Anuleaza/Fuzioneaza pe tab Categorii (competitie nefinalizata); alte roluri nu le vad. Pe competitie finalizata nu apar.
result: pass
note: pozitiv verificat in Chrome pe prod (super admin, CN Roman 2026); negativ (alte roluri) si finalizata NETESTATE

### 2. Lista categorii expandata cu grad si quyen
expected: Lista categoriilor expandate arata gradul sportivului (la data competitiei) si quyen-ul.
result: pass
note: lista expandata arata Grad + Quyen

### 3. Clonare categorie
expected: Cloneaza deschide formularul "Cloneaza Categorie" prefilat complet (inclusiv "Doua quyenuri"); salvarea creeaza o categorie noua.
result: pass
note: prefill + SALVARE OK pe competitia test (#152 creata)

### 4. Editare sigura cu inscrieri
expected: La editarea unei categorii cu inscrieri, Proba si Tip participare sunt blocate; schimband criteriile apare avertisment galben cu sportivii care nu mai respecta criteriile (nu blocheaza salvarea).
result: pass
note: Proba/Tip blocate; schimbare Gen local da avertisment cu 2 sportivi; fara salvare

### 5. Anulare categorie cu preview
expected: Anuleaza deschide modalul cu preview (cine se muta unde, rezumat taxe anulate/achitate); Confirm dezactivat daca exista blocaje. Dupa confirmare categoria devine anulata, inscrierile apar in "Fara categorie".
result: pass
note: preview corect + Confirm OK pe test (#149 Anulata, ramane doar Cloneaza)

### 6. Fuziune categorii
expected: Fuzioneaza 2+ categorii prin modal: preview cu participantii in categoria noua, confirmare, sursele devin fuzionate; nu exista alta cale de fuziune (FuzionariPanel doar sugestii).
result: pass
note: fuziune #1+#2 -> #149 Mixt, avertismente corecte, sursele Fuzionata in 149

### 7. Impartire categorie
expected: Imparte dupa Varsta/Grad/Gen: alegi praguri ("Adauga prag", chip-uri cu X), apar categoriile rezultate cu nr. participanti, confirmare le creeaza si muta sportivii.
result: pass
note: impartire #113 dupa varsta prag 9 -> #150 (7-8) + #151 (9-10), sursa Impartita in 150,151

### 8. Mutare participant
expected: Mutare: Select cu categorii active compatibile; sugestie doar daca exista o singura tinta valida; Confirm muta inscrierea.
result: pass
note: dupa fix a8992e0f (modal trimite surse [] la mutare), Realoca Nadia #51->#53: toast 1 inscrieri mutate, DB confirmat; avertisment Grad insuficient neblocant

### 9. Panou "Fara categorie (de realocat)"
expected: Panoul apare cand exista inscrieri pe categorii ne-active, vizibil tuturor rolurilor; checkbox + "Realoca selectate" doar pentru super admin; badge "Anulata" / "Achitata — de realocat" la taxa.
result: pass
note: dupa anulare #51 panoul arata Fara categorie (de realocat) - 1, badge Anulata; checkbox + Realoca selectate la super admin; avertisment Grad insuficient neblocant la tinta neeligibila. Realocarea efectiva = vezi test 8.

### 10. Taxe pe categorii anulate in view-urile financiare
expected: In Financiar, Plati club extern, Raport inscrieri, Inscrieri: linia anulata e taiata cu badge "Taxa anulata", nu intra in totaluri; header arata "Achitat pe categorii anulate: X lei".
result: pass
note: Financiar: 5 inscrisi dar 4 sportivi / 320 lei, taxa anulata (80 lei) exclusa din total

### 11. Stergere categorie doar fara randuri
expected: Stergerea unei categorii e permisa doar daca nu are niciun rand de inscriere/echipa; altfel e refuzata.
result: pass

## Teste la volum pe clona (182 inscrieri copiate din 1551ef52, prod, 14.11.2026)

- A. Fuziune 2 categorii (20 participanti) -> pass, total ramane 182
- B. Impartire dupa grad (13 participanti) -> pass
- C. Anulare #18 (11 inscrisi, 1100 lei taxe anulate) -> status anulata, 11 randuri pastrate; Realoca toti 11 -> #75 (toast "11 inscrieri si 0 echipe mutate"), #18 = 0, #75 = 31, total 182, 0 plati noi -> pass
- D. Echipe: anulare #29 (3 echipe, 450 lei) -> Realoca la #28 (toast "0 inscrieri si 3 echipe mutate"), #28 = 7, total 145 echipe / 321 membri neschimbat -> pass. Lista tinta exclude categorii cu alta proba (ex. #34), corect.
- E. Financiar pe clona: total 39950 lei, fara crash, 0 randuri pe categorii neactive dupa realocare (taxele anulate nu se mai pot vedea la volum dupa realocare; vazute la test 10) -> pass
- Test 11 (stergere): in Admin > Categorii butonul Sterge apare doar la categorii active fara randuri; #2 (0 randuri) sters cu confirmare, 77->76, inscrieri neatinse; la categorii cu randuri butonul nu exista -> pass
- Clona stearsa la final (competitie + categorii + inscrieri + echipe + membri), original 1551ef52 intact (182 inscrieri)

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

[none - gap test 8 inchis: fix a8992e0f (surse [] la mutare), retestat pe prod 14.11.2026]
