# Bulk Category Wizard — Generator Categorii în Masă

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step bulk generator wizard that lets SUPER_ADMIN_FEDERATIE pick ages, genders, grade ranges, and probe type → auto-generate all category combinations → preview/edit/deselect → bulk-save to `categorii_template`.

**Architecture:** New `BulkCategoryWizard.tsx` component handles all 3 wizard steps. Pure generator function `generateBulkCategories()` added to existing `utils/competitiiTemplates.ts`. `CategoriiTemplateManager.tsx` gets a new button + state to open the bulk wizard. Existing `CategoryWizard.tsx` is untouched.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase JS, `components/ui.tsx` design system (Button, Modal, Select, SearchableSelect), `lucide-react` icons via `components/icons.tsx`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `utils/competitiiTemplates.ts` | Modify | Add `BulkGeneratorParams`, `BulkCategorieRow`, `generateBulkCategories()` |
| `components/Competitii/BulkCategoryWizard.tsx` | Create | 3-step wizard modal: Params → Preview → Confirm+Save |
| `components/Competitii/CategoriiTemplateManager.tsx` | Modify | Add "Generator Bulk" button + `bulkWizardOpen` state + `onBulkSaved` handler |

**Do NOT touch:** `CategoryWizard.tsx`, `types.ts`, `ui.tsx`, `DataContext`, `NavigationContext`, any existing `categorii_competitie` or inscription flow.

---

## Task 1: Generator function

**Files:**
- Modify: `utils/competitiiTemplates.ts`

### What to add

The function takes a set of parameters and returns one row per combination `(varsta × gen × gradeRange)`.

- [ ] **Step 1: Add types at the end of `utils/competitiiTemplates.ts` (before the last export)**

```typescript
// -----------------------------------------------
// BULK GENERATOR
// -----------------------------------------------

export interface GradeRange {
  min: number | null;
  max: number | null;
}

export interface BulkGeneratorParams {
  varste: number[];
  genuri: Array<'Feminin' | 'Masculin' | 'Mixt'>;
  gradeRanges: GradeRange[];
  tip_proba: TipProba;
  arma: string;
}

export interface BulkCategorieRow {
  key: string;
  denumire: string;
  varsta_min: number;
  varsta_max: number;
  gen: 'Feminin' | 'Masculin' | 'Mixt';
  grad_min_ordine: number | null;
  grad_max_ordine: number | null;
  tip_proba: TipProba;
  arma: string | null;
  tip_participare: 'individual' | 'pereche' | 'echipa';
  sportivi_per_echipa_min: number;
  sportivi_per_echipa_max: number;
  rezerve_max: number;
  max_echipe_per_club: number;
  selected: boolean;
  hasConflict: boolean;
  conflictDenumire?: string;
}
```

- [ ] **Step 2: Add the helper `buildBulkDenumire` (right after the type declarations)**

```typescript
function buildBulkDenumire(
  varsta: number,
  gen: 'Feminin' | 'Masculin' | 'Mixt',
  gradMin: number | null,
  gradMax: number | null,
  arma: string | null
): string {
  const varstaStr = `${varsta} ani`;
  const gradStr = buildGradStr(gradMin, gradMax);
  const armaStr = arma ? ` / ${arma}` : '';
  return `${varstaStr} / ${gen} / ${gradStr}${armaStr}`;
}
```

> Note: `buildGradStr` already exists in the file (private function at line ~38). `buildBulkDenumire` calls it directly — no need to export it.

- [ ] **Step 3: Add `generateBulkCategories` (right after `buildBulkDenumire`)**

```typescript
export function generateBulkCategories(
  params: BulkGeneratorParams,
  existingTemplates: Array<{
    id: string;
    gen: string;
    tip_proba: string;
    varsta_min: number;
    varsta_max: number | null;
    denumire: string;
  }>
): BulkCategorieRow[] {
  const rows: BulkCategorieRow[] = [];
  const { varste, genuri, gradeRanges, tip_proba, arma } = params;

  const armaNorm = arma.trim() || null;
  const defaultPart: 'individual' | 'pereche' | 'echipa' = 'individual';
  const defaultSportMin = 1;
  const defaultSportMax = 1;

  for (const varsta of varste) {
    for (const gen of genuri) {
      for (const gr of gradeRanges) {
        const key = `${varsta}-${gen}-${gr.min ?? 'x'}-${gr.max ?? 'x'}`;
        const denumire = buildBulkDenumire(varsta, gen, gr.min, gr.max, armaNorm);

        // Conflict: same gen + tip_proba + overlapping varsta range
        const conflict = existingTemplates.find(e => {
          if (e.gen !== gen || e.tip_proba !== tip_proba) return false;
          const eMax = e.varsta_max ?? 200;
          return varsta <= eMax && varsta >= e.varsta_min;
        });

        rows.push({
          key,
          denumire,
          varsta_min: varsta,
          varsta_max: varsta,
          gen,
          grad_min_ordine: gr.min,
          grad_max_ordine: gr.max,
          tip_proba,
          arma: armaNorm,
          tip_participare: defaultPart,
          sportivi_per_echipa_min: defaultSportMin,
          sportivi_per_echipa_max: defaultSportMax,
          rezerve_max: 0,
          max_echipe_per_club: 1,
          selected: true,
          hasConflict: !!conflict,
          conflictDenumire: conflict?.denumire,
        });
      }
    }
  }

  return rows;
}
```

- [ ] **Step 4: Verify TypeScript compiles without errors**

```bash
cd C:/Users/lungu/portal-phihau && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git add utils/competitiiTemplates.ts
git commit -m "feat(competitii): add generateBulkCategories generator function"
```

---

## Task 2: BulkCategoryWizard component

**Files:**
- Create: `components/Competitii/BulkCategoryWizard.tsx`

The wizard has 3 steps controlled by a `step` state (`1 | 2 | 3`). A shared `Modal` wraps all steps.

### Step 1 — Parametri

UI elements:
- **Vârste:** Chip grid from `VARSTE_OPTIUNI` (4–60), toggle selected, min one required.
- **Gen:** 3 chips: Feminin / Masculin / Mixt, multi-select, min one required.
- **Tip Probă:** `<Select>` using `TIP_PROBA_LABELS`.
- **Armă:** `<Input>` text, optional (used for CVD probe).
- **Intervale grade:** List of added grade range chips. "Adaugă interval grad" shows inline mini-form with two `SearchableSelect` (grad_min, grad_max). Each chip shows "GradMin – GradMax ×". Min zero required (zero grade ranges = "Orice grad" = one combo with min=null max=null).
- "**Generează Preview →**" button — disabled if no ages or no genders selected.

### Step 2 — Preview

UI elements:
- Stats bar: "X categorii generate · Y conflicte"
- Table: checkbox | Denumire (editable inline) | Gen chip | Vârstă | Grad | Armă | Conflict badge
- Inline edit for `denumire`: click pencil icon → input replaces text in row, blur saves
- Checkbox per row, "Select all" in header
- If `hasConflict`: row has yellow-orange background, badge "Conflict: `conflictDenumire`"
- Buttons: "← Înapoi" | "Continuă →" (disabled if 0 selected)

### Step 3 — Confirmare

UI elements:
- Summary: "Vei salva N categorii noi în bibliotecă."
- Compact list (max 10 items + "și X altele...")
- If any conflicts: warning note "Y au conflict cu template-uri existente și vor fi salvate oricum."
- Buttons: "← Înapoi" | "Confirmă și Salvează" (shows spinner during save)
- On success: toast "N categorii salvate" → `onSaved(rows)` → close modal

- [ ] **Step 1: Create the file with imports and types**

```typescript
import React, { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select, SearchableSelect } from '../ui';
import { PlusIcon, TrashIcon, EditIcon } from '../icons';
import { useError } from '../ErrorProvider';
import {
  TIP_PROBA_LABELS,
  ordineToLabel,
  generateBulkCategories,
  BulkGeneratorParams,
  BulkCategorieRow,
  GradeRange,
} from '../../utils/competitiiTemplates';
import type { CategorieTemplate } from './CategoriiTemplateManager';
import type { TipProba } from '../../types';
import toast from 'react-hot-toast';

const VARSTE_OPTIUNI = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,50,55,60];

interface BulkCategoryWizardProps {
  existingTemplates: CategorieTemplate[];
  onSaved: (saved: CategorieTemplate[]) => void;
  onClose: () => void;
}
```

- [ ] **Step 2: Add the main component skeleton with step state**

```typescript
const BulkCategoryWizard: React.FC<BulkCategoryWizardProps> = ({
  existingTemplates, onSaved, onClose,
}) => {
  const { showError } = useError();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [selectedVarste, setSelectedVarste] = useState<Set<number>>(new Set());
  const [selectedGenuri, setSelectedGenuri] = useState<Set<'Feminin' | 'Masculin' | 'Mixt'>>(new Set());
  const [tipProba, setTipProba] = useState<TipProba>('thao_quyen_individual');
  const [arma, setArma] = useState('');
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>([]);
  const [addingRange, setAddingRange] = useState(false);
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');

  // Step 2 state: generated rows (mutable copy for editing)
  const [rows, setRows] = useState<BulkCategorieRow[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDenumire, setEditDenumire] = useState('');

  const gradeOptions = useMemo(() =>
    [
      { value: '1', label: 'Debutant' },
      { value: '2', label: '1 Câp Galben' }, { value: '3', label: '2 Câp Galben' },
      { value: '4', label: '3 Câp Galben' }, { value: '5', label: '4 Câp Galben' },
      { value: '6', label: '1 Câp Roșu' }, { value: '7', label: '2 Câp Roșu' },
      { value: '8', label: '3 Câp Roșu' }, { value: '9', label: '4 Câp Roșu' },
      { value: '10', label: 'Centura Violet' },
      { value: '11', label: 'C.V. 1 Câp Alb' }, { value: '12', label: 'C.V. 2 Câp Alb' },
      { value: '13', label: 'C.V. 3 Câp Alb' }, { value: '14', label: 'C.V. 4 Câp Alb' },
      { value: '15', label: '1 Câp Albastru' }, { value: '16', label: '2 Câp Albastru' },
      { value: '17', label: '3 Câp Albastru' }, { value: '18', label: '4 Câp Albastru' },
      { value: '19', label: 'Centura Neagră' },
      { value: '20', label: 'C.N. 1 Dang' }, { value: '21', label: 'C.N. 2 Dang' },
      { value: '22', label: 'C.N. 3 Dang' }, { value: '23', label: 'C.N. 4 Dang' },
    ],
    []
  );

  // ... component body below
};

export default BulkCategoryWizard;
```

- [ ] **Step 3: Add the helper handlers (inside component, before return)**

```typescript
  const toggleVarsta = (v: number) => setSelectedVarste(prev => {
    const next = new Set(prev);
    if (next.has(v)) next.delete(v); else next.add(v);
    return next;
  });

  const toggleGen = (g: 'Feminin' | 'Masculin' | 'Mixt') => setSelectedGenuri(prev => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next;
  });

  const addGradeRange = () => {
    const min = rangeMin ? parseInt(rangeMin) : null;
    const max = rangeMax ? parseInt(rangeMax) : null;
    setGradeRanges(prev => [...prev, { min, max }]);
    setRangeMin('');
    setRangeMax('');
    setAddingRange(false);
  };

  const removeGradeRange = (idx: number) =>
    setGradeRanges(prev => prev.filter((_, i) => i !== idx));

  const handleGeneratePreview = () => {
    if (selectedVarste.size === 0 || selectedGenuri.size === 0) return;
    const params: BulkGeneratorParams = {
      varste: Array.from(selectedVarste).sort((a, b) => a - b),
      genuri: Array.from(selectedGenuri),
      gradeRanges: gradeRanges.length > 0 ? gradeRanges : [{ min: null, max: null }],
      tip_proba: tipProba,
      arma,
    };
    const generated = generateBulkCategories(params, existingTemplates);
    setRows(generated);
    setStep(2);
  };

  const toggleRowSelect = (key: string) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));

  const toggleSelectAll = () => {
    const allSelected = rows.every(r => r.selected);
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  const startEditDenumire = (row: BulkCategorieRow) => {
    setEditingKey(row.key);
    setEditDenumire(row.denumire);
  };

  const commitEditDenumire = () => {
    if (!editingKey) return;
    setRows(prev => prev.map(r => r.key === editingKey ? { ...r, denumire: editDenumire } : r));
    setEditingKey(null);
  };

  const selectedRows = rows.filter(r => r.selected);
  const conflictCount = rows.filter(r => r.hasConflict).length;

  const handleSave = async () => {
    if (selectedRows.length === 0) return;
    setLoading(true);
    try {
      const payload = selectedRows.map((r, i) => ({
        denumire: r.denumire,
        tip_proba: r.tip_proba,
        varsta_min: r.varsta_min,
        varsta_max: r.varsta_max,
        gen: r.gen,
        grad_min_ordine: r.grad_min_ordine,
        grad_max_ordine: r.grad_max_ordine,
        arma: r.arma,
        tip_participare: r.tip_participare,
        sportivi_per_echipa_min: r.sportivi_per_echipa_min,
        sportivi_per_echipa_max: r.sportivi_per_echipa_max,
        rezerve_max: r.rezerve_max,
        max_echipe_per_club: r.max_echipe_per_club,
        ordine_afisare: i,
      }));
      const { data, error } = await supabase
        .from('categorii_template')
        .insert(payload)
        .select();
      if (error) throw error;
      toast.success(`${data.length} categorii salvate`);
      onSaved(data as CategorieTemplate[]);
    } catch (err: any) {
      showError('Eroare salvare', err.message);
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Add the render function (replace `// ... component body below` comment with the full return)**

```typescript
  const gradeRangeLabel = (gr: GradeRange) => {
    if (gr.min === null && gr.max === null) return 'Orice grad';
    const minL = gr.min !== null ? ordineToLabel(gr.min) : '?';
    const maxL = gr.max !== null ? ordineToLabel(gr.max) : '+';
    return gr.min === gr.max ? minL : `${minL} – ${maxL}`;
  };

  const stepTitle = step === 1 ? 'Generator Bulk — Parametri' : step === 2 ? 'Generator Bulk — Preview' : 'Generator Bulk — Confirmare';

  return (
    <Modal isOpen={true} onClose={onClose} title={stepTitle}>
      <div className="max-h-[78vh] overflow-y-auto pr-1">

        {/* ── PAS 1 ── */}
        {step === 1 && (
          <div className="space-y-5">

            {/* Vârste */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Vârste <span className="text-slate-600 normal-case font-normal">(selectează una sau mai multe)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARSTE_OPTIUNI.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVarsta(v)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedVarste.has(v)
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
                    }`}
                  >{v}</button>
                ))}
              </div>
              {selectedVarste.size > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Selectate: {Array.from(selectedVarste).sort((a,b)=>a-b).join(', ')} ani
                </p>
              )}
            </div>

            {/* Gen */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Gen</p>
              <div className="flex gap-2">
                {(['Feminin', 'Masculin', 'Mixt'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGen(g)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selectedGenuri.has(g)
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
                    }`}
                  >{g}</button>
                ))}
              </div>
            </div>

            {/* Tip Probă + Armă */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Tip Probă"
                value={tipProba}
                onChange={e => setTipProba(e.target.value as TipProba)}
              >
                {Object.entries(TIP_PROBA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Input
                label="Armă (opțional, ex: Bong)"
                value={arma}
                onChange={e => setArma(e.target.value)}
                placeholder="—"
              />
            </div>

            {/* Intervale grade */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Intervale Grade
                <span className="text-slate-600 normal-case font-normal ml-1">(gol = Orice grad)</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {gradeRanges.map((gr, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-indigo-900/40 border border-indigo-700/60 text-indigo-300"
                  >
                    {gradeRangeLabel(gr)}
                    <button
                      type="button"
                      onClick={() => removeGradeRange(i)}
                      className="text-indigo-400 hover:text-white ml-0.5"
                    >×</button>
                  </span>
                ))}
                {gradeRanges.length === 0 && !addingRange && (
                  <span className="text-xs text-slate-500 italic">Niciun interval adăugat — se va folosi „Orice grad"</span>
                )}
              </div>

              {addingRange ? (
                <div className="flex items-end gap-2 bg-slate-800/60 rounded-xl p-3">
                  <div className="flex-1">
                    <SearchableSelect
                      label="De la grad"
                      options={gradeOptions}
                      value={rangeMin}
                      onChange={setRangeMin}
                      placeholder="Orice"
                      emptyLabel="Orice"
                    />
                  </div>
                  <div className="flex-1">
                    <SearchableSelect
                      label="Până la grad"
                      options={gradeOptions}
                      value={rangeMax}
                      onChange={setRangeMax}
                      placeholder="Orice"
                      emptyLabel="Orice"
                    />
                  </div>
                  <Button variant="success" size="sm" onClick={addGradeRange}>Adaugă</Button>
                  <Button variant="secondary" size="sm" onClick={() => setAddingRange(false)}>Anulează</Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddingRange(true)}
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1" />
                  Adaugă interval grad
                </Button>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={onClose}>Anulează</Button>
              <Button
                variant="info"
                onClick={handleGeneratePreview}
                disabled={selectedVarste.size === 0 || selectedGenuri.size === 0}
              >
                Generează Preview →
              </Button>
            </div>
          </div>
        )}

        {/* ── PAS 2 ── */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400">
                <span className="text-white font-semibold">{rows.length}</span> categorii generate
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">
                <span className="text-emerald-400 font-semibold">{selectedRows.length}</span> selectate
              </span>
              {conflictCount > 0 && (
                <>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-amber-400">
                    ⚠ {conflictCount} conflicte cu template-uri existente
                  </span>
                </>
              )}
            </div>

            {/* Table */}
            <div className="-mx-1 overflow-x-auto border border-slate-700 rounded-xl">
              <table className="w-full text-xs text-slate-300 min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60 text-[11px] text-slate-400 uppercase">
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every(r => r.selected)}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-2 text-left">Denumire</th>
                    <th className="p-2 text-center">Gen</th>
                    <th className="p-2 text-center">Vârstă</th>
                    <th className="p-2 text-left hidden sm:table-cell">Grad</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map(row => (
                    <tr
                      key={row.key}
                      className={`transition-colors ${
                        row.hasConflict ? 'bg-amber-900/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRowSelect(row.key)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-2">
                        {editingKey === row.key ? (
                          <input
                            value={editDenumire}
                            onChange={e => setEditDenumire(e.target.value)}
                            onBlur={commitEditDenumire}
                            onKeyDown={e => e.key === 'Enter' && commitEditDenumire()}
                            autoFocus
                            className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-white text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className="text-white">{row.denumire}</span>
                            <button
                              type="button"
                              onClick={() => startEditDenumire(row)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                            >
                              <EditIcon className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {row.arma && <div className="text-orange-400 text-[10px]">{row.arma}</div>}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          row.gen === 'Feminin' ? 'bg-pink-900/40 text-pink-300'
                            : row.gen === 'Masculin' ? 'bg-blue-900/40 text-blue-300'
                            : 'bg-purple-900/40 text-purple-300'
                        }`}>{row.gen[0]}</span>
                      </td>
                      <td className="p-2 text-center text-slate-400">{row.varsta_min} ani</td>
                      <td className="p-2 hidden sm:table-cell text-slate-400">
                        {row.grad_min_ordine !== null
                          ? (row.grad_min_ordine === row.grad_max_ordine
                            ? ordineToLabel(row.grad_min_ordine)
                            : `${ordineToLabel(row.grad_min_ordine)} – ${row.grad_max_ordine !== null ? ordineToLabel(row.grad_max_ordine) : '+'}`)
                          : 'Orice'}
                      </td>
                      <td className="p-2 text-center">
                        {row.hasConflict ? (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-900/50 text-amber-300 cursor-help"
                            title={`Conflict cu: ${row.conflictDenumire}`}
                          >⚠ Conflict</span>
                        ) : (
                          <span className="text-emerald-500 text-[10px]">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-1">
              <Button variant="secondary" onClick={() => setStep(1)}>← Înapoi</Button>
              <Button
                variant="info"
                onClick={() => setStep(3)}
                disabled={selectedRows.length === 0}
              >
                Continuă → ({selectedRows.length})
              </Button>
            </div>
          </div>
        )}

        {/* ── PAS 3 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
              <p className="text-sm text-white font-semibold">
                Vei salva <span className="text-emerald-400">{selectedRows.length}</span> categorii în Biblioteca Federației.
              </p>
              {conflictCount > 0 && (
                <p className="text-xs text-amber-300">
                  ⚠ {selectedRows.filter(r => r.hasConflict).length} au conflict cu template-uri existente și vor fi salvate oricum.
                </p>
              )}
            </div>

            {/* Compact list */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {selectedRows.slice(0, 10).map(r => (
                <div key={r.key} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.hasConflict ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                  <span>{r.denumire}</span>
                </div>
              ))}
              {selectedRows.length > 10 && (
                <p className="text-xs text-slate-500 italic pl-3.5">
                  ... și {selectedRows.length - 10} altele
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-1">
              <Button variant="secondary" onClick={() => setStep(2)} disabled={loading}>← Înapoi</Button>
              <Button
                variant="success"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Se salvează...' : `Confirmă și Salvează (${selectedRows.length})`}
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:/Users/lungu/portal-phihau && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add components/Competitii/BulkCategoryWizard.tsx
git commit -m "feat(competitii): add BulkCategoryWizard 3-step bulk template generator"
```

---

## Task 3: Wire BulkCategoryWizard into CategoriiTemplateManager

**Files:**
- Modify: `components/Competitii/CategoriiTemplateManager.tsx`

- [ ] **Step 1: Add import at top of file (after existing imports)**

In `CategoriiTemplateManager.tsx`, after the line `import CategoryWizard from './CategoryWizard';`, add:

```typescript
import BulkCategoryWizard from './BulkCategoryWizard';
```

- [ ] **Step 2: Add state for bulk wizard (inside `CategoriiTemplateManager` component, near `wizardOpen` state)**

Find this line in the component:
```typescript
  const [wizardOpen, setWizardOpen] = useState(false);
```

Add after it:
```typescript
  const [bulkWizardOpen, setBulkWizardOpen] = useState(false);
```

- [ ] **Step 3: Add "Generator Bulk" button in the header actions (right before "Wizard Adăugare" button)**

Find this block:
```typescript
          {canEdit && (
            <>
              <Button variant="info" size="sm" onClick={() => setWizardOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-1" /> Wizard Adăugare
              </Button>
```

Replace with:
```typescript
          {canEdit && (
            <>
              <Button variant="warning" size="sm" onClick={() => setBulkWizardOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-1" /> Generator Bulk
              </Button>
              <Button variant="info" size="sm" onClick={() => setWizardOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-1" /> Wizard Adăugare
              </Button>
```

- [ ] **Step 4: Add BulkCategoryWizard modal at the bottom of the component (right after the Wizard modal block)**

Find this block (at the very end of the JSX, before the closing `</div>`):
```typescript
      {/* Wizard modal */}
      {wizardOpen && (
        <CategoryWizard
          mode="template"
          permissions={permissions}
          grade={grade}
          existingTemplates={templates}
          onTemplateSaved={t => { setTemplates(prev => [...prev, t]); setWizardOpen(false); }}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
```

Replace with:
```typescript
      {/* Wizard modal */}
      {wizardOpen && (
        <CategoryWizard
          mode="template"
          permissions={permissions}
          grade={grade}
          existingTemplates={templates}
          onTemplateSaved={t => { setTemplates(prev => [...prev, t]); setWizardOpen(false); }}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {/* Generator Bulk modal */}
      {bulkWizardOpen && (
        <BulkCategoryWizard
          existingTemplates={templates}
          onSaved={saved => {
            setTemplates(prev => [...prev, ...saved]);
            setBulkWizardOpen(false);
          }}
          onClose={() => setBulkWizardOpen(false)}
        />
      )}
    </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:/Users/lungu/portal-phihau && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add components/Competitii/CategoriiTemplateManager.tsx
git commit -m "feat(competitii): wire BulkCategoryWizard into CategoriiTemplateManager"
```

---

## Self-Review

**Spec coverage:**
- ✅ Age multi-select (one or more values from VARSTE_OPTIUNI)
- ✅ Gender multi-select (Feminin / Masculin / Mixt)
- ✅ Grade ranges (add/remove pairs, zero = "Orice grad")
- ✅ Tip probă per wizard run (separate runs for different types)
- ✅ Auto-generate ALL combinations (varsta × gen × grade-range)
- ✅ Preview table with checkboxes + deselect individual rows
- ✅ Conflict detection vs. existing templates (highlight + badge)
- ✅ Inline rename per row
- ✅ Bulk save to `categorii_template`
- ✅ Existing single-wizard workflow unchanged
- ✅ No touch on types.ts, ui.tsx, DataContext

**Placeholder scan:** No TBDs, all code complete.

**Type consistency:**
- `BulkCategorieRow.key` used as React key and for `editingKey` — consistent throughout
- `GradeRange` used in `BulkGeneratorParams.gradeRanges` and local state `gradeRanges: GradeRange[]` — consistent
- `onSaved: (saved: CategorieTemplate[])` matches Supabase response cast in `handleSave` — consistent
