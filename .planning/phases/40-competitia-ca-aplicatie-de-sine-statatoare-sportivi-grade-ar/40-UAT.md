---
status: testing
phase: 40-competitia-ca-aplicatie-de-sine-statatoare-sportivi-grade-ar
source: [40-01-SUMMARY.md, 40-02-SUMMARY.md, 40-03-SUMMARY.md, 40-04-SUMMARY.md]
started: 2026-11-13T20:14:27Z
updated: 2026-11-13T20:14:27Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Echivalare la 13 ani (cont club competitie)
expected: |
  Cont club /competitie, competitie cu inscrieri deschise, Pas 1. La un sportiv de 13+ ani cu grad intre 1 Cap Rosu si C.V. 4 Cap Alb, "Schimbă grad" arata "Echivalare la 13 ani ... fara cost". Dupa confirmare, randul arata 1 Câp Albastru imediat, fara reincarcare.
awaiting: user response

## Tests

### 1. Echivalare la 13 ani (cont club competitie)
expected: Modalul arata Echivalare la 13 ani, fara cost; dupa confirmare randul arata 1 Câp Albastru imediat.
result: [pending]

### 2. Anulare in fereastra de inscriere
expected: Redeschizi modalul pe acelasi sportiv: "Anulează schimbarea" merge fara motiv; gradul revine la cel anterior, randul se actualizeaza imediat.
result: [pending]

### 3. Promovare blocata de timpul de asteptare
expected: La un sportiv promovat recent: mesaj "Ultimul grad: ..., mai trebuie X luni", fara buton de confirmare.
result: [pending]

### 4. Tab federatie "Schimbări grad"
expected: Super admin, competitia -> tab "Schimbări grad": rand cu autor, badge-uri, contor "De achitat"; "Marchează achitat" scade contorul; filtrele "Toate competițiile" si club merg.
result: [pending]

### 5. Tab federatie pe mobil 375px
expected: Carduri, fara scroll orizontal; de la md in sus tabel.
result: [pending]

### 6. Regresie Management
expected: In Management (nu zona externa), wizard Pas 1 "Schimbă grad" deschide vechiul modal cu dropdown de grad.
result: [pending]

### 7. Termen inscriere obligatoriu la competitie
expected: Formularul de competitie nu se salveaza fara termen limita de inscriere sau cu termen dupa ziua competitiei; mesaj clar.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
