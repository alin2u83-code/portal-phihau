---
status: complete_with_deferred
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
source: [42-01..09-SUMMARY.md, 42-VERIFICATION.md]
started: 2026-11-16T00:00:00Z
updated: 2026-11-16T00:00:00Z
---

## Current Test

number: 1
name: Super admin - setare FRAM la competitie (D-01/D-02)
expected: |
  Super admin, competitie noua: optiunea "FRAM obligatoriu" e debifata implicit.
  O poti activa cat timp competitia e in draft. Dupa "Deschide Inscrierile" optiunea e read-only, cu motiv afisat.
  Antetul competitiei arata "Doar cu FRAM {an}".
awaiting: user response

## Tests

### 1. Super admin - setare FRAM la competitie (D-01/D-02)
expected: FRAM debifat implicit; editabil doar in draft; dupa deschiderea inscrierilor read-only cu motiv; antet "Doar cu FRAM {an}".
result: pass (18.11, super admin, prod DB): formular nou FRAM debifat implicit/editabil in draft; competitie noua cu FRAM -> antet 'Doar cu FRAM 2026'; dupa deschiderea inscrierilor camp disabled cu motiv 'Regula FRAM nu se mai modifica dupa deschiderea inscrierilor'.

### 2. Reprezentant club, intrat PRIN LISTA - blocare FRAM (D-04, gap inchis 0aa0aa1d)
expected: Cont REPREZENTANT_COMPETITIE, competitie cu FRAM obligatoriu, intrare din lista (nu link direct). Pas 1 dezactiveaza sportivii fara FRAM cu badge rosu "Doar cu FRAM"; in Detalii apare linia FRAM.
result: AMANAT (nu exista cont REPREZENTANT_COMPETITIE, decizie user 18.11):  cere cont REPREZENTANT_COMPETITIE (login manual). Partial vazut ca super admin: Pas 1 arata sportivii fara FRAM cu eticheta 'Fara FRAM 2026 - exceptie super admin' (nu blocati). Blocarea pentru reprezentant ramane de testat.

### 3. Super admin - exceptie FRAM (D-05)
expected: Pentru un club, sportiv fara FRAM -> "Exceptie FRAM" cu confirmare; apoi apare rand in Jurnal Audit.
result: pass (18.11): super admin, competitie test cu FRAM, sportiv fara FRAM (ANDRICIUC NADIA) -> dialog 'Exceptie FRAM' cu confirmare; dupa finalizare, audit_log are INSERT inscrieri_competitie cu motiv 'Super admin: inscriere fara FRAM confirmata (D-05)', an_fram 2026, exceptie_fram true. NOTA: actor_nume=null pe randul de audit (de verificat daca Jurnal Audit afiseaza actorul).

### 4. Editare inscriere/echipa cu inscrieri deschise (D-07/D-08)
expected: "Editeaza" schimba Q1/Q2 si muta in categorie compatibila; "Muta categoria" la echipa; "Editeaza componenta" pastreaza membrii daca salvarea esueaza.
result: pass partial (18.11, super admin, mobil ~920px): modal 'Editeaza inscrierea' Quyen+Categorie; mutare intr-o categorie nepotrivita arata avertisment 'Gen incompatibil; Grad prea mare' (avertisment, nu blocare - dupa design); salvare Quyen -> toast 'Quyen actualizat.', revenit la valoarea originala (GRIGORUTA ALEXANDRU). NEVERIFICAT: mutare reala de categorie, Muta categoria echipa, Editeaza componenta cu esec la salvare.

### 5. Vizibilitate butoane dupa stare (D-07)
expected: Dupa inchiderea inscrierilor reprezentantul nu vede butoane de editare, super adminul da; pe competitie finalizata nimeni; marcarea taxei achitate merge.
result: pass partial (18.11, super admin): inscrieri deschise -> Editeaza vizibil; inchise -> Editeaza vizibil (super admin); finalizata -> 0 butoane Editeaza. Cod (index.tsx canEditEchipe) corespunde D-07: reprezentant/admin club doar cu inscrieri deschise si deadline nedepasit. NEVERIFICAT in browser: reprezentant dupa inchidere; marcarea taxei achitate.

### 6. Mutare categorie cu alta taxa -> "De rezolvat" (D-09)
expected: Muta o echipa/individ intr-o categorie cu alta taxa; Financiar > "De rezolvat" arata taxa veche -> noua; "Vezi clubul" deschide clubul.
result: SARIT (decizie user 18.11: nu se schimba pretul la mutarea unei echipe, test nefolositor).

### 7. Arme CVD dupa grad (D-11..D-15)
expected: Pas Arme explica "Nicio arma" cand nu e eligibil; arma implicita fara drept nu blocheaza Finalizeaza; Giao Dau doar arme de lupta eligibile; De rezolvat listeaza arma neeligibila si sportivii fara arma.
result: pass (18.11, CVD Roman 2026, club C.S. Phi Hau, fara scriere): Pas Arme explica 'Gradul X nu are nicio arma in programa tehnica (drepturi pe grad)', listeaza doar armele eligibile pe grad, avertismente stagii 'nu blocheaza salvarea'; 'De rezolvat (3)' listeaza sportivii fara arma cu 'Mergi la Arme' ('avertisment, nu blocheaza inscrierea'); Giao Dau: avertisment 'Nicio arma de lupta aleasa care sa fie permisa si eligibila pentru grad. Inscrierea ramane permisa.' NEVERIFICAT: item 'arma-neeligibila' in De rezolvat (cere inscriere veche cu arma + grad schimbat; nu exista in date) si arma implicita fara drept la Finalizeaza (acoperit doar de cod, index.tsx:228).

### 8. Mobil - EditareInscriereModal si dialog exceptie
expected: Pe latime telefon modalele sunt utilizabile; option disabled in select functioneaza pe mobil.
result: pass partial (18.11): EditareInscriereModal utilizabil la latime telefon. NEVERIFICAT: dialog exceptie FRAM, option disabled in select pe telefon real.

## Summary

total: 8
passed: 3
issues: 0
pending: 0
deferred: 1
partial: 3
skipped: 1

## Gaps

Amanat: test 2 + partea reprezentant din test 5 (cer cont REPREZENTANT_COMPETITIE, inexistent). Neclar: audit_log.actor_nume null pe randul exceptiei FRAM (D-05).
