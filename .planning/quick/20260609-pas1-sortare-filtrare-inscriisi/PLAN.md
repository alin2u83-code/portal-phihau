---
slug: pas1-sortare-filtrare-inscriisi
description: useSortConfig hook + Pas1 empty start + hide înscriși + column sort
status: complete
created: 2026-06-09
---

# Plan: Pas1 — Sortare, Filtrare Înscriși, Start Gol + Hook Partajat

## Obiectiv

Îmbunătățește Pasul 1 din wizardul Thao Quyen Individual cu 3 modificări de comportament și extrage logica de sortare comună într-un hook reutilizabil, migrând toate site-urile de utilizare.

## Fișiere cheie

- `hooks/useSortConfig.ts` — NOU
- `components/Competitii/InscriereClubWizard/index.tsx`
- `components/Competitii/InscriereClubWizard/Pas1.tsx`
- `components/Sportivi/index.tsx`
- `components/Sportivi/SportiviTable.tsx`
- `components/GestiuneExamene/ManagementInscrieri.tsx`

---

## Task 1 — Creează `hooks/useSortConfig.ts`

**Fișiere:** `hooks/useSortConfig.ts`

**Acțiune:**

Creează fișierul de la zero. Exportă două entități publice: hook-ul `useSortConfig` și funcția utilitară `applySortConfig`.

### Tipuri

```
export interface SortConfigEntry {
  key: string;
  direction: 'asc' | 'desc';
}
```

### Hook: `useSortConfig`

Semnătură: `function useSortConfig(initial?: SortConfigEntry[]): { sortConfig, requestSort, clearSort }`

- `sortConfig: SortConfigEntry[]` — starea curentă
- `clearSort: () => void` — resetează la `[]`
- `requestSort(key: string, shiftKey?: boolean) => void`:
  - Dacă `shiftKey` este `true` (mod multi-sort):
    - Dacă coloana există și direction = `'asc'` → schimbă în `'desc'`
    - Dacă coloana există și direction = `'desc'` → elimină coloana din array
    - Dacă coloana nu există → adaugă `{ key, direction: 'asc' }` la sfârșitul array-ului
  - Dacă `shiftKey` este `false` sau absent (mod single-sort, înlocuire):
    - Dacă coloana există și direction = `'asc'` → înlocuiește tot array-ul cu `[{ key, direction: 'desc' }]`
    - Dacă coloana există și direction = `'desc'` → elimină coloana (array devine `[]`)
    - Dacă coloana nu există → înlocuiește tot array-ul cu `[{ key, direction: 'asc' }]`

  Notă: comportamentul single-sort fără shiftKey reproduce exact ce face `ManagementInscrieri` când `!shiftKey` și ce face `Sportivi/index.tsx` (care nu folosea shift dar adăuga la array — după migrare va folosi single-sort).

### Funcție: `applySortConfig`

```
export function applySortConfig<T>(
  data: T[],
  sortConfig: SortConfigEntry[],
  getField: (item: T, key: string) => unknown,
  tiebreaker?: (a: T, b: T) => number
): T[]
```

- Dacă `sortConfig` este gol returnează `[...data]` (copie, fără mutație).
- Sortează prin parcurgerea criteriilor în ordine.
- Comparație: dacă `aVal < bVal` returnează `direction === 'asc' ? -1 : 1`, invers pentru `>`, `0` dacă egale.
- Dacă după toate criteriile valorile sunt egale și `tiebreaker` e definit, aplică `tiebreaker(a, b)`.
- Nu mutează array-ul original.

**Verificare:** `npm run lint` — fără erori TypeScript.

---

## Task 2 — Migrează `Sportivi/index.tsx` + `SportiviTable.tsx`

**Fișiere:** `components/Sportivi/index.tsx`, `components/Sportivi/SportiviTable.tsx`

**Acțiune:**

### În `Sportivi/index.tsx`:

1. Adaugă import: `import { useSortConfig, applySortConfig } from '../../hooks/useSortConfig';`
2. Înlocuiește linia 69:
   - ÎNAINTE: `const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);`
   - DUPĂ: `const { sortConfig, requestSort } = useSortConfig();`
3. Șterge funcția `requestSort` de la liniile 357–370 (funcția inline care folosea `setSortConfig`).
4. Înlocuiește blocul `sortedAndFilteredSportivi` (liniile 476–500) pentru a folosi `applySortConfig`:
   - Apelul `getField` pentru `'grad_actual_id'` returnează `grade.find(g => g.id === item.grad_actual_id)?.ordine ?? -1`.
   - Pentru orice altă cheie returnează `item[key as keyof Sportiv]`.
   - Exemplu de structură (nu cod literal, ci logică):
     - `const sorted = applySortConfig(sportivi, sortConfig, (item, key) => { if (key === 'grad_actual_id') { return grade.find(...) } return item[key] }, undefined);`
   - Variabila rezultată înlocuiește `sortableItems` în `sortedAndFilteredSportivi`.

### În `SportiviTable.tsx`:

Interfața `SportiviTableProps` la linia 20–21 folosește tipuri inline. Actualizează:
- `import { useSortConfig } from '../../hooks/useSortConfig';` — nu e necesar dacă nu folosești hook-ul direct, dar importă tipul:
  - `import type { SortConfigEntry } from '../../hooks/useSortConfig';`
- Schimbă câmpul props:
  - ÎNAINTE: `requestSort: (key: string) => void; sortConfig: { key: string; direction: 'asc' | 'desc' }[];`
  - DUPĂ: `requestSort: (key: string) => void; sortConfig: SortConfigEntry[];`

**Verificare:** `npm run lint` — fără erori TypeScript.

---

## Task 3 — Migrează `ManagementInscrieri.tsx`

**Fișiere:** `components/GestiuneExamene/ManagementInscrieri.tsx`

**Acțiune:**

1. Adaugă import: `import { useSortConfig, applySortConfig, SortConfigEntry } from '../../hooks/useSortConfig';`
2. Înlocuiește linia 583:
   - ÎNAINTE: `const [sortConfigs, setSortConfigs] = useState<Array<{ key: keyof InscriereExamen | 'nume_sportiv' | 'grad_actual' | 'grad_vizat', direction: 'asc' | 'desc' }>>([]);`
   - DUPĂ: `const { sortConfig: sortConfigs, requestSort: requestSortRaw } = useSortConfig();`
3. Șterge funcția `requestSort` de la liniile 585–611 (funcția inline cu logica shift-key).
4. Creează wrapper local imediat după:
   ```
   const requestSort = (key: string, shiftKey: boolean) => requestSortRaw(key, shiftKey);
   ```
   Aceasta menține compatibilitatea cu apelul de la linia 1563 (`onSort={requestSort}`) care pasează `shiftKey` ca al doilea argument.
5. Înlocuiește blocul de sortare din `participantiInscrisi` (liniile 618–658) cu `applySortConfig`:
   - Funcția `getField`:
     - `'nume_sportiv'` → `(a.sportiv_nume || a.sportivi?.nume || '') + ' ' + (a.sportiv_prenume || a.sportivi?.prenume || '')`
     - `'grad_actual'` → `a.nume_grad_actual || ''`
     - `'grad_vizat'` → `getGradOrdine(a)`
     - altele → `a[key as keyof InscriereExamen]`
   - `tiebreaker` → sortare alfabetică după `sportiv_nume + sportivi?.nume`
   - Sortarea implicită (când `sortConfigs` e gol) rămâne neschimbată în blocul `else` — `applySortConfig` returnează o copie fără sortare când array-ul e gol, deci blocul `else` implicit din `useMemo` poate rămâne sau poate fi eliminat dacă sortarea implicită se aplică separat cu `.sort(...)` pe rezultatul lui `applySortConfig`.
   - **Important:** sortarea implicită după `getGradOrdine` (desc) + nume (asc) trebuie păstrată când `sortConfigs.length === 0`. Soluție: dacă `sortConfigs.length === 0` aplică sortarea implicită directă; dacă > 0 folosește `applySortConfig`.

**Verificare:** `npm run lint` — fără erori TypeScript.

---

## Task 4 — Pas1: start gol + ascunde înscriși + toggle button

**Fișiere:**
- `components/Competitii/InscriereClubWizard/index.tsx`
- `components/Competitii/InscriereClubWizard/Pas1.tsx`

**Acțiune:**

### A. Elimină pre-selectarea din inscrieri existente — `index.tsx`

La liniile 45–71 există un `useEffect` care apelează `setSelectedSportivi(prev => new Set([...prev, ...newSportivi]))`.

Modifică `useEffect`-ul astfel: **elimină apelul `setSelectedSportivi`**, dar **păstrează** inițializarea `autoCategorie` și `quyenAles` (liniile 69–70), deoarece acestea reconstituie categoriile și quyen-urile pentru sportivii care vor fi selectați ulterior de utilizator.

Rezultat: `initializedFromInscrieri.current = true` se setează, `newAuto` și `newQuyen` se calculează și se aplică pe `autoCategorie`/`quyenAles`, dar `selectedSportivi` rămâne gol (`new Set()`).

Linia exactă de șters/comentat: `setSelectedSportivi(prev => new Set([...prev, ...newSportivi]));` (linia 68).

### B. Ascunde înscriși by default + toggle — `Pas1.tsx`

1. Adaugă stare locală:
   ```
   const [showDejaInscrisi, setShowDejaInscrisi] = useState(false);
   ```

2. Calculează numărul de înscriși ascunși (după filtrele existente):
   ```
   const nrDejaInscrisiAscunsi = enrichedFiltrat.filter(e => e.isDejaInscris && !showDejaInscrisi).length;
   ```
   Aceasta se calculează în corpul componentei (nu în `useMemo` separat, e O(n) simplu).

3. Modifică lista afișată: în `enrichedFiltrat` — care deja există ca `useMemo` — adaugă un filtru suplimentar. **Nu modifica `enrichedFiltrat` în sine** (e folosit și pentru `selectableIds`). Creează o nouă variabilă derivată:
   ```
   const enrichedVizibil = showDejaInscrisi
     ? enrichedFiltrat
     : enrichedFiltrat.filter(e => !e.isDejaInscris);
   ```

4. Înlocuiește toate referințele la `enrichedFiltrat` din JSX cu `enrichedVizibil` (adică în: carduri mobile, tabel desktop, mesajul "niciun sportiv"). Referințele non-JSX (`selectableIds`, contoare `isDisabled`) rămân pe `enrichedFiltrat`.

5. Adaugă butonul toggle în bara de header (imediat după blocul `{/* Search */}`, înainte de `{/* Filtre avansate */}`). Structură:
   ```jsx
   {dejaInscrisiSet.size > 0 && (
     <button
       onClick={() => setShowDejaInscrisi(v => !v)}
       style={{ touchAction: 'manipulation' }}
       className={`text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5 min-h-[40px] ${
         showDejaInscrisi
           ? 'border-blue-500 text-blue-300 bg-blue-900/20'
           : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
       }`}
     >
       {showDejaInscrisi ? 'Ascunde înscriși' : `Arată înscriși (${dejaInscrisiSet.size})`}
     </button>
   )}
   ```
   Afișează butonul doar dacă există sportivi înscriși (`dejaInscrisiSet.size > 0`).

**Verificare:** `npm run lint` — fără erori TypeScript.

---

## Task 5 — Pas1: sortare coloane cu useSortConfig

**Fișiere:** `components/Competitii/InscriereClubWizard/Pas1.tsx`

**Acțiune:**

1. Adaugă import: `import { useSortConfig, applySortConfig, SortConfigEntry } from '../../../hooks/useSortConfig';`

2. În corpul lui `Pas1SelectareSportivi`, adaugă hook-ul:
   ```
   const { sortConfig, requestSort: requestSortPas1 } = useSortConfig();
   ```
   Numește-l `requestSortPas1` pentru a evita conflict cu orice altă variabilă locală.

3. Sortează `enrichedVizibil` (creată în Task 4) înainte de render. Adaugă după calculul `enrichedVizibil`:
   ```
   const enrichedSortat = applySortConfig(
     enrichedVizibil,
     sortConfig,
     (item, key) => {
       if (key === 'nume') return `${item.sportiv.nume} ${item.sportiv.prenume}`.toLowerCase();
       if (key === 'grad') return grade.find(g => g.id === item.sportiv.grad_actual_id)?.ordine ?? -1;
       if (key === 'varsta') return item.varsta ?? -1;
       if (key === 'gen') return item.sportiv.gen ?? '';
       return '';
     }
   );
   ```

4. Înlocuiește `enrichedVizibil` cu `enrichedSortat` în JSX (carduri mobile și tabel desktop).

5. Adaugă header-e clicabile în tabelul desktop (înlocuiește `<th>` existente cu versiuni sortabile):

   Coloanele sortabile: `Sportiv` (key `'nume'`), `Vârstă la competiție` (key `'varsta'`), `Grad` (key `'grad'`). Adaugă și o coloană `Gen` (key `'gen'`) între `Sportiv` și `Vârstă` — adaugă `<th>` în header și `<td>` cu `{sportiv.gen ?? '—'}` în `RandTabelSportiv` (pasează `gen` ca prop sau accesează direct).

   Pattern pentru fiecare `<th>` sortabil:
   ```jsx
   <th
     className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-white group"
     onClick={() => requestSortPas1('nume')}
   >
     <span className="flex items-center gap-1">
       Sportiv
       <SortIndicator sortConfig={sortConfig} columnKey="nume" />
     </span>
   </th>
   ```

6. Creează helper local `SortIndicator` în același fișier (înainte de `Pas1SelectareSportivi`):
   ```tsx
   const SortIndicator: React.FC<{ sortConfig: SortConfigEntry[]; columnKey: string }> = ({ sortConfig, columnKey }) => {
     const entry = sortConfig.find(s => s.key === columnKey);
     if (!entry) return <span className="text-slate-600 text-[10px]">⇅</span>;
     return <span className="text-brand-primary text-[10px]">{entry.direction === 'asc' ? '↑' : '↓'}</span>;
   };
   ```

7. Pentru carduri mobile: sortarea se aplică implicit prin `enrichedSortat` (ordinea se schimbă vizual). Nu e necesar UI de sortare pe carduri — sortarea e desktop-only.

8. Adaugă `RandTabelSportivProps` câmpul `gen?: string | null` și pasează-l din `enrichedSortat.map(...)`. În `<RandTabelSportiv>` adaugă `<td>` după coloana `Sportiv`:
   ```jsx
   <td className="p-3 text-sm text-slate-400">
     {sportiv.gen === 'Masculin' ? 'M' : sportiv.gen === 'Feminin' ? 'F' : '—'}
   </td>
   ```
   Adaugă `<th>` corespunzător cu sort pe key `'gen'` în header.

**Verificare:** `npm run lint` — fără erori TypeScript. Compilator TypeScript să nu raporteze nicio eroare pe fișierele modificate.

---

## Verificare finală

```bash
npm run lint
```

Toate cele 5 task-uri trebuie să compileze curat. Nicio stub implementare, nicio `any` introdusă inutil.

## Note pentru executor

- `SortConfigEntry` se importă ca tip named export din `hooks/useSortConfig.ts`.
- Sportivi/index.tsx folosea comportamentul de **adăugare la array** (multi-sort fără shift). După migrare va folosi **single-sort** (înlocuire). Aceasta este o schimbare intenționată de comportament — utilizatorul a aprobat-o implicit prin task description ("single-sort replace").
- `ManagementInscrieri.tsx` are shift-key multi-sort — trebuie păstrat prin `requestSortRaw(key, shiftKey)`.
- Nu modifica logica de eligibilitate sau filtrele avansate existente din Pas1.
- `enrichedFiltrat` rămâne bazat pe `sportiviFiltered` (fără filtrarea isDejaInscris) — `selectableIds` și contoarele de `isDisabled` continuă să folosească `enrichedFiltrat`.
