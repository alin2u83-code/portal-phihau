---
status: testing
phase: 07-aplicare-filtre-pe-tab-uri
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md]
started: 2026-06-09T00:00:00Z
updated: 2026-06-09T00:00:00Z
---

## Current Test

number: 1
name: Filtre pe tab Categorii
expected: |
  Deschizi o competiție și mergi pe tab-ul Categorii.
  Deasupra listei de categorii apare CompetitieFilterBar (butoane gen M/F, selector probă, grad min/max).
  Selectezi gen "M" — lista se restrânge la categorii masculine.
  Counter-ul din butonul tab Categorii (ex: "Categorii 12") scade și reflectă numărul de categorii filtrate.
awaiting: user response

## Tests

### 1. Filtre pe tab Categorii
expected: Deschizi o competiție și mergi pe tab-ul Categorii. Deasupra listei de categorii apare CompetitieFilterBar (butoane gen M/F, selector probă, grad min/max). Selectezi gen "M" — lista se restrânge la categorii masculine. Counter-ul din butonul tab Categorii (ex: "Categorii 12") scade și reflectă numărul de categorii filtrate.
result: [pending]

### 2. Reset filtre la schimbare tab
expected: Activezi un filtru pe orice tab (ex: selectezi gen "M" pe tab Categorii). Apeși pe alt tab (ex: Înscrieri). Filtrul activ anterior dispare automat — filter bar-ul apare curat, fără filtre active.
result: [pending]

### 3. Filtre pe tab Înscrieri
expected: Pe tab-ul Înscrieri apare CompetitieFilterBar. Filtrând după gen sau grad, lista de sportivi înscriși se restrânge corespunzător. Înscrierii care nu corespund filtrului nu mai apar.
result: [pending]

### 4. Confirmare retragere sportiv
expected: Pe tab Înscrieri, apeși butonul "Retrage" la un sportiv înscris individual. Apare un dialog de confirmare în browser (confirm dialog) înainte să se execute ștergerea. Dacă apeși Cancel, sportivul rămâne înscris.
result: [pending]

### 5. Filtre pe tab Raport
expected: Pe tab-ul Raport apare CompetitieFilterBar. Filtrând, raportul se restrânge. Dacă filtrele elimină toți sportivii, filter bar-ul rămâne vizibil deasupra mesajului "Niciun sportiv corespunde filtrelor aplicate." (nu dispare).
result: [pending]

### 6. Filtrare gen în tab Template
expected: Pe tab-ul Template (vizibil pentru admini), butoanele de gen (M/F) sunt funcționale. Selectând "M" sau "F", lista de template-uri de categorii se filtrează pe gen.
result: [pending]

### 7. Restaurare tab Template din sessionStorage
expected: Ești pe tab-ul Template al unei competiții. Dai refresh la pagină (F5). Competiția se redeschide direct pe tab-ul Template — nu revine la tab-ul Înscrieri.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
