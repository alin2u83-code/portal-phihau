# Filtre Înscrieri Competiții — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gen/probă/vârstă/grad collapsible filter panel to `InscrieriView` in `components/Competitii/index.tsx`, filtering inscriptions by their category's attributes.

**Architecture:** All filter state lives inside `InscrieriView` (self-contained, zero impact on parent or props). A `categoriiVizibile` Set (useMemo) holds IDs of categories that pass the active filters. `filteredInscrieri` and `filteredEchipe` are then additionally filtered against this set. UI pattern identical to the existing Template tab filter panel.

**Tech Stack:** React 18, TypeScript, Tailwind CSS — no new dependencies.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `components/Competitii/index.tsx` | Modify | Add filter state, categoriiVizibile memo, updated filteredInscrieri/Echipe, filter panel UI |

---

### Task 1: Add filter state + categoriiVizibile memo

**Files:**
- Modify: `components/Competitii/index.tsx:2724-2737`

- [ ] **Step 1: Add filter state after line 2728** (`const [editEchipaClubId...` line)

Insert after `const [editEchipaClubId, setEditEchipaClubId] = useState<CategorieCompetitie | null>(null);`:

```tsx
  const [filtreVisible, setFiltreVisible] = useState(false);
  const [filterGen, setFilterGen] = useState<Set<string>>(new Set());
  const [filterProbaId, setFilterProbaId] = useState<string>('');
  const [filterVarstaMin, setFilterVarstaMin] = useState('');
  const [filterVarstaMax, setFilterVarstaMax] = useState('');
  const [filterGradMin, setFilterGradMin] = useState('');
  const [filterGradMax, setFilterGradMax] = useState('');
```

- [ ] **Step 2: Add categoriiVizibile memo + helpers after the filter state**

Insert after the filter state declarations above:

```tsx
  const categoriiVizibile = useMemo(() => {
    const areFiltre = filterGen.size > 0 || filterProbaId || filterVarstaMin || filterVarstaMax || filterGradMin || filterGradMax;
    if (!areFiltre) return null; // null = no filtering, show all
    return new Set(
      categorii.filter(cat => {
        if (filterGen.size > 0 && !filterGen.has(cat.gen)) return false;
        if (filterProbaId && cat.proba_id !== filterProbaId) return false;
        if (filterVarstaMin !== '' && cat.varsta_min < Number(filterVarstaMin)) return false;
        if (filterVarstaMax !== '' && (cat.varsta_max === null || cat.varsta_max > Number(filterVarstaMax))) return false;
        if (filterGradMin !== '' && (cat.grad_min_ordine === null || cat.grad_min_ordine < Number(filterGradMin))) return false;
        if (filterGradMax !== '' && (cat.grad_max_ordine === null || cat.grad_max_ordine > Number(filterGradMax))) return false;
        return true;
      }).map(c => c.id)
    );
  }, [categorii, filterGen, filterProbaId, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  const nrFiltreActive = useMemo(() => {
    let n = 0;
    if (filterGen.size > 0) n++;
    if (filterProbaId) n++;
    if (filterVarstaMin !== '' || filterVarstaMax !== '') n++;
    if (filterGradMin !== '' || filterGradMax !== '') n++;
    return n;
  }, [filterGen, filterProbaId, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  const toggleGen = (gen: string) => {
    setFilterGen(prev => {
      const next = new Set(prev);
      if (next.has(gen)) next.delete(gen); else next.add(gen);
      return next;
    });
  };

  const resetFiltre = () => {
    setFilterGen(new Set());
    setFilterProbaId('');
    setFilterVarstaMin('');
    setFilterVarstaMax('');
    setFilterGradMin('');
    setFilterGradMax('');
  };
```

- [ ] **Step 3: Apply categoriiVizibile to filteredInscrieri (line ~2731)**

Replace the existing `filteredInscrieri` declaration:
```tsx
  const filteredInscrieri = (canSeeAll ? inscrieri : inscrieri.filter(i => i.club_id === myClubId))
    .filter(i => i.status?.toLowerCase() !== 'retras')
    .slice()
    .sort((a, b) => (statusOrdine[a.status] ?? 9) - (statusOrdine[b.status] ?? 9));
```

With:
```tsx
  const filteredInscrieri = (canSeeAll ? inscrieri : inscrieri.filter(i => i.club_id === myClubId))
    .filter(i => i.status?.toLowerCase() !== 'retras')
    .filter(i => !categoriiVizibile || categoriiVizibile.has(i.categorie_id))
    .slice()
    .sort((a, b) => (statusOrdine[a.status] ?? 9) - (statusOrdine[b.status] ?? 9));
```

- [ ] **Step 4: Apply categoriiVizibile to filteredEchipe (line ~2735)**

Replace the existing `filteredEchipe` declaration:
```tsx
  const filteredEchipe = (canSeeAll ? echipe : echipe.filter(e => e.club_id === myClubId))
    .filter(e => e.status?.toLowerCase() !== 'retrasa')
    .filter(e => !echipeRetraseLocal.has((e as any).id));
```

With:
```tsx
  const filteredEchipe = (canSeeAll ? echipe : echipe.filter(e => e.club_id === myClubId))
    .filter(e => e.status?.toLowerCase() !== 'retrasa')
    .filter(e => !echipeRetraseLocal.has((e as any).id))
    .filter(e => !categoriiVizibile || categoriiVizibile.has(e.categorie_id));
```

- [ ] **Step 5: Build app to verify no TypeScript errors**

```powershell
npm run lint
```

Expected: 0 errors (or same errors as before — no new ones).

- [ ] **Step 6: Commit**

```bash
git add components/Competitii/index.tsx
git commit -m "feat(competitii): add filter state + categoriiVizibile memo to InscrieriView"
```

---

### Task 2: Add filter panel UI

**Files:**
- Modify: `components/Competitii/index.tsx` — `return (` block of `InscrieriView` (line ~2759)

- [ ] **Step 1: Insert filter panel at top of InscrieriView return**

The `return (` in `InscrieriView` starts with `<div className="space-y-6">`. Insert the filter panel as the **first child** of that div, before `{/* Individual */}`:

```tsx
  return (
    <div className="space-y-6">
      {/* Panou filtre */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setFiltreVisible(v => !v)}
            style={{ touchAction: 'manipulation' }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${nrFiltreActive > 0 ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2" />
            </svg>
            Filtre
            {nrFiltreActive > 0 && (
              <span className="bg-brand-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {nrFiltreActive}
              </span>
            )}
            <svg className={`w-3 h-3 transition-transform ${filtreVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {nrFiltreActive > 0 && (
            <button onClick={resetFiltre} className="text-xs text-slate-400 hover:text-white underline">
              Reset
            </button>
          )}
        </div>

        {filtreVisible && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Gen */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Gen</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Feminin', 'Masculin', 'Mixt'].map(gen => (
                    <label key={gen} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${filterGen.has(gen) ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                      <input type="checkbox" checked={filterGen.has(gen)} onChange={() => toggleGen(gen)} className="w-3 h-3 accent-brand-primary" />
                      {gen}
                    </label>
                  ))}
                </div>
              </div>

              {/* Probă */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Probă</div>
                <select
                  value={filterProbaId}
                  onChange={e => setFilterProbaId(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-primary/60"
                >
                  <option value="">Toate probele</option>
                  {probe.map(p => (
                    <option key={p.id} value={p.id}>{p.denumire}</option>
                  ))}
                </select>
              </div>

              {/* Vârstă */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vârstă (ani)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={filterVarstaMin}
                    onChange={e => setFilterVarstaMin(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                  <span className="text-slate-500 text-xs">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={filterVarstaMax}
                    onChange={e => setFilterVarstaMax(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                </div>
              </div>

              {/* Grad */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Grad (ordine)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={filterGradMin}
                    onChange={e => setFilterGradMin(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                  <span className="text-slate-500 text-xs">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={filterGradMax}
                    onChange={e => setFilterGradMax(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Individual */}
```

> **Note:** Remove the original `{/* Individual */}` comment line from the old position — it's now included at the end of the inserted block above.

- [ ] **Step 2: Build + verify**

```powershell
npm run lint
```

Expected: 0 new errors.

- [ ] **Step 3: Manual smoke test**

Start dev server (`npm run dev`), navigate to a competition with inscriptions, go to tab **Înscrieri**. Verify:
- "Filtre ▼" button visible above list
- Click opens panel with Gen/Probă/Vârstă/Grad
- Select "Feminin" → only inscriptions in Feminin categories show
- Select a probă → only inscriptions in that probă's categories show
- Filters combine (AND): Gen=Feminin + Probă=X → intersection
- Reset clears all filters + hides badge
- Badge on button shows correct count of active filter dimensions

- [ ] **Step 4: Commit**

```bash
git add components/Competitii/index.tsx
git commit -m "feat(competitii): add filter panel UI to InscrieriView (gen/probă/vârstă/grad)"
```
