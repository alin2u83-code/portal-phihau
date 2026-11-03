---
status: complete
phase: 34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de
source: [34-01..34-13-SUMMARY.md]
started: 2026-11-03T12:00:00Z
updated: 2026-11-03T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sidebar + meniu 7/7/7/4
expected: Sidebar plat pe tokeni; 7/7/7/4 intrari pe rol; bottom nav pe mobil.
result: pass

### 2. Header + UserMenu
expected: Header fara umbre mari/blur; "Protectia datelor" si "Istoric Activitate" accesibile din UserMenu.
result: pass

### 3. Hub-uri cu tab-uri
expected: Sportivi, Examene, Competitii, Fisa mea au strip de tab-uri; Antrenamente are tabul "Generator Program".
result: issue
reported: "competitii contine activitati nationale, stagii sunt separate de competitii, vreau rearanjat aici"
severity: major

### 4. Dashboard staff (federatie/club/instructor)
expected: Salut cu data in romana, De rezolvat, 3 KPI, Actiuni rapide (un singur primary), Recente, Anunturi; fara acordeoane/card emerald.
result: issue
reported: "schimba denumirea 'De rezolvat', vreau alta formulare" (ales: "Necesita atentie")
severity: cosmetic

### 5. Dashboard sportiv
expected: Ordine Salut, Antrenament, Plati+Viza, Evenimente+Progres, Familie, acordeon "Detalii" inchis; "Particip" singurul primary.
result: pass

### 6. Pagini Sportivi, Plati-hub, Competitii
expected: Fara h1 duplicat, un singur buton primary; Plati-hub tab-uri 44px cu subliniere; competitii cu filtre inline functionale.
result: issue
reported: "plati sa fie la fel ca celelalte, fara sub meniu in sidebar"
severity: major

### 7. Grupe, Examene, Prezenta
expected: Fara h1 duplicat, un singur primary, filtre inline, fara culori slate/indigo/amber.
result: pass

### 8. Teme + mobil
expected: Pe cel putin 2 teme (inclusiv una deschisa) textul e lizibil; pe mobil nu apare scroll orizontal.
result: pass

## Summary

total: 8
passed: 5
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Hub-urile grupeaza logic: Stagii nu apartine hub-ului Competitii"
  status: failed
  reason: "User reported: Competitii contine activitati nationale, stagii sunt separate de competitii, vreau rearanjat. Decizie: Stagii = intrare separata in meniu; hub Competitii = Competitii | Activitati Nationale | Template Probe (meniu devine 8 intrari, de actualizat 7/7/7/4 + testul de paritate)"
  severity: major
  test: 3
  artifacts: [components/layout/HubTabs.tsx, components/menuConfig.ts]
  missing: [intrare meniu Stagii, scos 'stagii' din COMPETITII_HUB si ALIASES_COMPETITII]
- truth: "Titlul cardului din dashboard are formulare dorita"
  status: failed
  reason: "User reported: redenumeste 'De rezolvat' -> 'Necesita atentie' (components/DeRezolvatCard.tsx:123,125)"
  severity: cosmetic
  test: 4
  artifacts: [components/DeRezolvatCard.tsx]
  missing: [redenumire titlu + aria-label]
- truth: "Plati = intrare simpla in sidebar (fara submeniu), ca Sportivi/Examene/Competitii"
  status: failed
  reason: "User reported: Financiar are submeniu in sidebar; vrea intrare 'Plati' simpla. Decizie: Deconturi Federatie, Vacante Antrenamente, Echipamente, Vanzari devin tab-uri in plati-hub (cu minRole/permisiuni pastrate)"
  severity: major
  test: 6
  artifacts: [components/menuConfig.ts, components/Plati/hub/PlatiHub.tsx]
  missing: [Financiar->Plati fara submeniu in adminMenu si adminClubMenu, 4 tab-uri noi in PlatiHub, ALIASES_PLATI extins cu deconturi-federatie/perioade-vacanta/produse/vanzari-produse, update test paritate]
