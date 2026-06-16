---
phase: 9
slug: raport-financiar
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-16
---

# Phase 9 — UI Design Contract

> Contract vizual și de interacțiune pentru tab-ul "Restanțe" din RaportFinanciar.
> Generat de gsd-ui-researcher. Verificat de gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — design system intern `components/ui.tsx` |
| Preset | not applicable |
| Component library | intern (Card, Input, Select, Button din `components/ui.tsx`) |
| Icon library | Lucide React 0.400.0 via `components/icons.tsx` |
| Font | Inter (sans-serif) — definit în `tailwind.config.js` fontFamily |

**Nota:** Proiectul NU folosește Shadcn sau MUI. Shadcn gate: N/A. Registry safety gate: N/A.

---

## Spacing Scale

Scala 8-point, valori în multipli de 4. Toate clasele Tailwind sunt utilitare direct în JSX — niciun fișier CSS separat.

| Token | Valoare Tailwind | Px | Usage |
|-------|------------------|----|-------|
| xs | `gap-1` / `p-1` | 4px | Spații între iconiță și text în butoane (`gap-1.5` = 6px acceptat) |
| sm | `gap-2` / `p-2` | 8px | Spații între elemente inline, gap în mobile cards |
| md | `px-4 py-3` | 16px / 12px | Padding celule tabel, padding card |
| lg | `space-y-4` | 16px (gap) | Spații verticale între secțiuni principale |
| xl | `px-4 py-3` (header card) | 16px | Padding header bar total/export |
| 2xl | `py-8` | 32px | Padding vertical empty state |

Excepții: `px-3 py-1.5` (12px/6px) pentru butoanele export CSV/PDF — identic cu pattern existent la tab `incasari`, liniile 452–474.

---

## Typography

Sursa: `index.css` `:root` + clasele observate în `RaportFinanciar.tsx`.

| Rol | Size (Tailwind) | Size (px) | Weight (Tailwind) | Line Height |
|-----|-----------------|-----------|-------------------|-------------|
| Body / celulă tabel | `text-sm` | 14px | `font-normal` (400) | 1.5 (default Tailwind) |
| Label / antet tabel | `text-xs font-bold uppercase tracking-wider` | 12px | `font-bold` (700) | 1.5 |
| Sumă totală / KPI | `text-2xl font-black` (desktop) / `text-xl font-black` (mobil) | 24px / 20px | `font-black` (900) | 1.2 |
| Heading secțiune | `text-xs uppercase tracking-wider font-semibold` | 12px | `font-semibold` (600) | 1.5 |

**Regula de greutăți în uz:** 400 (body/celule), 600 (semibold — label, antet KPI), 700 (bold — antet tabel), 900 (black — valori KPI și sume mari).
**Font**: Inter, `letter-spacing: 0.01em` global, heading: `letter-spacing: -0.02em`.

---

## Color

Paleta este exclusiv dark mode (`:root { color-scheme: dark }`). Tokeni CSS definiți în `index.css`, tema `--t-*` activă.

| Rol | Valoare | Clasa Tailwind / CSS var | Usage |
|-----|---------|--------------------------|-------|
| Dominant (60%) — suprafață principală | `#020617` (slate-950) | `var(--t-bg)` / `bg-[var(--t-bg)]` | Fundal pagină, fundal tabel, fundal tab bar |
| Secondary (30%) — carduri, nav | `#0f172a` (slate-900) | `var(--t-surface)` / `bg-[var(--t-surface)]` | Card-uri componente, sidebar |
| Secondary-2 — suprafețe ridicate | `#1e293b` (slate-800) | `var(--t-surface-2)` / `bg-[var(--t-surface-2)]` | Header-ul bar total/export, antet tabel, hover rând |
| Border | `#1e293b` (slate-800) | `var(--t-border)` / `border-[var(--t-border)]` | Toate bordurile de card, tabel, tab bar |
| Text primar | `#f8fafc` (slate-50) | `var(--t-text)` / `text-white` | Conținut principal, nume sportiv |
| Text secundar | `#94a3b8` (slate-400) | `var(--t-text-muted)` / `text-slate-400` | Date, valori secundare, empty state |
| Text muted | `#64748b` (slate-500) | `text-slate-500` | Tab inactiv, valori lipsă (`—`) |
| **Accent warning — restanțe** | `#f59e0b` (amber-500) | `text-amber-400` / `bg-amber-500/10..20` | Tab "Restanțe" activ (IconExclamationTriangle), sumă totală cu valoare pozitivă, badge KPI restanțe — EXCLUSIV pentru stări de restanță financiară |
| Accent indigo — primar | `#4f46e5` (indigo-600) | `bg-indigo-600` | Tab activ (stare selected), buton PDF Export |
| Semantic success | `#10b981` (emerald-400) | `text-emerald-400` | Sume zero restanțe (niciun debitor) |
| Semantic destructive | `#ef4444` (red-400) | `text-red-400` | Nu apare în acest tab (nicio acțiune destructivă) |

**60/30/10 split:**
- 60% dominant: `--t-bg` (#020617) — fundaluri, tabel body
- 30% secondary: `--t-surface` / `--t-surface-2` (#0f172a / #1e293b) — carduri, header export, antet tabel
- 10% accent: **amber** (`text-amber-400` + `bg-amber-500/10`) rezervat exclusiv pentru: icona tab Restanțe, valoarea sumei totale când > 0 RON, header tabel PDF.

---

## Componente UI — Inventar Phase 9

### Tab "Restanțe" — intrare în array `tabs`

```
{ id: 'restante', label: 'Restanțe', icon: <ExclamationTriangleIcon className="w-4 h-4" /> }
```

Clasa tab **inactiv** (preluată din pattern existent):
```
text-[var(--t-text-muted)] hover:text-white hover:bg-[var(--t-surface)]
```

Clasa tab **activ** (identică cu celelalte taburi active):
```
bg-indigo-600 text-white shadow-sm
```

Wrapper tab bar (neschimbat):
```
flex bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl p-1 gap-1 overflow-x-auto scrollbar-none
```

Label tab ascuns pe mobil: `<span className="hidden sm:inline">Restanțe</span>`

### PeriodFilterBar — refolosire directă

Componentă: `components/Plati/PeriodFilterBar.tsx` — drop-in, zero modificări.
Preset-uri incluse: Săptămâna / Luna curentă / Luna trecută / 3 luni / 6 luni / Anul curent / Personalizat.
Preset activ: `bg-brand-primary border-brand-primary text-white` (blue-500).
Preset inactiv: `bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white`.

### Bar total + Export (imediat sub PeriodFilterBar)

Container:
```
flex flex-col sm:flex-row sm:items-center bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-xl px-4 py-3 gap-3
```

Conținut stânga: text mic gri cu total sumă + număr de sportivi.
Butoane export (identice cu tab `incasari`, liniile 452–474):

**CSV:**
```
flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-300
bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50
rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation
```
Iconița: `<DownloadIcon className="w-3.5 h-3.5" />` + label "CSV"

**PDF:**
```
flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-white
bg-indigo-600/70 hover:bg-indigo-600 border border-indigo-500/50
rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation
```
Iconița: `<DocumentArrowDownIcon className="w-3.5 h-3.5" />` + label "PDF"

Ambele butoane `disabled` când `restanteRows.length === 0`.

Suma totală (desktop, dreapta):
```
hidden sm:block text-2xl md:text-3xl font-black text-amber-400
```
(amber în loc de emerald, deoarece restanțele sunt o valoare de alertă, nu de succes)

Suma totală (mobil, inline):
```
text-2xl font-black ml-auto text-amber-400 sm:hidden
```

Label secțiune: `text-xs text-slate-400 uppercase tracking-wider font-semibold` → "Total Restanțe"
Subtext: `text-xs text-slate-500` → "{N} sportivi cu restanțe"

### Tabel desktop

Wrapper:
```
hidden md:block bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl overflow-hidden
```

`<table className="w-full text-left text-sm">`

`<thead>`: `<tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }} className="border-b border-[var(--t-border)]">`

Coloane și clase `<th>`:
| Coloană | Clasa th | Aliniere |
|---------|----------|----------|
| Sportiv | `px-4 py-3 text-xs font-bold uppercase tracking-wider` | stânga |
| Sumă Totală RON | `px-4 py-3 text-xs font-bold uppercase tracking-wider text-right` | dreapta |
| Nr. Facturi | `px-4 py-3 text-xs font-bold uppercase tracking-wider text-right` | dreapta |
| Cea Mai Veche Scadență | `px-4 py-3 text-xs font-bold uppercase tracking-wider` | stânga |

`<tbody className="divide-y divide-[var(--t-border)]">`

Clase `<tr>`: `hover:bg-[var(--t-table-row-hover)] transition-colors`

Clase `<td>`:
- Sportiv: `px-4 py-3 text-white font-medium`
- Sumă Totală: `px-4 py-3 text-right font-bold text-amber-400 whitespace-nowrap`
- Nr. Facturi: `px-4 py-3 text-right text-slate-300`
- Cea Mai Veche Scadență: `px-4 py-3 text-slate-300 whitespace-nowrap`

### Carduri mobile

Wrapper: `md:hidden space-y-2`

Card individual:
```
bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3
```

Layout intern card:
```html
<div className="flex items-start justify-between gap-2">
  <div className="min-w-0">
    <p className="text-white font-semibold text-sm truncate">{numeSportiv}</p>
    <p className="text-slate-400 text-xs mt-0.5">{nrFacturi} {nrFacturi === 1 ? 'factură' : 'facturi'} neachitate</p>
  </div>
  <p className="text-amber-400 font-bold text-sm whitespace-nowrap shrink-0">{formatSum(sumaTotala)}</p>
</div>
<div className="flex items-center gap-3 mt-2">
  <span className="text-xs text-slate-500">Scadent din {formatDate(ceaMaiVecheScadenta)}</span>
</div>
```

### Empty State

Container: `<Card>` (din `components/ui.tsx`)

Conținut:
```html
<div className="flex flex-col items-center gap-3 py-12 text-center">
  <CheckCircleIcon className="w-10 h-10 text-emerald-400 opacity-60" />
  <p className="text-slate-300 font-semibold">Nicio restanță în intervalul selectat</p>
  <p className="text-slate-500 text-sm">Toți sportivii sunt la zi cu plățile.</p>
</div>
```

Notă: `CheckCircleIcon` (verde) — starea pozitivă de "fără restanțe" este un succes, nu un avertisment.

---

## Copywriting Contract

Sursa: D-03 din CONTEXT.md + pattern observat în RaportFinanciar.tsx. Limbă: română.

| Element | Copy |
|---------|------|
| Label tab | Restanțe |
| Label total | Total Restanțe |
| Subtext total | {N} sportivi cu restanțe |
| Subtext total (zero) | Niciun sportiv cu restanțe |
| CTA export CSV | CSV |
| CTA export PDF | PDF |
| Antet PDF | `{ClubNume} — Raport Restanțe` |
| Subtext PDF | `Generat: {data} · {N} sportivi` |
| Antet coloană 1 | Sportiv |
| Antet coloană 2 | Sumă Totală (RON) |
| Antet coloană 3 | Nr. Facturi |
| Antet coloană 4 | Cea Mai Veche Scadență |
| Empty state heading | Nicio restanță în intervalul selectat |
| Empty state body | Toți sportivii sunt la zi cu plățile. |
| Empty state (fără filtru) | Niciun sportiv cu restanțe. |
| Error export | Nu s-a putut genera exportul. Încercați din nou. |
| Placeholder lipsă dată | — |
| Label mobil sub sumă | {N} factură / {N} facturi neachitate |
| Label mobil data | Scadent din {data formatată ro-RO} |

**Niciun text destructiv în această fază** — tab-ul este read-only + export. Zero acțiuni de ștergere sau modificare.

---

## Formatare Date și Sume

**Sume RON** (funcția `formatSum` existentă în RaportFinanciar.tsx, linia 45–46):
```typescript
(n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
```
Exemplu: `1.234,50 RON`

**Date calendaristice** (funcția `formatDate` existentă în RaportFinanciar.tsx, linia 39–43):
```typescript
new Date(val.toString().slice(0, 10)).toLocaleDateString('ro-RO')
```
Exemplu: `15.06.2026`

**Câmp sursă dată scadență**: `plata.data` (nu `plata.data_scadenta` — câmpul TypeScript se numește `data`).

---

## Culori Semantice Specifice Tab Restanțe

| Situație | Culoare | Clasa |
|----------|---------|-------|
| Sumă totală datorată (> 0) | amber-400 | `text-amber-400` |
| Sumă totală (= 0, nicio restanță) | slate-500 | `text-slate-500` |
| Iconița ExclamationTriangle (tab) | amber-400 | inline cu icon |
| Iconița CheckCircle (empty state) | emerald-400 | `text-emerald-400` |
| Antet tabel PDF | amber `fillColor: [245, 158, 11]` | jspdf-autotable `headStyles.fillColor` |
| Buton export CSV (background) | slate-700/60 | `bg-slate-700/60` |
| Buton export PDF (background) | indigo-600/70 | `bg-indigo-600/70` |

---

## Interacțiuni și State-uri

| Interacțiune | Comportament |
|-------------|-------------|
| Click tab "Restanțe" | `setActiveTab('restante')` — redare imediată, zero request Supabase |
| Selectare preset perioadă | `PeriodFilterBar.onChange(s, e)` → `setRestanteStart(s)` + `setRestanteEnd(e)` → `useMemo` recalculează `restanteRows` |
| Resetare perioadă | Buton "✕ Șterge" din `PeriodFilterBar` → `setRestanteStart('')` + `setRestanteEnd('')` → toate restanțele clubului |
| Click Export CSV | `exportRestanteCSV(restanteRows, clubNume)` → download browser imediat |
| Click Export PDF | `exportRestantePDF(restanteRows, clubNume)` async → spinner implicit din browser, PDF descărcat |
| Hover rând tabel | `hover:bg-[var(--t-table-row-hover)]` — highlight discret |
| Butoane export cu 0 rânduri | `disabled` → `opacity-40 cursor-not-allowed` |

**State-uri locale noi** (nu în `useLocalStorage` — nu persistă între sesiuni):
```typescript
const [restanteStart, setRestanteStart] = useState('');
const [restanteEnd, setRestanteEnd] = useState('');
```

**Nu există**: modals de confirmare, acțiuni destructive, stare de loading (datele sunt deja în cache React Query).

---

## Responsive Breakpoints

| Breakpoint | Comportament |
|------------|-------------|
| < 768px (`md`) | Tabel ascuns (`hidden md:block`), carduri mobile vizibile (`md:hidden`) |
| < 640px (`sm`) | Label tab "Restanțe" ascuns (`hidden sm:inline` pe `<span>`), suma totală apare inline în bar |
| ≥ 640px | Butoanele export reduse la `py-1.5` (`sm:py-1.5`), suma totală apare la dreapta barului |
| ≥ 768px | Tabel desktop vizibil, carduri mobile ascunse |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | niciun bloc — design system intern | not applicable |
| third-party | niciun bloc — zero dependențe noi | not applicable |

Faza nu instalează niciun pachet nou. Toate librăriile (jsPDF 4.2.1, jspdf-autotable 5.0.7, date-fns 4.1.0) sunt deja prezente în `package.json` și folosite în codebase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
