---
phase: 09-raport-financiar
plan: 01
subsystem: Plati/RaportFinanciar
tags: [financiar, restante, export-csv, export-pdf, tab-render, useMemo]
dependency_graph:
  requires: []
  provides: [tab-restante, export-restante-csv, export-restante-pdf]
  affects: [components/Plati/RaportFinanciar.tsx, utils/exportFinanciar.ts]
tech_stack:
  added: []
  patterns: [useMemo-aggregation, dynamic-import-jspdf, client-side-filter]
key_files:
  created: []
  modified:
    - utils/exportFinanciar.ts
    - components/Plati/RaportFinanciar.tsx
decisions:
  - "RestantaRow definit în exportFinanciar.ts (nu în types.ts sau RaportFinanciar.tsx) pentru a evita import circular (D-08, Pitfall 5)"
  - "restanteStart/restanteEnd ca useState('') separat, nu în useLocalStorage filters (D-06, Pitfall 2)"
  - "Grupare per p.sportiv_id ?? p.familie_id ?? '__necunoscut__' pentru a include facturi de familie (Pitfall 4)"
  - "Câmpul de scadență este p.data (NU p.data_scadenta care nu există pe interfața Plata) (Pitfall 1)"
  - "headStyles.fillColor amber [245,158,11] în exportRestantePDF pentru identitate vizuală restanțe (D-10)"
metrics:
  duration: "~9 min"
  completed: "2026-06-16"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
  files_created: 0
---

# Phase 09 Plan 01: Tab Restanțe cu Export CSV/PDF Summary

**One-liner:** Tab "Restanțe" cu agregare per sportiv din plăți outstanding, filtrare PeriodFilterBar și export CSV (BOM UTF-8, separator `;`) + PDF (jsPDF landscape, antet amber).

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RestantaRow + exportRestanteCSV + exportRestantePDF | `6194f35` | `utils/exportFinanciar.ts` |
| 2 | State wiring + useMemo + tab entry | `875a38c` | `components/Plati/RaportFinanciar.tsx` |
| 3 | JSX render bloc: PeriodFilterBar + tabel + carduri mobile + empty state | `132c09c` | `components/Plati/RaportFinanciar.tsx` |

## What Was Built

### utils/exportFinanciar.ts (+110 linii)

- `export interface RestantaRow` cu 5 câmpuri: `sportiv_id`, `numeSportiv`, `sumaTotala`, `nrFacturi`, `ceaMaiVecheScadenta`
- `export function exportRestanteCSV(rows, clubNume, filename)`: BOM UTF-8 (`﻿`), separator `;`, toate celulele în ghilimele cu escape, download via `URL.createObjectURL`
- `export async function exportRestantePDF(rows, clubNume, filename)`: dynamic import jsPDF + autoTable, antet cu `clubNume` bold 16pt + "Raport Restanțe" + dată generare, tabel cu `headStyles.fillColor: [245, 158, 11]` (amber — nu indigo), foot cu TOTAL

Funcțiile existente `exportIncasariCSV` și `exportIncasariPDF` neatinse.

### components/Plati/RaportFinanciar.tsx (+169 linii, -3 linii modificate)

**Task 2 — state wiring:**
- Import extins cu `exportRestanteCSV, exportRestantePDF, RestantaRow`
- `useData()` extins cu `activeRoleContext, clubs`
- `activeTab` union extins cu `| 'restante'`
- `const [restanteStart, setRestanteStart] = useState('')` și `restanteEnd`
- `const clubNume = clubs?.find(c => c.id === activeRoleContext?.club_id)?.nume ?? 'Club QwanKiDo'`
- `const restanteRows = useMemo()`: filtrare `status !== 'Achitat'` + interval dată pe `p.data`, grupare `sportiv_id ?? familie_id ?? '__necunoscut__'`, mapare `formatNume(sp)` sau `${fam.nume} [Familie]` sau `'—'`, sortare desc sumaTotala + asc scadenta
- Tab entry: `{ id: 'restante', label: 'Restanțe', icon: <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" /> }`

**Task 3 — render JSX:**
- `{activeTab === 'restante' && (...)}` plasat după block-ul 'grafice'
- PeriodFilterBar cu `restanteStart/restanteEnd` onChange
- Bar total/export: label "Total Restanțe", count sportivi, sumă totală `text-amber-400`, butoane CSV (slate) și PDF (indigo), disabled când 0 rânduri
- Empty state cu `CheckCircleIcon text-emerald-400` + "Nicio restanță în intervalul selectat" + "Toți sportivii sunt la zi cu plățile."
- Tabel desktop `hidden md:block`: 4 coloane, sumă `text-amber-400 font-bold text-right`
- Carduri mobile `md:hidden`: nume bold, facturi count, sumă amber, "Scadent din {data}"

## Deviations from Plan

Niciuna — planul executat exact ca scris.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` — erori în exportFinanciar.ts | 0 erori noi |
| `npx tsc --noEmit` — erori în RaportFinanciar.tsx | 0 erori noi |
| `npx vite build` | build complet în 13.29s |
| export interface RestantaRow prezent | DA |
| exportRestanteCSV cu separator `;` și BOM | DA |
| exportRestantePDF cu `fillColor: [245, 158, 11]` (amber) | DA |
| activeTab acceptă `'restante'` | DA |
| restanteRows agregare per sportiv_id | DA |
| PeriodFilterBar conectat la restanteStart/restanteEnd | DA |
| Empty state cu CheckCircleIcon emerald | DA |
| Tabel desktop 4 coloane + carduri mobile | DA |
| Butoane export disabled când 0 rânduri | DA |

## Requirements Coverage

| Req | Description | Status |
|-----|-------------|--------|
| FIN-01 | Tab Restanțe cu tabel 1 rând/sportiv sortat desc după sumă | DONE |
| FIN-02 | PeriodFilterBar filtrare live pe plata.data | DONE |
| FIN-03 | Export CSV compatibil Excel (BOM, separator `;`) | DONE |
| FIN-04 | Export PDF cu antet club + dată + tabel formatat amber | DONE |

## Known Stubs

Niciun stub. Toate datele vin din prop-ul `plati` existent (RLS-protected, filtrat pe club).

## Threat Flags

Niciuna. Suprafața de securitate nu s-a extins față de planul documentat în `<threat_model>`. Exporturile CSV/PDF se generează local în browser din date deja afișate în UI (nicio transmisie nouă server-side).

## Self-Check: PASSED

- [x] `utils/exportFinanciar.ts` modificat și corectat — commit `6194f35`
- [x] `components/Plati/RaportFinanciar.tsx` modificat (Task 2) — commit `875a38c`
- [x] `components/Plati/RaportFinanciar.tsx` modificat (Task 3) — commit `132c09c`
- [x] TSC trece fără erori noi
- [x] Vite build trece (build în 13.29s)
