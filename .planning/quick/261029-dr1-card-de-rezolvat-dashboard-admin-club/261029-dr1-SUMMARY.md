---
status: complete
---
# Quick 261029-dr1 — Card "De rezolvat" + banner cu actiune (feedback Max Falticeni)

Executat inline. Context: Falticeni 0 tipuri_abonament -> banner doar lista, fara actiune.

## Facut
- components/DeRezolvatCard.tsx: card pe Dashboard ADMIN_CLUB (nu federatie). Verifica: tip Individual sezon activ, grupe active, sportivi activi fara grupa, fara factura Abonament luna curenta. Fiecare problema are buton catre view-ul de rezolvare. Calcul client-side, fara query noi, fara cron.
- AppRouter: randare card deasupra AdminMasterMap.
- PlatiScadente: banner "fara tip abonament" are buton "Configurare abonament" + lista scrollabila.

## Verificat
- tsc OK. UI netestat (MFA pe emailul userului).

## Ramas
- Test manual Max/Falticeni; Falticeni trebuie sa defineasca tip Individual 2026-2027.
- Plati incarcate pot fi partiale -> "fara factura" e aproximativ; confirma pe date reale.
