# Phase 9: Raport Financiar - Research

**Researched:** 2026-06-16
**Domain:** React/TypeScript — adăugare tab la componentă financiară existentă, calcul agregat din date locale, export CSV/PDF
**Confidence:** HIGH

## Summary

Faza 9 constă în adăugarea unui tab nou `'restante'` la componenta `RaportFinanciar.tsx` deja existentă, fără niciun fișier nou de componentă. Datele vin ca prop `plati: Plata[]` deja injectat din `AppRouter.tsx` — nu este nevoie de niciun query Supabase nou. Agregarea per sportiv se face în `useMemo` prin filtrare pe `status !== 'Achitat'` și grupare după `sportiv_id`. Filtrarea pe perioadă refolosește `PeriodFilterBar` existent cu aceeași interfață (3 props: `startDate`, `endDate`, `onChange`). Exportul refolosește exact patternul din `exportIncasariCSV`/`exportIncasariPDF` adăugând două funcții noi în `utils/exportFinanciar.ts`.

Singura complexitate non-trivială este obținerea numelui clubului pentru antetul PDF: `RaportFinanciar` accesează `useData()` care expune `activeRoleContext` (cu `club_id`) și `data.clubs` (lista de cluburi cu `id` și `nume`) — deci `clubs.find(c => c.id === activeRoleContext?.club_id)?.nume` este calea corectă, fără modificări la props.

**Primary recommendation:** Adaugă tab `'restante'` la union-ul `activeTab`, implementează `useMemo` de agregare per sportiv, refolosește `PeriodFilterBar` cu state local `restanteStart`/`restanteEnd`, adaugă `exportRestanteCSV`/`exportRestantePDF` în `utils/exportFinanciar.ts` cu patternul identic celor existente.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Tab nou `'restante'` adăugat la `activeTab` state din `RaportFinanciar.tsx` — zero rute/views noi, zero wiring AppRouter
- **D-02:** Tab apare în bara de tab-uri existentă (după taburile curente), vizibil pentru ADMIN_CLUB și SUPER_ADMIN
- **D-03:** 1 rând per sportiv cu coloane: Sportiv (nume+prenume) | Sumă Totală RON | Nr. Facturi | Cea Mai Veche Scadență
- **D-04:** Sortare default descrescător după sumă totală (cel mai mare debitor sus)
- **D-05:** Fără expandare/accordion în v1.1 — un rând plat per sportiv
- **D-06:** Filtrul se aplică pe `data_scadenta` a facturilor cu `status='Neachitat'`
- **D-07:** Refolosim `PeriodFilterBar` existent din `components/Plati/PeriodFilterBar.tsx` — aceeași UI ca la celelalte tab-uri
- **D-08:** Funcții noi `exportRestanteCSV(rows, clubNume)` și `exportRestantePDF(rows, clubNume, dataGenerare)` adăugate în `utils/exportFinanciar.ts`
- **D-09:** CSV cu separator `;` compatibil Excel — coloane: Sportiv, Suma Totala (RON), Nr Facturi, Cea Mai Veche Scadenta
- **D-10:** PDF cu antet: `[ClubNume] — Raport Restanțe` + dată generare, apoi tabel jspdf-autotable (același pattern ca exportIncasariPDF)

### Claude's Discretion

- Culori/iconuri UI în tab (warning/amber pentru restanțe, consistent cu AgingReport)
- Mesaj empty state când nu există restanțe în intervalul filtrat
- Formatare sumă (2 zecimale RON, `toLocaleString('ro-RO')`)

### Deferred Ideas (OUT OF SCOPE)

- Expandare accordion cu facturile individuale per sportiv — v2.0
- Notificare WhatsApp/email din interfața de raport restanțe — v2.0
- Sold pozitiv (avansuri) în același ecran — out of scope v1.1

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIN-01 | Admin de club poate vedea tabelul restanțelor per sportiv: nume sportiv, sumă totală datorată, data celei mai vechi facturi neachitate | `plati: Plata[]` prop deja disponibil; agregare per `sportiv_id` prin `useMemo`; `formatNume(sportiv)` pentru afișare |
| FIN-02 | Admin poate filtra restanțele pe interval dată (câmp "De la" și "Până la" — aplicate pe data_scadenta a facturilor neachitate) | `PeriodFilterBar` cu props `startDate`, `endDate`, `onChange(s, e)` — drop-in; `Plata.data` este câmpul `data_scadenta` |
| FIN-03 | Admin poate exporta tabelul restanțelor în format CSV (compatibil Excel) | Pattern `exportIncasariCSV` — BOM UTF-8 + separator `;` + `Blob` download; replicat ca `exportRestanteCSV` |
| FIN-04 | Admin poate exporta tabelul restanțelor în format PDF (antet cu numele clubului, data generării, tabel cu coloane: sportiv, sumă, vechime) | Pattern `exportIncasariPDF` — jsPDF + autoTable, dynamic import; club name din `useData().clubs` + `activeRoleContext.club_id` |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Agregare restanțe per sportiv | Frontend (React) | — | Date deja în cache React Query; filtrare/grupare client-side în `useMemo` |
| Filtrare pe perioadă `data_scadenta` | Frontend (React) | — | `PeriodFilterBar` existent; niciun query nou Supabase |
| Export CSV | Frontend (Browser) | — | `Blob` + `URL.createObjectURL` — execuție în browser |
| Export PDF | Frontend (Browser) | — | jsPDF + autoTable via dynamic import — execuție în browser |
| Autorizare vizibilitate tab | RLS (Supabase) + UI | Frontend (React) | RLS filtrează datele pe club; `isAtLeastClubAdmin` verificat în `AppRouter.tsx` la nivel de view |

---

## Standard Stack

### Core (deja instalat — zero dependențe noi)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | 4.2.1 | Generare PDF în browser | Deja în `package.json`; folosit în `exportIncasariPDF` |
| jspdf-autotable | 5.0.7 | Tabele în PDF | Deja în `package.json`; deja pattern `autoTable(doc, {...})` verificat |
| PapaParse | 5.4.1 | CSV parsing | Deja instalat; nu e necesar pentru export simplu (folosim `Blob` nativ) |
| date-fns | 4.1.0 | Manipulare date | Deja instalat; `differenceInDays` folosit în AgingReport |

**Nota importantă:** Faza nu instalează niciun pachet nou. Toate dependențele sunt deja în `package.json`. Secțiunea Package Legitimacy Audit nu se aplică.

### Pattern de Import (verificat în codebase)

```typescript
// Dynamic import — nu blochează bundle-ul inițial (pattern existent în exportIncasariPDF)
const { jsPDF } = await import('jspdf');
const { default: autoTable } = await import('jspdf-autotable');
```

---

## Architecture Patterns

### System Architecture Diagram

```
plati: Plata[] (prop din AppRouter → filteredData.plati)
         │
         ▼
RaportFinanciar.tsx
├── tabs array → adaugă { id: 'restante', label: 'Restanțe', icon: ExclamationTriangleIcon }
├── useState activeTab → extindem union cu | 'restante'
├── useState restanteStart / restanteEnd → state local pentru PeriodFilterBar
│
└── activeTab === 'restante'
    ├── restanteUseMemo ← filtrare: status !== 'Achitat', interval data_scadenta
    │   ├── group by sportiv_id
    │   ├── suma = Σ plata.suma
    │   ├── nrFacturi = count
    │   └── ceaMaiVecheScadenta = min(plata.data)
    ├── PeriodFilterBar (refolosit direct)
    │   └── onChange → setRestanteStart / setRestanteEnd
    ├── Tabel desktop + carduri mobile (pattern din tab 'incasari')
    ├── Button "Export CSV" → exportRestanteCSV(rows, clubNume)
    └── Button "Export PDF" → exportRestantePDF(rows, clubNume, dataGenerare)

utils/exportFinanciar.ts
├── exportRestanteCSV(rows: RestantaRow[], clubNume: string) → Blob download
└── exportRestantePDF(rows: RestantaRow[], clubNume: string, dataGenerare: string) → jsPDF save
```

### Recommended Project Structure (modificări minime)

```
components/Plati/
└── RaportFinanciar.tsx     ← MODIFICAT: tab nou + state + useMemo + JSX

utils/
└── exportFinanciar.ts      ← MODIFICAT: 2 funcții noi adăugate la final
```

Niciun fișier nou. Nicio schimbare în AppRouter.tsx, LazyComponents.tsx sau types.ts.

### Pattern 1: Extinderea activeTab Union

**Ce face:** Adaugă `'restante'` la tipul existent fără să rupă niciun alt tab.

**Linia actuală (RaportFinanciar.tsx, linia 54):**
```typescript
// Source: components/Plati/RaportFinanciar.tsx:54 [VERIFIED: grep codebase]
const [activeTab, setActiveTab] = useState<'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice' | 'familii'>('incasari');
```

**Modificare:**
```typescript
const [activeTab, setActiveTab] = useState<'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice' | 'familii' | 'restante'>('incasari');
```

### Pattern 2: Agregare Restanțe per Sportiv (useMemo)

**Ce face:** Grupează facturile neachitate pe sportiv, calculează suma totală și cea mai veche scadență.

**Model derivat din AgingReport.tsx și abonamenteData din RaportFinanciar:**
```typescript
// Source: derivat din components/Plati/AgingReport.tsx + RaportFinanciar.tsx patterns [VERIFIED: grep codebase]
interface RestantaRow {
    sportiv_id: string;
    numeSportiv: string;
    sumaTotala: number;
    nrFacturi: number;
    ceaMaiVecheScadenta: string; // ISO date string
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
        const sid = p.sportiv_id ?? '__fara_sportiv__';
        if (!byId[sid]) byId[sid] = { sume: [], date: [] };
        byId[sid].sume.push(p.suma);
        if (p.data) byId[sid].date.push(p.data.toString().slice(0, 10));
    }

    return Object.entries(byId)
        .map(([sid, { sume, date }]) => {
            const sp = sportivi.find(s => s.id === sid);
            return {
                sportiv_id: sid,
                numeSportiv: sp ? formatNume(sp) : '—',
                sumaTotala: sume.reduce((a, b) => a + b, 0),
                nrFacturi: sume.length,
                ceaMaiVecheScadenta: date.sort()[0] ?? '',
            };
        })
        .sort((a, b) => {
            if (b.sumaTotala !== a.sumaTotala) return b.sumaTotala - a.sumaTotala;
            return (a.ceaMaiVecheScadenta || '').localeCompare(b.ceaMaiVecheScadenta || '');
        });
}, [plati, sportivi, restanteStart, restanteEnd]);
```

**Nota:** `Plata.data` este câmpul ce conține data scadenței (nu `data_scadenta`). Verificat în `AgingReport.tsx` care folosește `plata.data.toString().slice(0, 10)` pentru a calcula zilele restante față de azi.

### Pattern 3: PeriodFilterBar — Refolosire Directă

**Interfata verificată (PeriodFilterBar.tsx, liniile 4-8):**
```typescript
// Source: components/Plati/PeriodFilterBar.tsx [VERIFIED: grep codebase]
interface PeriodFilterBarProps {
    startDate: string;          // YYYY-MM-DD sau ''
    endDate: string;            // YYYY-MM-DD sau ''
    onChange: (startDate: string, endDate: string) => void;
    className?: string;         // opțional
}
```

**Utilizare în tab 'restante':**
```typescript
// State local (lângă celelalte state-uri din RaportFinanciar)
const [restanteStart, setRestanteStart] = useState('');
const [restanteEnd, setRestanteEnd] = useState('');

// În JSX
<PeriodFilterBar
    startDate={restanteStart}
    endDate={restanteEnd}
    onChange={(s, e) => { setRestanteStart(s); setRestanteEnd(e); }}
/>
```

### Pattern 4: Obținerea Numelui Clubului pentru PDF

**Calea corectă — fără modificări la props:**
```typescript
// Source: derivat din ThemeContext.tsx + useDataProvider.ts return object [VERIFIED: grep codebase]
// useData() expune: activeRoleContext (cu .club_id), data.clubs (array de Club cu .id, .nume)
const { currentUser, activeRoleContext, clubs } = useData();
const clubNume = clubs?.find(c => c.id === activeRoleContext?.club_id)?.nume ?? 'Club QwanKiDo';
```

**Alternativă via currentUser:** `currentUser` are câmp `cluburi?: Club | null` (setat în `fetchAppData` cu `activeCtx.cluburi`), deci `(currentUser as any).cluburi?.nume` funcționează și el, dar `clubs.find(...)` e mai explicit și tipizat.

### Pattern 5: Butoane Export — Identice cu Tab 'Incasari'

**Pattern verificat (RaportFinanciar.tsx, liniile 452-474):**
```typescript
// Source: components/Plati/RaportFinanciar.tsx:452-474 [VERIFIED: grep codebase]
<button
    onClick={() => exportIncasariCSV(filteredIstoric)}
    disabled={filteredIstoric.length === 0}
    className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-300
               bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50
               rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
>
    <DownloadIcon className="w-3.5 h-3.5" />
    CSV
</button>
<button
    onClick={() => exportIncasariPDF(filteredIstoric, totalIncasari)}
    disabled={filteredIstoric.length === 0}
    className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-white
               bg-indigo-600/70 hover:bg-indigo-600 border border-indigo-500/50
               rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
>
    <DocumentArrowDownIcon className="w-3.5 h-3.5" />
    PDF
</button>
```

### Pattern 6: exportRestanteCSV — Funcție Nouă în exportFinanciar.ts

**Model exact din `exportIncasariCSV` (exportFinanciar.ts, liniile 19-47):**
```typescript
// Source: utils/exportFinanciar.ts [VERIFIED: grep codebase]
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
        r.ceaMaiVecheScadenta ? new Date(r.ceaMaiVecheScadenta).toLocaleDateString('ro-RO') : '',
    ]);

    const csv = [HEADER, ...csvRows]
        .map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
        )
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

**Nota:** `fmtSum` este funcție privată în `exportFinanciar.ts` (liniile 14-16) — disponibilă automat pentru funcțiile noi adăugate în același fișier.

### Pattern 7: exportRestantePDF — Funcție Nouă în exportFinanciar.ts

**Model exact din `exportIncasariPDF` (exportFinanciar.ts, liniile 51-115):**
```typescript
// Source: utils/exportFinanciar.ts [VERIFIED: grep codebase]
export async function exportRestantePDF(
    rows: RestantaRow[],
    clubNume = 'Club QwanKiDo',
    filename = 'restante.pdf',
) {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Antet
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(clubNume, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Raport Restanțe', 14, 21);
    doc.text(`Generat: ${new Date().toLocaleDateString('ro-RO')} · ${rows.length} sportivi`, 14, 27);

    const totalSuma = rows.reduce((s, r) => s + r.sumaTotala, 0);

    autoTable(doc, {
        head: [['Sportiv', 'Sumă Totală (RON)', 'Nr. Facturi', 'Cea Mai Veche Scadență']],
        body: rows.map(r => [
            r.numeSportiv,
            fmtSum(r.sumaTotala),
            String(r.nrFacturi),
            r.ceaMaiVecheScadenta ? new Date(r.ceaMaiVecheScadenta).toLocaleDateString('ro-RO') : '—',
        ]),
        foot: [['TOTAL', fmtSum(totalSuma), String(rows.reduce((s, r) => s + r.nrFacturi, 0)), '']],
        startY: 33,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59] as [number, number, number],
            lineColor: [226, 232, 240] as [number, number, number],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [245, 158, 11] as [number, number, number], // amber pentru restanțe
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

### Pattern 8: Tab Entry în Array `tabs`

**Array `tabs` existent (RaportFinanciar.tsx, liniile 283-290):**
```typescript
// Source: components/Plati/RaportFinanciar.tsx:283-290 [VERIFIED: grep codebase]
const tabs = [
    { id: 'incasari' as const,    label: 'Încasări',     icon: <FileTextIcon className="w-4 h-4" /> },
    { id: 'abonamente' as const,  label: 'Abonamente',   icon: <WalletIcon className="w-4 h-4" /> },
    { id: 'lunar' as const,       label: 'Lunar',        icon: <ChartBarIcon className="w-4 h-4" /> },
    { id: 'taxe_anuale' as const, label: 'Taxe Anuale',  icon: <BanknotesIcon className="w-4 h-4" /> },
    { id: 'grafice' as const,     label: 'Grafice',      icon: <TrendingUpIcon className="w-4 h-4" /> },
    { id: 'familii' as const,     label: 'Familii',      icon: <UsersIcon className="w-4 h-4" /> },
];
```

**Adăugare tab restanțe la finalul array-ului:**
```typescript
{ id: 'restante' as const, label: 'Restanțe', icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
```

`ExclamationTriangleIcon` este deja importat în RaportFinanciar.tsx (linia 5).

### Anti-Patterns to Avoid

- **Filtrare pe `data_scadenta` ca câmp separat:** `Plata` NU are câmp `data_scadenta`. Câmpul este `data` (string ISO). Verificat în `types.ts` (linia 162) și folosit ca atare în `AgingReport.tsx` și `PlatiScadente`.
- **Query Supabase nou pentru restanțe:** Prop `plati: Plata[]` conține deja toate facturile clubului. Nu se adaugă query nou.
- **Import static jsPDF/autoTable:** Codul existent folosește dynamic import (`await import(...)`) pentru code splitting. Respectat în funcțiile noi.
- **Tip `RestantaRow` în `types.ts`:** Tipul este local funcției/modulului — nu se adaugă în `types.ts` central (urmează convenția că tipurile interne de UI nu poluează fișierul global de tipuri).
- **Modificarea `AgingReport`:** Componenta NU se modifică — coexistă cu noul tab.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Export CSV cu BOM UTF-8 | Custom string builder | Pattern `exportIncasariCSV` existent | Deja implementat, testat, rezolvă encoding Excel |
| Export PDF cu tabel | jsPDF manual | `autoTable(doc, {...})` + pattern `exportIncasariPDF` | Header/footer/stiluri deja definite; dynamic import rezolvă bundle size |
| Filtrare perioadă | Input date custom | `PeriodFilterBar` existent | Preseturi rapide (Luna curentă etc.) incluse gratuit |
| Formatare sumă RON | `.toFixed(2)` + concatenare | `formatSum` local din RaportFinanciar (linia 45-46) | Formatare localizată `ro-RO` corectă |
| Formatare nume sportiv | Concatenare `prenume + ' ' + nume` | `formatNume(sportiv)` din `utils/formatareSportiv.ts` | Gestionează null/undefined, format consistent |

---

## Common Pitfalls

### Pitfall 1: `Plata.data` vs. câmp `data_scadenta` inexistent

**Ce se întâmplă:** Dacă implementatorul caută `plata.data_scadenta`, nu găsește câmpul și poate adăuga un câmp nou în types.ts sau face query separat.
**De ce se întâmplă:** D-06 din CONTEXT.md menționează `data_scadenta` ca semantică, dar câmpul DB mapat în interfața TypeScript se numește `data`.
**Cum se evită:** Folosește `plata.data.toString().slice(0, 10)` — exact ca în `AgingReport.tsx` linia 70.
**Semn de avertizare:** TypeScript error `Property 'data_scadenta' does not exist on type 'Plata'`.

### Pitfall 2: Re-render excesiv din state separat pentru filtre restanțe

**Ce se întâmplă:** Dacă state-urile `restanteStart`/`restanteEnd` sunt adăugate în obiectul `filters` gestionat de `useLocalStorage`, filtrele de restanțe persistă între sesiuni (nedorit) și pot cauza race conditions cu resetFilters.
**De ce se întâmplă:** `filters` din `useLocalStorage` e partajat între toate tab-urile.
**Cum se evită:** State local separat cu `useState('')` — nu în `useLocalStorage`.

### Pitfall 3: Pierderea `clubNume` la PDF dacă `clubs` e empty la mount

**Ce se întâmplă:** `clubs` se populează async. La primul render poate fi `[]`. Dacă butonul PDF e apăsat imediat, `clubNume` e fallback `'Club QwanKiDo'`.
**De ce se întâmplă:** `clubs` vine din `data` state în `useDataProvider` populat în `fetchAppData`.
**Cum se evită:** Fallback acceptabil `'Club QwanKiDo'` — nu blochează. Export PDF este o acțiune tardivă (userul vede mai întâi datele).

### Pitfall 4: `sportiv_id` null pe facturi de familie

**Ce se întâmplă:** Unele facturi din `plati` au `sportiv_id === null` și `familie_id` setat în schimb. Dacă grupăm strict pe `sportiv_id`, facturile de familie sunt ignorate sau cauzează un rând cu `numeSportiv = '—'`.
**De ce se întâmplă:** Schema suportă plăți la nivel de familie (nu sportiv individual).
**Cum se evită:** Decizia din CONTEXT.md (D-03) specifică „1 rând per sportiv" — facturile cu `sportiv_id === null` pot fi grupate separat ca `'Familie'` sau excluse. Recomandare: grupează `sportiv_id ?? familie_id ?? 'necunoscut'` și afișează `fam?.nume` dacă `sp` e null.

### Pitfall 5: `RestantaRow` trebuie exportat dacă e folosit în prop de export

**Ce se întâmplă:** Dacă tipul `RestantaRow` e definit în `RaportFinanciar.tsx` și funcțiile de export din `exportFinanciar.ts` îl acceptă ca parametru, avem import circular sau tip duplicat.
**Cum se evită:** Definește `RestantaRow` în `exportFinanciar.ts` și importă-l în `RaportFinanciar.tsx` — sau folosește tip inline în funcție (`{ numeSportiv: string; sumaTotala: number; nrFacturi: number; ceaMaiVecheScadenta: string }[]`).

---

## Key Type Signatures (Verificate în Codebase)

### `Plata` (types.ts, linia 153) [VERIFIED: grep codebase]

```typescript
export interface Plata {
    id: string;
    sportiv_id: string | null;
    familie_id: string | null;
    club_id?: string | null;
    suma: number;
    data: string;                           // ← aceasta e data_scadenta!
    status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
    descriere: string;
    tip: string;
    observatii: string;
    // ... alte câmpuri opționale
}
```

### `PeriodFilterBar` Props (PeriodFilterBar.tsx, linia 4) [VERIFIED: grep codebase]

```typescript
interface PeriodFilterBarProps {
    startDate: string;
    endDate: string;
    onChange: (startDate: string, endDate: string) => void;
    className?: string;
}
```

### `formatNume` (formatareSportiv.ts, linia 3) [VERIFIED: grep codebase]

```typescript
type SportivNume = { nume?: string | null; prenume?: string | null } | null | undefined;
export function formatNume(s: SportivNume): string;
// returnează 'NUME PRENUME' sau '—'
```

### `activeTab` State Union (RaportFinanciar.tsx, linia 54) [VERIFIED: grep codebase]

```typescript
// Starea curentă:
useState<'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice' | 'familii'>

// După modificare:
useState<'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice' | 'familii' | 'restante'>
```

### `RaportFinanciarProps` (RaportFinanciar.tsx, linia 19) [VERIFIED: grep codebase]

```typescript
interface RaportFinanciarProps {
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    sportivi: Sportiv[];
    familii: Familie[];
    plati: Plata[];                              // ← sursa datelor pentru FIN-01..FIN-04
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onBack: () => void;
    onViewSportiv?: (sportiv: Sportiv) => void;
}
// Nicio modificare la props necesară pentru Phase 9.
```

### `exportIncasariCSV` / `exportIncasariPDF` (exportFinanciar.ts) [VERIFIED: grep codebase]

```typescript
// Funcții existente — pattern de replicat:
export function exportIncasariCSV(
    data: IstoricPlataDetaliat[],
    filename?: string,                          // default 'incasari.csv'
): void

export async function exportIncasariPDF(
    data: IstoricPlataDetaliat[],
    total: number,
    filename?: string,                          // default 'incasari.pdf'
    titlu?: string,                             // default 'Raport Încasări'
): Promise<void>
```

### `useData()` — Ce expune relevant pentru Phase 9 [VERIFIED: grep codebase]

```typescript
const { currentUser, activeRoleContext, clubs } = useData();
// clubs: Club[] — array cu { id, nume, ... }
// activeRoleContext: { club_id: string, ... } | null
// Calea pentru clubNume:
const clubNume = clubs?.find(c => c.id === activeRoleContext?.club_id)?.nume ?? 'Club QwanKiDo';
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Import static jsPDF | Dynamic import `await import('jspdf')` | Bundle inițial mai mic; deja implementat în exportIncasariPDF |
| Fișier CSS separat | Tailwind CSS utility classes direct în JSX | Nu există fișiere CSS noi |
| URL routing pentru view-uri noi | `activeView` string în NavigationContext | Tab 'restante' NU necesită view nou în AppRouter |

---

## Project Constraints (from CLAUDE.md)

- **Limbă:** română pentru domeniu (variabile, UI labels), engleză pentru hook-uri/patterns tehnice
- **Tipuri:** Interfețele noi care sunt strict locale (ex: `RestantaRow`) NU merg în `types.ts`; tipurile de domeniu DA
- **UI:** Folosim exclusiv `components/ui.tsx` (Button, Card, Input, Select) — nu Shadcn, nu MUI
- **Navigare:** SPA fără URL routing intern — tab-urile din RaportFinanciar sunt state, nu routes
- **Supabase:** Nicio query nouă — datele vin din `plati: Plata[]` prop deja filtrat prin RLS
- **Strict mode:** Dezactivat în tsconfig — tipuri flexibile acceptate

---

## Environment Availability

Step 2.6: SKIPPED — faza nu are dependențe externe. Toate librăriile (jsPDF, jspdf-autotable) sunt deja instalate și folosite în codebase. Nu se instalează nimic nou.

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` în config.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nu | Tab-ul e în RaportFinanciar deja protejat de `isAtLeastClubAdmin` în AppRouter |
| V3 Session Management | nu | Sesiunea e gestionată de Supabase Auth la nivel global |
| V4 Access Control | da | RLS filtrează `plati` pe `club_id` via header `active-role-context-id`; vizibilitatea tab-ului e controlată de `D-02` (ADMIN_CLUB + SUPER_ADMIN) |
| V5 Input Validation | da (minor) | `startDate`/`endDate` sunt date HTML `<input type="date">` — format YYYY-MM-DD garantat de browser; `new Date(val)` cu `isNaN` check deja prezent în `filteredIstoric` |
| V6 Cryptography | nu | Nu se mânuiesc date criptografice |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Date injection în filtre client-side | Tampering | Filtrare pe date deja încărcate din RLS-protected query; niciun SQL nou |
| Export date sensibile (sume, restanțe) | Information Disclosure | Datele sunt deja vizibile în UI pentru adminul autentificat; exportul nu extinde suprafața de atac |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Plata.data` conține data scadenței (nu există câmp separat `data_scadenta`) | Architecture Patterns | Dacă există un câmp `data_scadenta` nemapat în `Plata` interface, filtrul FIN-02 nu funcționează corect |
| A2 | Facturile cu `sportiv_id === null` (plăți de familie) sunt relativ rare și excluderea lor din raportul de restanțe pe sportiv este acceptabilă | Architecture Patterns | Dacă adminii au multe plăți de familie neachitate, raportul ar părea incomplet |

**Risc A1:** Scăzut — verificat că AgingReport.tsx folosește `plata.data` pentru calcul zile restante, fără niciun alt câmp.
**Risc A2:** Mediu — depinde de cum sunt înregistrate plățile în club. Recomandare: menționat explicit în plan ca decizie de implementare.

---

## Open Questions

1. **Facturi cu `sportiv_id === null` (plăți de familie)**
   - Ce știm: Schema DB permite plăți atribuite direct unei familii (`familie_id` setat, `sportiv_id = null`)
   - Ce e neclar: Cât de frecvent sunt astfel de înregistrări în datele reale; dacă adminii se așteaptă să le vadă în raportul de restanțe per sportiv
   - Recomandare: Grupează și aceste facturi folosind `familie_id` ca fallback — afișează `fam?.nume` în coloana Sportiv cu un marker vizual (ex: `[Familie]`)

2. **Sortare secundară la sumă egală**
   - Ce știm: D-04 specifică sortare descrescătoare după sumă; CONTEXT.md `<specifics>` menționează că la sumă egală, sportivul cu scadența mai veche apare primul
   - Ce e neclar: Dacă aceasta e o cerință dură sau preferință
   - Recomandare: Implementat în codul de mai sus (sort secundar pe `ceaMaiVecheScadenta` ascendent)

---

## Sources

### Primary (HIGH confidence)
- `components/Plati/RaportFinanciar.tsx` — structură completă componentă, props interface, tabs array, patterns export [VERIFIED: grep codebase]
- `components/Plati/PeriodFilterBar.tsx` — interfață props completă [VERIFIED: grep codebase]
- `utils/exportFinanciar.ts` — funcții `exportIncasariCSV` și `exportIncasariPDF` complete cu toate detaliile de implementare [VERIFIED: grep codebase]
- `components/Plati/AgingReport.tsx` — pattern calcul `plata.data` pentru restanțe [VERIFIED: grep codebase]
- `utils/formatareSportiv.ts` — semnătură `formatNume` [VERIFIED: grep codebase]
- `types.ts` — interfețele `Plata`, `Sportiv`, `Club`, `User` [VERIFIED: grep codebase]
- `hooks/useDataProvider.ts` — return object cu `clubs`, `activeRoleContext` [VERIFIED: grep codebase]
- `components/AppRouter.tsx:221` — wiring complet RaportFinanciar (props pasate) [VERIFIED: grep codebase]

### Secondary (MEDIUM confidence)
- `.planning/phases/09-raport-financiar/09-CONTEXT.md` — decizii utilizator D-01..D-10
- `.planning/REQUIREMENTS.md` — cerințe FIN-01..FIN-04
- `.planning/STATE.md` — decizii proiect (jsPDF/autoTable deja instalat)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero dependențe noi; totul verificat în codebase
- Architecture: HIGH — cod sursă real citit complet
- Pitfalls: HIGH — derivate din analiza codului existent și schemei de tipuri
- Export patterns: HIGH — cod funcție existent copiat și adaptat

**Research date:** 2026-06-16
**Valid until:** 2026-07-16 (cod stabil, fără dependențe externe noi)
