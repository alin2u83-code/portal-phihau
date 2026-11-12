# Phase 6: Infrastructură Filtrare Unificată - Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 2 new files
**Analogs found:** 2 / 2

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `hooks/useCompetitieFilters.ts` | hook | transform (client-side filter state) | `hooks/useFilteredData.ts` + inline state în `components/Competitii/InscrieriView.tsx:36-84` | exact — extracție 1:1 din InscrieriView |
| `components/Competitii/CompetitieFilterBar.tsx` | component (presentational) | request-response (controlled inputs → callbacks) | `components/Competitii/InscrieriView.tsx:134-236` (panoul filtre inline) | exact — UI extras direct |

---

## Pattern Assignments

### `hooks/useCompetitieFilters.ts` (hook, transform)

**Analog primar:** `components/Competitii/InscrieriView.tsx` liniile 36-84 (stare + funcții) și liniile 60-67 (useMemo nrFiltreActive)
**Analog structură fișier:** `hooks/useFilteredData.ts` (imports, export named function, fără default export)

**Imports pattern** (`hooks/useFilteredData.ts` liniile 1-2 + `InscrieriView.tsx` linia 1):
```typescript
import { useState, useMemo } from 'react';
import type { CategorieCompetitie, ProbaCompetitie, Grad } from '../types';
```
Nota: `import type` pentru tipuri de domeniu — convenție proiect. `ProbaCompetitie` și `Grad` sunt necesare doar pentru semnătura `aplicaFiltreCategorie`.

**Interface CompetitieFiltre** (nu merge în `types.ts` — tip UI state, nu tip domeniu):
```typescript
// Definit în același fișier, deasupra hook-ului
export interface CompetitieFiltre {
  gen: Set<string>;
  probaId: string;
  varstaMin: string;
  varstaMax: string;
  gradMin: string;
  gradMax: string;
}

// Constantă la nivel de modul — OBLIGATORIU în afara hook-ului
// pentru a evita new Set() referință nouă la fiecare resetFiltre()
const FILTRE_INITIALE: CompetitieFiltre = {
  gen: new Set(),
  probaId: '',
  varstaMin: '',
  varstaMax: '',
  gradMin: '',
  gradMax: '',
};
```

**Core hook pattern** (`InscrieriView.tsx` liniile 36-84, adaptat pentru obiect grupat conform D-01):
```typescript
export function useCompetitieFilters() {
  const [filtre, setFiltreState] = useState<CompetitieFiltre>(FILTRE_INITIALE);

  const toggleGen = (gen: string) => {
    setFiltreState(prev => {
      const next = new Set(prev.gen);
      if (next.has(gen)) next.delete(gen); else next.add(gen);
      return { ...prev, gen: next };
    });
  };

  const setFiltre = (partial: Partial<CompetitieFiltre>) => {
    setFiltreState(prev => ({ ...prev, ...partial }));
  };

  // La reset: spread FILTRE_INITIALE + new Set() — nu referința din constantă
  const resetFiltre = () => setFiltreState({ ...FILTRE_INITIALE, gen: new Set() });

  const nrFiltreActive = useMemo(() => {
    let n = 0;
    if (filtre.gen.size > 0) n++;
    if (filtre.probaId) n++;
    if (filtre.varstaMin !== '' || filtre.varstaMax !== '') n++;
    if (filtre.gradMin !== '' || filtre.gradMax !== '') n++;
    return n;
  }, [filtre]);

  return { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive };
}
```

**Funcție pură co-locată** (D-06, D-07, D-08 — semnătură diferită față de sursă: returnează array, nu Set):
```typescript
// ATENȚIE: funcția originală din InscrieriView.tsx:44-58 returnează Set<string> de ID-uri.
// aplicaFiltreCategorie returnează CategorieCompetitie[] — diferență intenționată (D-07).
export function aplicaFiltreCategorie(
  categorii: CategorieCompetitie[],
  filtre: CompetitieFiltre
): CategorieCompetitie[] {
  const areFiltre =
    filtre.gen.size > 0 || filtre.probaId ||
    filtre.varstaMin || filtre.varstaMax ||
    filtre.gradMin || filtre.gradMax;
  if (!areFiltre) return categorii;

  return categorii.filter(cat => {
    if (filtre.gen.size > 0 && !filtre.gen.has(cat.gen)) return false;
    if (filtre.probaId && cat.proba_id !== filtre.probaId) return false;
    if (filtre.varstaMin !== '' && !isNaN(Number(filtre.varstaMin)) && cat.varsta_min < Number(filtre.varstaMin)) return false;
    if (filtre.varstaMax !== '' && !isNaN(Number(filtre.varstaMax)) && (cat.varsta_max === null || cat.varsta_max > Number(filtre.varstaMax))) return false;
    if (filtre.gradMin !== '' && !isNaN(Number(filtre.gradMin)) && (cat.grad_min_ordine === null || cat.grad_min_ordine < Number(filtre.gradMin))) return false;
    if (filtre.gradMax !== '' && !isNaN(Number(filtre.gradMax)) && (cat.grad_max_ordine === null || cat.grad_max_ordine > Number(filtre.gradMax))) return false;
    return true;
  });
}
```
Nota: guards `!isNaN()` adăugate față de sursă — ASVS L1 V5 (inputs string numeric pot fi NaN dacă manipulate).

---

### `components/Competitii/CompetitieFilterBar.tsx` (component prezentational, request-response)

**Analog primar:** `components/Competitii/InscrieriView.tsx` liniile 134-236 (panoul filtre inline)
**Analog badge:** `components/Competitii/CategoriiTemplateManager.tsx` linia 462 (badge filtre active)
**Analog structură componentă:** `components/Competitii/InscrieriView.tsx` liniile 1-28 (named export, props interface)

**Imports pattern** (`InscrieriView.tsx` liniile 1-8, adaptat):
```typescript
import React, { useState } from 'react';
import type { ProbaCompetitie, Grad } from '../../types';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
```
Nota: Importul din hook — nu din `types.ts`. Nicio componentă din `components/ui.tsx` nu este strict necesară — stilizarea este 100% Tailwind inline ca în InscrieriView.

**Props interface** (D-11, D-12):
```typescript
export interface CompetitieFilterBarProps {
  filtre: CompetitieFiltre;
  toggleGen: (gen: string) => void;
  setFiltre: (partial: Partial<CompetitieFiltre>) => void;
  resetFiltre: () => void;
  nrFiltreActive: number;
  probe: ProbaCompetitie[];
  grade: Grad[];
}
```

**Singurul useState intern permis** (D-12 — expand/collapse local, NU în hook):
```typescript
export const CompetitieFilterBar: React.FC<CompetitieFilterBarProps> = ({
  filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, probe, grade
}) => {
  const [filtreVisible, setFiltreVisible] = useState(false); // colapsat la mount (A2)
  // ...
};
```

**Buton toggle cu badge** (`InscrieriView.tsx` liniile 136-153 + `CategoriiTemplateManager.tsx` linia 462):
```typescript
<div className="flex items-center gap-2 mb-2">
  <button
    onClick={() => setFiltreVisible(v => !v)}
    style={{ touchAction: 'manipulation' }}
    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
      nrFiltreActive > 0
        ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary'
        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
    }`}
  >
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>
    {`Filtrează${nrFiltreActive > 0 ? ` (${nrFiltreActive})` : ''}`}
    <svg className={`w-3 h-3 transition-transform ${filtreVisible ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  {nrFiltreActive > 0 && (
    <button onClick={resetFiltre} className="text-xs text-slate-400 hover:text-white underline">
      Reset
    </button>
  )}
</div>
```

**Container panou collapse** (`InscrieriView.tsx` liniile 156-157):
```typescript
{filtreVisible && (
  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* controale filtre */}
    </div>
  </div>
)}
```

**Controale Gen — checkbox pills** (`InscrieriView.tsx` liniile 160-169):
```typescript
<div className="space-y-1.5">
  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Gen</div>
  <div className="flex flex-wrap gap-1.5">
    {['Feminin', 'Masculin', 'Mixt'].map(gen => (
      <label key={gen} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${
        filtre.gen.has(gen)
          ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary'
          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
      }`}>
        <input type="checkbox" checked={filtre.gen.has(gen)} onChange={() => toggleGen(gen)}
          className="w-3 h-3 accent-brand-primary" />
        {gen}
      </label>
    ))}
  </div>
</div>
```

**Select Probă — native select** (`InscrieriView.tsx` liniile 173-185):
```typescript
<div className="space-y-1.5">
  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Probă</div>
  <select
    value={filtre.probaId}
    onChange={e => setFiltre({ probaId: e.target.value })}
    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-primary/60"
  >
    <option value="">Toate probele</option>
    {probe.map(p => (
      <option key={p.id} value={p.id}>{p.denumire}</option>
    ))}
  </select>
</div>
```

**Input Vârstă range** (`InscrieriView.tsx` liniile 187-209):
```typescript
<div className="space-y-1.5">
  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vârstă (ani)</div>
  <div className="flex items-center gap-2">
    <input type="number" min={0} placeholder="Min"
      value={filtre.varstaMin}
      onChange={e => setFiltre({ varstaMin: e.target.value })}
      className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
    />
    <span className="text-slate-500 text-xs">–</span>
    <input type="number" min={0} placeholder="Max"
      value={filtre.varstaMax}
      onChange={e => setFiltre({ varstaMax: e.target.value })}
      className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
    />
  </div>
</div>
```

**Select Grad — native select cu ordine ca value** (D-10; adaptat din pattern probă, nu din InscrieriView care folosea inputs numerice):
```typescript
// IMPORTANT: value = grad.ordine.toString() — nu grad.id
// Compatibil cu aplicaFiltreCategorie care compară cat.grad_min_ordine cu Number(filtre.gradMin)
<div className="space-y-1.5">
  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Grad</div>
  <div className="flex items-center gap-2">
    <select
      value={filtre.gradMin}
      onChange={e => setFiltre({ gradMin: e.target.value })}
      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-primary/60"
    >
      <option value="">Min grad</option>
      {[...grade].sort((a, b) => a.ordine - b.ordine).map(g => (
        <option key={g.id} value={g.ordine.toString()}>{g.nume}</option>
      ))}
    </select>
    <span className="text-slate-500 text-xs">–</span>
    <select
      value={filtre.gradMax}
      onChange={e => setFiltre({ gradMax: e.target.value })}
      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-primary/60"
    >
      <option value="">Max grad</option>
      {[...grade].sort((a, b) => a.ordine - b.ordine).map(g => (
        <option key={g.id} value={g.ordine.toString()}>{g.nume}</option>
      ))}
    </select>
  </div>
</div>
```

---

## Shared Patterns

### Export stil — named export (nu default)
**Sursă:** `components/Competitii/InscrieriView.tsx` linia 26 (`export const InscrieriView`)
**Aplică la:** Ambele fișiere noi
```typescript
export const CompetitieFilterBar: React.FC<CompetitieFilterBarProps> = ...
export function useCompetitieFilters() ...
export function aplicaFiltreCategorie(...) ...
```

### Tailwind dark theme tokens (fără CSS vars custom)
**Sursă:** `InscrieriView.tsx` întregul panou filtre
**Aplică la:** `CompetitieFilterBar.tsx`
- Fundal panou: `bg-slate-800/60 border border-slate-700 rounded-xl`
- Inputs: `bg-slate-700 border border-slate-600 text-white`
- Focus ring: `focus:border-brand-primary/60`
- Filtre active accent: `bg-brand-primary/20 border-brand-primary/50 text-brand-primary`
- Inactive text: `text-slate-300`, `text-slate-400`, `text-slate-500`

### Touch support pe butoane interactive
**Sursă:** `InscrieriView.tsx` linia 138, `CategoriiTemplateManager.tsx` linia 456
**Aplică la:** Butonul toggle din `CompetitieFilterBar`
```typescript
style={{ touchAction: 'manipulation' }}
```

---

## No Analog Found

Niciun fișier fără analog — ambele fișiere noi au surse directe în codebase.

---

## Critical Notes for Planner

1. **Ordinea controalelor în FilterBar:** Gen → Probă → Vârstă → Grad (stânga-dreapta, top-bottom în grid 2 col). Identică cu `InscrieriView.tsx:158-234`.

2. **Grad filter — select vs. input:** InscrieriView folosea `input type="number"` pentru grad. Phase 6 introduce `<select>` cu `grade[]` prop (D-10). Aceasta este UNICA diferență față de UI-ul existent — justificată UX: user vede "Galben 1" nu ordine numerică.

3. **Import circular — regulă strictă:** `hooks/useCompetitieFilters.ts` importă DOAR din `react` și `../types`. Niciodată din `../components/`. `CompetitieFilterBar.tsx` importă din `../../hooks/useCompetitieFilters` și `../../types`. Direcție unidirecțională.

4. **`aplicaFiltreCategorie` returnează array, nu Set:** Diferență deliberată față de `InscrieriView.tsx:44-58` (care returnează `Set<string>` de ID-uri pentru lookup). Funcția shared returnează `CategorieCompetitie[]` direct conform D-07.

5. **`filtreVisible` rămâne în componentă, nu în hook:** Dacă ar fi în hook, toate cele 4 tab-uri din Phase 7 ar împărți starea expand/collapse — comportament nedorit.

---

## Metadata

**Analog search scope:** `components/Competitii/`, `hooks/`
**Files scanned:** `InscrieriView.tsx` (1-236), `CategoriiTemplateManager.tsx` (250-310, 455-475), `useFilteredData.ts` (1-50)
**Pattern extraction date:** 2026-06-08
