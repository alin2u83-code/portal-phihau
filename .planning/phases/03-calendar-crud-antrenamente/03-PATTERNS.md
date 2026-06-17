# Phase 03: Calendar & CRUD Antrenamente - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 2 (1 modified principal + 1 hook posibil extins)
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/Grupe/GrupaDetailView.tsx` (TabAntrenamente) | component (tab sub-component) | CRUD + request-response | `TabOrar` și `TabSportivi` din același fișier (liniile 39-242) | exact — același fișier, același tip de sub-componentă tab |
| `hooks/useCalendarView.ts` (extindere opțională) | hook | CRUD + request-response | fișierul curent în întregime (liniile 1-112) | exact — extindere directă a hook-ului existent |

---

## Pattern Assignments

### `components/Grupe/GrupaDetailView.tsx` — TabAntrenamente (înlocuire placeholder liniile 24-36)

**Analog primar:** `TabOrar` (liniile 39-181 din același fișier) — pentru pattern modal state + supabase mutations.
**Analog secundar:** `TabSportivi` (liniile 183-242 din același fișier) — pentru pattern useQuery React Query local + empty state.

---

#### Imports pattern (liniile 1-8 din GrupaDetailView.tsx)

```typescript
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';
```

TabAntrenamente va adăuga la importurile existente:
- `Modal, ConfirmButton, Badge` din `'../ui'`
- `XCircleIcon, ChevronLeftIcon, ChevronRightIcon` din `'../icons'`
- `useCalendarView` din `'../../hooks/useCalendarView'`
- `formatTime` din `'../../utils/date'`
- tipul `Antrenament` din `'../../types'`

---

#### Pattern hook consum (analog: TabOrar liniile 40-43)

```typescript
// TabOrar — pattern dependency pe ID string, nu obiect
const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
React.useEffect(() => {
    setProgram(grupa.program || []);
}, [grupa.id]); // CRITIC: grupa.id (string), NU grupa (obiect) — evită infinite loop
```

TabAntrenamente va consuma `useCalendarView(grupa.id)` — același pattern dependency pe `grupa.id`.

---

#### Pattern modal state management (analog: TabOrar liniile 40-41)

```typescript
// Pattern din TabOrar — useState local per modal
const [loading, setLoading] = useState(false);
const { showError, showSuccess } = useError();
const queryClient = useQueryClient();
```

TabAntrenamente va extinde cu:
```typescript
const [isModalAdaugareOpen, setIsModalAdaugareOpen] = useState(false);
const [modalAnulareId, setModalAnulareId] = useState<string | null>(null);
const [motivAnulare, setMotivAnulare] = useState('');
```

---

#### Pattern Supabase mutation (analog: TabOrar liniile 51-75)

```typescript
// TabOrar — pattern mutation: try/catch + showError/showSuccess + queryClient.invalidateQueries
const handleSave = async () => {
    setLoading(true);
    try {
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
        // ...insert...
        Object.keys(localStorage)
            .filter(k => k.startsWith('cache_grupe_'))
            .forEach(k => clearCache(k));
        await queryClient.invalidateQueries({ queryKey: ['grupe'] });
        showSuccess('Succes', 'Orarul a fost salvat.');
    } catch (error: any) {
        showError('Eroare la salvare orar', error.message);
    } finally {
        setLoading(false);
    }
};
```

Pentru TabAntrenamente — mutațiile `handleAnulare` / `handleReactivare` / `handleStergere` vor folosi același pattern try/catch + showError/showSuccess. **Diferență importantă:** NU se apelează `queryClient.invalidateQueries(['grupe'])` după mutații pe `program_antrenamente` — se apelează direct `fetchAntrenamente()` din hook (anti-pattern documentat în RESEARCH.md).

---

#### Pattern empty state + acțiune (analog: TabSportivi liniile 218-223)

```typescript
// TabSportivi — empty state cu Card și mesaj
{sportivi.length === 0 ? (
    <Card className="text-center py-8">
        <p className="text-sm font-semibold text-slate-300">Niciun sportiv în această grupă</p>
        <p className="text-xs text-slate-400 mt-1">Adaugă primul sportiv folosind butonul de mai jos.</p>
    </Card>
) : (
    // ...list
)}
```

TabAntrenamente va folosi același pattern pentru DayPanel când ziua nu are antrenamente (D-06):
```typescript
{antrenamenteForSelectedDay.length === 0 ? (
    <Card className="text-center py-6">
        <p className="text-sm font-semibold text-slate-300">Niciun antrenament pe {selectedDate}</p>
        <Button variant="primary" size="sm" onClick={() => setIsModalAdaugareOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Antrenament
        </Button>
    </Card>
) : null}
```

---

#### Pattern rând listă compact (analog: TabSportivi liniile 224-238)

```typescript
// TabSportivi — rând compact cu border și gap
<div
    key={s.id}
    className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
>
    <span className="text-sm text-slate-300">{s.prenume} {s.nume}</span>
    {s.grade?.denumire && (
        <span className="text-xs text-slate-500 ml-auto">{s.grade.denumire}</span>
    )}
</div>
```

DayPanel per antrenament va folosi aceeași structură div (aceleași clase Tailwind), extinzând cu Badge + butoane acțiuni.

---

#### Pattern buton header tab (analog: GrupaDetailView liniile 252-260 + TabSportivi linia 208)

```typescript
// GrupaDetailView header row (liniile 252-260):
<div className="flex items-center justify-between py-4 border-b border-slate-700 flex-wrap gap-2">
    <Button variant="secondary" size="sm" onClick={onBack}>
        <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
        Înapoi la Grupe
    </Button>
    ...
</div>

// TabSportivi — buton header tab (linia 208):
<Button
    variant="info"
    size="sm"
    onClick={() => onOpenAdaugaSportivi(grupa)}
    className="min-h-[40px] touch-manipulation"
>
    Adaugă Sportivi
</Button>
```

Butonul "Adaugă Antrenament" (D-09) se adaugă în header-ul din `GrupaDetailView` (linia ~258), vizibil doar când `activeTab === 'antrenamente'`:
```typescript
{activeTab === 'antrenamente' && (
    <Button variant="primary" size="sm" onClick={() => setIsModalAdaugareOpen(true)}
        className="min-h-[40px] touch-manipulation">
        <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Antrenament
    </Button>
)}
```
Aceasta implică ridicarea `isModalAdaugareOpen` și `setIsModalAdaugareOpen` din `TabAntrenamente` în `GrupaDetailView`, sau pasarea unui callback `onAdaugaAntrenament` ca prop la `TabAntrenamente`.

---

#### Pattern tab bar (analog: GrupaDetailView liniile 264-278)

```typescript
// Tab bar existent — nu se modifică structura
<div className="flex border-b border-slate-700 gap-1">
    {(['antrenamente', 'orar', 'sportivi'] as TabId[]).map(tab => (
        <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
            {tab === 'antrenamente' ? 'Antrenamente' : tab === 'orar' ? 'Orar' : 'Sportivi'}
        </button>
    ))}
</div>
```

Tab bar-ul nu se modifică. `TabAntrenamente` se montează la linia 282 cu props extinse.

---

#### Pattern ConfirmButton (din ui.tsx liniile 201-260)

```typescript
// ConfirmButton API — din ui.tsx liniile 201-207
export interface ConfirmButtonProps extends Omit<ButtonProps & {...}, 'onClick' | 'as'> {
  onConfirm: () => void;
  confirmText?: string;   // default: 'Ești sigur?'
  confirmLabel?: string;  // default: 'Da'
  cancelLabel?: string;   // default: 'Nu'
}
// Auto-reset după 3000ms (linia 222-226)
// Utilizare pentru Șterge (D-12):
<ConfirmButton
    variant="danger"
    size="sm"
    onConfirm={() => handleStergere(a.id)}
>
    <TrashIcon className="w-3.5 h-3.5" />
</ConfirmButton>
```

---

#### Pattern Modal (din ui.tsx liniile 328-361)

```typescript
// Modal API — portal în document.body, Escape key, backdrop click
<Modal isOpen={isModalAdaugareOpen} onClose={() => setIsModalAdaugareOpen(false)} title="Adaugă Antrenament">
    {/* form content */}
    <div className="space-y-4">
        <Input label="Data" type="date" value={formData.data} onChange={...} />
        <Input label="Ora start" type="time" value={formData.ora_start} onChange={...} />
        <Input label="Ora sfârșit" type="time" value={formData.ora_sfarsit} onChange={...} />
    </div>
    <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={() => setIsModalAdaugareOpen(false)}>Anulează</Button>
        <Button variant="primary" isLoading={loading} onClick={handleSubmitAdaugare}>Salvează</Button>
    </div>
</Modal>
```

---

#### Pattern Badge (din ui.tsx liniile 655-683)

```typescript
// Badge — variant determină culorile din CSS vars
<Badge variant={statusVariant(a.status)}>
    {a.status || 'planificat'}
</Badge>

// Helper statusVariant:
const statusVariant = (status: string | undefined): 'green' | 'red' | 'amber' | 'slate' => {
    if (status === 'planificat') return 'green';
    if (status === 'anulat') return 'red';
    if (status === 'efectuat') return 'amber';
    return 'slate';
};
```

---

### `hooks/useCalendarView.ts` (extindere opțională — dacă planner alege să adauge handleAnulare/handleReactivare/handleStergere în hook)

**Analog:** fișierul curent (liniile 1-112) — toate funcțiile existente servesc ca pattern direct.

#### Pattern funcție din hook (analog: handleSaveCustom liniile 64-93)

```typescript
// Pattern existent în useCalendarView.ts — mutation cu showError/showSuccess + fetchAntrenamente()
const handleSaveCustom = async (data: any, clubId?: string) => {
    // ...logică insert...
    if (error) {
        showError("Eroare", error.message);
    } else if (newAntrenament) {
        showSuccess("Succes", "Antrenamentul personalizat a fost adăugat.");
        await fetchAntrenamente(); // refetch, nu invalidateQueries
    }
};
```

Dacă se extinde hook-ul, `handleAnulare` / `handleReactivare` / `handleStergere` urmează **exact** același pattern:
1. `await supabase.from('program_antrenamente').update({...}).eq('id', id)`
2. `if (error) showError(...); else { showSuccess(...); await fetchAntrenamente(); }`

**Recomandarea RESEARCH.md (A3):** Definesc local în `TabAntrenamente` — funcțiile sunt simple (3 linii fiecare) și nu sunt reutilizate în altă parte.

---

## Shared Patterns

### useError (showError / showSuccess)
**Sursă:** `components/ErrorProvider.tsx`
**Import:** `import { useError } from '../ErrorProvider';` (în GrupaDetailView) sau `import { useError } from '../../ErrorProvider';` (în hooks)
**Aplicare:** Toate mutațiile din TabAntrenamente
```typescript
const { showError, showSuccess } = useError();
// La eroare:
showError('Eroare anulare', error.message);
// La succes:
showSuccess('Succes', 'Antrenamentul a fost anulat.');
```

### toLocaleDateString('sv-SE') pentru date locale
**Sursă:** `hooks/useCalendarView.ts` linia 9
**Aplicare:** Oriunde se construiește un string YYYY-MM-DD din `new Date()` — în `navigateMonth`, în form data default
```typescript
const todayLocal = new Date().toLocaleDateString('sv-SE');
// și pentru capătul lunii:
const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('sv-SE');
```

### Dependency pe ID string în useEffect/useMemo
**Sursă:** `GrupaDetailView.tsx` linia 49 — comentariu explicit "Pitfall 2"
```typescript
React.useEffect(() => {
    setProgram(grupa.program || []);
}, [grupa.id]); // CRITIC: grupa.id, NU grupa
```
**Aplicare:** Orice `useEffect` sau `useCallback` care depinde de `grupa` în `TabAntrenamente`.

### Supabase client import
**Sursă:** `GrupaDetailView.tsx` linia 6
```typescript
import { supabase } from '../../supabaseClient';
```
RLS injectează automat `active-role-context-id` header în toate requesturile — nu necesită parametri suplimentari la query.

---

## No Analog Found

Niciun fișier nou fără analog în codebase. Toate componentele și hook-urile din această fază au analogi direcți sau sunt extinderi ale codului existent.

| File | Role | Data Flow | Observație |
|------|------|-----------|------------|
| CalendarGrid (subcomponentă inline) | component | CRUD display | Nu există calendar grid în proiect — se construiește cu Tailwind div-uri conform D-01. Pattern-ul de calcul offset e documentat în RESEARCH.md Pattern 1. |

---

## Critical Decisions for Planner

1. **D-13 rezolvat:** `handleAnulare` / `handleReactivare` / `handleStergere` se definesc **local în TabAntrenamente** (nu în hook) — funcțiile sunt simple și nu sunt reutilizate.

2. **Ridicare state modal:** Butonul "Adaugă Antrenament" (D-09) trebuie să fie în header-ul `GrupaDetailView` (linia 252-260). Opțiuni:
   - Ridică `isModalAdaugareOpen` și setter-ul în `GrupaDetailView` și pasează ca prop la `TabAntrenamente`
   - Sau: lasă state-ul în `TabAntrenamente` și pasează un ref/callback la `GrupaDetailView`
   - Pattern recomandat: ridică state-ul în `GrupaDetailView` — consistent cu cum `onOpenAdaugaSportivi` e gestionat (prop drilling simplu, un nivel).

3. **selectedDate reset la navigare lună:** La apelul `setDate()` din `navigateMonth`, adaugă `setSelectedDate(null)` — Pitfall 4 din RESEARCH.md.

4. **Motiv anulare NULL vs '':** `motiv_anulare: motivAnulare.trim() || null` — Pitfall 5 din RESEARCH.md.

5. **handleSaveCustom cu club_id:** Apelul TREBUIE să includă `grupa.club_id` ca al doilea parametru — Pitfall 6 din RESEARCH.md.

---

## Metadata

**Analog search scope:** `components/Grupe/`, `hooks/`, `components/ui.tsx`, `utils/date.ts`
**Files scanned:** 4 fișiere citite integral
**Pattern extraction date:** 2026-06-15
