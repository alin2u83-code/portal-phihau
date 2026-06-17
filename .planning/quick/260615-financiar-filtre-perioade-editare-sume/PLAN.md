---
slug: financiar-filtre-perioade-editare-sume
date: 2026-06-15
status: in-progress
---

# Financiar: Filtre Perioade + Editare Sume + Vizualizare Factură + UX Încasare

## Obiectiv
4 îmbunătățiri modul Financiar solicitate de user.

## Sarcini

### T1: PeriodFilterBar component (NOU)
- Fișier: `components/Plati/PeriodFilterBar.tsx`
- Butoane predefinite: Săptămâna, Luna curentă, Luna trecută, 3 luni, 6 luni, Anul curent, Personalizat
- Când Personalizat sau niciun preset: date inputs vizibile
- Props: `{ startDate, endDate, onChange }`

### T2: JurnalIncasari UX reorder
- Fișier: `components/Plati/JurnalIncasari.tsx`
- Muta forma principala de incasare DEASUPRA AdaugaAvans
- AdaugaAvans → colapsibil (chevron, collapsed by default)
- Adauga PeriodFilterBar + filtreaza sortedTranzactii

### T3: GestiuneFacturi improvements
- Fișier: `components/Plati/GestiuneFacturi.tsx`
- PeriodFilterBar pentru lista facturi
- Modal edit extins: suma_initiala + suma editable (+ status)
- Buton "Vizualizare" → FacturaChitantaModal mode="factura"

### T4: RaportFinanciar PeriodFilterBar
- Fișier: `components/Plati/RaportFinanciar.tsx`
- Înlocuiește Input "De la" + "Până la" cu PeriodFilterBar
- Muta filtrul de perioadă deasupra, vizibil mereu (nu în drawer colapsibil)

## Fișiere modificate
- `components/Plati/PeriodFilterBar.tsx` (NOU)
- `components/Plati/JurnalIncasari.tsx`
- `components/Plati/GestiuneFacturi.tsx`
- `components/Plati/RaportFinanciar.tsx`
