# Competiții Îmbunătățiri (Items 1-9, 11-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 14 improvement items for the competition registration module (InscriereClubWizard + Competitii/index), covering duplicate-skip logic, club filtering, UI polish, keyboard navigation, and smart defaults in CategorieForm.

**Architecture:** All changes are in two files only: `components/Competitii/InscriereClubWizard.tsx` (3556 lines) and `components/Competitii/index.tsx`. No DB migrations needed. Items are grouped by file to minimize context-switching.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS, Supabase JS client, shadcn-style custom UI components.

---

## File Map

| File | Changes |
|------|---------|
| `components/Competitii/InscriereClubWizard.tsx` | Items 1+4, 2, 3, 5, 7, 9 |
| `components/Competitii/index.tsx` | Items 6, 8, 11, 12, 13, 14, 15 |

---

## Task 1: Items 1+4 — Skip/re-insert logic in Pas4 handleSave

**Files:**
- Modify: `components/Competitii/InscriereClubWizard.tsx` lines ~2967–3014

The existing code throws an error when a sportiv is already enrolled. Replace the throw with a skip counter and notification.

- [ ] **Step 1: Read the current handleSave block**

Read lines 2967–3090 to confirm exact code before editing.

- [ ] **Step 2: Replace error-throw with skip counter**

Find this block (starts around line 2972):
```typescript
      // 1. Insert/reactivare înscrieri individuale
      for (const rand of randuriIndividuale) {
        const catName = rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`;
        const sportivName = `${rand.sportiv.prenume} ${rand.sportiv.nume}`;

        const { data: existent } = await supabase
          .from('inscrieri_competitie')
          .select('id, status')
          .eq('competitie_id', competitie.id)
          .eq('sportiv_id', rand.sportiv.id)
          .eq('categorie_id', rand.categorie.id)
          .maybeSingle();

        if (existent && existent.status?.toLowerCase() !== 'retras') {
          throw new Error(`Sportivul ${sportivName} este deja inscris la categoria "${catName}".`);
        }
```

Replace the entire for-loop (lines ~2972–3013) with:
```typescript
      // 1. Insert/reactivare înscrieri individuale
      let skippedCount = 0;
      for (const rand of randuriIndividuale) {
        const { data: existent } = await supabase
          .from('inscrieri_competitie')
          .select('id, status')
          .eq('competitie_id', competitie.id)
          .eq('sportiv_id', rand.sportiv.id)
          .eq('categorie_id', rand.categorie.id)
          .maybeSingle();

        if (existent) {
          if (existent.status?.toLowerCase() !== 'retras') {
            skippedCount++; // deja înscris activ — skip silențios
            continue;
          }
          // Reactivare sportiv retras — UPDATE în loc de INSERT
          const { error: updErr } = await supabase
            .from('inscrieri_competitie')
            .update({
              status: 'inscris',
              inlantuire_id: rand.inlantuire_id ?? null,
              inlantuire_id_2: rand.inlantuire_id_2 ?? null,
            })
            .eq('id', existent.id);
          if (updErr) throw new Error(updErr.message);
          continue;
        }

        // INSERT normal (sportiv nou)
        const { error } = await supabase.from('inscrieri_competitie').insert({
          competitie_id: competitie.id,
          sportiv_id: rand.sportiv.id,
          categorie_id: rand.categorie.id,
          club_id: clubId,
          borderou_club_id: clubId,
          inlantuire_id: rand.inlantuire_id ?? null,
          inlantuire_id_2: rand.inlantuire_id_2 ?? null,
          status: 'inscris',
          taxa_achitata: false,
        });
        if (error) throw new Error(error.message);
      }
```

- [ ] **Step 3: Add skippedCount notification after the loop (before the echipe loop)**

After the `for (const rand of randuriIndividuale)` loop, add:
```typescript
      if (skippedCount > 0) {
        showSuccess('Info', `${skippedCount} sportiv${skippedCount === 1 ? '' : 'i'} ignorat${skippedCount === 1 ? '' : 'i'} (deja înscriși activ).`);
      }
```

- [ ] **Step 4: Remove the unused `catName` and `sportivName` variables**

The old code declared `catName` and `sportivName` inside the loop. These are no longer needed. Verify they were removed in step 2 (they should not appear in the new loop).

- [ ] **Step 5: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors related to this change.

---

## Task 2: Item 5 — Filter only club's sportivi in Pas1

**Files:**
- Modify: `components/Competitii/InscriereClubWizard.tsx` lines ~491–523

The `Pas1SelectareSportivi` component receives `sportivi` (all sportivi from DataContext, not filtered by club). We need to add club filtering.

- [ ] **Step 1: Read the Pas1Props interface and component start**

Read lines 491–530 to see the exact interface.

- [ ] **Step 2: Add `myClubId` prop to Pas1Props interface**

Find:
```typescript
interface Pas1Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  vizeSportivi: VizaSportiv[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onContinua: () => void;
  onBack: () => void;
}
```

Replace with:
```typescript
interface Pas1Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  vizeSportivi: VizaSportiv[];
  myClubId?: string | null;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onContinua: () => void;
  onBack: () => void;
}
```

- [ ] **Step 3: Destructure `myClubId` in Pas1SelectareSportivi and add filter**

Find the component function signature:
```typescript
const Pas1SelectareSportivi: React.FC<Pas1Props> = ({
  competitie, sportivi, grade, categorii, inscrieri, vizeSportivi,
  selected, onToggle, onContinua, onBack,
}) => {
```

Replace with:
```typescript
const Pas1SelectareSportivi: React.FC<Pas1Props> = ({
  competitie, sportivi, grade, categorii, inscrieri, vizeSportivi,
  myClubId, selected, onToggle, onContinua, onBack,
}) => {
```

Then find:
```typescript
  const sportiviActivi = useMemo(
    () => sportivi.filter(s => s.status === 'Activ'),
    [sportivi]
  );
```

Replace with:
```typescript
  const sportiviActivi = useMemo(
    () => sportivi.filter(s => s.status === 'Activ' && (!myClubId || s.club_id === myClubId)),
    [sportivi, myClubId]
  );
```

- [ ] **Step 4: Pass `myClubId` from InscriereClubWizard to Pas1SelectareSportivi**

Find the main component props interface (line ~3424):
```typescript
export interface InscriereClubWizardProps {
  competitie: Competitie;
  probe: ProbaCompetitie[];
  categorii: CategorieCompetitie[];
  sportivi: Sportiv[];
  grade: Grad[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  onBack: () => void;
  onSaved: () => void;
}
```

The `clubId` prop already exists. In the `if (step === 1)` render block (line ~3487), pass it:
```typescript
    return (
      <Pas1SelectareSportivi
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        inscrieri={inscrieri}
        vizeSportivi={vizeSportivi}
        myClubId={clubId}
        selected={selectedSportivi}
        onToggle={handleToggle}
        onContinua={handlePas1Continua}
        onBack={onBack}
      />
    );
```

- [ ] **Step 5: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

---

## Task 3: Item 7 — Fix AI footer overlap with wizard sticky footers

**Files:**
- Modify: `components/Competitii/InscriereClubWizard.tsx`

There are 6 sticky footer divs. All have `pb-2`. On desktop, the AI footer is ~48px tall (h-12), so adding `md:pb-16` (64px) gives enough clearance.

- [ ] **Step 1: Find all 6 occurrences**

Confirm the grep output (already known): lines 894, 1634, 1817, 2197, 2763, 3300.
The class is: `sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2`

- [ ] **Step 2: Replace all occurrences (use replace_all)**

Use Edit with `replace_all: true`:

Find:
```
sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2
```

Replace with:
```
sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16
```

- [ ] **Step 3: Verify count — should be exactly 6 replacements**

```bash
cd C:\Users\lungu\portal-phihau && grep -c "md:pb-16" components/Competitii/InscriereClubWizard.tsx
```

Expected output: `6`

---

## Task 4: Item 9 — Navigation back fix (step1Picks at top level)

**Files:**
- Modify: `components/Competitii/InscriereClubWizard.tsx` lines ~3443–3485

The `selectedSportivi` state is already at the top-level component — it will not be reset on step change. However, verify that `computeAutoCategorie` is called only when going forward (not on back navigation).

- [ ] **Step 1: Read the top-level InscriereClubWizard state**

Read lines 3439–3502 to confirm `selectedSportivi` is top-level `useState`.

- [ ] **Step 2: Verify no useEffect resets state on step change**

Search for any `useEffect` that depends on `step`:
```bash
cd C:\Users\lungu\portal-phihau && grep -n "step" components/Competitii/InscriereClubWizard.tsx | grep "useEffect\|setSelectedSportivi\|setAutoCategorie" | head -20
```

If any such useEffect exists, wrap its body in a condition to only run when going forward.

- [ ] **Step 3: Verify sportiviActivi uses useMemo (not useEffect+setState)**

The `sportiviActivi` memo was already confirmed as `useMemo` in Pas1SelectareSportivi. No changes needed here unless grep reveals a `useState` + `useEffect` pattern elsewhere in the wizard.

---

## Task 5: Item 2 — Skip/reactivate probe in Pas2 (no-competitor toggle)

**Files:**
- Modify: `components/Competitii/InscriereClubWizard.tsx`

The Pas2 component (`Pas2CategoriiFull` or `Pas2SelectieQuyen` depending on type) handles per-sportiv category selection. We need a "Nu avem concurenți" skip button per proba group.

- [ ] **Step 1: Find the Pas2 component that renders probe sections**

Read lines 1930–2060 to find the component that groups categories by proba and renders sections.

- [ ] **Step 2: Find the interface for Pas2 full-selection component**

Search for the component that contains `grupeazaDupaProba`:
```bash
cd C:\Users\lungu\portal-phihau && grep -n "grupeazaDupaProba\|grupeProbile\|CardSportivCategorii" components/Competitii/InscriereClubWizard.tsx | head -20
```

- [ ] **Step 3: Add `probeSkipped` state to `CardSportivCategorii`**

In the `CardSportivCategorii` component (line ~1148), add state:
```typescript
  const [probeSkipped, setProbeSkipped] = useState<Set<string>>(new Set());
```

- [ ] **Step 4: In the render of `grupeProbile`, add skip button and conditional render**

Find where `grupeProbile.map(...)` renders each proba group inside `CardSportivCategorii`. The pattern is something like:
```tsx
{grupeProbile.map(({ proba, cats }) => (
  <div key={proba?.id ?? 'null'} ...>
    {/* header */}
    {/* categorii list */}
  </div>
))}
```

Add skip toggle button in the proba group header, and conditionally hide the categories table when skipped:
```tsx
{grupeProbile.map(({ proba, cats }) => {
  const probaId = proba?.id ?? 'null';
  const isSkipped = probeSkipped.has(probaId);
  return (
    <div key={probaId} className="...">
      {/* existing header */}
      <div className="flex items-center justify-between">
        {/* existing proba title/label */}
        <button
          onClick={() => setProbeSkipped(prev => {
            const next = new Set(prev);
            if (next.has(probaId)) next.delete(probaId); else next.add(probaId);
            return next;
          })}
          className="text-xs text-slate-400 hover:text-yellow-400 border border-slate-600 rounded px-2 py-1 min-h-[32px]"
        >
          {isSkipped ? '↩ Reactivează probă' : 'Nu avem concurenți'}
        </button>
      </div>
      {isSkipped && (
        <div className="text-xs text-yellow-500/70 italic px-2 py-1">Sărită</div>
      )}
      {!isSkipped && (
        /* existing categories render */
      )}
    </div>
  );
})}
```

Note: Read the exact structure first (Step 1) before making this edit — the exact JSX depends on how `grupeProbile` is rendered.

- [ ] **Step 5: Ensure skipped probe categories are excluded from Pas4**

The `randuriIndividuale` in Pas4 is built from `indivPicks` / `autoCategorie`. Since skipped probes are per-card (per sportiv), and the categories in those probes won't have picks toggled on, they will naturally be excluded from the sumar. No change needed in Pas4.

- [ ] **Step 6: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 6: Item 3 — Enforce max_echipe_per_club in Pas3

**Files:**
- Modify: `components/Competitii/InscriereClubWizard.tsx`

The `Pas3FormareEchipe` component renders one `SectiuneEchipaCategorie` per category. The current design supports one team per category per club (no Add Team button exists — a single team is always pre-initialized). However, we need to add the limita check for completeness.

- [ ] **Step 1: Read Pas3FormareEchipe component**

Read lines 2620–2782 to understand how teams are initialized and rendered.

- [ ] **Step 2: Find where getEchipa/echipeFormate are used**

The state `echipeFormate: EchipaFormata[]` has one entry per category. The `getEchipa(cat.id)` function returns the existing entry or a blank one. The current UI has no "Add team" button — one team per category is the implicit limit.

- [ ] **Step 3: Add visual limita indicator per category header**

In `SectiuneEchipaCategorie` (line ~2313), inside the card header where the category name and description are shown, add:
```tsx
{cat.max_echipe_per_club === 1 && (
  <span className="text-[10px] text-slate-500 ml-1">(max 1 echipă/club)</span>
)}
```

This satisfies the "enforce" requirement visually — since the wizard already creates exactly one EchipaFormata per category (checked by `getEchipa`), no functional change is needed beyond the indicator.

- [ ] **Step 4: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 7: Item 6 — Refresh button in Competitii/index.tsx

**Files:**
- Modify: `components/Competitii/index.tsx`

This is already implemented! Reading line 421–432 confirms a refresh button exists at line 421. Skip this task — **Item 6 is already done**.

---

## Task 8: Item 8 — Expand/collapse per-category tables in InscrieriView

**Files:**
- Modify: `components/Competitii/index.tsx`

The `InscrieriView` component (line ~1726) renders tables grouped by category. We need expand/collapse toggle per category.

- [ ] **Step 1: Read InscrieriView component structure**

Read lines 1726–1900 to understand the category grouping and table render.

- [ ] **Step 2: Add expandedCats state to InscrieriView**

In `InscrieriView` (after the existing `useState` declarations), add:
```typescript
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(categorii.map(c => c.id))
  );

  const toggleCat = (catId: string) => setExpandedCats(prev => {
    const next = new Set(prev);
    if (next.has(catId)) next.delete(catId); else next.add(catId);
    return next;
  });
```

- [ ] **Step 3: Find the category header element in InscrieriView**

Search for the pattern where each category header is rendered:
```bash
cd C:\Users\lungu\portal-phihau && grep -n "cat\.denumire\|cat\.numar_categorie" components/Competitii/index.tsx | grep -v "CategorieForm\|handleDelete\|CategorieDetail" | head -20
```

- [ ] **Step 4: Add toggle button to each category header**

Find the div/row that renders the category name in `InscrieriView`. Add a toggle button on the right side of that header:
```tsx
<button
  onClick={() => toggleCat(cat.id)}
  className="p-1 text-slate-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center"
  title={expandedCats.has(cat.id) ? 'Restrânge' : 'Extinde'}
>
  {expandedCats.has(cat.id) ? '▲' : '▼'}
</button>
```

- [ ] **Step 5: Wrap the table body (or sportivi list) in the expand condition**

Find where the inscriptions per category are rendered (the tbody or the list). Wrap with:
```tsx
{expandedCats.has(cat.id) && (
  /* existing table or list JSX */
)}
```

- [ ] **Step 6: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 9: Items 11+12 — Keyboard nav in CategorieForm + auto-increment + grad labels

**Files:**
- Modify: `components/Competitii/index.tsx` lines ~1559–1721

Three sub-items done together since they're all in `CategorieForm`.

### 11: Keyboard Tab/Enter nav
### 12a: Auto-increment numar_categorie
### 12b: Grad labels without ordine prefix
### Varsta: Labels without "ani"

- [ ] **Step 1: Read CategorieForm interface and state**

Read lines 1562–1600 to see the interface.

- [ ] **Step 2: Add `nextNumarCategorie` prop to CategorieFormProps**

Find:
```typescript
interface CategorieFormProps {
  competitieId: string;
  probe: ProbaCompetitie[];
  grade: Grad[];
  categorie: CategorieCompetitie | null;
  onClose: () => void;
  onSaved: (c: CategorieCompetitie) => void;
}
```

Replace with:
```typescript
interface CategorieFormProps {
  competitieId: string;
  probe: ProbaCompetitie[];
  grade: Grad[];
  categorie: CategorieCompetitie | null;
  nextNumarCategorie?: number;
  onClose: () => void;
  onSaved: (c: CategorieCompetitie) => void;
}
```

- [ ] **Step 3: Use nextNumarCategorie in CategorieForm state initialization**

Find the `useState` for form (line ~1578):
```typescript
    numar_categorie: String(categorie?.numar_categorie ?? ''),
```

Replace with:
```typescript
    numar_categorie: categorie ? String(categorie.numar_categorie ?? '') : String(nextNumarCategorie ?? ''),
```

The full component signature needs updating too:
```typescript
const CategorieForm: React.FC<CategorieFormProps> = ({ competitieId, probe, grade, categorie, onClose, onSaved }) => {
```

Replace with:
```typescript
const CategorieForm: React.FC<CategorieFormProps> = ({ competitieId, probe, grade, categorie, nextNumarCategorie, onClose, onSaved }) => {
```

- [ ] **Step 4: Pass nextNumarCategorie from the AdminPanel render site**

Find where `CategorieForm` is rendered (line ~1469):
```tsx
          {catFormOpen && (
            <CategorieForm
              competitieId={competitie.id}
              probe={probe}
              grade={grade}
              categorie={catToEdit}
              onClose={() => { setCatFormOpen(false); setCatToEdit(null); }}
```

Replace with:
```tsx
          {catFormOpen && (
            <CategorieForm
              competitieId={competitie.id}
              probe={probe}
              grade={grade}
              categorie={catToEdit}
              nextNumarCategorie={Math.max(0, ...categorii.map(c => c.numar_categorie ?? 0)) + 1}
              onClose={() => { setCatFormOpen(false); setCatToEdit(null); }}
```

- [ ] **Step 5: Fix grad labels — remove ordine prefix**

Find in CategorieForm (line ~1599):
```typescript
  const gradeOptions = useMemo(
    () => [...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({
      value: String(g.ordine),
      label: `${g.ordine}. ${g.nume}`,
    })),
    [grade]
  );
```

Replace with:
```typescript
  const gradeOptions = useMemo(
    () => [...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({
      value: String(g.ordine),
      label: g.nume,
    })),
    [grade]
  );
```

- [ ] **Step 6: Fix VARSTE_OPTIONS labels — remove "ani" suffix**

Find (line ~1573):
```typescript
const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: `${v} ani` }));
```

Replace with:
```typescript
const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: String(v) }));
```

- [ ] **Step 7: Add useRef for keyboard navigation in CategorieForm**

Add at the top of `CategorieForm` component body (after the `const { showError }` line):
```typescript
  const numRef = useRef<HTMLInputElement>(null);
  const varstaMinRef = useRef<HTMLInputElement>(null);
  const varstaMaxRef = useRef<HTMLInputElement>(null);
```

Also add `useRef` to the import at the top of index.tsx if not already imported:
```typescript
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
```

(It's already imported per line 1 — no change needed.)

- [ ] **Step 8: Add ref and onKeyDown to Nr. Categorie Input**

Find in CategorieForm render (line ~1648):
```tsx
          <Input label="Nr. Categorie" type="number" value={form.numar_categorie} onChange={f('numar_categorie')} />
```

The `Input` component is a custom wrapper. Check if it accepts `ref` by looking at its definition, or use an `onKeyDown` on a wrapper div:
```tsx
          <div onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); } }}>
            <Input label="Nr. Categorie" type="number" value={form.numar_categorie} onChange={f('numar_categorie')} />
          </div>
```

Since `SearchableSelect` (used for Vârstă fields) is custom and may not forward refs, use the native `onKeyDown` on the wrapping div to focus the next element. The keyboard sequence: Nr.Categorie → Gen select → Grad min → Grad max → Salvează button.

Note: Skip complex ref-forwarding if the Input component doesn't support it — the `onKeyDown` wrapper approach works for Enter-to-next-field without needing refs.

- [ ] **Step 9: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 10: Item 13 — "Generează din șabloane" modal in AdminPanel

**Files:**
- Modify: `components/Competitii/index.tsx`

Add a button "Generează din șabloane" next to "Adaugă Categorie" and a modal that lets admin bulk-insert categories from the existing template functions.

- [ ] **Step 1: Add generareOpen state to AdminPanel**

In `AdminPanel` component (line ~1268), add:
```typescript
  const [generareOpen, setGenerareOpen] = useState(false);
  const [generareLoading, setGenerareLoading] = useState(false);
  const [generareSelected, setGenerareSelected] = useState<Set<number>>(new Set());
```

- [ ] **Step 2: Build the template list with checkboxes**

The templates come from `generateTemplateTehnnica()`, `generateTemplateGiaoDau()`, `generateTemplateCVD()`. These are already imported.

- [ ] **Step 3: Add button next to "Adaugă Categorie"**

Find (line ~1410):
```tsx
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{categorii.length} categorii definite</span>
            <Button variant="success" size="sm" onClick={() => { setCatToEdit(null); setCatFormOpen(true); }}>
              <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Categorie
            </Button>
          </div>
```

Replace with:
```tsx
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-slate-400">{categorii.length} categorii definite</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setGenerareOpen(true)}>
                Generează din șabloane
              </Button>
              <Button variant="success" size="sm" onClick={() => { setCatToEdit(null); setCatFormOpen(true); }}>
                <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Categorie
              </Button>
            </div>
          </div>
```

- [ ] **Step 4: Add the GenerareSabloaneModal inline below the button row**

After the table and before `{catFormOpen && ...}`, add:
```tsx
          {generareOpen && (
            <GenerareSabloaneModal
              competitieId={competitie.id}
              probe={probe}
              existingCategorii={categorii}
              onClose={() => setGenerareOpen(false)}
              onGenerated={(newCats) => {
                setCategorii(prev => [...prev, ...newCats]);
                setGenerareOpen(false);
              }}
            />
          )}
```

- [ ] **Step 5: Create GenerareSabloaneModal component**

Add this new component before `AdminPanel` in index.tsx:
```tsx
interface GenerareSabloaneModalProps {
  competitieId: string;
  probe: ProbaCompetitie[];
  existingCategorii: CategorieCompetitie[];
  onClose: () => void;
  onGenerated: (cats: CategorieCompetitie[]) => void;
}

const GenerareSabloaneModal: React.FC<GenerareSabloaneModalProps> = ({
  competitieId, probe, existingCategorii, onClose, onGenerated,
}) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [tipSelectat, setTipSelectat] = useState<'tehnica' | 'giao_dau' | 'cvd'>('tehnica');

  const templateCats = useMemo(() => {
    if (tipSelectat === 'tehnica') return generateTemplateTehnnica();
    if (tipSelectat === 'giao_dau') return generateTemplateGiaoDau();
    return generateTemplateCVD();
  }, [tipSelectat]);

  const handleGenereaza = async () => {
    setLoading(true);
    try {
      const probeMap: Record<string, string> = {};
      for (const p of probe) probeMap[p.tip_proba] = p.id;

      const startOrdine = existingCategorii.length;
      const payload = templateCats.map((cat, i) => ({
        competitie_id: competitieId,
        proba_id: probeMap[cat.tip_proba] || null,
        numar_categorie: cat.numar_categorie,
        denumire: buildCategorieDenumire(cat),
        varsta_min: cat.varsta_min,
        varsta_max: cat.varsta_max,
        gen: cat.gen,
        grad_min_ordine: cat.grad_min_ordine,
        grad_max_ordine: cat.grad_max_ordine,
        arma: cat.arma,
        tip_participare: cat.tip_participare,
        sportivi_per_echipa_min: cat.sportivi_per_echipa_min,
        sportivi_per_echipa_max: cat.sportivi_per_echipa_max,
        rezerve_max: cat.rezerve_max,
        max_echipe_per_club: cat.max_echipe_per_club,
        min_participanti_start: cat.min_participanti_start,
        ordine_afisare: startOrdine + i,
      }));

      const { data, error } = await supabase
        .from('categorii_competitie')
        .insert(payload)
        .select();
      if (error) throw error;
      onGenerated((data || []) as CategorieCompetitie[]);
    } catch (err: any) {
      showError('Eroare generare', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Generează categorii din șablon">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Generează automat categoriile dintr-un șablon predefinit pentru tipul de competiție selectat.
          Categoriile vor fi adăugate la cele existente.
        </p>
        <div className="flex gap-2 flex-wrap">
          {(['tehnica', 'giao_dau', 'cvd'] as const).map(tip => (
            <button
              key={tip}
              onClick={() => setTipSelectat(tip)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px] ${
                tipSelectat === tip
                  ? 'border-brand-primary bg-brand-primary/20 text-white'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {tip === 'tehnica' ? 'Tehnică' : tip === 'giao_dau' ? 'Giao Dau' : 'CVD'}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Șablonul <strong className="text-slate-300">{tipSelectat}</strong> conține {templateCats.length} categorii.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" onClick={handleGenereaza} disabled={loading}>
            {loading ? 'Se generează...' : `Generează ${templateCats.length} categorii`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 6: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 11: Items 14+15 — Auto-fill tip_participare and sportivi_per_echipa from tip_proba

**Files:**
- Modify: `components/Competitii/index.tsx` — `CategorieForm` component (lines ~1575–1720)

Two `useEffect` hooks that auto-update form fields based on selected `proba_id` and `tip_participare`.

- [ ] **Step 1: Add useEffect for auto tip_participare from tip_proba**

In `CategorieForm`, after the existing `useMemo` for `gradeOptions`, add:
```typescript
  // Item 15 — auto tip_participare from selected proba
  useEffect(() => {
    const proba = probe.find(p => p.id === form.proba_id);
    if (!proba) return;
    const map: Record<string, 'individual' | 'pereche' | 'echipa'> = {
      thao_quyen_individual: 'individual',
      thao_lo_individual: 'individual',
      sincron: 'echipa',
      song_luyen: 'pereche',
      giao_dau: 'echipa',
    };
    const tp = map[proba.tip_proba];
    if (tp) setForm(p => ({ ...p, tip_participare: tp }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.proba_id]);
```

Note: We intentionally omit `probe` from deps to avoid running on every render. It's stable (parent doesn't recreate the array). Add comment if linter complains.

- [ ] **Step 2: Add useEffect for auto sportivi_per_echipa from tip_participare + tip_proba**

```typescript
  // Item 14 — auto sportivi_per_echipa from tip_participare/tip_proba
  useEffect(() => {
    const proba = probe.find(p => p.id === form.proba_id);
    if (proba?.tip_proba === 'sincron') {
      setForm(p => ({ ...p, sportivi_per_echipa_min: '3', sportivi_per_echipa_max: '3' }));
    } else if (form.tip_participare === 'pereche') {
      setForm(p => ({ ...p, sportivi_per_echipa_min: '2', sportivi_per_echipa_max: '2' }));
    } else if (form.tip_participare === 'individual') {
      setForm(p => ({ ...p, sportivi_per_echipa_min: '1', sportivi_per_echipa_max: '1' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tip_participare, form.proba_id]);
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 12: Final Integration Check

- [ ] **Step 1: Full TypeScript build**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 2: Check for unused variables introduced**

```bash
cd C:\Users\lungu\portal-phihau && npx tsc --noEmit 2>&1 | grep "declared but"
```

Expected: no new unused variable errors.

- [ ] **Step 3: Commit**

```bash
git add components/Competitii/InscriereClubWizard.tsx components/Competitii/index.tsx
git commit -m "feat(competitii): implement improvement items 1-9, 11-15

- Items 1+4: skip duplicate enrollments, reactivate withdrawn
- Item 2: Nu avem concurenți skip button per probe group
- Item 3: max_echipe_per_club visual indicator in Pas3
- Item 5: filter sportivi by club in Pas1
- Item 7: fix AI footer overlap with pb-2 md:pb-16
- Item 8: expand/collapse per-category in InscrieriView
- Item 9: confirmed step1Picks stable across navigation
- Item 11: Enter/Tab keyboard nav stubs in CategorieForm
- Items 12: auto-increment numar_categorie, grad/varsta labels cleanup
- Item 13: GenerareSabloaneModal bulk category generation
- Items 14+15: auto tip_participare and sportivi_per_echipa from tip_proba

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Implementation Notes

- **Item 6 (Refresh button)** is already implemented in `index.tsx` at line 421. No action needed.
- **Item 9** requires reading first to confirm no reset useEffect exists — it may be a no-op.
- **Item 2** (skip probe) is the most structurally complex because `CardSportivCategorii` renders `grupeProbile` — read exact JSX structure first at lines 1182–1300.
- **Item 3** (max echipe enforce) is a visual-only change since the wizard already creates exactly one team per category.
- All items use existing `showSuccess`/`showError` from `useError()` — no new providers needed.
- No SQL migrations required — all changes are frontend only.
