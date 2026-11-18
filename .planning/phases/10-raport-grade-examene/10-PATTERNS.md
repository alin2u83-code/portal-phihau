# Phase 10: Raport Grade & Examene - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 6 (1 nou, 5 modificate)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `components/RaportGradeExamene.tsx` (NOU) | component (raport, 3 taburi) | transform (props -> useMemo agregari) | `components/Plati/RaportFinanciar.tsx` + `components/Plati/RevenueBarChart.tsx` | role-match |
| `types.ts` (union `View`, linia ~799) | config/tip | n/a | intrarea `'rapoarte-examen'` din union | exact |
| `components/LazyComponents.tsx` | config | n/a | linia 41 `RapoarteExamen`, linia 59 `ReportsDashboard` | exact |
| `components/AppRouter.tsx` (switch ~306-309) | route | request-response | `case 'raport-prezenta'` / `'raport-interval-examen'` | exact |
| `components/ReportsDashboard.tsx` (array `reports`) | component | n/a | propriul array `reports` | exact |
| `components/UserProfile/ExamHistory.tsx` (EXTINDE, nu duplica) | component | transform | el insusi | exact |

Nota GRD-04: sectiunea exista deja. `GradeTab` randeaza `<ExamHistory>` (GradeTab.tsx:55-61), care primeste deja `participari` (`filteredData.inscrieriExamene`), `examene`, `grade`, filtreaza pe `sportiv.id` si sorteaza descrescator. D-08 spune "extinde, nu duplica": modifica ExamHistory.tsx, nu crea alta sectiune. Nu e nevoie de props noi si nici de modificari in `UserProfile.tsx`.

## Pattern Assignments

### `components/RaportGradeExamene.tsx` (component, transform)

**Analog:** `components/Plati/RaportFinanciar.tsx` (structura, tab bar), `components/Plati/RevenueBarChart.tsx` (chart).

**Props/date:** RaportFinanciar primeste props din AppRouter (`onBack`, `onViewSportiv`). Pentru noua componenta, urmeaza `RaportPrezenta`/`RaportIntervalExamen` (case-urile din AppRouter nu paseaza liste, ci `onViewSportiv` + `onBack`). Datele vin din `useData().filteredData` (`grade`, `sesiuniExamene`, `inscrieriExamene`, `istoricGrade`, `sportivi`), la fel ca `UserProfile.tsx:69-72`:
```typescript
const participari = filteredData.inscrieriExamene;
const examene = filteredData.sesiuniExamene;
const grade = useData().grade;
const istoricGrade = filteredData.istoricGrade;
```
Verifica daca `grade` vine din `filteredData.grade` (CONTEXT) sau `useData().grade` (folosit in UserProfile) si alege varianta deja folosita.

**Imports** (RaportFinanciar.tsx:1-3, 14, 18, 22):
```typescript
import React, { useMemo, useState } from 'react';
import { Card } from './ui';            // din components/ => './ui'
import { useData } from '../contexts/DataContext';
import { formatNume } from '../utils/formatareSportiv';
import { useStareVizualizare } from '../hooks/useStareVizualizare'; // optional
import { parseDurationToMonths } from '../utils/eligibility';
import { differenceInMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
```
Exporturi din ui.tsx: `Card`, `Badge` (variant green/red/amber/blue/slate, ui.tsx:681), `EmptyState` ({icon,title,description}, ui.tsx:288), `StatCard` ({label,value,icon,accentColor}, ui.tsx:309), `Skeleton` (ui.tsx:649).

**Stare tab** (RaportFinanciar.tsx:60; CONTEXT cere useState simplu):
```typescript
const [activeTab, setActiveTab] = useStareVizualizare<'incasari' | ...>('raport-financiar-tab', 'incasari');
// Faza 10: useState<'distributie' | 'promovabilitate' | 'eligibili'>('distributie')
```

**Tab bar** (RaportFinanciar.tsx:474-486). UI-SPEC cere abateri: `gap-2`, `px-4 py-2`, `bg-[var(--t-primary)]` in loc de `bg-indigo-600`, eticheta vizibila pe mobil (fara `hidden sm:inline`), `role="tablist"`/`role="tab"`/`aria-selected`:
```tsx
<div className="flex bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl p-1 gap-1 overflow-x-auto scrollbar-none">
  {tabs.map(t => (
    <button key={t.id} onClick={() => setActiveTab(t.id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shrink-0 ${
        activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--t-text-muted)] hover:text-white hover:bg-[var(--t-surface)]'}`}>
      {t.icon}<span className="hidden sm:inline">{t.label}</span>
```
Taburile se definesc ca array `{ id: '...' as const, label, icon: <X className="w-4 h-4" /> }` (RaportFinanciar.tsx:459-469).

**Chart** (RevenueBarChart.tsx:71-91). Copiaza scheletul, dar inlocuieste hex-urile cu `var(--t-*)` conform UI-SPEC (culoare uniforma `var(--t-primary)`, fara `Cell`):
```tsx
<ResponsiveContainer width="100%" height={220}>
  <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />   // -> var(--t-border)
    <XAxis dataKey="luna" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.07)' }} />
    <Bar dataKey="incasat" radius={[4, 4, 0, 0]} maxBarSize={48}>
```
CustomTooltip (RevenueBarChart.tsx:33-43): `({ active, payload, label }) => { if (!active || !payload?.length) return null; return <div ...>` — retine garda, restilizeaza cu `bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-4 py-2 text-sm`.

**Eligibilitate GRD-03** — logica din `utils/eligibility.ts` (adaptata la "azi"):
- `parseDurationToMonths(str)` (eligibility.ts:15-25), export direct.
- Grad urmator (eligibility.ts:73): `sortedGrades.find(g => g.ordine === currentGrade.ordine + 1)`; fara grad urmator = excluzi.
- Varsta (eligibility.ts:79): `ageAtExam < nextGrade.varsta_minima` -> neeligibil; foloseste `getAgeOnDate(sportiv.data_nasterii, azi)` (verifica sursa importului in capul eligibility.ts, linia 1-14).
- Data de referinta (eligibility.ts:94-96) — fallback la `data_inscrierii`:
```typescript
const lastPromotionDate = lastPromotionSesiuneData ? new Date(lastPromotionSesiuneData) : new Date(sportiv.data_inscrierii);
const monthsToWait = parseDurationToMonths(nextGrade.timp_asteptare);
```
Diferenta fata de analog (D-04): sursa datei = `istoricGrade` (max `data_obtinere` unde `grad_id === sportiv.grad_actual_id` si `sportiv_id` egal), NU inscrieriExamene. Parsare data ca in UserProfile.tsx:194-197 (`.toString().slice(0,10)` + `'T00:00:00'`) pentru a evita offset UTC. Exclude sportivii fara `grad_actual_id` (D-05). `Timp La Grad = differenceInMonths(new Date(), lastPromotionDate)`; eligibil daca `>= monthsToWait` si varsta ok. Sortare desc dupa luni.

**Rand clicabil** (UI-SPEC): `role="button" tabIndex={0}` + Enter/Space -> `onViewSportiv(sportiv)`; aria-label "Deschide profilul sportivului {nume}"; `formatNume(sportiv)`. Props: `onViewSportiv`, `onBack` (la fel ca `Lazy.RaportPrezenta`).

**Tabel** (stil din GradeTab.tsx:71-84): wrapper `overflow-hidden rounded-lg border border-[var(--t-border)]`, antet `style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}`, `divide-y divide-[var(--t-border)]`, hover `hover:bg-[var(--t-table-row-hover)]`.

**GRD-02:** din `sesiuniExamene` + `inscrieriExamene` grupate pe `sesiune_id`; Prezenti = `rezultat` nenul si != 'Neprezentat'; Promovati = 'Admis'. Valorile `rezultat` verificate in ExamHistory.tsx:84-86 ('Admis'/'Respins'; `!rezultat` = in asteptare).

**Error handling:** raport read-only fara mutatii; fara try/catch. Foloseste `EmptyState` per tab (copy din UI-SPEC).

---

### `types.ts` (union View, linia 799)
Adauga `| 'raport-grade-examene'` langa `'rapoarte-examen'` (linia 799, linie lunga — editeaza cu Grep/Edit pe sirul exact `'rapoarte-examen'`).

### `components/LazyComponents.tsx`
Copiaza forma de la liniile 41 si 59:
```typescript
export const RapoarteExamen = lazy(() => import('./GestiuneExamene/RapoarteExamen').then(m => ({ default: m.RapoarteExamen })));
export const ReportsDashboard = lazy(() => import('./ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
// nou:
export const RaportGradeExamene = lazy(() => import('./RaportGradeExamene').then(m => ({ default: m.RaportGradeExamene })));
```

### `components/AppRouter.tsx`
Copiaza `case 'raport-interval-examen'` (linii 308-309), langa el:
```tsx
case 'raport-interval-examen':
    return renderProtected(<Lazy.RaportIntervalExamen onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} />, isAtLeastInstructor);
// nou:
case 'raport-grade-examene':
    return renderProtected(<Lazy.RaportGradeExamene onViewSportiv={onViewSportiv} onBack={handleBackToDashboard} />, isAtLeastInstructor);
```
`rapoarte` (linia 300-301) foloseste `isAtLeastInstructor`; pastreaza acelasi guard (D-02). Datele vin din `useData()` in componenta, nu prin props (ca RaportPrezenta). Nu atinge linia 345 (`rapoarte-examen`).

### `components/ReportsDashboard.tsx`
Adauga in `reports` (linii 14-19) o intrare dupa `Rapoarte Examen`; importa `TrendingUpIcon` din `./icons` (exista, folosit in RaportFinanciar.tsx:5):
```typescript
{ label: 'Analiză Grade', icon: TrendingUpIcon, view: 'raport-grade-examene' },
```
Fara `params` -> ruleaza `onNavigate(report.view as View)` (linia 30). Cardul reutilizeaza markup-ul existent (linii 26-38).

### `components/UserProfile/ExamHistory.tsx` (GRD-04, extindere)
Deja: filtrare pe sportiv, sortare desc dupa data sesiunii (linii 18-34), badge rezultat, `Card` cu titlu "Istoric Examene" (linii 55-61). Lipsesc fata de D-08/UI-SPEC: coloana/afisare explicita "Sesiune" (nume/denumire) — verifica campul in `SesiuneExamen` (acum arata `locatie_nume || localitate`, linia 97) — si stare "Neprezentat" (acum doar Admis/Respins/in asteptare, linii 84-107). Empty state curent (linia 50): inlocuieste cu `EmptyState` conform copy-ului UI-SPEC ("Niciun examen inregistrat"). Pastreaza butonul `onNavigateToExam` (API existent, constrangere "nu se sparge API-ul"). Badge-urile pot trece pe `Badge` din ui.tsx (green/red/slate). Nu modifica semnatura props.

## Shared Patterns

### Guard de rol
**Sursa:** `components/AppRouter.tsx:300-301`, `renderProtected(<.../>, isAtLeastInstructor)`. **Se aplica la:** case-ul nou.

### Tokeni de tema (fara hex)
**Sursa:** tabele in `UserProfile/GradeTab.tsx:74,82,84`. Toate culorile noi prin `var(--t-*)`; evita `bg-indigo-600`/hex din RevenueBarChart/RaportFinanciar (UI-SPEC deviaza intentionat).

### Formatare
`formatNume` din `utils/formatareSportiv`; data `new Date(s.slice(0,10)).toLocaleDateString('ro-RO')` (RaportFinanciar.tsx:45-49 `formatDate`, definit local, copiaza).

## No Analog Found

| Fisier | Motiv |
|---|---|
| Rand tabel clicabil cu `role="button"` + tastatura | Nu exista analog exact; `SportivLink` (RaportFinanciar.tsx:445-457) e buton in celula, nu rand. Foloseste specificatia UI-SPEC. |
| Card-uri mobile pentru taburile 2 si 3 | Urmeaza `hidden md:block` / `md:hidden` din RaportFinanciar (cauta in fisier); fara excerpt verificat aici. |

## Metadata

**Scope cautare:** `components/`, `components/Plati/`, `components/UserProfile/`, `utils/eligibility.ts`, `types.ts`
**Fisiere citite:** ReportsDashboard, RaportFinanciar (partial), RevenueBarChart, eligibility, GradeTab, ExamHistory, fragmente AppRouter/LazyComponents/UserProfile/ui.
**Nu verificat:** continutul `getAgeOnDate` (import), forma exacta `SesiuneExamen` (camp denumire), existenta `ChevronRightIcon`/`ClipboardCheckIcon`/`UsersIcon` in icons (primele doua folosite deja in alte fisiere), randul AppRouter 345 (linie omisa ca lunga).
**Data:** 2026-11-18
