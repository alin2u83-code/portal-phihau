# Phase 02: Navigare Grupe Drill-Down — Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 3 (1 new, 2 modified)
**Analogs found:** 3 / 3

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/Grupe/GrupaDetailView.tsx` | component (view) | request-response + CRUD | `components/Grupe/OrarEditorModal.tsx` + `components/Competitii/index.tsx` | role-match (tab pattern exact) |
| `components/Grupe/GrupaCard.tsx` | component (card) | request-response | `components/Grupe/GrupaCard.tsx` (self — modification) | self-modify |
| `components/Grupe/index.tsx` | component (orchestrator) | request-response | `components/Grupe/index.tsx` (self — modification) | self-modify |

---

## Pattern Assignments

### `components/Grupe/GrupaDetailView.tsx` (NEW — view + tabs)

**Primary analog:** `components/Grupe/OrarEditorModal.tsx` (orar logic) + `components/Competitii/index.tsx` lines 884–928 (tab bar pattern)

#### Imports pattern (copy from OrarEditorModal lines 1–9, extend):
```typescript
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa, ProgramItem } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';
import { formatTime } from '../../utils/date';
import { sortProgram } from './ProgramEditor';
```

#### Local type definitions (copy from GrupaCard.tsx lines 9–12):
```typescript
interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

type TabId = 'antrenamente' | 'orar' | 'sportivi';
```

#### Tab bar pattern (copy from Competitii/index.tsx lines 884–910, simplified):
```typescript
// Lightweight underline-tab style (simpler than Competitii's pill style)
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

#### Tab Orar — core logic (copy from OrarEditorModal.tsx lines 22–78, adapt):

**Key adaptations from original:**
1. Remove `isOpen`/`onClose` props — not a modal
2. `useEffect([isOpen, grupa])` → `useEffect([grupa.id])` (avoids object reference re-render)
3. Remove `setGrupe` prop — use `queryClient.invalidateQueries` only
4. After save: toast + stay on tab (no `onClose()` call)
5. "Anulează" → "Resetează": `setProgram(grupa.program || [])` (local undo, not close)
6. Remove `max-h-[50vh]` scroll container — tab content is full height

```typescript
// State (from OrarEditorModal lines 23–27):
const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
const [loading, setLoading] = useState(false);
const { showError, showSuccess } = useError();
const queryClient = useQueryClient();
const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

// Reset effect (adapted from OrarEditorModal line 30–34 — CHANGED dependency):
React.useEffect(() => {
    setProgram(grupa.program || []);
}, [grupa.id]); // IMPORTANT: use grupa.id (string), NOT grupa (object)

// handleSave (from OrarEditorModal lines 36–63, adapted):
const handleSave = async () => {
    setLoading(true);
    try {
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
        const toInsert = program.map(({ id, ...rest }) => ({
            ...rest,
            grupa_id: grupa.id,
            club_id: grupa.club_id,
        }));
        if (toInsert.length > 0) {
            const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
            if (error) throw error;
        }
        // Clear localStorage cache BEFORE invalidateQueries (from OrarEditorModal lines 52–55):
        Object.keys(localStorage)
            .filter(k => k.startsWith('cache_grupe_'))
            .forEach(k => clearCache(k));
        await queryClient.invalidateQueries({ queryKey: ['grupe'] });
        showSuccess('Succes', 'Orarul a fost salvat.');
        // ADAPTED: no onClose() — stay on tab (D-04)
    } catch (error: any) {
        showError('Eroare la salvare orar', error.message);
    } finally {
        setLoading(false);
    }
};

// Item handlers (from OrarEditorModal lines 66–78 — unchanged):
const handleAddItem = (zi: ProgramItem['ziua'] = 'Luni') =>
    setProgram(p => [...p, { id: `new-${Date.now()}`, ziua: zi, ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true }]);
const handleRemoveItem = (id: string) => setProgram(p => p.filter(item => item.id !== id));
const handleItemChange = (id: string, field: keyof ProgramItem, value: any) =>
    setProgram(p => p.map(item => item.id === id ? { ...item, [field]: value } : item));
const programByDay = useMemo(() => {
    const grouped: Record<string, ProgramItem[]> = {};
    zileSaptamana.forEach(zi => (grouped[zi] = program.filter(p => p.ziua === zi)));
    return grouped;
}, [program]);
```

#### Tab Orar — day grid JSX (copy from OrarEditorModal lines 92–158, remove max-h scroll wrapper):
```typescript
// From OrarEditorModal lines 92–158 — remove the outer max-h scroll div:
<div className="space-y-6">  {/* was: space-y-6 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-1 */}
    {zileSaptamana.map(zi => (
        <div key={zi} className="group">
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    {zi}
                </h3>
                <Button variant="secondary" size="sm" onClick={() => handleAddItem(zi)}
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation min-h-[36px]">
                    <PlusIcon className="w-3 h-3 mr-1" /> Adaugă Interval
                </Button>
            </div>
            {/* ... rest of day rows identical to OrarEditorModal lines 110–158 */}
        </div>
    ))}
</div>
```

#### Tab Orar — action buttons (adapt from OrarEditorModal lines 162–169):
```typescript
// ADAPTED: "Anulează" → "Resetează" with local undo (D-03), no onClose
<div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-700">
    <Button variant="secondary" onClick={() => setProgram(grupa.program || [])} disabled={loading}
        className="w-full sm:w-auto touch-manipulation">
        Resetează
    </Button>
    <Button variant="success" onClick={handleSave} isLoading={loading}
        className="w-full sm:w-auto touch-manipulation">
        <CheckCircleIcon className="w-4 h-4 mr-2" /> Salvează Orar
    </Button>
</div>
```

#### Tab Sportivi — query pattern (from Prezenta pattern, confirmed in RESEARCH.md):
```typescript
const { data: sportivi = [], isLoading } = useQuery({
    queryKey: ['sportivi-grupa', grupa.id],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('sportivi')
            .select('id, nume, prenume, grad_actual_id, grade:grad_actual_id(denumire)')
            .eq('grupa_id', grupa.id)
            .eq('status', 'Activ');
        if (error) throw error;
        return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
});
```

#### Tab Antrenamente — placeholder (D-10):
```typescript
const TabAntrenamente: React.FC = () => (
    <div className="flex items-center justify-center py-12">
        <div className="border-dashed border-2 border-slate-700 rounded-xl py-12 px-8 text-center max-w-md">
            <h3 className="text-base font-bold text-white mb-2">
                Calendar antrenamente — disponibil în curând
            </h3>
            <p className="text-sm text-slate-400">
                Gestionarea completă a antrenamentelor va fi disponibilă în faza următoare.
                Folosește tab-ul Orar pentru a configura programul recurent.
            </p>
        </div>
    </div>
);
```

#### Back navigation header (pattern from index.tsx lines 200–201):
```typescript
// Copy back button pattern from Grupe/index.tsx line 200:
<Button variant="secondary" onClick={onBack}>
    <ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi la Grupe
</Button>
```

---

### `components/Grupe/GrupaCard.tsx` (MODIFIED)

**Analog:** Self — current `components/Grupe/GrupaCard.tsx`

#### Props interface change (lines 43–62 → replace):

**Remove** from interface: `onAdaugaSportivi`, `onConfigurareOrar`
**Add** to interface: `onDetalii`

```typescript
// CURRENT (lines 43–62):
export const GrupaCard: React.FC<{
    grupa: GrupaWithDetails;
    onEdit: (g: GrupaWithDetails) => void;
    onDelete: (g: GrupaWithDetails) => void;
    onAdaugaSportivi: (g: GrupaWithDetails) => void;   // REMOVE
    onConfigurareOrar: (g: GrupaWithDetails) => void;  // REMOVE
    onModificareOrar?: (g: GrupaWithDetails) => void;
    onGestionareSecundari?: (g: GrupaWithDetails) => void;
    onGenerareAntrenamente?: (g: GrupaWithDetails) => void;
    nrSecundari?: number;
}>

// NEW (D-07):
export const GrupaCard: React.FC<{
    grupa: GrupaWithDetails;
    onEdit: (g: GrupaWithDetails) => void;
    onDelete: (g: GrupaWithDetails) => void;
    onDetalii: (g: GrupaWithDetails) => void;          // NEW — CTA primary
    onModificareOrar?: (g: GrupaWithDetails) => void;
    onGestionareSecundari?: (g: GrupaWithDetails) => void;
    onGenerareAntrenamente?: (g: GrupaWithDetails) => void;
    nrSecundari?: number;
}>
```

#### Button area change (lines 141–214 → replace buttons, keep dropdown):

```typescript
// CURRENT buttons (lines 141–151) — replace with:
<div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-end flex-wrap gap-2">
    <Button size="sm" variant="primary" onClick={() => onDetalii(grupa)}
        className="min-h-[40px] touch-manipulation">
        Detalii
    </Button>
    <Button size="sm" variant="secondary" onClick={() => onEdit(grupa)}
        className="min-h-[40px] touch-manipulation">
        Gestionează
    </Button>
    {/* [...] dropdown div — KEEP UNCHANGED from line 154–214 */}
</div>
```

---

### `components/Grupe/index.tsx` (MODIFIED)

**Analog:** Self — current `components/Grupe/index.tsx`

#### New state (add after line 52, following existing state pattern lines 44–53):
```typescript
// Existing pattern (lines 48–52):
const [grupaForAdaugaSportivi, setGrupaForAdaugaSportivi] = useState<GrupaWithDetails | null>(null);
const [grupaForOrar, setGrupaForOrar] = useState<GrupaWithDetails | null>(null);

// ADD (same pattern):
const [grupaSelectedForDetail, setGrupaSelectedForDetail] = useState<GrupaWithDetails | null>(null);
```

#### Conditional render (wrap grid in index.tsx lines 238–248):
```typescript
// CURRENT (line 238–248):
<div data-tour="grupe-lista" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {(grupe as GrupaWithDetails[]).map(grupa => (
        <GrupaCard key={grupa.id} grupa={grupa} onEdit={handleOpenEdit} onDelete={setGrupaToDelete}
            onAdaugaSportivi={setGrupaForAdaugaSportivi} onConfigurareOrar={setGrupaForOrar} ... />
    ))}
</div>

// REPLACE WITH:
{grupaSelectedForDetail ? (
    <GrupaDetailView
        grupa={grupaSelectedForDetail}
        onBack={() => setGrupaSelectedForDetail(null)}
        onOpenAdaugaSportivi={(g) => setGrupaForAdaugaSportivi(g)}
    />
) : (
    <div data-tour="grupe-lista" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(grupe as GrupaWithDetails[]).map(grupa => (
            <GrupaCard key={grupa.id} grupa={grupa} onEdit={handleOpenEdit} onDelete={setGrupaToDelete}
                onDetalii={setGrupaSelectedForDetail}    {/* NEW prop */}
                onModificareOrar={setGrupaForModificareOrar}
                onGestionareSecundari={setGrupaForSecundari}
                onGenerareAntrenamente={setGrupaForGenerare}
                nrSecundari={undefined} />
        ))}
    </div>
)}
```

Note: `onAdaugaSportivi` and `onConfigurareOrar` props are removed from the `<GrupaCard>` call. The handlers `setGrupaForAdaugaSportivi` and `setGrupaForOrar` remain in `index.tsx` — `OrarEditorModal` and `AdaugaSportiviModal` still mount here (lines 254–281), unchanged.

---

## Shared Patterns

### Error handling
**Source:** `components/Grupe/OrarEditorModal.tsx` lines 25, 59–62
**Apply to:** Tab Orar in GrupaDetailView
```typescript
const { showError, showSuccess } = useError();
// In catch:
showError('Eroare la salvare orar', error.message);
```

### Cache invalidation (dual layer)
**Source:** `components/Grupe/index.tsx` lines 61–65 and `OrarEditorModal.tsx` lines 52–56
**Apply to:** Tab Orar handleSave — MUST do both steps in order:
```typescript
// Step 1: clear localStorage custom cache
Object.keys(localStorage)
    .filter(k => k.startsWith('cache_grupe_'))
    .forEach(k => clearCache(k));
// Step 2: invalidate React Query
await queryClient.invalidateQueries({ queryKey: ['grupe'] });
```

### Loading state button
**Source:** `components/ui.tsx` Button component — `isLoading` prop
**Apply to:** All save/async buttons in GrupaDetailView
```typescript
<Button variant="success" onClick={handleSave} isLoading={loading} className="touch-manipulation">
    Salvează Orar
</Button>
```

### Touch target sizing
**Source:** `components/Grupe/GrupaCard.tsx` lines 143–151
**Apply to:** All interactive elements in GrupaDetailView
```typescript
className="min-h-[40px] touch-manipulation"
// For dropdown items: min-h-[44px] touch-manipulation
```

---

## No Analog Found

None — all files have direct analogs in the codebase.

---

## Metadata

**Analog search scope:** `components/Grupe/`, `components/Competitii/`, `components/Prezenta/`
**Files read:** GrupaCard.tsx, OrarEditorModal.tsx, index.tsx (lines 1–100, 200–300), Competitii/index.tsx (lines 880–928)
**Pattern extraction date:** 2026-06-05
