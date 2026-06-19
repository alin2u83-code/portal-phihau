# Phase 11: Prezenta Refactorizata — Research

**Researched:** 2026-06-19
**Domain:** React SPA — calendar multi-grupă, marcare prezență, rapoarte prezență
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRZ-01 | Calendarul din tab "Grupe" afișează antrenamentele TUTUROR grupelor instructorului simultan, cu dots colorate per grupă | `useCalendarView` se extinde sau se creează `useMultiCalendarView`; `CalendarActivitati` primește props opționale `grupe[]` și `antrenamente` pre-fetched |
| PRZ-02 | Click pe o zi deschide direct form de marcare prezență (fără navigare prin Orar → Calendar → antrenament) | Schimbarea callback-ului `onSelect` în `CalendarActivitati` — în loc de `navigateTo('orar', id)` → direct `handleSelectAntrenament(antrenamentId)` |
| PRZ-03 | Grupe cu același interval orar — sportivii tuturor sunt vizibili și pot fi marcați împreună | `FormularPrezenta` se extinde cu prop `antrenamente: Antrenament[]` (array); merge sportivii din toate grupele; `saveAttendance` se apelează iterativ per antrenament |
| PRZ-04 | `GeneratorProgramMasiv` accesibil direct din tab "Grupe" | Adaugă un buton/shortcut în `case 'grupe':` din `renderContent()` care apelează `navigateTo('generator', null)` |
| PRZ-05 | 3 rapoarte de prezență separate: (a) lunar, (b) per grupă, (c) per interval examen — FĂRĂ procente, doar numere absolute | (a) `RaportLunarPrezenta.tsx` deja există — se curăță procentele din export CSV; (b) `RaportPrezenta.tsx` — tab "Per Grupă"; (c) `useAttendanceStats` calculează deja intervalele — se creează un nou raport la nivel de club/toate grupele |
</phase_requirements>

---

## Summary

Această fază refactorizează modulul Prezenta pentru a rezolva 5 fricțiuni concrete ale instructorului. Codul existent este substanțial și bine structurat — nu se rescrie de la zero, ci se extinde strategic.

**Problema centrală PRZ-01/02:** `CalendarActivitati` este hardcodat să afișeze o singură grupă (`useCalendarView(grupa.id)` primește fix un singur `grupaId`). Navigarea actuală în tab "Grupe" este `GrupeList → OrarEditor → CalendarActivitati` — trei nivele de navigare înainte de a ajunge la prezență.

**Problema PRZ-03:** `FormularPrezenta` acceptă un singur `Antrenament` cu o singură `grupe`. Grupe simultane înseamnă multiple `program_antrenamente` rows — trebuie fuzionat un singur UI pentru ele.

**Problema PRZ-04:** `GeneratorProgramMasiv` este accesibil din `DashboardPrezentaAzi` (tab "Rapid") prin `onMassGenerator`. Tab "Grupe" nu are un entry-point direct.

**Problema PRZ-05:** `RaportLunarPrezenta.tsx` afișează și calculează procente (inclusiv în CSV export). `RaportPrezenta.tsx` afișează un grafic Recharts cu procente. Raportul per interval examen nu există ca vizualizare per-club (există `useAttendanceStats` per sportiv individual în profilul sportivului).

**Primary recommendation:** Extinde `useCalendarView` cu suport multi-grupă, adaugă un shortcut direct din tab "Grupe" la marcare prezență, creează un `FormularPrezentaMultiGrupa` backward-compatible, adaugă entry-point Generator în tab Grupe, și refactorizează rapoartele existente pentru a elimina procentele și a adăuga raportul per interval examen la nivel de club.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Calendar multi-grupă | Frontend (React component) | Hook (data fetch) | Date deja în React Query cache; hook-ul extinde logica de fetch |
| Marcare prezență click-direct | Frontend navigation state | `useAttendance` (salvare) | Schimbare de flow UI în `index.tsx`; `saveAttendance` neschimbat |
| Grupe simultane — form unificat | Frontend component | `useAttendance` | Merge UI-side; salvare cu apeluri multiple `saveAttendance` |
| Entry-point Generator din Grupe | Frontend navigation state | — | Un shortcut/buton în `renderContent()` case 'grupe' |
| Raport lunar fără procente | Frontend component | DataContext cache | Modificare în `RaportLunarPrezenta.tsx` |
| Raport per grupă | Frontend component | DataContext cache | Nou tab în `RaportPrezenta.tsx` sau componentă separată |
| Raport per interval examen (club) | Frontend component | Supabase (fetch direct) | `useAttendanceStats` există per-sportiv; pentru club trebuie fetch per sportiv din grupele clubului |

---

## Standard Stack

Faza nu instalează nicio librărie nouă. Toate dependențele sunt deja instalate:

### Core (deja în proiect)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React 18 | 18.3.1 | UI | Instalat |
| TypeScript | 5.5.3 | Types | Instalat |
| Tailwind CSS | 3.4.6 | Styling | Instalat |
| `@supabase/supabase-js` | 2.98.0 | Data fetch | Instalat |
| TanStack React Query v5 | 5.90.21 | Cache invalidare | Instalat |

**Installation:** Nicio instalare necesară.

---

## Package Legitimacy Audit

> Secțiunea nu se aplică — această fază nu instalează pachete noi.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
USER CLICK (tab "Grupe")
    │
    ▼
Prezenta/index.tsx (viewStack state)
    │
    ├─ case 'grupe': GrupeList + ShortcutBar
    │       │
    │       ├─ [NEW] buton "Generator Program" → navigateTo('generator', null)
    │       ├─ [NEW] buton "Calendar Toate Grupele" → navigateTo('calendar-all', null)
    │       └─ selectGrupa → navigateTo('orar', grupaId) [EXISTENT]
    │
    ├─ [NEW] case 'calendar-all':
    │       └─ CalendarActivitatiMultiGrupa (toate grupele instructorului)
    │               │ fetch: program_antrenamente WHERE grupa_id IN [grupeIds] AND luna
    │               ▼
    │           dots colorate per grupă
    │               │ click zi
    │               ▼
    │           antrenamente în acea zi → [merge sportivi dacă intervale identice]
    │               │
    │               ├─ 1 antrenament → FormularPrezenta (existent)
    │               └─ N cu același interval → [NEW] FormularPrezentaMultiGrupa
    │
    └─ case 'generator':
            └─ GeneratorProgramMasiv [EXISTENT, neschimbat]

REPORTS (navTo global → AppRouter)
    ├─ 'raport-prezenta'      → RaportPrezenta.tsx [EXTINS: tab "Per Grupă" fără %]
    ├─ 'raport-lunar-prezenta' → RaportLunarPrezenta.tsx [MODIFICAT: elimină %]
    └─ [NEW] 'raport-interval-examen' → RaportIntervalExamen.tsx
```

### Recommended Project Structure

Nicio structură nouă de foldere nu este necesară. Modificările sunt în:

```
components/Prezenta/
├── index.tsx                          # MODIFICAT: case 'calendar-all', shortcut Generator
├── CalendarActivitati.tsx             # MODIFICAT: props opționale multi-grupă
├── ListaPrezentaAntrenament.tsx       # ADAUGAT: FormularPrezentaMultiGrupa export
├── RaportLunarPrezenta.tsx            # MODIFICAT: elimină % din tabel și CSV
├── RaportPrezenta.tsx                 # MODIFICAT: tab nou "Per Grupă"
└── [NOU] RaportIntervalExamen.tsx     # Raport per interval examen la nivel club
hooks/
└── useMultiCalendarView.ts            # NOU: versiune multi-grupă a useCalendarView
```

---

## Research Focus Area 1: useCalendarView — Structură și Extensibilitate

**[VERIFIED: codebase grep]** `useCalendarView` are semnătura:

```typescript
export const useCalendarView = (grupaId: string, initialDate?: string)
```

Primește un singur `grupaId` string. Intern face:

```typescript
const { data, error } = await supabase.from('program_antrenamente')
    .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status_id)')
    .eq('grupa_id', grupaId)  // <-- SINGLE GROUP FILTER
    .gte('data', startOfMonth)
    .lte('data', endOfMonth)
    .order('data')
    .order('ora_start');
```

**Concluzie:** Pentru multi-grupă, nu se poate reutiliza `useCalendarView` direct — `eq('grupa_id', grupaId)` nu acceptă array. Soluțiile sunt:

**Opțiunea A (recomandată):** Creează `hooks/useMultiCalendarView.ts` cu semnătură `(grupeIds: string[], initialDate?: string)` care folosește `.in('grupa_id', grupeIds)` în loc de `.eq(...)`. Returnează același shape ca `useCalendarView` dar cu antrenamente din toate grupele.

**Opțiunea B (mai simplă dar cu overhead):** Apelează `useCalendarView` de N ori (un hook per grupă) și merge rezultatele. Nu funcționează în React deoarece hooks nu pot fi apelate condiționat sau în loop.

**Concluzie fermă:** Implementează `useMultiCalendarView` cu `.in('grupa_id', grupeIds)`.

**Schema query multi-grupă:**
```typescript
const { data, error } = await supabase.from('program_antrenamente')
    .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status_id)')
    .in('grupa_id', grupeIds)  // array de IDs
    .gte('data', startOfMonth)
    .lte('data', endOfMonth)
    .order('data')
    .order('ora_start');
```

---

## Research Focus Area 2: Navigarea în index.tsx

**[VERIFIED: codebase grep]** Tipurile de view sunt definite la linia 162:

```typescript
type View = 'azi' | 'rapid' | 'grupe' | 'orar' | 'calendar' | 'prezenta' | 'prezenta-grupe' | 'istoric' | 'generator';
```

**Fluxul actual pentru calendar:**
1. Tab "Grupe" → `case 'grupe'`: afișează `GrupeList` cu `onSelect={id => navigateTo('orar', id)}`
2. `case 'orar'`: `OrarEditor` cu `onNavigate={id => navigateTo('calendar', id)}`
3. `case 'calendar'`: `CalendarActivitati` cu `selectedGrupa = grupe.find(g => g.id === currentView.id)`
4. `CalendarActivitati.onSelect` → `handleSelectAntrenament(antrenamentId)` → `navigateTo('prezenta', id)`

**PRZ-01/02 — Schimbări necesare:**

1. Adaugă `'calendar-all'` la tipul `View`
2. Adaugă un shortcut în `case 'grupe'` care apelează `navigateTo('calendar-all', null)` (fără grupaId)
3. Adaugă `case 'calendar-all'`: returnează `<CalendarActivitatiMultiGrupa grupe={grupe} onSelect={handleSelectAntrenament} onBack={navigateBack} />`
4. `handleSelectAntrenament` deja există și gestionează fetch + `navigateTo('prezenta', id)` — se reutilizează direct

**PRZ-03 — Grupe simultane:**

Problema: `handleSelectAntrenament` primește un singur `antrenamentId`. Pentru grupe simultane (N antrenamente la aceeași oră) trebuie `handleSelectMultipleAntrenamente(ids: string[])`.

Alternativ, se poate detecta că N antrenamente au același `(data, ora_start, ora_sfarsit)` în `CalendarActivitatiMultiGrupa` și se transmite un array.

**Concluzie:** Adaugă `handleSelectMultipleAntrenamente` în `index.tsx` care:
- Fetch-uiește toate antrenamentele din array (cu `in('id', ids)`)
- Setează `antrenamentDetaliu` ca primul (sau un obiect agregat)
- Navigează la un nou view `'prezenta-multi'`

---

## Research Focus Area 3: Rapoartele Existente

### RaportLunarPrezenta.tsx — Starea Actuală

**[VERIFIED: codebase grep]** Componentă de 631 linii, standalone, accesibilă prin `navTo('raport-lunar-prezenta')` (navigare globală prin AppRouter). Nu are tab-uri interne. Filtre: an, lună, grupă. Afișează:
- Total antrenamente planificate în lună
- Total prezențe în lună
- **Procentaj** — `Math.round((attendedTrainings / totalTrainings) * 100)` — la export CSV include coloana "Procentaj (luna)"
- Perioadă examen (calculată din sesiuni_examene): total + prezente + **procent** implicat în calcul

**PRZ-05 cerința (a):** Raport lunar — FĂRĂ procente. Modificare: elimina procentele din tabel și din export CSV. `ReportRow` interface include `totalTrainings` și `attendedTrainings` deja.

**Encoding bug (din Playwright report):** `perioadaLabel` concatenează `—` (em-dash) care se afișează garbled. Fix: înlocuiește `—` cu ` - ` sau asigură că fișierul e UTF-8.

### RaportPrezenta.tsx — Starea Actuală

**[VERIFIED: codebase grep]** Componentă de 384 linii, filtre: an, tip antrenament, grupă, sală. Afișează:
- Grafic Recharts (BarChart) cu prezențe per lună per grupă — cu procente
- Tabel sumar per sportiv: `present / total` și **procentaj**
- Log detaliat: fiecare antrenament, status per sportiv

**PRZ-05 cerința (b):** Raport per grupă — count per sportiv per grupă, fără procente. `RaportPrezenta.tsx` deja grupează per grupă prin filtrare. Se poate:
- **Opțiune simplă:** Adaugă un tab "Per Grupă" în `RaportPrezenta.tsx` care afișează un tabel: Grupă | Sportiv | Nr. Prezențe (fără procente, fără grafic)
- **Opțiune separată:** Componentă nouă `RaportPerGrupa.tsx`

Dat fiind că `RaportPrezenta.tsx` are deja datele necesare în `filteredPresenceRecords` și `athleteSummary`, extinderea cu un tab e mai economică.

### Raport Per Interval Examen — Lipsă

**[VERIFIED: codebase grep]** `useAttendanceStats.ts` returnează `gradeStats` care calculează intervalele exact cum cere PRZ-05: `[Început → GradA]`, `[GradA → GradB]`, `[GradB → Prezent]` ca array de `{ period, count, date }`. Dar `useAttendanceStats` ia `istoricPrezenta` și `istoricGrade` per un singur sportiv — input de la profilul sportivului.

**Problema pentru raportul club:** Raportul PRZ-05(c) cere COUNT per sportiv per interval examen, pentru TOȚI sportivii clubului. Datele necesare:
1. `sesiuni_examene` (deja fetched în `RaportLunarPrezenta`)
2. Prezențe per sportiv din `program_antrenamente` + `prezenta_antrenament` (deja în `filteredData.antrenamente`)
3. Examene per sportiv din `rezultate_examene` sau `istoricGrade` (LIPSĂ din filteredData cache)

**Concluzie:** `RaportIntervalExamen.tsx` necesită un fetch suplimentar pentru `rezultate_examene` sau `vw_istoricprezenta_sportiv` per club. Sau se reutilizează logica din `RaportLunarPrezenta.tsx` care deja fetch-uiește `sesiuniExamene`.

**Schema minimă pentru raport interval examen:**
```typescript
// Fetch sesiuni examene club (existent în RaportLunarPrezenta)
// Fetch prezente club (din filteredData.antrenamente — deja cache)
// Fetch grade per sportiv (NECESAR NOU — din rezultate_examene sau istoricGrade view)
// Calculează per sportiv: intervalele exact ca useAttendanceStats
```

---

## Research Focus Area 4: useAttendanceStats — Structura gradeStats

**[VERIFIED: codebase grep]** Funcția returnează:

```typescript
return {
    totalAttended: number,
    attendanceStats: { total: number, recent: { month: string, count: number }[], loading: boolean },
    gradeStats: { period: string, count: number, date: string }[]  // reversed (recent first)
}
```

`gradeStats` este exact ce cere PRZ-05(c): perioade `"GradA -> GradB"` cu `count` (numere absolute, fără procente).

**Compatibilitate cu PRZ-05:** DA. `gradeStats` satisface formatul cerut. Problema e că hook-ul primește input per sportiv (din profilul sportivului). Pentru un raport la nivel de club, trebuie să apeleze logica echivalentă pentru toți sportivii simultan, fără a apela hook-ul de N ori.

**Soluție recomandată:** Extrage logica din `useAttendanceStats` într-o funcție pură `calculateGradeStats(istoricPrezenta, sortedExamDates, grade)` și apel-o per sportiv în `useMemo` din `RaportIntervalExamen.tsx`.

---

## Research Focus Area 5: Grupe Simultane — FormularPrezentaMultiGrupa

**[VERIFIED: codebase grep]** `FormularPrezenta` props actuale:
```typescript
{
    antrenament: Antrenament & { grupe: Grupa & { sportivi: Sportiv[] } };
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
    saveAttendance: (id, records, allSportivIds?) => Promise<boolean>;
}
```

Pentru N grupe simultane, există N `Antrenament` rows separate în DB. Nu se pot fuziona la nivel de DB fără migrații.

**Strategia corectă:**
1. `CalendarActivitatiMultiGrupa` detectează că în ziua selectată există N antrenamente cu același `(ora_start, ora_sfarsit)`
2. Transmite array `antrenamente: Antrenament[]` la noul component `FormularPrezentaMultiGrupa`
3. `FormularPrezentaMultiGrupa` merge sportivii din toate grupele (cu deduplicare pe `sportiv.id`)
4. La salvare: apelează `saveAttendance` iterativ pentru fiecare `antrenament.id`:

```typescript
// Pseudo-code pentru save multi-grupă
for (const ant of antrenamente) {
    const recordsForThisGroup = recordsAll
        .filter(r => sportiviGrupa[ant.grupa_id].has(r.sportiv_id));
    await saveAttendance(ant.id, recordsForThisGroup, allIdsForGroup);
}
```

**IMPORTANT:** `saveAttendance` nu se modifică (scope fence). Apelul multiplu e OK — fiecare apel face delete+insert per `antrenament_id`.

**Problema sportivilor din multiple grupe:** Un sportiv poate fi în Grupa A (principală) și Grupa B (secundară). Dacă ambele au antrenament simultan:
- Sportivul apare o singură dată în form (deduplicat pe `id`)
- **DECIZIE LOCKED (PRZ-03):** Prezența se salvează DOAR în antrenamentul grupei principale (`sportiv.grupa_id === antrenament.grupa_id`). Nu se salvează în grupe secundare.
- UI marchează clar cărei grupe aparține fiecare sportiv (badge cu numele grupei).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dots colorate per grupă în calendar | Sistem de culori custom complex | Array de culori Tailwind predefinite indexate per grupă | Deja există `GROUP_COLORS` în `RaportPrezenta.tsx` |
| Format dată calendaristică | Funcții custom de formatare date | `toLocaleDateString('sv-SE')` / `toLocaleString('ro-RO')` — deja pattern consistent în codebase | Deja stabilit în useCalendarView, CalendarActivitati |
| State management pentru multi-select antrenamente | Nou store Zustand | `useState` local în `index.tsx` + `antrenamentDetaliu` | Starea e locală modulului Prezenta |
| CSV export pentru rapoarte | Librărie nouă | `exportToCsv` helper deja definit în `RaportLunarPrezenta.tsx` | Copiat sau mutat în `utils/` și importat |

**Key insight:** Toată logica de prezență, fetch și salvare există. Faza e de recablare a UI-ului și extindere a fetch-urilor existente.

---

## Common Pitfalls

### Pitfall 1: Hook-uri cu grupaId single în CalendarActivitati
**What goes wrong:** `CalendarActivitati` apelează `useCalendarView(grupa.id)` la linia 62, hardcodat cu o singură grupă. Dacă se extinde prin modificarea directă a componentei existente fără backward-compatibility, se sparge fluxul existent Orar → Calendar.
**Why it happens:** Prop `grupa: Grupa` e singular; hook-ul primește `string`, nu `string[]`.
**How to avoid:** Creează un nou component `CalendarActivitatiMultiGrupa` sau adaugă props opționale `grupe?: Grupa[]` (plural) la `CalendarActivitati` și un nou hook `useMultiCalendarView`. Păstrează signătura originală neschimbată când `grupe` nu e furnizat.
**Warning signs:** `grupaId` undefined în useCalendarView → fetch fără filtru → date din toate grupele clubului (dacă RLS permite).

### Pitfall 2: Dots colorate per grupă — culori inconsistente la re-render
**What goes wrong:** Dacă culorile sunt alocate dinamic prin indexul în array, ordinea grupelor poate schimba între render-uri → dot galben devine verde pentru aceeași grupă.
**How to avoid:** Alocă culoarea la nivel de `grupaId` folosind un `Map<string, string>` construit o singură dată (în `useMemo`) din lista ordonată a grupelor.
**Warning signs:** User raportează că "culoarea grupei s-a schimbat".

### Pitfall 3: saveAttendance apelat de N ori — race condition
**What goes wrong:** Dacă N grupe simultane → N apeluri `saveAttendance` în paralel → posibil conflict pe același `antrenament_id` dacă sportivul apare în ambele grupe.
**Why it happens:** `saveAttendance` face DELETE + INSERT per `antrenament_id`, nu per `sportiv_id` global.
**How to avoid:** Apelează `saveAttendance` secvențial (`for...of await`), nu în `Promise.all`. Fiecare apel e independent per `antrenament_id` diferit — nu există conflict de fapt, dar pattern-ul secvențial e mai sigur.
**Warning signs:** Error `23505` (unique constraint) în consolă după salvare grupe simultane.

### Pitfall 4: Procente în CSV — PRZ-05 cere DOAR numere absolute
**What goes wrong:** `RaportLunarPrezenta.tsx` la linia ~321 include `"Procentaj (luna)": Math.round(...)%` în export CSV. Dacă nu se elimina, cerința PRZ-05 nu e îndeplinită.
**How to avoid:** Ștergere coloană "Procentaj" din `dataToExport` în `handleExport`. Verifică și coloanele din tabelul HTML — dacă există th/td cu "%", se elimină.
**Warning signs:** Coloana "Procentaj" apare în CSV sau tabel.

### Pitfall 5: View type 'calendar-all' nu e în tipul View
**What goes wrong:** TypeScript aruncă eroare la `navigateTo('calendar-all', null)` dacă nu se adaugă `'calendar-all'` în union type `View`.
**How to avoid:** Extinde la linia 162 din `index.tsx`: `type View = 'azi' | ... | 'calendar-all' | ...`.
**Warning signs:** TypeScript compile error: `Argument of type '"calendar-all"' is not assignable to parameter of type 'View'`.

### Pitfall 6: Encoding em-dash în RaportLunarPrezenta
**What goes wrong:** `perioadaLabel` conține `—` (em-dash Unicode), afișat ca `â€"` (UTF-8 bytes interpretate Latin-1) — confirmat de raportul Playwright.
**How to avoid:** Înlocuiește `—` cu ` - ` sau `—` (escape explicit) sau verifică că `RaportLunarPrezenta.tsx` e salvat cu BOM UTF-8.
**Warning signs:** Text `â€"` vizibil în banner perioadă examen.

---

## Code Examples

### Multi-grupă calendar fetch [ASSUMED din pattern existent]
```typescript
// hooks/useMultiCalendarView.ts
export const useMultiCalendarView = (grupeIds: string[], initialDate?: string) => {
    // ... același state ca useCalendarView ...
    const fetchAntrenamente = useCallback(async () => {
        setLoading(true);
        try {
            const startOfMonth = date.substring(0, 7) + '-01';
            const d = new Date(date);
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
                .toLocaleDateString('sv-SE');

            if (grupeIds.length === 0) { setAntrenamente([]); return; }

            const { data, error } = await supabase.from('program_antrenamente')
                .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status_id)')
                .in('grupa_id', grupeIds)   // <-- diferența față de useCalendarView
                .gte('data', startOfMonth)
                .lte('data', endOfMonth)
                .order('data')
                .order('ora_start');

            if (error) { showError("Eroare calendar", error.message); }
            else { setAntrenamente((data || []).map(a => ({ ...a, prezenta: a.prezenta || [] }))); }
        } finally { setLoading(false); }
    }, [grupeIds, date, showError]);
    // ...
};
```

### Detectare grupe simultane [ASSUMED]
```typescript
// În CalendarActivitatiMultiGrupa — detectare antrenamente simultane
const simultaneGroups = useMemo(() => {
    const key = (a: Antrenament) => `${a.ora_start}_${a.ora_sfarsit}`;
    const grouped = new Map<string, Antrenament[]>();
    for (const a of selectedAntrenamente) {
        const k = key(a);
        if (!grouped.has(k)) grouped.set(k, []);
        grouped.get(k)!.push(a);
    }
    return grouped; // Map<"HH:MM_HH:MM", Antrenament[]>
}, [selectedAntrenamente]);
```

### Entry-point Generator din tab Grupe [ASSUMED — din pattern existent]
```typescript
// În index.tsx, case 'grupe':
<ShortcutBar shortcuts={[
    { label: 'Raport Prezențe', icon: <SparklesIcon className="w-3.5 h-3.5" />, onClick: () => navTo('raport-prezenta') },
    { label: 'Raport Lunar', icon: <ClockIcon className="w-3.5 h-3.5" />, onClick: () => navTo('raport-lunar-prezenta') },
    // ADAUGAT:
    { label: 'Generator Program', icon: <CalendarDaysIcon className="w-3.5 h-3.5" />, onClick: () => navigateTo('generator', null) },
    { label: 'Calendar Toate Grupele', icon: <UsersIcon className="w-3.5 h-3.5" />, onClick: () => navigateTo('calendar-all', null) },
]} />
```

### gradeStats per sportiv pentru raport club [ASSUMED — din useAttendanceStats]
```typescript
// Funcție pură extrasă din useAttendanceStats pentru reutilizare
function calculateGradeStats(
    istoricPrezenta: { data: string; status: string }[],
    sortedExamDates: string[], // din sesiuniExamene, filtrate per sportiv dacă există rezultate_examene
    grade: Grad[]
): { period: string; count: number }[] {
    // Logica identică cu gradeStats din useAttendanceStats
    // returnează array de perioade cu count absolut
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Calendar per-grupă (single) | Calendar multi-grupă | PRZ-01 (această fază) | Instructorul vede toate antrenamentele într-un singur loc |
| 3 click-uri pentru prezență (Grupe → Orar → Calendar → Antrenament) | 1 click din calendar | PRZ-02 (această fază) | Flux drastică simplificat |
| Generator accesibil doar din tab Rapid | Generator accesibil din tab Grupe | PRZ-04 (această fază) | Acces direct fără switch de tab |

**Deprecated/outdated:**
- Navigarea `navigateTo('orar', grupaId)` din tab "Grupe" rămâne dar devine opțională (pentru configurare orar detaliat); noul shortcut e `navigateTo('calendar-all', null)`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `.in('grupa_id', grupeIds)` este suportat de `@supabase/supabase-js` 2.98.0 în query builder | Research Focus Area 1 | Scăzut — `.in()` e API standard Supabase PostgREST |
| A2 | Un sportiv cu grupe simultane trebuie să aibă prezența salvată în AMBELE `antrenament_id`, nu doar unul | Research Focus Area 5 | MEDIU — dacă cerința business e "o singură prezență per zi", trebuie clarificat |
| A3 | Culorile per grupă pot fi alocate din array `GROUP_COLORS` existent în `RaportPrezenta.tsx` | Code Examples | Scăzut — array există, decizie de design, nu funcțională |
| A4 | Raportul per interval examen (PRZ-05c) se implementează ca componentă separată `RaportIntervalExamen.tsx`, nu ca tab în `RaportLunarPrezenta.tsx` | Research Focus Area 3 | Scăzut — ambele sunt valide, e decizie de planificare |
| A5 | Fetch-ul pentru `rezultate_examene` per sportiv pentru `RaportIntervalExamen.tsx` se face direct în componentă (nu prin React Query cache) | Research Focus Area 3 | MEDIU — dacă datele sunt mari, poate fi lent; cache e mai bun |

---

## Open Questions (RESOLVED)

1. **PRZ-05(c) — Sursa datelor "interval examen per sportiv"** ✅ RESOLVED
   - **Răspuns:** `filteredData.istoricGrade` din DataContext conține `IstoricGrade[]` pentru toți sportivii vizibili. Vine din view-ul `vedere_istoric_grade_sportiv` (hooks/useDataProvider.ts linia 373). `RaportIntervalExamen.tsx` folosește `filteredData.istoricGrade` direct — NU fetch separat din `rezultate_examene`.

2. **PRZ-03 — Comportament "prezență simultană"** ✅ RESOLVED
   - **Răspuns (LOCKED):** Prezența se salvează DOAR în antrenamentul grupei principale (`sportiv.grupa_id === antrenament.grupa_id`). Nu se salvează în grupe secundare. Decizie confirmată de utilizator.

3. **IstoricGrade type — disponibilitate în DataContext** ✅ RESOLVED
   - **Răspuns:** `istoricGrade` ESTE în DataContext — `filteredData.istoricGrade: IstoricGrade[]` (hooks/useDataProvider.ts linia 28, 141). Disponibil via `useData().filteredData.istoricGrade`.

---

## Environment Availability

> Secțiunea nu se aplică — faza nu are dependențe de tool-uri externe. Toate runtime-urile (Node, Supabase, Vite) sunt disponibile și rulate în proiect.

---

## Validation Architecture

> `nyquist_validation: false` în `.planning/config.json` — secțiune omisă.

---

## Security Domain

> `security_enforcement: true` în config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nu direct | Supabase Auth (existent) |
| V3 Session Management | nu | Supabase JWT (existent) |
| V4 Access Control | DA | `usePermissions(activeRoleContext)` + RLS Supabase |
| V5 Input Validation | parțial | Validare `grupeIds.length > 0` înainte de `.in()` query |
| V6 Cryptography | nu | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Fetch antrenamente din grupe care nu aparțin instructorului | Spoofing/IDOR | RLS pe `program_antrenamente` filtrează per `active-role-context-id`; frontend folosește `grupe` din `filteredData` (deja filtrate per club/rol) |
| Marcare prezență la antrenament din altă grupă | Tampering | `saveAttendance` face INSERT în `prezenta_antrenament`; RLS interzice insert dacă `antrenament_id` nu aparține clubului activ |
| Export CSV cu date din toate cluburile | Information Disclosure | `filteredData.sportivi` e deja filtrat per `visibleClubIds` din `usePermissions` |

**Concluzie securitate:** Faza nu introduce noi surface de atac. Toate operațiunile de fetch și write merg prin Supabase cu header `active-role-context-id` și RLS existente. Nu se creează noi API endpoints sau bypass-uri.

---

## Sources

### Primary (HIGH confidence)
- Codebase grep — `hooks/useCalendarView.ts` (121 linii, verificat complet)
- Codebase grep — `hooks/useAttendance.ts` (70 linii, verificat complet)
- Codebase grep — `hooks/useAttendanceStats.ts` (107 linii, verificat complet)
- Codebase grep — `components/Prezenta/index.tsx` (435 linii, verificat complet)
- Codebase grep — `components/Prezenta/CalendarActivitati.tsx` (355 linii, verificat complet)
- Codebase grep — `components/Prezenta/ListaPrezentaAntrenament.tsx` (FormularPrezenta props, verificat)
- Codebase grep — `components/Prezenta/RaportLunarPrezenta.tsx` (structura și logica, verificat)
- Codebase grep — `components/Prezenta/RaportPrezenta.tsx` (structura și logica, verificat)
- Codebase grep — `components/Grupe/GeneratorProgramMasiv.tsx` (props interface, verificat)
- Codebase grep — `.planning/ROADMAP.md` (PRZ requirements și success criteria)
- Playwright report — `.playwright-mcp/reports/raport-prezenta-orar-program-2026-06-19.md` (bug-uri confirmate)

### Secondary (MEDIUM confidence)
- `types.ts` — interface `Antrenament`, `Grupa`, `ProgramItem` (verificate prin grep)
- `components/AppRouter.tsx` — rutele `raport-prezenta` și `raport-lunar-prezenta` (verificate prin grep)

### Tertiary (LOW confidence)
- Logica de deduplicare sportivi pentru grupe simultane (PRZ-03) — derivată din pattern existent în `FormularPrezenta.tsx` (liniile 171-183)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nicio librărie nouă, totul verificat în codebase
- Architecture: HIGH — toate componentele și hook-urile citite direct din cod
- Pitfalls: HIGH — 4 din 6 pitfall-uri confirmate din cod real (encoding bug confirmat Playwright, type union gap, hook limitation, saveAttendance interface)
- Raport per interval examen: MEDIUM — logica `useAttendanceStats` confirmată, sursa `IstoricGrade` pentru nivel club necesită verificare suplimentară

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (cod stabil, fără dependențe externe volatile)
