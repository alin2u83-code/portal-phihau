# RAPORT DE CERCETARE
## Vizualizarea Facturilor și Plăților în Aplicații de Management pentru Cluburi Sportive
### Aplicare pentru Portalul Phi Hau — Club Arte Marțiale Qwan Ki Do

**Data generării**: 03 Aprilie 2026  
**Scop**: Identificarea celor mai bune practici din industrie și propuneri concrete de implementare

---

## CAPITOLUL 1: ANALIZA COMPARATIVĂ A APLICAȚIILOR EXISTENTE

### 1.1 TeamSnap

**Profil**: Platformă dominantă pentru echipe de tineret, orientată spre simplitate.

**Ce oferă în zona plăți/facturi:**
- Invoice generation direct din aplicație sau web, securizat prin Stripe Identity
- Tracking triplat: *cine* a plătit, *cum* a plătit, *când* a plătit — vizibil dintr-un singur ecran
- Automated reminders cu notificări push și email
- Installment plans integrate în procesul de înregistrare (plată în rate pe sezon)
- Deposit în cont bancar în 2 zile lucrătoare
- Comision: 3.25% + $1.50 per tranzacție

**Puncte forte**: Simplitate extremă, integrare completă înregistrare-plată, mobile-first.  
**Lipsă**: Nu are aging report, nu are dashboard financiar avansat, nu are vizualizare per familie complexă.

---

### 1.2 SportsEngine HQ

**Profil**: Platformă enterprise pentru organizații sportive mari (federații, ligi).

**Ce oferă:**
- Invoice centralizat cu colectare plăți înregistrare + taxe extra-sezon
- Tool de raportare cu reducere declarată de 50% din timpul de reconciliere lunară
- Toate tranzacțiile într-un singur loc securizat
- Fundraising integrat cu tracking financiar

**Relevanță pentru Phi Hau**: Potrivit pentru federații și structuri pe mai multe niveluri — aproape de contextul FRAM/FRQKD.  
**Lipsă**: Complex de configurat, cost ridicat, nu are specificitate pentru arte marțiale.

---

### 1.3 Mindbody Analytics 2.0

**Profil**: Lider pentru studiouri fitness/wellness, extins spre arte marțiale.

**Ce oferă (cele mai relevante pentru contextul Phi Hau):**

*Dashboard Payments Tab:*
- Centralizare completă a tuturor tranzacțiilor: sumă, data procesării, fee-uri, data depunerii în cont
- Filtrare pe sursă plată: Autopay, web, app, card, ACH
- Declined Payment Analysis — identifică cauza exactă a eșecurilor (card expirat, fonduri insuficiente)

*Raportare:*
- Revenue pe tip serviciu (clase, abonamente, retail, pachete)
- Filtre: interval dată, locație, staff, tip serviciu
- Export: CSV, PDF, Excel
- Integrare BI: Tableau, Power BI, Looker via Snowflake
- Date istorice accesibile din 2021 încolo

*Reconciliere bancară:*
- Matching automat depozite bancare cu tranzacțiile din sistem, cu deducerea fee-urilor de procesare

**Puncte forte**: Cel mai avansat dashboard financiar dintre platformele analizate.

---

### 1.4 Glofox (ABC Glofox)

**Profil**: Concurent Mindbody, orientat spre arte marțiale și fitness boutique.

**Ce oferă:**
- Dashboard unic pentru sănătate financiară + performanță instructori + activitate membri
- Procesatori multipli: Stripe, PayU, Braintree, Checkout.com
- Recurring memberships + drop-in fees + special events — toate vizibile unitar
- Consolidarea tuturor fluxurilor de venituri pe un singur ecran

**Puncte forte**: Cel mai bun pentru structura specifică artelor marțiale (membership recurring + taxe per eveniment).

---

### 1.5 Gymdesk ⭐ (Cel mai relevant pentru Phi Hau)

**Profil**: Soluție modernă dedicată exclusiv artelor marțiale și gym-urilor.

**Ce oferă — Billing Dashboard:**

*Dashboard Overview:*
- Grafic breakdown luna curentă: **Upcoming payments** + **Processed payments** + **Overdue payments** — trei valori distincte vizual
- Revenue history ultimele **12 luni** — grafic bar/line
- Tabel "Top 5 overdue payments" cu link direct la lista completă
- Tabel "Top 5 recent payments" cu opțiuni de refund

*Overdue Management:*
- Automatic retry schedule: re-încearcă la 2, 4, 7 zile după data inițială
- Notificări automate membri: card expirat + plată întârziată + link self-service
- Late fees adăugate automat la plata cu întârziere
- Daily billing report email pentru administrator

*Invoice Management:*
- Editare invoice: sumă, descriere, late fee, tax rate, discount, dată plată, metodă plată
- On-demand charges + recurring + scheduled
- Export date în software contabil extern

**De ce este Gymdesk cel mai aproape de Phi Hau**: Combină belt tracking + family memberships + billing proratat + Stripe — exact configurația din portalul Phi Hau.

---

### 1.6 Zen Planner

**Profil**: Specializat arte marțiale, cu accent pe progressia pe grade/centuri.

**Ce oferă:**
- Family accounts native — multiple memberships sub un singur cont părinte
- Class packs + progression-based billing (taxe diferite per grad)
- Belt/rank tracking integrat cu billing (taxa examen cuplată cu promovarea)
- Automated billing cu failed payment recovery

**Relevanță pentru Phi Hau**: Modelul de family accounts și billing legat de grade/examene este direct analog cu structura `familii` + `inscrieriExamene` din Phi Hau.

---

### 1.7 Martialytics

**Profil**: Cea mai specializată platformă pentru arte marțiale.

**Ce oferă:**
- Live reports pe KPI financiari: revenue growth vs income trends
- Overdue payment management cu identificare conturi problemă
- Automated recurring billing + family discounts + prorated billing
- Stripe integration nativă
- Economie declarată: 5-10 ore/săptămână salvate din colectare manuală

---

### 1.8 EZFacility

**Profil**: Platformă multi-sport, nu dedicată artelor marțiale.

**Ce oferă:**
- Rapoarte separate pe: memberships, POS transactions, payroll, package sales
- Export CSV/PDF/Excel/multiple formate
- Automated billing + payment reminders
- Inventory tracking + commission tracking

---

## CAPITOLUL 2: PATTERN-URI UI/UX IDENTIFICATE

### 2.1 Structura Dashboard Financiar — Ierarhia Informației

Toate platformele mature folosesc aceeași ierarhie pe 3 niveluri:

```
Nivel 1: KPI Cards (sus) — 4-6 metrici vizuale imediate
   └── Nivel 2: Grafice (mijloc) — trend pe 12 luni + breakdown curent
        └── Nivel 3: Tabele detaliate (jos) — liste cu acțiuni directe
```

**KPI Cards specifice (găsite în Gymdesk + Mindbody + Glofox):**
- Total încasat luna curentă
- Total restanțe (overdue)
- Plăți programate (upcoming)
- Rata de colectare (% din total datorat efectiv încasat)

**Exemplu concret Gymdesk**: Cele 3 valori afișate prominent pe dashboard — *upcoming*, *processed*, *overdue* — cu culori distincte: verde, albastru, roșu.

---

### 2.2 Status Badge-uri — Standard de Facto

| Status | Culoare | Aplicare în Phi Hau |
|--------|---------|---------------------|
| Achitat | Verde `#22c55e` | Existent ✓ |
| Achitat Parțial | Amber `#f59e0b` | Existent ✓ |
| Neachitat | Roșu `#ef4444` | Existent ✓ |
| **Scadent** (overdue) | Roșu intens + Bold | **Lipsă — de adăugat** |
| **Scadent Critic** (30+ zile) | Roșu pulsând | **Lipsă — de adăugat** |
| **Programat** (upcoming) | Albastru `#3b82f6` | **Lipsă** |

**Regula de accesibilitate (Carbon Design System)**: Badge-ul trebuie să folosească minim 2 din 3 elemente: culoare + formă/icon + text label. Contrast minim 3:1.

**Sub-status recomandat — "Scadent"**: Plată `Neachitat` + data scadentă < azi = status vizual diferit față de `Neachitat` viitor. Aceasta este distincția crucială care lipsește în Phi Hau.

---

### 2.3 Liste de Facturi — Pattern Filtrare Avansată

Standard identificat în toate platformele mature:

```
[Search global] [Status ▼] [Tip plată ▼] [Interval dată] [Sportiv/Familie ▼] [Export ▼]
────────────────────────────────────────────────────────────────────────────────────────
[☐] Sportiv     | Descriere        | Sumă      | Status     | Dată     | Acțiuni
────────────────────────────────────────────────────────────────────────────────────────
[☐] Popescu Ion | Abonament Ian    | 150 RON   | [Achitat]  | 05.01    | [👁] [✏] [💰]
[☐] Pop Maria   | Taxa Examen      | 80 RON    | [Scadent]  | 15.01    | [👁] [✏] [💰]
```

**Elemente esențiale identificate:**
1. **Checkbox bulk selection** — pentru plăți multiple (parțial existent în `PlatiScadente.tsx`)
2. **Search global** — filtrare pe nume sportiv/descriere (lipsă)
3. **Filter chips** — vizualizare filtre active cu ștergere individuală (lipsă)
4. **Sortare pe coloane** — dată, sumă, status (lipsă)
5. **Acțiuni inline** — vizualizare, editare, înregistrare plată (parțial existent)
6. **Paginare sau infinite scroll** — pentru volume mari (lipsă)

**Pattern "Grouping"** (găsit în Mindbody + Glofox):
- Group by Sportiv → sub-total per sportiv
- Group by Familie → sub-total per familie
- Group by Lună → sub-total per perioadă
- Group by Tip plată → sub-total per categorie

---

### 2.4 Aging Report — Pattern Standard Industrie (AR Aging)

Structura identificată din Versapay + QuickBooks + GrowthZone:

```
Aging Report — Restanțe la: 01.04.2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sportiv/Familie   │ Curent  │ 1-30 zile │ 31-60 zile │ 61-90 z │ 90+ zile │ TOTAL
──────────────────┼─────────┼───────────┼────────────┼─────────┼──────────┼──────
Popescu Ion       │   150   │     0     │    80      │    0    │    0     │  230
Familia Ionescu   │     0   │   300     │     0      │   150   │    0     │  450
Maria Georgescu   │     0   │     0     │     0      │    0    │   200    │  200
──────────────────┼─────────┼───────────┼────────────┼─────────┼──────────┼──────
TOTAL             │   150   │   300     │    80      │   150   │   200    │  880
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Coloanele de 90+ zile se colorează progresiv mai roșu (heat map). Click pe celulă → drill-down la facturile individuale.

---

### 2.5 Grafice Recomandate pentru Dashboard Financiar

**Grafic 1 — Revenue History (Bar Chart, 12 luni):**
- X: lunile calendaristice
- Y: sumă RON
- Serii: Achitat (verde) / Emis (albastru) — grouped sau stacked bar

**Grafic 2 — Breakdown pe Tip Plată (Donut/Pie):**
- Segmente: Abonamente, Taxe Examene, Taxe Competiții, Taxe Federale
- Procent + valoare absolută per segment

**Grafic 3 — Cashflow Forecast (Area Chart):**
- X: zilele/săptămânile viitoare (30-90 zile)
- Y: suma estimată de încasat (din plăți `Neachitat` cu data scadentă viitoare)

**Grafic 4 — Rata de Colectare per Lună (Line Chart):**
- Formula: `(suma_achitata / suma_totala_emisa) * 100`
- Target line la 95% — referință vizuală

**Bibliotecă recomandată**: `recharts` (React-first, lightweight, ușor de customizat cu temă dark)

---

### 2.6 Notificări Plăți Scadente — Best Practices

**Secvența optimă de reminder (implementată de Gymdesk):**

| Timing | Canal | Mesaj |
|--------|-------|-------|
| T-7 zile | Email | "Plata se apropie" |
| T-0 (ziua scadenței) | Email + SMS | "Plată scadentă azi" |
| T+3 zile | Email | "Plată întârziată — acționează acum" |
| T+7 zile | WhatsApp | Escaladare |
| T+14 zile | Email ferm | Mențiunea penalităților |
| T+30 zile | Manual | Escaladare administrator |

**Date de impact:**
- SMS: 98% open rate, citit în 3 minute
- WhatsApp: 98% open rate, răspuns 3-5x mai rapid vs email
- Implementarea acestei secvențe crește rata de colectare cu **60-80%**
- Ora optimă trimitere: 9-11am, marți-joi

**Portalul Phi Hau** are deja infrastructura de notificări în `utils/notifications` — lipsește orchestrarea automată a secvenței.

---

## CAPITOLUL 3: FUNCȚIONALITĂȚI RECOMANDATE — PRIORITIZATE

### 🔴 HIGH IMPACT (implementare prioritară)

#### H1. Sub-status "Scadent" pentru plăți restante

**Problema**: Aplicația actuală nu distinge între o factură `Neachitat` cu scadența mâine și una scadentă acum 60 de zile. Ambele arată identic.

**Soluție propusă**:

```typescript
// utils/paymentStatus.ts — fișier nou
export type PaymentDisplayStatus =
  | 'Achitat'
  | 'Achitat Parțial'
  | 'Neachitat'
  | 'Scadent'        // overdue: data scadentă < azi
  | 'Scadent Critic'; // overdue 30+ zile

export function getDisplayStatus(plata: Plata, zileToleranță = 0): PaymentDisplayStatus {
  if (plata.status === 'Achitat') return 'Achitat';
  if (plata.status === 'Achitat Parțial') return 'Achitat Parțial';

  const diffZile = Math.floor((Date.now() - new Date(plata.data).getTime()) / 86400000);

  if (diffZile > 30) return 'Scadent Critic';
  if (diffZile > zileToleranță) return 'Scadent';
  return 'Neachitat';
}

// Configurare badge-uri
export const STATUS_CONFIG = {
  'Achitat':         { cls: 'bg-green-600/20 text-green-400',   label: 'Achitat' },
  'Achitat Parțial': { cls: 'bg-amber-600/20 text-amber-400',   label: 'Achitat Parțial' },
  'Neachitat':       { cls: 'bg-slate-600/20 text-slate-300',   label: 'Neachitat' },
  'Scadent':         { cls: 'bg-red-600/20 text-red-400',       label: 'Scadent' },
  'Scadent Critic':  { cls: 'bg-red-900/40 text-red-300 font-bold animate-pulse', label: 'Scadent!' },
};
```

**Fișiere de actualizat**: `GestiuneFacturi.tsx`, `PlatiScadente.tsx`, `RaportFinanciar.tsx`, `FisaDigitalaSportiv.tsx`

---

#### H2. KPI Cards pe Dashboard Financiar

**Problema**: Nu există o vizualizare imediată a sănătății financiare a clubului.

**Soluție — 4 card-uri de top** în `RaportFinanciar.tsx`:

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Încasat Apr 2026 │ │ Total Restanțe   │ │ Rata Colectare   │ │ Plăți Scadente   │
│   3.450 RON      │ │   1.200 RON      │ │     88%          │ │    7 facturi     │
│ ↑ +12% vs mar    │ │   (12 facturi)   │ │ [████████░░]     │ │ Acțiune urgentă  │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

**Calcule necesare** (client-side din datele existente):
- Total încasat luna curentă = din `tranzactii` filtrate pe luna curentă
- Total restanțe = suma `rest_de_plata` pentru toate plățile `Neachitat`
- Rata colectare = `(suma_achitata_luna / suma_emisa_luna) * 100`
- Nr. plăți scadente = plăți cu `data < azi` și `status != 'Achitat'`

---

#### H3. Aging Report — Raport Vechime Restanțe

**Problema**: Nu există vizualizarea distribuției datoriilor pe intervale temporale.

**Soluție — RPC Supabase**:

```sql
-- supabase/functions/get_aging_report.sql
CREATE OR REPLACE FUNCTION get_aging_report(p_club_id UUID)
RETURNS TABLE (
  sportiv_id UUID, nume_complet TEXT, familie_id UUID,
  suma_curenta NUMERIC, suma_1_30 NUMERIC,
  suma_31_60 NUMERIC, suma_61_90 NUMERIC,
  suma_90_plus NUMERIC, total_restant NUMERIC
) AS $$
  SELECT
    s.id,
    s.nume || ' ' || s.prenume,
    s.familie_id,
    SUM(CASE WHEN (CURRENT_DATE - p.data::date) <= 0
        THEN GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - p.data::date) BETWEEN 1 AND 30
        THEN GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - p.data::date) BETWEEN 31 AND 60
        THEN GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - p.data::date) BETWEEN 61 AND 90
        THEN GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - p.data::date) > 90
        THEN GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0) ELSE 0 END),
    SUM(GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0))
  FROM plati p
  JOIN sportivi s ON s.id = p.sportiv_id
  WHERE COALESCE(p.club_id, s.club_id) = p_club_id
    AND p.status != 'Achitat'
  GROUP BY s.id, s.nume, s.prenume, s.familie_id
  HAVING SUM(GREATEST(p.suma - COALESCE(p.suma_incasata,0), 0)) > 0
  ORDER BY suma_90_plus DESC, suma_61_90 DESC;
$$ LANGUAGE sql SECURITY DEFINER;
```

**Componentă nouă**: `AgingReport.tsx` — tabel cu heat map pe coloanele de vechime

---

#### H4. Grafic Revenue History (12 luni)

**Instalare**: `npm install recharts`

**Implementare**:

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Date (client-side)
const revenueByMonth = useMemo(() => {
  const months: Record<string, { incasat: number; emis: number; luna: string }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    months[key] = {
      incasat: 0, emis: 0,
      luna: d.toLocaleString('ro-RO', { month: 'short', year: '2-digit' })
    };
  }
  tranzactii.forEach(t => {
    const key = t.data_platii?.slice(0, 7);
    if (key && months[key]) months[key].incasat += t.suma;
  });
  plati.forEach(p => {
    const key = p.data?.toString().slice(0, 7);
    if (key && months[key]) months[key].emis += p.suma;
  });
  return Object.values(months);
}, [tranzactii, plati]);

// JSX
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={revenueByMonth}>
    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
    <XAxis dataKey="luna" stroke="#94a3b8" />
    <YAxis stroke="#94a3b8" tickFormatter={v => `${v} RON`} />
    <Tooltip formatter={(v: number) => `${v.toFixed(2)} RON`} />
    <Legend />
    <Bar dataKey="emis" name="Emis" fill="#3b82f6" opacity={0.6} radius={[4,4,0,0]} />
    <Bar dataKey="incasat" name="Încasat" fill="#22c55e" radius={[4,4,0,0]} />
  </BarChart>
</ResponsiveContainer>
```

---

#### H5. Filter Chips Persistente (Filtre Vizibile Active)

**Problema**: Filtrele active nu sunt vizibile ca "chips" ștergibile individual.

**Soluție**:

```typescript
const activeFilterChips = useMemo(() => {
  const chips = [];
  if (filters.startDate) chips.push({ key: 'startDate', label: `De la: ${formatDate(filters.startDate)}` });
  if (filters.endDate)   chips.push({ key: 'endDate',   label: `Până la: ${formatDate(filters.endDate)}` });
  if (filters.metodaPlata) chips.push({ key: 'metodaPlata', label: `Metodă: ${filters.metodaPlata}` });
  if (filters.sportivId) {
    const s = sportivi.find(s => s.id === filters.sportivId);
    if (s) chips.push({ key: 'sportivId', label: `Sportiv: ${s.nume} ${s.prenume}` });
  }
  return chips;
}, [filters, sportivi]);

// Render chips
{activeFilterChips.map(chip => (
  <span key={chip.key}
    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/20
               text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-medium">
    {chip.label}
    <button onClick={() => setFilters(f => ({ ...f, [chip.key]: '' }))}
      className="ml-1 hover:text-white">×</button>
  </span>
))}
```

---

### 🟡 MEDIUM IMPACT (implementare faza 2)

#### M1. Donut Chart — Breakdown pe Tip Plată

Segmente: Abonamente / Taxe Examene / Taxe Competiții / Taxe Federale (FRAM/FRQKD) / Stagii / Altele

```typescript
const COLORS = {
  'Abonament':        '#3b82f6',
  'Taxa Examen':      '#8b5cf6',
  'Taxa Competitie':  '#f59e0b',
  'Taxa Stagiu':      '#06b6d4',
  'Echipament':       '#10b981',
  'Altele':           '#64748b',
};
```

---

#### M2. Family Account View — Vizualizare Consolidată per Familie

**Problema**: Nu există o pagină dedicată soldului per familie cu toți membrii.

**UI Pattern**:
```
┌─────────────────────────────────────────────────────┐
│ 👨‍👩‍👧 Familia Popescu                                │
│ Ionuț (Centura Galbenă) • Maria (Centura Portocalie) │
├─────────────────────────────────────────────────────┤
│ Sold curent: -150 RON  [2 facturi neachitate]        │
│ Ultima plată: 15.03.2026 — 200 RON (Transfer Bancar) │
├─────────────────────────────────────────────────────┤
│ [Înregistrează Plată]  [Vezi Istoric Complet]        │
└─────────────────────────────────────────────────────┘
```

---

#### M3. Export PDF per Sportiv/Familie

**Bibliotecă**: `jspdf` + `jspdf-autotable`

```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const exportPDF = (sportiv: Sportiv, platiSportiv: IstoricPlataDetaliat[]) => {
  const doc = new jsPDF();
  doc.text(`Situație Financiară — ${sportiv.nume} ${sportiv.prenume}`, 14, 20);
  doc.text(`Generată la: ${new Date().toLocaleDateString('ro-RO')}`, 14, 27);

  autoTable(doc, {
    head: [['Descriere', 'Sumă datorată', 'Suma achitată', 'Data', 'Status']],
    body: platiSportiv.map(p => [
      p.descriere,
      `${p.suma_datorata.toFixed(2)} RON`,
      `${(p.suma_incasata || 0).toFixed(2)} RON`,
      formatDate(p.data_emitere),
      p.status
    ]),
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 80, 150] },
  });

  doc.save(`situatie-financiara-${sportiv.nume}-${sportiv.prenume}.pdf`);
};
```

---

#### M4. Export CSV pentru Reconciliere Contabilă

```typescript
const exportCSV = (data: IstoricPlataDetaliat[], fileName: string) => {
  const headers = [
    'Data Emitere', 'Sportiv', 'Familie', 'Descriere', 'Tip',
    'Suma Datorată', 'Suma Achitată', 'Rest de Plată',
    'Status', 'Data Plată', 'Metodă Plată'
  ];

  const rows = data.map(p => [
    formatDate(p.data_emitere),
    p.nume_complet_sportiv || '',
    p.familie_id ? (familii.find(f => f.id === p.familie_id)?.nume || '') : '',
    p.descriere,
    (p as any).tip || '',
    p.suma_datorata.toFixed(2),
    (p.suma_incasata || 0).toFixed(2),
    (p.rest_de_plata || 0).toFixed(2),
    p.status,
    formatDate(p.data_plata_string),
    p.metoda_plata || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // \uFEFF = BOM pentru Excel cu caractere române corecte
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

#### M5. Secvență Automată Notificări Scadente

**Implementare**: Supabase Edge Function rulată zilnic via `pg_cron`.

```typescript
// supabase/functions/payment-reminders/index.ts
const SEQUENTA_NOTIFICARI = [
  { zilesScadenta: 0,   template: 'scadenta_azi',        canal: 'email+sms' },
  { zilesScadenta: 3,   template: 'intarziata_3_zile',   canal: 'email' },
  { zilesScadenta: 7,   template: 'intarziata_7_zile',   canal: 'whatsapp' },
  { zilesScadenta: 14,  template: 'intarziata_14_zile',  canal: 'email' },
  { zilesScadenta: 30,  template: 'escaladare_30_zile',  canal: 'email+sms' },
];
```

Infrastructura de notificări există deja în Phi Hau (`utils/notifications`) — lipsește orchestrarea automată.

---

#### M6. Cashflow Forecast (30 zile)

**Scop**: Proiecție a încasărilor așteptate în viitoarele 30 de zile.

```typescript
// Client-side — din plăți Neachitat cu data viitoare
const cashflowForecast = useMemo(() => {
  const azi = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const zi = new Date(azi);
    zi.setDate(azi.getDate() + i);
    const key = zi.toISOString().slice(0, 10);
    const suma = plati
      .filter(p => p.status !== 'Achitat' && p.data?.toString().slice(0, 10) === key)
      .reduce((s, p) => s + p.suma, 0);
    return { data: key, suma_asteptata: suma };
  });
}, [plati]);
```

---

### 🟢 LOW IMPACT (implementare opțională / faza 3)

#### L1. Reconciliere Bancară prin Import CSV Extras de Cont
- Parse CSV extras bancar → matching automat cu tranzacțiile din sistem
- Algoritm: sumă ± 1 RON + dată ± 3 zile + fuzzy matching pe nume

#### L2. Raport Comparativ An/An
- Grafic cu două serii: an curent vs an precedent (același BarChart cu 2 seturi de date)

#### L3. Pivot Table Interactiv
- Biblioteci: `react-pivottable` sau `FlexMonster`
- Complexitate mare, utilitate limitată pentru dimensiunea actuală a clubului

---

## CAPITOLUL 4: RECOMANDĂRI SPECIFICE PENTRU CONTEXTUL QWAN KI DO

### 4.1 Cicluri de Plată Specifice Artelor Marțiale

| Tip Plată | Frecvență | Sezonalitate | Particularitate |
|-----------|-----------|--------------|-----------------|
| Abonament Lunar | Lunar | Constantă | Familie = discount |
| Taxa Examen FRQKD | 2-4/an | Oct-Nov, Feb-Mar | Legată de promovare grad |
| Taxa Competiție | Variabilă | Mar-Mai, Sep-Oct | Per eveniment, per probă |
| Taxa Federală FRAM | Anuală | Sep-Oct | Per sportiv activ |
| Taxa Federală FRQKD | Anuală | Sep-Oct | Viza anuală |
| Stagii Tehnice | 2-4/an | Variabilă | Opțional |
| Echipamente | La cerere | Start sezon | One-time |

**Implicații pentru dashboard:**
- Luna septembrie-octombrie = vârf de generare facturi (taxe anuale + restart sezon)
- Cashflow forecast trebuie să evidențieze aceste vârfuri sezoniere
- Aging report filtrat per tip (taxele federale scadente au urgență diferită față de abonamente)

---

### 4.2 Structura Familie — Vizualizare Consolidată

**Problemă identificată**: Nu există o vizualizare consolidată a soldului per familie.

```typescript
interface FamilyFinancialView {
  familie: Familie;
  membri: Array<{
    sportiv: Sportiv;
    totalDatorat: number;
    totalAchitat: number;
    platiActive: Plata[];
    gradActual: string;
  }>;
  soldConsolidat: number;   // sold net familie (negativ = datorii)
  urmatoraScadenta: { plata: Plata; zile: number } | null;
}
```

---

### 4.3 Widget "Eligibilitate Examen" per Sportiv

**Problema**: Taxele federale și taxa de examen sunt tratate separat de înscrierea la examen.

```typescript
interface EligibilitateExamen {
  areVizaFederala: boolean;       // taxa FRQKD achitată an curent
  areTaxaExamenAchitata: boolean; // taxa examen sesiune curentă
  areAbonamentActiv: boolean;     // abonament curent achitat
  esteEligibil: boolean;          // AND logic
  motivBlocare?: string;
}
```

Widget vizibil în: profilul sportivului, lista de înscrieri, dashboard administrator.

---

### 4.4 Raport Lunar Specific — Situație Abonamente

```
SITUAȚIE ABONAMENTE — Aprilie 2026
═══════════════════════════════════════════════════════
Total sportivi activi:     45
Cu abonament achitat:      38  (84%)
Fără abonament luna asta:   7  (16%) ← prioritate colectare
Cu reducere familie:       12  (membrii în 5 familii)
═══════════════════════════════════════════════════════
Total de colectat:    6.750 RON
Total încasat:        5.700 RON
Rest de colectat:     1.050 RON
═══════════════════════════════════════════════════════
```

**Implementare**: Tab nou în `RaportFinanciar.tsx`, filtrat pe `tip = 'Abonament'`.

---

### 4.5 KPI-uri Specifice Clubului

| KPI | Formula | Target |
|-----|---------|--------|
| Rata Colectare Abonamente | `achitat_abonamente / emis_abonamente * 100` | >90% |
| Zile Medie Colectare (DSO) | `restante / (incasari_an / 365)` | <15 zile |
| % Sportivi cu Restanțe | `sportivi_cu_restante / total_activi * 100` | <10% |
| Revenue per Sportiv | `total_incasat / nr_sportivi_activi` | Benchmark |
| Rata Vize Federale Plătite | `vize_FRQKD_achitate / sportivi_activi * 100` | 100% pre-examen |

---

## CAPITOLUL 5: ROADMAP DE IMPLEMENTARE

### Sprint 1 — 1-2 săptămâni (HIGH IMPACT, fără dependențe noi)

| Task | Fișier(e) | Efort |
|------|-----------|-------|
| `utils/paymentStatus.ts` — funcție `getDisplayStatus()` | Fișier nou | 2h |
| Actualizare badge-uri cu sub-status "Scadent" / "Scadent Critic" | `GestiuneFacturi.tsx`, `PlatiScadente.tsx`, `RaportFinanciar.tsx` | 3h |
| KPI Cards (4 metrici) în tab Încasări | `RaportFinanciar.tsx` | 4h |
| Filter chips active cu ștergere individuală | `RaportFinanciar.tsx` | 2h |
| Tab "Situație Abonamente" lunar | `RaportFinanciar.tsx` | 4h |

---

### Sprint 2 — 2-3 săptămâni (GRAFICE + AGING)

| Task | Fișier(e) | Efort |
|------|-----------|-------|
| `npm install recharts` | — | 15 min |
| `RevenueBarChart.tsx` — grafic 12 luni | Componentă nouă | 4h |
| `PaymentTypePieChart.tsx` — donut breakdown tipuri | Componentă nouă | 3h |
| RPC `get_aging_report` în Supabase | Migrație SQL nouă | 3h |
| `AgingReport.tsx` — tabel cu heat map | Componentă nouă | 6h |

---

### Sprint 3 — 2-3 săptămâni (EXPORT + FAMILIE)

| Task | Fișier(e) | Efort |
|------|-----------|-------|
| `npm install jspdf jspdf-autotable` | — | 15 min |
| Export CSV cu BOM pentru Excel | `RaportFinanciar.tsx` | 2h |
| Export PDF per sportiv | `RaportFinanciar.tsx` + utilitar | 4h |
| `FamilyPaymentCard.tsx` — vizualizare consolidată familie | Componentă nouă | 6h |
| Widget "Eligibilitate Examen" în profilul sportivului | `FisaDigitalaSportiv.tsx` | 4h |

---

### Sprint 4 — 2-4 săptămâni (FORECAST + NOTIFICĂRI AUTO)

| Task | Fișier(e) | Efort |
|------|-----------|-------|
| `CashflowForecastChart.tsx` — AreaChart 30 zile | Componentă nouă | 4h |
| Supabase Edge Function `payment-reminders` | `supabase/functions/` | 8h |
| `pg_cron` job zilnic pentru triggering | Migrație SQL | 1h |
| Raport "Situație Taxe Federale" per an | `RaportFinanciar.tsx` tab nou | 3h |

---

## CONCLUZIE

Portalul Phi Hau are o **infrastructură solidă** (tipuri bine definite, DataContext, componentele existente, Supabase RPC). Principalele lacune față de best practices din industrie sunt:

| Lacună | Impact | Efort Rezolvare |
|--------|--------|-----------------|
| Lipsa sub-statusului "Scadent" | ⭐⭐⭐ Ridicat | 1-2 zile |
| Lipsa graficelor vizuale | ⭐⭐⭐ Ridicat | 3-5 zile |
| Lipsa KPI cards pe dashboard | ⭐⭐⭐ Ridicat | 1-2 zile |
| Lipsa aging report | ⭐⭐ Mediu | 3-4 zile |
| Export limitat (fără PDF individual) | ⭐⭐ Mediu | 2-3 zile |
| Vizualizarea per familie neconsolidată | ⭐⭐ Mediu | 3-4 zile |
| Notificări automate scadente | ⭐⭐ Mediu | 5-7 zile |
| Cashflow forecast | ⭐ Scăzut | 2-3 zile |

**Toate lacunele sunt rezolvabile cu codul și datele existente, fără schimbări majore de arhitectură.** Datele din `plati`, `tranzactii` și `view_istoric_plati_detaliat` conțin tot ce este necesar — lipsesc stratul de prezentare și câteva RPC-uri de agregare în Supabase.

---

## SURSE

- [TeamSnap Payments Features](https://www.teamsnap.com/for-business/features/payments)
- [SportsEngine Financials](https://www.sportsengine.com/hq/features/financials/)
- [Mindbody Analytics 2.0](https://www.mindbodyonline.com/business/reporting)
- [Gymdesk Billing Overview](https://docs.gymdesk.com/help/billing-overview)
- [Glofox Martial Arts Software](https://www.glofox.com/business-types/martial-arts-software/)
- [Zen Planner Martial Arts](https://zenplanner.com/martial-arts-studio-software/)
- [Martialytics](https://www.martialytics.com/)
- [EZFacility](https://www.ezfacility.com/)
- [AR Aging Reports — Versapay](https://www.versapay.com/resources/ar-aging-reports-how-to-create)
- [Aging Report — Stripe](https://stripe.com/resources/more/what-is-an-aging-report-what-is-in-one-and-how-to-use-it)
- [Payment Reminder Best Practices — Messente](https://messente.com/blog/payment-reminder-message)
- [Carbon Design System — Status Indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- [Essential KPIs for Sports Centres — Resasports](https://resasports.com/en/blog/kpis-sports-centre/)
- [Best Sports Team Accounting Software — Jersey Watch](https://www.jerseywatch.com/blog/sports-team-accounting-software)
- [Top 7 Martial Arts Payment Tools — Bytomic](https://www.bytomic.com/blogs/journal/top-7-martial-arts-payment-tools)
