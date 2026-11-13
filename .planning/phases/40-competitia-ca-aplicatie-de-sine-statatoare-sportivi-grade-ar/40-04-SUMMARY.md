# 40-04 SUMMARY — tab Schimbări grad + verificare browser

Cod+docs: c500ec42. Verificare umană rulată de Claude în browser (Playwright, `vite build` + `preview`, desktop 1280 + mobil 375).

## Verificat în browser
- Reprezentant: modal echivalare (13 ani, fără cost), blocat timp (S3), anulare cu update imediat în rând, 375px.
- Federație: tab Schimbări grad, contor „De achitat", „Marchează achitat", carduri mobil.
- Regresie Management (super admin, club selectat): Pas1 „Schimbă grad" deschide vechiul `SchimbaGradModal` cu `<select>`.

## Buguri găsite în test, reparate
1. `ExternDataProvider` fără `setSportivi` → rândul din wizard nu se actualiza după schimbare/anulare. Adăugat callback pe cache React Query.
2. `SchimbariGrad` listă veche din cache → `staleTime: 0`, `refetchOnMount: 'always'`.

## Neverificat
Telefon real, rol INSTRUCTOR, anulare după deadline cu motiv în UI (acoperit doar de bateria live 27/27).
Date test șterse (sportivi=0, competitii=0, conturi=0); rămân rânduri audit_log cu autor „ZZ Test Faza 40".
