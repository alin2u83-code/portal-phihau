# Competiții — 15 Îmbunătățiri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 15 UX/logic improvements across the competition module — wizard save logic, filtering, keyboard nav, auto-fill fields, collapse UI, and a template generation modal.

**Architecture:** All changes are confined to two main files (`InscriereClubWizard.tsx` and `Competitii/index.tsx`). No DB migrations needed — all required columns already exist. Items are grouped into 4 batches ordered by risk: quick fixes first, new UI features last.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase JS client, react-query pattern via `useCallback`/`useEffect`. No new dependencies.

---

## Pre-work: Read files before any edit

- [ ] Read `C:/Users/lungu/portal-phihau/components/Competitii/InscriereClubWizard.tsx` fully (3556 lines) before touching it.
- [ ] Read `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx` fully (~1900 lines) before touching it.
- [ ] Read `C:/Users/lungu/portal-phihau/utils/competitiiTemplates.ts` before touching it.

---

## BATCH 1 — Quick Fixes (InscriereClubWizard.tsx)

### Task 1: Item 4 + Item 1 — Skip silențios sportiv deja înscris + Re-adăugare sportiv retras

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/InscriereClubWizard.tsx:2972-3014`

Context: The `handleSave` function (inside `Pas4SumarTaxe`) currently **throws** an error when a sportiv with active status already exists. The fix replaces the throw with a silent skip and also handles the UPDATE path for withdrawn athletes correctly.

Current code at line 2986-2988:
```typescript
if (existent && existent.status?.toLowerCase() !== 'retras') {
  throw new Error(`Sportivul ${sportivName} este deja inscris la categoria "${catName}".`);
}
```

- [ ] **Step 1: Add `skippedCount` counter before the `for` loop**

  Locate the line `for (const rand of randuriIndividuale) {` (around line 2974). Before it, add:

  ```typescript
  let skippedCount = 0;
  ```

- [ ] **Step 2: Replace the throw with silent skip**

  Replace lines 2986-2988:
  ```typescript
  if (existent && existent.status?.toLowerCase() !== 'retras') {
    throw new Error(`Sportivul ${sportivName} este deja inscris la categoria "${catName}".`);
  }
  ```

  With:
  ```typescript
  if (existent && existent.status?.toLowerCase() !== 'retras') {
    skippedCount++;
    continue;
  }
  ```

  The existing UPDATE block at 2997-3002 already handles the `existent && status === 'retras'` case correctly (it does UPDATE). No change needed there.

- [ ] **Step 3: Show toast after the loop if skippedCount > 0**

  After the closing `}` of the `for (const rand of randuriIndividuale)` loop (around line 3014), but still inside the `try` block, add:

  ```typescript
  if (skippedCount > 0) {
    setSuccessMsg(`${skippedCount} sportiv${skippedCount !== 1 ? 'i' : ''} ignorat${skippedCount !== 1 ? 'i' : ''} (deja înscriși activ).`);
  }
  ```

- [ ] **Step 4: Verify TypeScript — no errors**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -30
  ```

  Expected: 0 errors for these lines.

- [ ] **Step 5: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/InscriereClubWizard.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "fix(wizard): skip duplicate active registrations silently, show count toast"
  ```

---

### Task 2: Item 5 — Doar sportivi din club în wizard

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx:663-676`

Context: The wizard is already rendered with `sportivi={filteredData.sportivi.filter(s => s.club_id === myClubId)}` at line 667. This filter is already correct for ADMIN_CLUB. Verify it exists and confirm SUPER_ADMIN sees all sportivi.

- [ ] **Step 1: Read the wizard instantiation block (lines 660-700)**

  Confirm line 667 reads:
  ```typescript
  sportivi={filteredData.sportivi.filter(s => s.club_id === myClubId)}
  ```

  If this filter is already there → **this item is already implemented**. Move to Task 3.

  If it reads `sportivi={filteredData.sportivi}` (no filter) → apply the fix:

  ```typescript
  sportivi={filteredData.sportivi.filter(s => !myClubId || s.club_id === myClubId)}
  ```

  The `!myClubId` guard lets SUPER_ADMIN (who has no `club_id`) see all sportivi.

- [ ] **Step 2: Commit (only if a change was needed)**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "fix(wizard): filter sportivi by club for ADMIN_CLUB role"
  ```

---

### Task 3: Item 7 — Floating footer nu se suprapune cu AI widget

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/InscriereClubWizard.tsx` — all sticky footers

Context: The AI widget occupies `fixed bottom-[72px] md:bottom-12` (48px from bottom on desktop). The wizard footers have `pb-2` which is not enough on desktop.

Pattern to find: `sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2`

There are 5 occurrences (lines ~894, ~1634, ~1817, ~2197, ~2763, ~3300).

- [ ] **Step 1: Replace all occurrences of the sticky footer class**

  Use global replace:

  Find: `sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2`

  Replace with: `sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16`

  Verify how many replacements were made (should be 5-6).

- [ ] **Step 2: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/InscriereClubWizard.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "fix(wizard): add md:pb-16 to sticky footers to avoid AI widget overlap"
  ```

---

### Task 4: Item 10 — Nume + prenume în tabel înscrieri (index.tsx)

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx:596-605`

Context: In the expanded row panel, sportivi are displayed as `${sp.nume} ${sp.prenume}` (nume first). The spec requests prenume first: `${sp.prenume} ${sp.nume}`. Also verify the `InscrieriView` table (around line 1750+) for the same pattern.

- [ ] **Step 1: Fix display order in expanded category panel**

  At line ~600, change:
  ```typescript
  {sp ? `${sp.nume} ${sp.prenume}` : ins.sportiv_id}
  ```
  to:
  ```typescript
  {sp ? `${sp.prenume} ${sp.nume}` : ins.sportiv_id}
  ```

  Also at line ~632 (echipa members):
  ```typescript
  {ms.sportiv ? `${ms.sportiv.nume} ${ms.sportiv.prenume}` : ms.sportiv_id}
  ```
  to:
  ```typescript
  {ms.sportiv ? `${ms.sportiv.prenume} ${ms.sportiv.nume}` : ms.sportiv_id}
  ```

- [ ] **Step 2: Find and fix InscrieriView table rows**

  Search for all `${ins.sportiv?.nume}` or `sp.nume` patterns in `InscrieriView` (lines 1740-1900). Change any `${sp.nume} ${sp.prenume}` to `${sp.prenume} ${sp.nume}`.

- [ ] **Step 3: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "fix(competitii): display prenume before nume in inscriptions table"
  ```

---

## BATCH 2 — New features in index.tsx

### Task 5: Item 6 — Buton Refresh manual

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx`

Context: At line ~358, `fetchData` is already defined as a `useCallback`. At line ~421, a refresh button already exists (verified from reading). If the button already exists with `onClick={fetchData}` and a spinning SVG → **this item is already implemented**.

- [ ] **Step 1: Verify button existence at lines 421-432**

  Confirm the button uses `onClick={fetchData}` and `className={... loading ? 'animate-spin' : ''}`. If yes → skip to Task 6.

  If missing → add the button inside the header flex container at line ~432, after the status badges:

  ```tsx
  <button
    onClick={fetchData}
    disabled={loading}
    title="Reîncarcă datele competiției"
    style={{ touchAction: 'manipulation' }}
    className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-400 transition-colors disabled:opacity-40 shrink-0"
    aria-label="Refresh"
  >
    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </button>
  ```

- [ ] **Step 2: Commit (only if a change was needed)**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(competitii): add manual refresh button to competition detail header"
  ```

---

### Task 6: Item 8 — Expand/collapse tabele per categorie

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx`

Context: Currently the inline expanded panel is controlled by `viewInscrieriCatId` (single-expand, toggle on count click). The spec wants per-category expand/collapse with a chevron button, all expanded by default.

- [ ] **Step 1: Add `expandedCats` state in `CompetitieDetail`**

  After the existing state declarations (around line 340-348), add:

  ```typescript
  // Item 8: expand/collapse per categorie — inițial toate expanded (populated after data loads)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  ```

- [ ] **Step 2: Auto-populate expandedCats after data loads**

  In the `fetchData` `useCallback` (lines 358-371), after `setCategorii(...)`, add:

  ```typescript
  setExpandedCats(new Set((catRes.data || []).map((c: any) => c.id)));
  ```

- [ ] **Step 3: Add toggle helper**

  After the `handleSetActiveTab` callback (line ~356), add:

  ```typescript
  const toggleCat = useCallback((catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }, []);
  ```

- [ ] **Step 4: Add chevron button to each category row header**

  In the `filteredCategorii.map(cat => ...)` render (around line 528), find the `<tr>` for the category. Inside the last `<td>` (or a new one), add a chevron button:

  ```tsx
  <button
    onClick={() => toggleCat(cat.id)}
    style={{ touchAction: 'manipulation' }}
    title={expandedCats.has(cat.id) ? 'Restrânge' : 'Extinde'}
    className="p-1 rounded text-slate-500 hover:text-white transition-colors"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {expandedCats.has(cat.id)
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />}
    </svg>
  </button>
  ```

- [ ] **Step 5: Make expanded content conditional on `expandedCats`**

  The existing expanded panel is rendered inside `{isExpanded && (...)}` where `isExpanded = viewInscrieriCatId === cat.id`. Replace this guard:

  ```typescript
  const isExpanded = expandedCats.has(cat.id);
  ```

  Remove the old `viewInscrieriCatId` click handler on the count button (keep the count display, remove `onClick` and `cursor-pointer` if count = 0 logic is no longer needed). Keep the close `✕` button or remove it since chevron replaces it.

  Remove the `setViewInscrieriCatId` state entirely if it is no longer used after this change. If it is referenced elsewhere in the file, keep it but stop using it for expand logic.

- [ ] **Step 6: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -30
  ```

- [ ] **Step 7: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(competitii): expand/collapse per category with chevron, all expanded by default"
  ```

---

## BATCH 3 — CategorieForm super-admin improvements (index.tsx line 1560+)

### Task 7: Item Varsta — Etichete fără " ani"

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx:1573`

- [ ] **Step 1: Change label in VARSTE_OPTIONS**

  Line 1573:
  ```typescript
  const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: `${v} ani` }));
  ```

  Change to:
  ```typescript
  const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: String(v) }));
  ```

- [ ] **Step 2: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "fix(CategorieForm): remove 'ani' suffix from age dropdown labels"
  ```

---

### Task 8: Item 12 — Auto-increment numar_categorie + grad label fără ordine prefix

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx`

**Part A: Auto-increment**

- [ ] **Step 1: Pass `nextNumarCategorie` to `CategorieForm`**

  In `AdminPanel`, where `catFormOpen` is rendered (look for `<CategorieForm` around line 1500+, or directly inside `CompetitieDetail`), calculate:

  ```typescript
  const nextNrCategorie = Math.max(0, ...categorii.map(c => c.numar_categorie ?? 0)) + 1;
  ```

  Add `defaultNumarCategorie` prop to `CategorieFormProps`:

  ```typescript
  interface CategorieFormProps {
    // existing props...
    defaultNumarCategorie?: number;
  }
  ```

  Pass it when rendering `CategorieForm`:
  ```tsx
  <CategorieForm
    // existing props
    defaultNumarCategorie={nextNrCategorie}
  />
  ```

- [ ] **Step 2: Use `defaultNumarCategorie` in `CategorieForm` initial state**

  In `CategorieForm`, change the `useState` initializer for `numar_categorie`:

  ```typescript
  numar_categorie: String(categorie?.numar_categorie ?? defaultNumarCategorie ?? ''),
  ```

  Update the function signature:
  ```typescript
  const CategorieForm: React.FC<CategorieFormProps> = ({ competitieId, probe, grade, categorie, onClose, onSaved, defaultNumarCategorie }) => {
  ```

**Part B: Grad label without ordine prefix**

- [ ] **Step 3: Change gradeOptions label**

  Lines 1599-1604:
  ```typescript
  const gradeOptions = useMemo(
    () => [...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({
      value: String(g.ordine),
      label: `${g.ordine}. ${g.nume}`,
    })),
    [grade]
  );
  ```

  Change `label` to:
  ```typescript
  label: g.nume,
  ```

- [ ] **Step 4: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -30
  ```

- [ ] **Step 5: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(CategorieForm): auto-increment numar_categorie, simplify grad labels"
  ```

---

### Task 9: Item 15 + Item 14 — Auto tip_participare + auto sportivi_per_echipa

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx` — inside `CategorieForm`

- [ ] **Step 1: Add useEffect for auto tip_participare from proba.tip_proba**

  Inside `CategorieForm`, after the `gradeOptions` useMemo (around line 1605), add:

  ```typescript
  useEffect(() => {
    const proba = probe.find(p => p.id === form.proba_id);
    if (!proba) return;
    const tipToParticipare: Record<string, 'individual' | 'pereche' | 'echipa'> = {
      thao_quyen_individual: 'individual',
      thao_lo_individual: 'individual',
      sincron: 'echipa',
      song_luyen: 'pereche',
      giao_dau: 'echipa',
    };
    const tp = tipToParticipare[proba.tip_proba];
    if (tp) setForm(prev => ({ ...prev, tip_participare: tp }));
  }, [form.proba_id, probe]);
  ```

- [ ] **Step 2: Add useEffect for auto sportivi_per_echipa from tip_participare + proba**

  After the previous `useEffect`, add:

  ```typescript
  useEffect(() => {
    const proba = probe.find(p => p.id === form.proba_id);
    if (proba?.tip_proba === 'sincron') {
      setForm(prev => ({ ...prev, sportivi_per_echipa_min: '3', sportivi_per_echipa_max: '3' }));
    } else if (form.tip_participare === 'pereche') {
      setForm(prev => ({ ...prev, sportivi_per_echipa_min: '2', sportivi_per_echipa_max: '2' }));
    } else if (form.tip_participare === 'individual') {
      setForm(prev => ({ ...prev, sportivi_per_echipa_min: '1', sportivi_per_echipa_max: '1' }));
    }
  }, [form.tip_participare, form.proba_id, probe]);
  ```

- [ ] **Step 3: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -30
  ```

- [ ] **Step 4: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(CategorieForm): auto-set tip_participare and member counts from proba type"
  ```

---

### Task 10: Item 11 — Tab/Enter keyboard navigation în CategorieForm

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx` — `CategorieForm` component

Context: `SearchableSelect` may not accept `ref` directly. The strategy is to use `onKeyDown` where available (native `<input>`, `<select>`), and skip `SearchableSelect` fields from keyboard chain (they have their own internal keyboard handling).

Navigation sequence for native fields only: `numar_categorie input` → `denumire input` → `gen select` → `tip_participare select` → `min_participanti_start input` → `sportivi_per_echipa_min input` (if visible) → `sportivi_per_echipa_max input` (if visible) → `arma input` → Save button.

- [ ] **Step 1: Add refs for all native input/select fields in `CategorieForm`**

  At the top of `CategorieForm` (after the `useError()` call), add:

  ```typescript
  const refNrCategorie = useRef<HTMLInputElement>(null);
  const refDenumire = useRef<HTMLInputElement>(null);
  const refGen = useRef<HTMLSelectElement>(null);
  const refTipParticipare = useRef<HTMLSelectElement>(null);
  const refMinStart = useRef<HTMLInputElement>(null);
  const refSportiviMin = useRef<HTMLInputElement>(null);
  const refSportiviMax = useRef<HTMLInputElement>(null);
  const refArma = useRef<HTMLInputElement>(null);
  const refSave = useRef<HTMLButtonElement>(null);
  ```

  `useRef` is already imported (check line 1 of index.tsx — it is imported in the main component; verify `CategorieForm` uses the same React import).

- [ ] **Step 2: Create a `focusNext` helper**

  ```typescript
  const focusNext = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.focus();
  };
  ```

- [ ] **Step 3: Add `ref` and `onKeyDown` to native inputs**

  For `<Input label="Nr. Categorie" ...>` — the `Input` component renders a native `<input>`. Check if `Input` accepts `ref` via `React.forwardRef`. If not, replace with a bare `<input>` for this field only, or add `inputRef` prop.

  The simplest approach: replace native-field `<Input>` components with inline `<div>` + `<input>` pairs with the correct `ref` and `onKeyDown`:

  For `Nr. Categorie` input (line 1648):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Nr. Categorie</label>
    <input
      ref={refNrCategorie}
      type="number"
      value={form.numar_categorie}
      onChange={f('numar_categorie')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); focusNext(refDenumire); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    />
  </div>
  ```

  For `Denumire` input (line 1654):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Denumire (auto sau personalizată)</label>
    <input
      ref={refDenumire}
      type="text"
      value={form.denumire}
      onChange={f('denumire')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); focusNext(refGen); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    />
  </div>
  ```

  For `Gen select` (line 1671):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Gen</label>
    <select
      ref={refGen}
      value={form.gen}
      onChange={f('gen')}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); focusNext(refTipParticipare); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    >
      <option value="Feminin">Feminin</option>
      <option value="Masculin">Masculin</option>
      <option value="Mixt">Mixt</option>
    </select>
  </div>
  ```

  For `Tip Participare select` (line 1697):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Tip Participare</label>
    <select
      ref={refTipParticipare}
      value={form.tip_participare}
      onChange={f('tip_participare')}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); focusNext(refMinStart); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    >
      <option value="individual">Individual</option>
      <option value="pereche">Pereche</option>
      <option value="echipa">Echipă</option>
    </select>
  </div>
  ```

  For `Min. participanți start` (line 1702):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Min. participanți start</label>
    <input
      ref={refMinStart}
      type="number"
      value={form.min_participanti_start}
      onChange={f('min_participanti_start')}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          if (form.tip_participare !== 'individual') focusNext(refSportiviMin);
          else focusNext(refArma);
        }
      }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    />
  </div>
  ```

  For `sportivi_per_echipa_min` and `sportivi_per_echipa_max` inputs (lines 1706-1708):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Sportivi/echipă min</label>
    <input
      ref={refSportiviMin}
      type="number"
      value={form.sportivi_per_echipa_min}
      onChange={f('sportivi_per_echipa_min')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); focusNext(refSportiviMax); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    />
  </div>
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Sportivi/echipă max</label>
    <input
      ref={refSportiviMax}
      type="number"
      value={form.sportivi_per_echipa_max}
      onChange={f('sportivi_per_echipa_max')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); focusNext(refArma); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    />
  </div>
  ```

  For `Armă` (line 1695):
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1">Armă (pentru CVD, ex: Bong)</label>
    <input
      ref={refArma}
      type="text"
      value={form.arma}
      onChange={f('arma')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); focusNext(refSave); } }}
      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
    />
  </div>
  ```

  Add `ref={refSave}` to the Save button (line 1714).

- [ ] **Step 4: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -40
  ```

- [ ] **Step 5: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(CategorieForm): Tab/Enter keyboard navigation through form fields"
  ```

---

## BATCH 4 — Complex Features

### Task 11: Item 2 — Sari peste o probă (InscriereClubWizard.tsx)

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/InscriereClubWizard.tsx`

Context: `Pas2SelectieQuyen` and `Pas3FormareEchipe` display sections grouped by probe. Adding a per-probe skip toggle.

- [ ] **Step 1: Add `probeSkipped` state to `InscriereClubWizard` main component**

  In `InscriereClubWizard` (around line 3443, after other `useState`s):

  ```typescript
  const [probeSkipped, setProbeSkipped] = useState<Set<string>>(new Set());

  const toggleProbaSkip = useCallback((probaId: string) => {
    setProbeSkipped(prev => {
      const next = new Set(prev);
      if (next.has(probaId)) next.delete(probaId); else next.add(probaId);
      return next;
    });
  }, []);
  ```

- [ ] **Step 2: Pass `probeSkipped` and `toggleProbaSkip` as props to `Pas2SelectieQuyen`**

  Add to `Pas2SelectieQuyen`'s props interface (find the interface around line 930 — it's `Pas2QuyenProps` or similar):

  ```typescript
  probeSkipped: Set<string>;
  onToggleProbaSkip: (probaId: string) => void;
  ```

  Pass from `InscriereClubWizard` when rendering step 2:
  ```tsx
  probeSkipped={probeSkipped}
  onToggleProbaSkip={toggleProbaSkip}
  ```

- [ ] **Step 3: In `Pas2SelectieQuyen`, add skip button per probe section**

  Locate where probe sections are rendered. Before each section header for a proba, add:

  ```tsx
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold text-slate-300">{proba.denumire}</h3>
    <button
      onClick={() => onToggleProbaSkip(proba.id)}
      style={{ touchAction: 'manipulation' }}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors min-h-[36px] ${
        probeSkipped.has(proba.id)
          ? 'border-yellow-600 bg-yellow-900/30 text-yellow-300'
          : 'border-slate-600 text-slate-400 hover:border-slate-500'
      }`}
    >
      {probeSkipped.has(proba.id) ? 'Sărită ↩' : 'Nu avem concurenți'}
    </button>
  </div>
  ```

  Wrap the section content with: `{!probeSkipped.has(proba.id) && (<div>...section content...</div>)}`

  When skipped, show a compact badge:
  ```tsx
  {probeSkipped.has(proba.id) && (
    <div className="px-3 py-2 text-xs text-yellow-400 bg-yellow-900/10 border border-yellow-700/30 rounded-lg">
      Probă sărită — nicio categorie din această probă nu va fi trimisă
    </div>
  )}
  ```

- [ ] **Step 4: Pass `probeSkipped` to `Pas4SumarTaxe` and filter rows**

  Add `probeSkipped: Set<string>` to `Pas4Props`. In the Pas4 render logic where `randuriIndividuale` are computed, filter out categories whose `proba_id` is in `probeSkipped`:

  ```typescript
  const randuriIndividualeFiltered = randuriIndividuale.filter(
    r => !probeSkipped.has(r.categorie.proba_id ?? '')
  );
  ```

  Use `randuriIndividualeFiltered` in taxe calculation and display.

- [ ] **Step 5: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -40
  ```

- [ ] **Step 6: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/InscriereClubWizard.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(wizard): add per-probe skip toggle in Pas2 and filter in Pas4"
  ```

---

### Task 12: Item 3 — O singură echipă per categorie per club

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/InscriereClubWizard.tsx` — `Pas3FormareEchipe`

Context: Currently clubs can form multiple teams per category. The spec limits to `cat.max_echipe_per_club` (default 1). In `Pas3`, teams are stored as `echipeFormate: EchipaFormata[]` — one per category already. This is essentially already 1 per category per wizard run.

The real need is: if existing DB echipe already exist for this club+category, block adding a new one.

- [ ] **Step 1: Pass `echipe` (existing DB echipe) and `clubId` to `Pas3FormareEchipe`**

  Add to `Pas3Props`:
  ```typescript
  echipeExistente: EchipaCompetitie[];
  clubId: string;
  ```

  Pass from `InscriereClubWizard` step 3 render:
  ```tsx
  echipeExistente={echipe}
  clubId={clubId}
  ```

- [ ] **Step 2: Compute `categoriiBlockate` inside `Pas3FormareEchipe`**

  After `categoriiEchipa` (around line 2613):

  ```typescript
  const categoriiBlockate = useMemo<Set<string>>(() => {
    const blocked = new Set<string>();
    for (const cat of categoriiEchipa) {
      const maxPerClub = cat.max_echipe_per_club ?? 1;
      const existingCount = echipeExistente.filter(
        e => e.categorie_id === cat.id &&
             e.club_id === clubId &&
             e.status?.toLowerCase() !== 'retrasa'
      ).length;
      if (existingCount >= maxPerClub) blocked.add(cat.id);
    }
    return blocked;
  }, [categoriiEchipa, echipeExistente, clubId]);
  ```

- [ ] **Step 3: Show blocked badge on category header in Pas3**

  In the render loop for each category in Pas3, add a banner when blocked:

  ```tsx
  {categoriiBlockate.has(cat.id) && (
    <div className="px-4 py-2 bg-orange-900/20 border-b border-orange-700/40 text-xs text-orange-300">
      Ați atins limita de {cat.max_echipe_per_club ?? 1} echipă per club pentru această categorie. Echipa existentă este deja înscrisă.
    </div>
  )}
  ```

  And disable the entire card content when blocked (wrap the body in `{!categoriiBlockate.has(cat.id) && ...}`).

- [ ] **Step 4: Filter blocked categories from randuriEchipe in Pas4**

  This is automatic: if blocked categories are hidden in Pas3, no `echipa` gets configured for them, so `randuriEchipe` will be empty for those categories.

- [ ] **Step 5: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -30
  ```

- [ ] **Step 6: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/InscriereClubWizard.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(wizard): block adding team when club already has max teams for category"
  ```

---

### Task 13: Item 9 — Navigare înapoi fix (stabilitate selecție sportivi)

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/InscriereClubWizard.tsx`

Context: `selectedSportivi` is a `Set<string>` in `InscriereClubWizard`. Since step changes don't unmount the outer component (only inner components change via `if (step === N)`), the state is already preserved across step navigation. This item is likely already working.

- [ ] **Step 1: Verify that `Pas1SelectareSportivi` does NOT reset selection on re-mount**

  Look at `Pas1SelectareSportivi` — it receives `selected={selectedSportivi}` as a prop. It has no internal `useState` for the selection (it uses the parent's state). Therefore going back from step 2 to step 1 will show the same selection. **This is already correct.**

- [ ] **Step 2: Verify `sportiviFiltered` is computed as `useMemo` not `useEffect+setState`**

  In `Pas1SelectareSportivi`, find where `sportiviFiltered` is defined (around line 570+). If it uses `useMemo`:
  ```typescript
  const sportiviFiltered = useMemo(() => sportiviActivi.filter(...), [...]);
  ```
  This is correct — no re-fetch on step change. If it uses `useEffect + setState`, refactor to `useMemo`.

- [ ] **Step 3: Verify `dejaInscrisiSet` is computed as `useMemo`**

  In `Pas1SelectareSportivi`, `dejaInscrisiSet` should be:
  ```typescript
  const dejaInscrisiSet = useMemo(() => buildDejaInscrisiSet(inscrieri), [inscrieri]);
  ```

  Not inside a `useEffect`. Fix if needed.

- [ ] **Step 4: Commit only if changes were made**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/InscriereClubWizard.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "fix(wizard): ensure step1 selections persist when navigating back from step2/3"
  ```

---

### Task 14: Item 13 — Generare categorii din șabloane (GenerareSabloaneModal)

**Files:**
- Modify: `C:/Users/lungu/portal-phihau/components/Competitii/index.tsx`

Context: `AdminPanel` has a `categorii` sub-section. We add a "Generează din șabloane" button that opens a new modal. The modal uses `generateTemplateTehnnica()`, `generateTemplateGiaoDau()`, `generateTemplateCVD()` from `utils/competitiiTemplates.ts`, already imported at line 8-12.

- [ ] **Step 1: Add `GenerareSabloaneModal` component before `CategorieForm`**

  Add a new component (before `CategorieForm` around line 1559):

  ```tsx
  // -----------------------------------------------
  // GENERARE CATEGORII DIN SABLOANE
  // -----------------------------------------------
  interface GenerareSabloaneModalProps {
    competitieId: string;
    probe: ProbaCompetitie[];
    onClose: () => void;
    onGenerated: (categorii: CategorieCompetitie[]) => void;
  }

  const GenerareSabloaneModal: React.FC<GenerareSabloaneModalProps> = ({
    competitieId, probe, onClose, onGenerated,
  }) => {
    const { showError } = useError();
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    // Build all template entries
    const allTemplates = useMemo(() => {
      const tehnica = generateTemplateTehnnica().map((t, i) => ({ ...t, group: 'Tehnica', globalIdx: i }));
      const startGiao = tehnica.length;
      const giao = generateTemplateGiaoDau().map((t, i) => ({ ...t, group: 'Giao Dau', globalIdx: startGiao + i }));
      const startCvd = startGiao + giao.length;
      const cvd = generateTemplateCVD().map((t, i) => ({ ...t, group: 'CVD', globalIdx: startCvd + i }));
      return [...tehnica, ...giao, ...cvd];
    }, []);

    const groups = useMemo(() => {
      const g: Record<string, typeof allTemplates> = {};
      for (const t of allTemplates) {
        if (!g[t.group]) g[t.group] = [];
        g[t.group].push(t);
      }
      return g;
    }, [allTemplates]);

    const toggleGroup = (groupName: string) => {
      const groupItems = groups[groupName].map(t => t.globalIdx);
      const allSelected = groupItems.every(idx => selected.has(idx));
      setSelected(prev => {
        const next = new Set(prev);
        if (allSelected) groupItems.forEach(idx => next.delete(idx));
        else groupItems.forEach(idx => next.add(idx));
        return next;
      });
    };

    const toggleOne = (idx: number) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx); else next.add(idx);
        return next;
      });
    };

    const handleGenerate = async () => {
      if (selected.size === 0) return;
      setLoading(true);
      try {
        const toInsert = allTemplates
          .filter(t => selected.has(t.globalIdx))
          .map((t, i) => {
            // Find matching proba by tip_proba
            const proba = probe.find(p => p.tip_proba === t.tip_proba);
            return {
              competitie_id: competitieId,
              proba_id: proba?.id ?? null,
              numar_categorie: t.numar_categorie,
              denumire: buildCategorieDenumire(t),
              varsta_min: t.varsta_min,
              varsta_max: t.varsta_max,
              gen: t.gen,
              grad_min_ordine: t.grad_min_ordine,
              grad_max_ordine: t.grad_max_ordine,
              arma: t.arma,
              tip_participare: t.tip_participare,
              sportivi_per_echipa_min: t.sportivi_per_echipa_min,
              sportivi_per_echipa_max: t.sportivi_per_echipa_max,
              rezerve_max: t.rezerve_max,
              max_echipe_per_club: t.max_echipe_per_club,
              min_participanti_start: t.min_participanti_start,
              ordine_afisare: i + 1,
            };
          });
        const { data, error } = await supabase
          .from('categorii_competitie')
          .insert(toInsert)
          .select();
        if (error) throw error;
        onGenerated((data || []) as CategorieCompetitie[]);
        onClose();
      } catch (err: any) {
        showError('Eroare generare', err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Modal isOpen={true} onClose={onClose} title="Generează categorii din șabloane">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {Object.entries(groups).map(([groupName, items]) => {
            const allSel = items.every(t => selected.has(t.globalIdx));
            const someSel = items.some(t => selected.has(t.globalIdx));
            return (
              <div key={groupName} className="border border-slate-700 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-700/60">
                  <input
                    type="checkbox"
                    checked={allSel}
                    ref={el => { if (el) el.indeterminate = someSel && !allSel; }}
                    onChange={() => toggleGroup(groupName)}
                    className="accent-brand-primary"
                  />
                  <span className="text-sm font-semibold text-white">{groupName}</span>
                  <span className="text-xs text-slate-400 ml-auto">{items.filter(t => selected.has(t.globalIdx)).length}/{items.length}</span>
                </div>
                <div className="divide-y divide-slate-700/40 max-h-48 overflow-y-auto">
                  {items.map(t => (
                    <label key={t.globalIdx} className="flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:bg-slate-800/60">
                      <input
                        type="checkbox"
                        checked={selected.has(t.globalIdx)}
                        onChange={() => toggleOne(t.globalIdx)}
                        className="accent-brand-primary"
                      />
                      <span className="text-xs text-slate-300">{buildCategorieDenumire(t)}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-slate-400">{selected.size} categorii selectate</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
              <Button variant="success" onClick={handleGenerate} disabled={loading || selected.size === 0}>
                {loading ? 'Se generează...' : `Generează ${selected.size > 0 ? `(${selected.size})` : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  };
  ```

- [ ] **Step 2: Add state and button in `AdminPanel` categorii section**

  In `AdminPanel`, add state:
  ```typescript
  const [sabloaneOpen, setSabloaneOpen] = useState(false);
  ```

  In the `adminSection === 'categorii'` render section (look for the button row with "Adaugă Categorie"), add alongside it:

  ```tsx
  <Button variant="secondary" size="sm" onClick={() => setSabloaneOpen(true)}>
    Generează din șabloane
  </Button>
  ```

  And add the modal at the bottom of AdminPanel return:
  ```tsx
  {sabloaneOpen && (
    <GenerareSabloaneModal
      competitieId={competitie.id}
      probe={probe}
      onClose={() => setSabloaneOpen(false)}
      onGenerated={newCats => {
        setCategorii(prev => [...prev, ...newCats]);
        setSabloaneOpen(false);
      }}
    />
  )}
  ```

- [ ] **Step 3: TypeScript check**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1 | head -40
  ```

- [ ] **Step 4: Commit**

  ```bash
  git -C C:/Users/lungu/portal-phihau add components/Competitii/index.tsx
  git -C C:/Users/lungu/portal-phihau commit -m "feat(admin): add GenerareSabloaneModal for bulk category creation from templates"
  ```

---

## Final Verification

- [ ] **Full TypeScript check — zero errors**

  ```bash
  npx tsc --noEmit --project C:/Users/lungu/portal-phihau/tsconfig.json 2>&1
  ```

  Expected: no errors.

- [ ] **Visual smoke-test checklist (manual)**

  1. Open a competition detail → tab "Categorii" → click chevron on any category row → section collapses/expands.
  2. Open wizard → step 1 → select sportivi → go to step 2 → click Back → step 1 shows same selection.
  3. Open wizard → step 4 → click "Finalizează" with a sportiv already inscribed → no error thrown, success toast shows "X sportivi ignorați".
  4. Open CategorieForm (Admin tab → Categorii → Adaugă) → change Probă to "Song Luyen" → Tip Participare auto-sets to "Pereche", sportivi_min/max auto-set to 2.
  5. Open CategorieForm → Tab through fields → focus moves in sequence.
  6. Open Admin → Categorii → "Generează din șabloane" → checkbox groups visible → select some → click Generează → categories appear in list.

- [ ] **No SQL migrations required** — all fields (`numar_categorie`, `max_echipe_per_club`, `tip_proba`, etc.) already exist in DB schema.

---

## Self-Review: Spec Coverage Check

| Item | Task | Status |
|------|------|--------|
| Item 4 — skip silențios sportiv activ | Task 1 | Covered |
| Item 1 — re-adaugă sportiv retras | Task 1 (UPDATE path already existed, verified) | Covered |
| Item 5 — doar sportivi din club | Task 2 | Covered |
| Item 7 — footer no AI overlap | Task 3 | Covered |
| Item 10 — prenume + nume | Task 4 | Covered |
| Item 6 — buton refresh manual | Task 5 | Covered |
| Item 8 — expand/collapse categorii | Task 6 | Covered |
| Item Varsta — label fără "ani" | Task 7 | Covered |
| Item 12 — auto-increment nr + grad label | Task 8 | Covered |
| Item 15 — auto tip_participare | Task 9 | Covered |
| Item 14 — max membri auto | Task 9 | Covered |
| Item 11 — Tab/Enter nav | Task 10 | Covered |
| Item 2 — sari probă | Task 11 | Covered |
| Item 3 — o echipă per club per cat | Task 12 | Covered |
| Item 9 — navigare înapoi fix | Task 13 | Covered |
| Item 13 — generare din șabloane | Task 14 | ✅ DONE (commit 821168f) |

---

## Sesiunea 2026-05-20 — Status implementare

### Realizat din plan

| Task | Item | Status |
|------|------|--------|
| Task 2 | Item 5 — doar sportivi din club | ✅ DONE (commit 2465874) |
| Task 3 | Item 7 — footer md:pb-16 no AI overlap | ✅ DONE (commit 2465874) |
| Task 4 | Item 10 — prenume + nume | ✅ DONE (commit 2465874) |
| Task 14 | Item 13 — GenerareSabloaneModal | ✅ DONE (commit 821168f — 19 mai, trecut cu vederea) |

### Feature-uri noi implementate azi (NU erau în plan)

| Feature | Commit | Descriere |
|---------|--------|-----------|
| Bulk "Nu participăm la nicio probă" | 7254388 | Buton în Pas3 care setează `echipaSkip=true` pe toate categoriile simultan |
| Per-athlete TQ opt-out | 7254388 | Checkbox per sportiv în Pas2 Thao Quyen — exclude sportivul de la TQ fără a-l scoate din competiție |
| Edit echipe existente din DB | 7254388 | La redeschiderea wizard-ului, echipele salvate se încarcă și se pot edita — UPDATE în loc de INSERT |
| Responsive mobile/tablet complet | a711151 | Layout adaptat pentru toate step-urile: butoane full-width, cards în loc de tabele pe mobil |
| Fix handleUpdateEchipa data bug | 21cee53 | Bug: update categorii care nu erau încă în `echipeFormate` era ignorat silențios — fix: append dacă nu există |
| Fix race condition init useEffect | 21cee53 | Race condition: fetch async DB suprascria init sync — fix: deps `[categoriiEchipa.length, echipeFormate.length]` |
| Prefix club auto în nume echipă | 2465874 | Numele clubului se adaugă automat ca prefix la denumirea echipei |
| Finalizare cu 0 înscriși | 2465874 | Wizard permite salvarea fără înscriși (avertisment, nu eroare) |
| Revert safe-area footer | c1891ce | Eliminat `style paddingBottom safe-area-inset-bottom` adăugat de responsive agent care rupea footer-ul |
