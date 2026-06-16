# Phase 9: Raport Financiar — Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 2 (modified)
**Analogs found:** 2 / 2

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `components/Plati/RaportFinanciar.tsx` | component (tab extension) | transform / client-side filter | Self (existing tabs: `incasari`, `abonamente`) | exact — same file, copy intra-file patterns |
| `utils/exportFinanciar.ts` | utility | batch / file-I/O | Self (existing `exportIncasariCSV`, `exportIncasariPDF`) | exact — same file, append two functions |

---

## Pattern Assignments

### `components/Plati/RaportFinanciar.tsx` — tab `'restante'`

**Analog:** Same file. Copy patterns from the `incasari` and `abonamente` tabs.

---

#### Imports already present (lines 1–17) — no new imports needed

```typescript
// components/Plati/RaportFinanciar.tsx:1-17
import React, { useMemo, useState } from 'react';
import { IstoricPlataDetaliat, Sportiv, Familie, Plata, Tranzactie } from '../../types';
import { Card, Input, Select, Button } from '../ui';
import { PeriodFilterBar } from './PeriodFilterBar';
import {
    ChartBarIcon, BanknotesIcon, FileTextIcon, ChevronDownIcon,
    ExclamationTriangleIcon, CheckCircleIcon, WalletIcon, XIcon,
    TrendingUpIcon, UsersIcon, DownloadIcon, DocumentArrowDownIcon,
} from '../icons';
import { exportIncasariCSV, exportIncasariPDF } from '../../utils/exportFinanciar';
// ADD: import exportRestanteCSV, exportRestantePDF alongside the above line
import { useData } from '../../contexts/DataContext';
import { formatNume } from '../../utils/formatareSportiv';
```

**Action:** Add `exportRestanteCSV, exportRestantePDF` to the existing import on line 10. Add `RestantaRow` type import from `../../utils/exportFinanciar` (if type is defined there per Pitfall 5 guidance in RESEARCH.md).

---

#### Pattern 1: Extend `activeTab` union (line 54)

```typescript
// components/Plati/RaportFinanciar.tsx:54  — CURRENT
const [activeTab, setActiveTab] = useState<
    'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice' | 'familii'
>('incasari');

// AFTER — append | 'restante'
const [activeTab, setActiveTab] = useState<
    'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice' | 'familii' | 'restante'
>('incasari');
```

---

#### Pattern 2: New local state for period filter (after line 56)

```typescript
// Analog: lunaAbonamente / setLunaAbonamente pattern (line 247) — but use useState('') not useLocalStorage
// REASON: filters must not persist across sessions (Pitfall 2 in RESEARCH.md)
const [restanteStart, setRestanteStart] = useState('');
const [restanteEnd, setRestanteEnd]   = useState('');
```

---

#### Pattern 3: `useMemo` aggregation per sportiv (after existing useMemo blocks, ~line 260)

```typescript
// Analog: abonamenteData useMemo (lines 255–268) — group-by + filter pattern
// Analog: filteredIstoric useMemo (lines 116–147) — date range filter on p.data
// Analog: AgingReport.tsx:69-75 — plata.data.toString().slice(0, 10) for date comparison
// CRITICAL: Plata.data is the due-date field — there is no separate data_scadenta

interface RestantaRow {           // define locally or import from exportFinanciar.ts
    sportiv_id: string;
    numeSportiv: string;
    sumaTotala: number;
    nrFacturi: number;
    ceaMaiVecheScadenta: string;  // ISO date YYYY-MM-DD
}

const restanteRows = useMemo((): RestantaRow[] => {
    const neachitate = (plati || []).filter(p => {
        if (p.status === 'Achitat') return false;
        if (!restanteStart && !restanteEnd) return true;
        const d = new Date(p.data.toString().slice(0, 10));
        if (isNaN(d.getTime())) return true;
        if (restanteStart && d < new Date(restanteStart)) return false;
        if (restanteEnd) {
            const eEnd = new Date(restanteEnd);
            eEnd.setHours(23, 59, 59, 999);
            if (d > eEnd) return false;
        }
        return true;
    });

    const byId: Record<string, { sume: number[]; date: string[] }> = {};
    for (const p of neachitate) {
        // Pitfall 4: some invoices have sportiv_id=null (family payments) — group separately
        const sid = p.sportiv_id ?? p.familie_id ?? '__necunoscut__';
        if (!byId[sid]) byId[sid] = { sume: [], date: [] };
        byId[sid].sume.push(p.suma);
        if (p.data) byId[sid].date.push(p.data.toString().slice(0, 10));
    }

    return Object.entries(byId)
        .map(([sid, { sume, date }]) => {
            const sp = sportivi.find(s => s.id === sid);
            const fam = familii.find(f => f.id === sid);
            const numeSportiv = sp
                ? formatNume(sp)
                : fam
                    ? `${fam.nume} [Familie]`
                    : '—';
            return {
                sportiv_id: sid,
                numeSportiv,
                sumaTotala: sume.reduce((a, b) => a + b, 0),
                nrFacturi: sume.length,
                ceaMaiVecheScadenta: date.sort()[0] ?? '',
            };
        })
        // D-04: sort descending by total; secondary: oldest due date first
        .sort((a, b) => {
            if (b.sumaTotala !== a.sumaTotala) return b.sumaTotala - a.sumaTotala;
            return (a.ceaMaiVecheScadenta || '').localeCompare(b.ceaMaiVecheScadenta || '');
        });
}, [plati, sportivi, familii, restanteStart, restanteEnd]);
```

---

#### Pattern 4: Club name for PDF (use `useData()` already destructured at line 51)

```typescript
// components/Plati/RaportFinanciar.tsx:51 — currentUser already destructured
// RESEARCH.md Pattern 4: clubs comes from useData()
// Extend destructure:
const { currentUser, activeRoleContext, clubs } = useData();
// Then derive clubNume where export buttons are rendered:
const clubNume = clubs?.find(c => c.id === activeRoleContext?.club_id)?.nume ?? 'Club QwanKiDo';
```

---

#### Pattern 5: Tab entry in `tabs` array (lines 283–290)

```typescript
// components/Plati/RaportFinanciar.tsx:283-290 — existing tabs array
// ExclamationTriangleIcon already imported (line 5)
// APPEND at end of array:
{ id: 'restante' as const, label: 'Restanțe', icon: <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" /> },
```

---

#### Pattern 6: Export buttons JSX (analog: lines 452–474 tab `incasari`)

```typescript
// components/Plati/RaportFinanciar.tsx:451-474 — copy for 'restante' tab header
// CSV button (slate style):
<button
    onClick={() => exportRestanteCSV(restanteRows, clubNume)}
    disabled={restanteRows.length === 0}
    title="Export CSV"
    className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-300
               bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50
               rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
>
    <DownloadIcon className="w-3.5 h-3.5" />
    CSV
</button>
// PDF button (amber style — consistent with AgingReport warning palette):
<button
    onClick={() => exportRestantePDF(restanteRows, clubNume)}
    disabled={restanteRows.length === 0}
    title="Export PDF"
    className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-white
               bg-amber-600/70 hover:bg-amber-600 border border-amber-500/50
               rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
>
    <DocumentArrowDownIcon className="w-3.5 h-3.5" />
    PDF
</button>
```

---

#### Pattern 7: PeriodFilterBar usage (analog: lines 384–388 inside `incasari` tab)

```typescript
// components/Plati/RaportFinanciar.tsx:384-388
// Drop-in reuse — same 3 props:
<PeriodFilterBar
    startDate={restanteStart}
    endDate={restanteEnd}
    onChange={(s, e) => { setRestanteStart(s); setRestanteEnd(e); }}
/>
```

---

#### Pattern 8: Empty state (analog from AgingReport or inline per existing tab style)

```tsx
// Use amber/warning color consistent with restanțe visual identity
{restanteRows.length === 0 && (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <ExclamationTriangleIcon className="w-10 h-10 text-amber-500/30 mb-3" />
        <p className="text-sm font-medium">Nicio restanță în intervalul selectat</p>
        <p className="text-xs mt-1 text-slate-600">Ajustează filtrele sau verifică că există facturi neachitate.</p>
    </div>
)}
```

---

#### Pattern 9: Table JSX (analog: existing `incasari` tabel desktop, ~lines 480–560)

Table structure to copy:
- `<div className="overflow-x-auto">` wrapper
- `<table className="w-full text-sm">` with `<thead>` / `<tbody>`
- Row classes: `border-b border-[var(--t-border)] hover:bg-[var(--t-table-row-hover)]`
- Amount column: right-aligned, `text-amber-300 font-bold`
- Header: `text-xs text-slate-400 uppercase tracking-wider font-semibold py-2 px-3 text-left`

---

### `utils/exportFinanciar.ts` — two new functions

**Analog:** Same file, `exportIncasariCSV` (lines 19–47) and `exportIncasariPDF` (lines 51–115).

**Private helper `fmtSum` (lines 14–15)** — already available in file scope, no redefinition needed:
```typescript
const fmtSum = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
```

---

#### `exportRestanteCSV` — append after line 47

```typescript
// Analog: exportIncasariCSV (lines 19-47) — identical structure, different columns
// NOTE: define RestantaRow here so RaportFinanciar.tsx imports it from this file (avoids Pitfall 5)
export interface RestantaRow {
    sportiv_id: string;
    numeSportiv: string;
    sumaTotala: number;
    nrFacturi: number;
    ceaMaiVecheScadenta: string;
}

export function exportRestanteCSV(
    rows: RestantaRow[],
    clubNume = 'Club QwanKiDo',
    filename = 'restante.csv',
) {
    const BOM = '﻿';
    const HEADER = ['Sportiv', 'Suma Totala (RON)', 'Nr Facturi', 'Cea Mai Veche Scadenta'];

    const csvRows = rows.map(r => [
        r.numeSportiv,
        fmtSum(r.sumaTotala),
        String(r.nrFacturi),
        r.ceaMaiVecheScadenta
            ? new Date(r.ceaMaiVecheScadenta).toLocaleDateString('ro-RO')
            : '',
    ]);

    const csv = [HEADER, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
```

---

#### `exportRestantePDF` — append after `exportRestanteCSV`

```typescript
// Analog: exportIncasariPDF (lines 51-115) — dynamic import + autoTable pattern
// Key difference: headStyles fillColor amber (245,158,11) not indigo (99,102,241)
export async function exportRestantePDF(
    rows: RestantaRow[],
    clubNume = 'Club QwanKiDo',
    filename = 'restante.pdf',
) {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Antet — copy from exportIncasariPDF:63-73, replace static text with dynamic clubNume
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(clubNume, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Raport Restanțe', 14, 21);
    doc.text(
        `Generat: ${new Date().toLocaleDateString('ro-RO')} · ${rows.length} sportivi`,
        14, 27,
    );

    const totalSuma = rows.reduce((s, r) => s + r.sumaTotala, 0);
    const totalFacturi = rows.reduce((s, r) => s + r.nrFacturi, 0);

    autoTable(doc, {
        head: [['Sportiv', 'Sumă Totală (RON)', 'Nr. Facturi', 'Cea Mai Veche Scadență']],
        body: rows.map(r => [
            r.numeSportiv,
            fmtSum(r.sumaTotala),
            String(r.nrFacturi),
            r.ceaMaiVecheScadenta
                ? new Date(r.ceaMaiVecheScadenta).toLocaleDateString('ro-RO')
                : '—',
        ]),
        foot: [['TOTAL', fmtSum(totalSuma), String(totalFacturi), '']],
        startY: 33,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59] as [number, number, number],
            lineColor: [226, 232, 240] as [number, number, number],
            lineWidth: 0.2,
        },
        headStyles: {
            // amber instead of indigo — visual identity for restanțe
            fillColor: [245, 158, 11] as [number, number, number],
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 9,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] as [number, number, number],
        },
        footStyles: {
            fillColor: [241, 245, 249] as [number, number, number],
            textColor: [30, 41, 59] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 10,
        },
        columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' },
        },
    });

    doc.save(filename);
}
```

---

## Shared Patterns

### Date field on `Plata`
**Source:** `components/Plati/AgingReport.tsx:70` and `components/Plati/RaportFinanciar.tsx:220`
**Apply to:** All filtering logic in the new `restante` tab
```typescript
// Plata.data IS the due-date. No field named data_scadenta exists on the interface.
const d = new Date(p.data.toString().slice(0, 10));
if (isNaN(d.getTime())) return false;
```

### `formatSum` local utility
**Source:** `components/Plati/RaportFinanciar.tsx:45-46`
**Apply to:** All currency display in tab JSX
```typescript
const formatSum = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';
```

### `fmtSum` private utility (export functions)
**Source:** `utils/exportFinanciar.ts:14-15`
**Apply to:** CSV/PDF export cell values — already in scope, no re-declaration
```typescript
const fmtSum = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
```

### Dynamic PDF import
**Source:** `utils/exportFinanciar.ts:58-59`
**Apply to:** `exportRestantePDF` — must use dynamic import, not static
```typescript
const { jsPDF } = await import('jspdf');
const { default: autoTable } = await import('jspdf-autotable');
```

### Tab bar render
**Source:** `components/Plati/RaportFinanciar.tsx:295-308`
**Apply to:** Tab `'restante'` is rendered automatically — it is an entry in the `tabs` array, no separate render block needed for the button itself.

### `useData()` destructure pattern
**Source:** `components/Plati/RaportFinanciar.tsx:51`
**Apply to:** Obtaining `clubs` and `activeRoleContext` for PDF club name
```typescript
// line 51 currently: const { currentUser } = useData();
// EXTEND to:
const { currentUser, activeRoleContext, clubs } = useData();
```

---

## No Analog Found

None. Both modified files have exact in-file analogs for every pattern needed.

---

## Critical Pitfalls (from RESEARCH.md — enforce in plan)

| # | Pitfall | Guard |
|---|---------|-------|
| P1 | Using `plata.data_scadenta` (field does not exist) | Use `plata.data.toString().slice(0,10)` |
| P2 | Adding restante filter state to `useLocalStorage filters` object | Use separate `useState('')` for `restanteStart`/`restanteEnd` |
| P3 | Defining `RestantaRow` in `RaportFinanciar.tsx` and importing in `exportFinanciar.ts` (circular) | Define `RestantaRow` and export it from `exportFinanciar.ts`; import in component |
| P4 | Ignoring invoices with `sportiv_id === null` (family payments) | Group on `p.sportiv_id ?? p.familie_id ?? '__necunoscut__'` |
| P5 | Static import of jsPDF | Dynamic `await import('jspdf')` — matches existing pattern |

---

## Metadata

**Analog search scope:** `components/Plati/`, `utils/`
**Files read:** `RaportFinanciar.tsx` (lines 1-474), `exportFinanciar.ts` (full, 116 lines), `AgingReport.tsx` (lines 1-80)
**Pattern extraction date:** 2026-06-16
