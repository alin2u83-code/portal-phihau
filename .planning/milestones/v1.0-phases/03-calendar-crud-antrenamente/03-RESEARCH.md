# Phase 3: Calendar & CRUD Antrenamente - Research

**Researched:** 2026-06-15
**Domain:** Calendar lunar React (Tailwind grid), CRUD `program_antrenamente`, Supabase mutations
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Grid lunar 7 coloane (Luni–Duminică), 4-6 rânduri — div-uri Tailwind fără librărie externă. Zero dependențe noi.
- **D-02:** Navigație: săgeți prev/next lună. Header: "Lună An" (ex: "Iunie 2026"). Fără buton Jump-to-today.
- **D-03:** Dot-uri colorate pe zile: verde = planificat/efectuat, roșu = anulat. Numărul maxim vizibil per zi e la discretia Claude (ex: 3 dots + "..." dacă mai mult).
- **D-04:** Ziua de azi: border indigo + text bold. Consistentă cu pattern-ul portalului.
- **D-05:** Panel fix dedesubt grilei (nu modal, nu inline expand). Ziua selectată = highlight activ.
- **D-06:** Dacă ziua nu are antrenamente: mesaj "Niciun antrenament pe [data]" + buton primar "Adaugă Antrenament".
- **D-07:** Per antrenament în panel: Ora start–sfârșit | Badge status | Butoane: [Anulează] [Șterge] (și [Reactivează] dacă status='anulat'). Compact, pe un rând.
- **D-08:** Modal dedicat pentru adăugare. Câmpuri: Data (pre-filled cu ziua selectată), Ora start, Ora sfârșit. `is_recurent=false`. Submit → INSERT.
- **D-09:** Buton "Adaugă Antrenament" în header-ul tab-ului Antrenamente (colț dreapta sus), mereu vizibil.
- **D-10:** Buton "Anulează" → modal mic cu textarea "Motiv anulare" (OPȚIONAL). Submit → UPDATE status='anulat' + motiv_anulare (sau NULL).
- **D-11:** Anulare REVERSIBILĂ. Buton [Reactivează] pe antrenamentele anulate → UPDATE status='planificat', motiv_anulare=null.
- **D-12:** Hard delete cu `ConfirmButton` (din ui.tsx) → DELETE din `program_antrenamente`.
- **D-13 (Claude's Discretion):** Hook-ul existent `useCalendarView.ts` are deja logica de fetch lunar + insert one-off. Planner decide reutilizare directă vs query React Query local.

### Deferred Ideas (OUT OF SCOPE)

- Jump-to-today buton (nav calendar)
- Tip antrenament (regular/stagiu/examen) în formularul de adăugare — v2
- Calendar săptămânal (week view) — v2
- WhatsApp la anulare antrenament — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | Tab Antrenamente din GrupaDetailView afișează calendar lunar cu dot-uri colorate pe zile (verde=planificat/efectuat, roșu=anulat) | Grid Tailwind, `useCalendarView.fetchAntrenamente`, status din DB confirmat |
| CAL-02 | Clic pe zi expandează panel dedesubt cu lista antrenamentelor zilei, statusul vizual și acțiunile Anulează/Șterge | Pattern `selectedDate` din `useCalendarView`, panel div sub grid |
| CAL-03 | Modal "Anulare Antrenament" cu textarea motiv (opțional) → UPDATE status='anulat' + motiv_anulare | Supabase `.update()` pe `program_antrenamente`, coloana motiv_anulare confirmată în migrație Phase 1 |
| CAL-04 | Buton "Adaugă Antrenament" → formular one-off (grupă pre-filled, dată, oră start, oră sfârșit) → INSERT cu `is_recurent=false` | `useCalendarView.handleSaveCustom` pentru is_recurent=false, Modal din ui.tsx |
</phase_requirements>

---

## Summary

Faza 3 înlocuiește placeholder-ul `TabAntrenamente` din `GrupaDetailView.tsx` cu un calendar lunar funcțional implementat exclusiv cu div-uri Tailwind CSS. Întreaga logică de date există deja în `hooks/useCalendarView.ts`: fetch lunar din `program_antrenamente`, insert one-off via `handleSaveCustom`, și state management pentru luna afișată + ziua selectată.

Nivelul de risc tehnic este scăzut: toate primitivele sunt prezente în codebase (hook, tipuri, design system, icoane, DB schema). Munca constă în compunerea acestora într-o componentă `TabAntrenamente` completă cu 3 sub-piese: (1) CalendarGrid, (2) DayPanel dedesubt, (3) două modals (adăugare + anulare).

Singura decizie rămasă la discreția plannerului: dacă `TabAntrenamente` consumă `useCalendarView` direct (simplu, DRY) sau dacă își creează propriul `useQuery` React Query pentru fetch lunar (mai consistent cu pattern-ul din `TabSportivi`). Recomandarea cercetării: reutilizează `useCalendarView` direct — evită duplicarea logicii de generare a intervalului lunar.

**Recomandare primară:** Reutilizează `useCalendarView(grupa.id)` în `TabAntrenamente`. Adaugă 2 funcții noi direct în hook sau local în componentă: `handleAnulare(id, motiv)` și `handleReactivare(id)` și `handleStergere(id)`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Afișare calendar lunar (grid) | Browser / Client | — | Pure UI state, dată locală |
| Fetch antrenamente lună curentă | React Query / Hook | Supabase | `useCalendarView.fetchAntrenamente` |
| INSERT antrenament one-off | Browser / Client → Supabase | — | `handleSaveCustom` în hook |
| UPDATE status='anulat' / 'planificat' | Browser / Client → Supabase | — | Mutation directă `.update()` |
| DELETE antrenament | Browser / Client → Supabase | — | `.delete().eq('id', id)` cu confirmare |
| Calcul celule calendar (prima zi din lună) | Browser / Client | — | `new Date(year, month, 1).getDay()` |
| Badge status (planificat/anulat/efectuat) | Browser / Client | — | `<Badge>` din ui.tsx cu variant corespunzătoare |

---

## Standard Stack

### Core (toate [VERIFIED: codebase grep])

| Library | Version | Purpose | Observație |
|---------|---------|---------|------------|
| React | 18.3.1 | UI, hooks, state local | Deja instalat |
| TypeScript | 5.5.3 | Type safety | Deja instalat |
| Tailwind CSS | 3.4.6 | Grid calendar, stilizare | Deja instalat |
| @tanstack/react-query | 5.90.21 | Cache invalidare după mutații | Deja instalat |
| @supabase/supabase-js | 2.98.0 | Mutations (update, delete, insert) | Deja instalat |

### Reutilizate din codebase [VERIFIED: codebase grep]

| Asset | Locație | Ce oferă |
|-------|---------|----------|
| `useCalendarView` | `hooks/useCalendarView.ts` | `fetchAntrenamente`, `handleSaveCustom`, `date`, `setDate`, `selectedDate`, `setSelectedDate`, `todayLocal`, `antrenamente`, `loading` |
| `formatTime` | `utils/date.ts` | Formatare `HH:MM:SS` → `HH:MM` |
| `Modal` | `components/ui.tsx` | Container modal adăugare + anulare |
| `Button` | `components/ui.tsx` | Acțiuni (Adaugă, Anulează, Reactivează) |
| `ConfirmButton` | `components/ui.tsx` | Delete cu confirmare inline (D-12) |
| `Badge` | `components/ui.tsx` | Status vizual (variant: green/red/amber) |
| `Input` | `components/ui.tsx` | Câmpuri dată/oră în modal adăugare |
| `ChevronLeftIcon`, `ChevronRightIcon` | `components/icons.tsx` | Navigație lună prev/next |
| `PlusIcon` | `components/icons.tsx` | Buton adaugă |
| `XCircleIcon` | `components/icons.tsx` | Buton anulare |
| `TrashIcon` | `components/icons.tsx` | Buton ștergere |
| `CheckCircleIcon` | `components/icons.tsx` | Buton reactivare |

**Nicio dependență nouă necesară.** [VERIFIED: codebase grep]

---

## Package Legitimacy Audit

Nu se instalează pachete noi în această fază. Toate dependențele sunt deja în `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
GrupaDetailView (tab='antrenamente')
       │
       ├── [header] Buton "Adaugă Antrenament" (D-09)
       │
       └── TabAntrenamente
             │
             ├── useCalendarView(grupa.id)          ← hook existent
             │     ├── fetchAntrenamente()           ← GET lunar din Supabase
             │     ├── handleSaveCustom()            ← INSERT one-off
             │     ├── date / setDate                ← luna curentă
             │     ├── selectedDate / setSelectedDate ← ziua selectată
             │     ├── antrenamente[]                ← date din DB
             │     └── todayLocal                    ← azi (sv-SE)
             │
             ├── CalendarGrid (calculat inline)
             │     ├── Header: "Lună An" + ChevronLeft/Right
             │     ├── Zilele săptămânii (L M M J V S D)
             │     └── Celule [1..N]
             │           ├── Număr zi
             │           ├── Dots: max 3 + "..." dacă mai mult
             │           │     ├── verde → status planificat/efectuat
             │           │     └── roșu  → status anulat
             │           └── onClick → setSelectedDate(data)
             │
             ├── DayPanel (dedesubt, fix, dacă selectedDate != null)
             │     ├── [ziua fără antrenamente] → mesaj + buton Adaugă
             │     └── [per antrenament]
             │           ├── Ora start–sfarsit (formatTime)
             │           ├── Badge status (green/red/amber)
             │           ├── Buton Anulează → deschide ModalAnulare
             │           ├── ConfirmButton Șterge → DELETE Supabase
             │           └── Buton Reactivează (doar dacă status=anulat)
             │
             ├── ModalAdaugare (isOpen controlat cu useState)
             │     ├── Input data (type="date", pre-filled cu selectedDate)
             │     ├── Input ora_start (type="time")
             │     ├── Input ora_sfarsit (type="time")
             │     └── Submit → handleSaveCustom({ is_recurent: false, ... })
             │
             └── ModalAnulare (isOpen + antrenamentId state)
                   ├── Textarea motiv_anulare (OPȚIONAL)
                   └── Submit → supabase.update({ status: 'anulat', motiv_anulare })
                                → fetchAntrenamente()
```

### Structura modificărilor (fișiere afectate)

```
components/Grupe/
└── GrupaDetailView.tsx       ← FIȘIERUL PRINCIPAL de modificat
      ├── TabAntrenamente     ← înlocuiește placeholder-ul (liniile 24-36)
      │     ├── CalendarGrid  ← subcomponentă internă (definită în același fișier)
      │     ├── DayPanel      ← subcomponentă internă
      │     ├── ModalAdaugare ← componentă internă cu useState
      │     └── ModalAnulare  ← componentă internă cu useState
      └── GrupaDetailView     ← adaugă buton header (D-09, zona liniei 252-260)

hooks/useCalendarView.ts      ← POSIBIL de extins cu handleAnulare/handleReactivare/handleStergere
                                 (sau aceste funcții se definesc local în TabAntrenamente)
```

### Pattern 1: Calcul grid calendar lunar

```typescript
// [VERIFIED: standard JS Date API, ASSUMED pattern]
// Calculează offset-ul primei zile din lună (0=Duminică → 6=Sâmbătă în JS)
// Portalul folosește Luni ca primă zi a săptămânii
function getCalendarCells(year: number, month: number): (string | null)[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // getDay(): 0=D, 1=L, ..., 6=S → transformăm în Luni-first: (getDay() + 6) % 7
    const startOffset = (firstDay.getDay() + 6) % 7; // 0=Luni, 6=Duminică
    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push(dateStr);
    }
    return cells;
}
```

### Pattern 2: Navigare lună (compatibil cu `useCalendarView.date`)

```typescript
// [VERIFIED: pattern din useCalendarView.ts - date e 'YYYY-MM-DD']
const navigatMonth = (direction: -1 | 1) => {
    const d = new Date(date); // date din useCalendarView
    d.setMonth(d.getMonth() + direction);
    setDate(d.toLocaleDateString('sv-SE')); // setDate din useCalendarView
};
// Derivate pentru afișare:
const currentYear = parseInt(date.substring(0, 4));
const currentMonth = parseInt(date.substring(5, 7)) - 1; // 0-indexed pentru Date()
```

### Pattern 3: Grupare antrenamente pe zile (pentru dots + panel)

```typescript
// [ASSUMED: pattern standard React]
const antrenamenteByDate = useMemo(() => {
    const map: Record<string, Antrenament[]> = {};
    antrenamente.forEach(a => {
        if (!map[a.data]) map[a.data] = [];
        map[a.data].push(a);
    });
    return map;
}, [antrenamente]);
```

### Pattern 4: Mutation UPDATE status (anulare/reactivare)

```typescript
// [VERIFIED: pattern din useCalendarView.ts - supabase client]
const handleAnulare = async (id: string, motiv: string | null) => {
    const { error } = await supabase
        .from('program_antrenamente')
        .update({ status: 'anulat', motiv_anulare: motiv || null })
        .eq('id', id);
    if (error) { showError('Eroare anulare', error.message); return; }
    showSuccess('Succes', 'Antrenamentul a fost anulat.');
    await fetchAntrenamente(); // refetch lunar
};

const handleReactivare = async (id: string) => {
    const { error } = await supabase
        .from('program_antrenamente')
        .update({ status: 'planificat', motiv_anulare: null })
        .eq('id', id);
    if (error) { showError('Eroare reactivare', error.message); return; }
    showSuccess('Succes', 'Antrenamentul a fost reactivat.');
    await fetchAntrenamente();
};
```

### Pattern 5: DELETE cu ConfirmButton

```typescript
// [VERIFIED: ConfirmButton din ui.tsx]
<ConfirmButton
    variant="danger"
    size="sm"
    onConfirm={() => handleStergere(antrenament.id)}
    confirmText="Ești sigur?"
    confirmLabel="Da"
    cancelLabel="Nu"
>
    <TrashIcon className="w-4 h-4" />
</ConfirmButton>
```

### Pattern 6: Badge status → variant ui.tsx

```typescript
// [VERIFIED: Badge din ui.tsx are variant: 'green' | 'red' | 'amber' | 'blue' | 'slate']
const statusVariant = (status: string | undefined) => {
    if (status === 'planificat') return 'green';
    if (status === 'anulat') return 'red';
    if (status === 'efectuat') return 'amber';
    return 'slate';
};
// Utilizare:
<Badge variant={statusVariant(antrenament.status)}>
    {antrenament.status || 'planificat'}
</Badge>
```

### Pattern 7: Date pre-filled în Modal adăugare

```typescript
// [VERIFIED: pattern din useCalendarView.ts - toLocaleDateString('sv-SE')]
// selectedDate din hook e deja 'YYYY-MM-DD' — direct compatibil cu <input type="date">
const [formData, setFormData] = useState({
    data: selectedDate || todayLocal,
    ora_start: '18:00',
    ora_sfarsit: '19:30',
});
// La deschidere modal, re-sync cu selectedDate:
useEffect(() => {
    if (isModalAdaugareOpen) {
        setFormData(f => ({ ...f, data: selectedDate || todayLocal }));
    }
}, [isModalAdaugareOpen, selectedDate]);
```

### Anti-Patterns de evitat

- **Anti-pattern: getDay() fără ajustare Luni-first** — JS `getDay()` returnează 0=Duminică. Calendarul portalului pornește de Luni. Formula corectă: `(getDay() + 6) % 7`.
- **Anti-pattern: new Date(dateStr) pentru comparații** — Decalaj UTC poate schimba ziua. Folosește mereu `toLocaleDateString('sv-SE')` pentru YYYY-MM-DD local, ca în `todayLocal` din hook. [VERIFIED: pattern documentat în useCalendarView.ts]
- **Anti-pattern: staleTime=0 pe query antrenamente** — Dacă se creează un useQuery local, setează staleTime minim 30000ms pentru a evita fetch la fiecare render al panelului.
- **Anti-pattern: dependență pe grupa (obiect) în useEffect** — Ca în TabOrar (linia 47): dependency trebuie să fie `grupa.id` (string), nu `grupa` (obiect), altfel infinite loop.
- **Anti-pattern: invalidateQueries(['grupe']) după mutații antrenamente** — `program_antrenamente` nu face parte din queryKey `['grupe']`. Refetch-ul se face direct prin `fetchAntrenamente()` din `useCalendarView`, nu prin invalidarea cache-ului global.
- **Anti-pattern: new Date(year, month + 1, 0) cu month 0-indexed vs 1-indexed** — `date` din useCalendarView e `YYYY-MM-DD`, iar `parseInt(date.substring(5,7)) - 1` dă month 0-indexed pentru `new Date()`.

---

## Don't Hand-Roll

| Problemă | Nu construi | Folosește în schimb | Motivul |
|----------|-------------|---------------------|---------|
| Confirm inline pe buton Șterge | Propriul modal de confirmare | `ConfirmButton` din `components/ui.tsx` | Deja implementat, auto-reset după 3s, pattern stabilit în proiect |
| Badge status colorat | `<span>` cu clase Tailwind custom | `<Badge variant="green/red/amber">` din ui.tsx | Folosește variabilele CSS de temă (`--t-status-*`), consistent cu restul portalului |
| Modal container | `<div>` custom cu backdrop | `<Modal>` din ui.tsx | Gestionează Escape, portal în `document.body`, z-index, accesibilitate |
| Formatare oră din DB | `time.split(':').slice(0,2).join(':')` | `formatTime` din `utils/date.ts` | Același helper folosit în GenerareAntrenamenteModal și GrupaCard |
| Fetch lunar antrenamente | Query Supabase direct în componentă | `useCalendarView(grupa.id)` | Deja are fetch + loading state + erori; evită duplicare |

---

## Runtime State Inventory

> Faza 3 nu este o fază de redenumire/refactorizare/migrare. Secțiunea omisă.

---

## Common Pitfalls

### Pitfall 1: Calcul offset prima zi a săptămânii (Luni-first vs Sunday-first)

**Ce merge greșit:** JavaScript `new Date(year, month, 1).getDay()` returnează 0 pentru Duminică. Dacă se folosește direct ca offset de celule goale, Lunile care încep Luni vor afișa 1 celulă goală în loc de 0.

**De ce se întâmplă:** Standardul JS/ECMAScript pornește săptămâna de Duminică. Calendarul portalului (afișat L-D) pornește de Luni.

**Cum se evită:** Formula corectă: `const offset = (firstDay.getDay() + 6) % 7;` — dă 0 pentru Luni, 6 pentru Duminică.

**Semn de avertizare:** Zilele calendarului apar decalate față de headerul L/M/M/J/V/S/D.

---

### Pitfall 2: Decalaj UTC la comparația `data === todayLocal`

**Ce merge greșit:** `new Date().toISOString().substring(0, 10)` poate returna ziua anterioară în timezone-uri UTC+. Ziua de azi ar apărea incorect în calendar.

**De ce se întâmplă:** `toISOString()` returnează data UTC, nu locală.

**Cum se evită:** `toLocaleDateString('sv-SE')` — pattern deja documentat și folosit în `useCalendarView.ts` (linia 9). `todayLocal` este expus direct din hook.

**Semn de avertizare:** In timezone UTC+2 (România), `new Date().toISOString().substring(0,10)` poate returna ziua anterioară după miezul nopții UTC (ora 2:00 România).

---

### Pitfall 3: Dependency pe obiect `grupa` vs `grupa.id`

**Ce merge greșit:** Dacă `useCalendarView` sau un `useEffect` în `TabAntrenamente` listează `grupa` (obiect) ca dependency, componenta va re-fetch la fiecare render al parent-ului.

**De ce se întâmplă:** Obiectele React sunt comparat by-reference. `grupa` din prop poate fi re-creat la fiecare render al `GrupaDetailView`.

**Cum se evită:** Dependency trebuie să fie `grupa.id` (string). Pattern confirmat în `TabOrar` (linia 47 din GrupaDetailView.tsx).

**Semn de avertizare:** Numeroase request-uri Supabase la fiecare hover sau interacțiune.

---

### Pitfall 4: Sincronizare `selectedDate` la schimbarea lunii

**Ce merge greșit:** Dacă utilizatorul navighează la luna anterioară/următoare și `selectedDate` rămâne setat pe o zi din luna veche, panel-ul va afișa date dintr-o altă lună decât cea vizibilă.

**De ce se întâmplă:** `date` și `selectedDate` sunt state-uri independente în `useCalendarView`.

**Cum se evită:** La schimbarea lunii (apel `setDate`), resetează și `selectedDate` la null sau la prima zi a lunii noi.

**Semn de avertizare:** Panel-ul afișează "Niciun antrenament pe [data din altă lună]" deși luna curentă are antrenamente.

---

### Pitfall 5: Motiv anulare textarea — NULL vs string gol

**Ce merge greșit:** Dacă textarea e goală și se trimite `motiv_anulare: ''` (string gol), DB-ul primește `''` nu `NULL`. Decizia D-10 specifică `NULL` dacă necompletat.

**De ce se întâmplă:** `e.target.value` pe un textarea gol returnează `''`, nu `null`.

**Cum se evită:** `motiv_anulare: motiv.trim() || null` — dacă string-ul e gol după trim, salvează NULL.

---

### Pitfall 6: `handleSaveCustom` din useCalendarView inserează cu `club_id` undefined

**Ce merge greșit:** `handleSaveCustom` primește `clubId` ca parametru opțional. Dacă se omite, `club_id` nu e setat în INSERT.

**De ce se întâmplă:** Semnătura funcției: `handleSaveCustom(data: any, clubId?: string)`.

**Cum se evită:** La apelul din `ModalAdaugare`, pasează `grupa.club_id` ca al doilea parametru:
```typescript
await handleSaveCustom({
    grupa_id: grupa.id,
    is_recurent: false,
    data: formData.data,
    ora_start: formData.ora_start,
    ora_sfarsit: formData.ora_sfarsit,
}, grupa.club_id ?? undefined);
```

---

## Code Examples

### Lunar header cu luni în română

```typescript
// [ASSUMED: standard Intl API - disponibil în toate browserele moderne]
const LUNI_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

// Afișaj header:
const currentYear = parseInt(date.substring(0, 4));
const currentMonth = parseInt(date.substring(5, 7)) - 1; // 0-indexed
// → `${LUNI_RO[currentMonth]} ${currentYear}` → "Iunie 2026"
```

### Ziua de azi (highlight D-04)

```typescript
// [VERIFIED: pattern din useCalendarView.ts]
// todayLocal vine direct din hook — YYYY-MM-DD local
<div className={`
    rounded-lg text-center text-sm p-1 cursor-pointer transition-all
    ${cellDate === selectedDate ? 'bg-indigo-600/30 ring-1 ring-indigo-500' : 'hover:bg-slate-700/50'}
    ${cellDate === todayLocal ? 'ring-2 ring-indigo-400 font-bold' : ''}
`}>
    {dayNumber}
</div>
```

### Dots per zi (max 3 + overflow indicator)

```typescript
// [ASSUMED: pattern standard]
const dotsForDay = antrenamenteByDate[cellDate] || [];
const MAX_DOTS = 3;
<div className="flex gap-0.5 justify-center mt-0.5 min-h-[6px]">
    {dotsForDay.slice(0, MAX_DOTS).map(a => (
        <span
            key={a.id}
            className={`w-1.5 h-1.5 rounded-full ${
                a.status === 'anulat' ? 'bg-rose-400' : 'bg-emerald-400'
            }`}
        />
    ))}
    {dotsForDay.length > MAX_DOTS && (
        <span className="text-[9px] text-slate-400 leading-none">...</span>
    )}
</div>
```

### Structura rând antrenament în DayPanel (D-07)

```typescript
// [VERIFIED: formatTime din utils/date.ts, Badge + ConfirmButton din ui.tsx]
{antrenamenteForSelectedDay.map(a => (
    <div key={a.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
        <span className="text-sm font-mono text-slate-200 shrink-0">
            {formatTime(a.ora_start)}–{formatTime(a.ora_sfarsit ?? '')}
        </span>
        <Badge variant={statusVariant(a.status)} className="shrink-0">
            {a.status || 'planificat'}
        </Badge>
        <div className="flex gap-1 ml-auto shrink-0">
            {a.status !== 'anulat' && (
                <Button size="sm" variant="secondary" onClick={() => deschideModalAnulare(a.id)}>
                    <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Anulează
                </Button>
            )}
            {a.status === 'anulat' && (
                <Button size="sm" variant="success" onClick={() => handleReactivare(a.id)}>
                    <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Reactivează
                </Button>
            )}
            <ConfirmButton
                size="sm"
                variant="danger"
                onConfirm={() => handleStergere(a.id)}
            >
                <TrashIcon className="w-3.5 h-3.5" />
            </ConfirmButton>
        </div>
    </div>
))}
```

---

## State of the Art

| Abordare veche | Abordare curentă (portal) | Impact |
|----------------|--------------------------|--------|
| Librărie calendar externă (react-calendar, FullCalendar) | Grid Tailwind div-uri custom | Zero dependențe noi, control total al stilizării |
| Date UTC (toISOString) | Date locale (toLocaleDateString sv-SE) | Evită decalajul UTC+2 în România |
| Re-fetch la fiecare acțiune cu queryClient.invalidateQueries | `fetchAntrenamente()` direct din hook | Mai simplu pentru un singur query lunar izolat |

---

## Assumptions Log

| # | Claim | Secțiune | Risc dacă e greșit |
|---|-------|----------|---------------------|
| A1 | Luni în română hard-coded ca array (nu Intl.DateTimeFormat cu locale 'ro') | Code Examples | Intl ar fi mai robust, dar array-ul e mai simplu și controlat |
| A2 | MAX_DOTS = 3 ca limită de dots vizibili per zi | Architecture Patterns | Dacă utilizatorul are >3 antrenamente/zi, va apărea "..." — acceptabil pentru MVP |
| A3 | `handleAnulare`, `handleReactivare`, `handleStergere` definite local în TabAntrenamente (nu extinse în useCalendarView) | Architecture Patterns | Dacă planner alege să le adauge în hook, structura fișierelor se schimbă |
| A4 | Icona "Reactivează" = `CheckCircleIcon` (disponibil în icons.tsx) | Code Examples | CheckCircleIcon există în icons.tsx (linia 41) — [VERIFIED: codebase grep] |

---

## Open Questions

1. **D-13: unde se definesc `handleAnulare` / `handleReactivare` / `handleStergere`?**
   - Ce știm: Decizia D-13 lasă la discretia plannerului dacă se extinde `useCalendarView` sau se definesc local.
   - Ce e neclar: Dacă se adaugă în hook, hook-ul devine mai greu și mai cuplat de UI (showError/showSuccess). Dacă sunt locale, TabAntrenamente crește în dimensiune.
   - Recomandare: Definesc local în TabAntrenamente — funcțiile sunt simple și nu beneficiază de refolosire în altă parte a portalului.

2. **`selectedDate` la schimbarea lunii — reset necesar?**
   - Ce știm: `useCalendarView` inițializează `selectedDate` cu `todayLocal`. La navigarea lunii se apelează `setDate`, nu `setSelectedDate`.
   - Ce e neclar: Dacă se lasă `selectedDate` setat pe o zi din luna veche, panel-ul afișează date goale sau eronate.
   - Recomandare: Adaugă `setSelectedDate(null)` în funcția `navigateMonth` — user vede panelul gol la schimbarea lunii și alege o zi.

---

## Environment Availability

> Faza 3 nu are dependențe externe noi. Toate tool-urile și serviciile sunt deja active (Supabase, Node.js, npm). Secțiunea omisă conform skip condition.

---

## Validation Architecture

> `workflow.nyquist_validation: false` în `.planning/config.json` — secțiunea omisă.

---

## Security Domain

`security_enforcement: true` în config.json. ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Control standard |
|---------------|---------|-----------------|
| V2 Authentication | nu — operații pe date proprii club | RLS Supabase prin header `active-role-context-id` |
| V3 Session Management | nu — gestionat de useAuth + Supabase Auth | — |
| V4 Access Control | da — UPDATE/DELETE pe antrenamente | RLS pe `program_antrenamente` trebuie să permită operații doar utilizatorilor cu rol pe club |
| V5 Input Validation | da — câmpuri dată, oră, textarea motiv | Validare client-side minimă (dată validă, oră start < oră sfârșit) |
| V6 Cryptography | nu — nu se criptează date noi | — |

### Known Threat Patterns

| Pattern | STRIDE | Mitigare standard |
|---------|--------|------------------|
| DELETE/UPDATE pe antrenament dintr-un alt club | Tampering | RLS pe `program_antrenamente` filtrează by `club_id` via header `active-role-context-id` |
| XSS prin motiv_anulare | Tampering | React escapeaza automat textul redat în JSX; nu se folosește `dangerouslySetInnerHTML` |
| Insert antrenament cu `club_id` invalid | Tampering | `supabase.from()` trimite header de rol; RLS blochează inserarea pentru cluburi neautorizate |

**Nota:** Toate mutațiile (INSERT/UPDATE/DELETE) pe `program_antrenamente` trebuie să paseze `club_id` corect (din `grupa.club_id`) pentru ca RLS să funcționeze. Verificat că `handleSaveCustom` acceptă `clubId` ca al doilea parametru — trebuie apelat cu `grupa.club_id`. [VERIFIED: codebase grep useCalendarView.ts linia 64]

---

## Sources

### Primary (HIGH confidence — VERIFIED: codebase grep)

- `hooks/useCalendarView.ts` — logica fetch lunar, insert one-off, state management
- `components/Grupe/GrupaDetailView.tsx` — structura actuală TabAntrenamente placeholder, pattern TabOrar, pattern TabSportivi
- `components/ui.tsx` — API exact pentru Modal, Button, ConfirmButton, Badge, Input
- `components/icons.tsx` — toate iconițele disponibile
- `utils/date.ts` — `formatTime`, `normalizeDate`
- `types.ts` liniile 323-363 — interfețele `Antrenament`, `ProgramItem`, `Grupa`
- `sql/migrations/add_status_motiv_antrenamente.sql` — confirmă coloanele status + motiv_anulare
- `.planning/phases/03-calendar-crud-antrenamente/03-CONTEXT.md` — toate deciziile D-01..D-13

### Secondary (MEDIUM confidence)

- Pattern calcul offset calendar Luni-first: `(getDay() + 6) % 7` — standard JavaScript, larg documentat

### Tertiary (LOW confidence / ASSUMED)

- Array `LUNI_RO` în loc de `Intl.DateTimeFormat` — convenție aleasă pentru simplitate MVP

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — totul e deja în codebase, fără dependențe noi
- Architecture: HIGH — pattern-urile existente sunt clare și direct reutilizabile
- Pitfalls: HIGH — identificate din codul existent (comentariile din GrupaDetailView.tsx, useCalendarView.ts)

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (stack stabil)
