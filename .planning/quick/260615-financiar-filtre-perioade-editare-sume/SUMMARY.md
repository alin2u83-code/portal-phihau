---
slug: financiar-filtre-perioade-editare-sume
status: complete
date: 2026-06-15
commit: f4dcc53
---

# Summary

## Ce s-a livrat

- **PeriodFilterBar.tsx** (NOU) — 7 butoane predefinite + date range flexibil
- **JurnalIncasari** — forma principală sus, AdaugaAvans colapsibil jos + filtru perioadă pe jurnal
- **GestiuneFacturi** — filtru perioadă + modal edit cu suma_initiala + suma_ramasa + buton vizualizare factură completă
- **RaportFinanciar** — PeriodFilterBar înlocuiește inputs manuale dată
- **icons.tsx** — EyeIcon adăugat

## Note
- TS: zero erori
- Build: OK (port 5174)
- Editare sume: suma_initiala + suma ambele editable independent în modal
- Vizualizare factură: construiește IstoricPlataDetaliat din Plata inline
