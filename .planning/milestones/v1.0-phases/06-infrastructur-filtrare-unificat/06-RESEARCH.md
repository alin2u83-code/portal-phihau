# Phase 6: Infrastructură Filtrare Unificată - Research

**Researched:** 2026-06-08
**Domain:** React hook extraction + presentational component authoring (TypeScript, Tailwind)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hook returnează obiect grupat: `{ filtre: CompetitieFiltre, toggleGen, setFiltre, resetFiltre, nrFiltreActive }`
- **D-02:** `CompetitieFiltre` interface: `{ gen: Set<string>, probaId: string, varstaMin: string, varstaMax: string, gradMin: string, gradMax: string }` — string pentru inputs numerice
- **D-03:** `toggleGen(gen)` separat de `setFiltre` — operează pe Set
- **D-04:** `setFiltre(partial)` actualizează orice câmp prin spread
- **D-05:** `resetFiltre()` resetează toate câmpurile la valori inițiale
- **D-06:** `aplicaFiltreCategorie` exportată din `hooks/useCompetitieFilters.ts` — un singur import
- **D-07:** Semnătură: `aplicaFiltreCategorie(categorii: CategorieCompetitie[], filtre: CompetitieFiltre): CategorieCompetitie[]`
- **D-08:** Logica AND copiată din `InscrieriView.tsx:48-56` — identică cu implementarea testată
- **D-09:** Vizibilitate collapsibilă — toggle "Filtre (N)" cu badge filtre active vizibil chiar și colapsat
- **D-10:** Grad filter: dropdown-uri cu nume grade (`grade: Grad[]` prop) — nu inputs numerice
- **D-11:** Props directe: `filtre + toggleGen + setFiltre + resetFiltre + nrFiltreActive + probe + grade`
- **D-12:** Componentă zero state propriu — FilterBar = UI pur, hook = logica de stare
- **D-13:** Fișier: `hooks/useCompetitieFilters.ts`
- **D-14:** Fișier: `components/Competitii/CompetitieFilterBar.tsx`

### Claude's Discretion

- Structura exactă UI dropdown grad (native `<select>` vs custom pills)
- Valoarea inițială pentru `filtreVisible` (expanded/collapsed la mount — probabil `false`)
- Ordinea vizuală a controalelor în FilterBar

### Deferred Ideas (OUT OF SCOPE)

- Persistență filtre în localStorage per competiție (PERS-01, PERS-02)
- Filtru după club pentru super admin (ADV-01)
- Filtru după status înscris/retras (ADV-02)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFR-01 | Hook `useCompetitieFilters` extras din cod existent — gestionează starea filtrelor (gen, vârstă min/max, grad min/max, probă) și returnează funcțiile de toggle/reset | Cod sursă complet în `InscrieriView.tsx:36-84`; extracție directă verificată |
| INFR-02 | Componentă `CompetitieFilterBar` inline — afișează chips gen, inputs vârstă range, select probă, dropdown-uri grad + badge număr filtre active | UI pattern verificat în `InscrieriView.tsx:134-236`; design tokens Tailwind confirmate |
| INFR-03 | Funcție pură `aplicaFiltreCategorie(categorii, filtre)` — logica AND extrasă, reutilizabilă | Logica verificată în `InscrieriView.tsx:44-58`; semnătură confirmată cu tipurile din `types.ts` |
</phase_requirements>

---

## Summary

Phase 6 este o extracție de cod (extraction refactor), nu o scriere de cod nou. Toată logica de filtrare există și funcționează în producție în `InscrieriView.tsx` (liniile 36-84 pentru stare/funcții, 44-58 pentru filtrarea categoriilor, 134-236 pentru UI). Sarcina este să se mute această logică într-un hook reutilizabil și o componentă prezentațională separată, fără a modifica comportamentul.

Tipurile necesare (`CategorieCompetitie`, `ProbaCompetitie`, `Grad`) sunt deja definite în `types.ts`. Design system-ul (`components/ui.tsx`) oferă `Button` și `Card`. Stilurile Tailwind pentru panou filtre și badge-uri sunt deja stabilite în `InscrieriView.tsx` și `CategoriiTemplateManager.tsx`. Nu sunt necesare pachete noi.

Singura decizie discretionară semnificativă este UI-ul pentru dropdown-ul de grad: contextul cere `<select>` nativ (consistent cu dropdown-ul pentru probă în `InscrieriView.tsx:175-185`), nu custom pills. Aceasta este alegerea corectă UX deoarece lista de grade poate fi lungă.

**Primary recommendation:** Extrage 1:1 logica din `InscrieriView.tsx`, adaptează interfețele conform D-01 până la D-05, construiește `CompetitieFilterBar` ca componentă pur prezentațională cu `<select>` nativ pentru grad și probă.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stare filtre (gen, vârstă, grad, probă) | Hook React (`useCompetitieFilters`) | — | Starea UI reutilizabilă aparține hook-ului, nu componentei |
| Funcții toggle/set/reset | Hook React | — | Operațiile pe Set și spread logic sunt parte din starea hook-ului |
| Calcul `nrFiltreActive` | Hook React (`useMemo`) | — | Derivat din starea hook-ului; recalculat automat |
| Logica de filtrare categorii | Funcție pură exportată | — | Pură = testabilă, reutilizabilă fără mount componentă |
| UI filtre (render) | Componentă prezentațională (`CompetitieFilterBar`) | — | Zero state propriu — primește tot via props |
| Aplicare filtre pe date | Consumatorul (Phase 7) | — | Phase 6 doar produce artefactele; Phase 7 le conectează |

---

## Standard Stack

### Core (fără pachete noi)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React `useState` | 18.3.1 [VERIFIED: codebase] | Stare locală în hook | Standard React — deja în proiect |
| React `useMemo` | 18.3.1 [VERIFIED: codebase] | Calcul `nrFiltreActive` derivat | Evită recalcul la fiecare render |
| TypeScript | 5.5.3 [VERIFIED: codebase] | Tipuri `CompetitieFiltre`, props | Convenție proiect — toate tipurile în `types.ts` |
| Tailwind CSS | 3.4.6 [VERIFIED: codebase] | Stiluri FilterBar | Convenție proiect — fără CSS separat |

### Design System intern

| Component | Fișier | Utilizare în Phase 6 |
|-----------|--------|----------------------|
| `Button` | `components/ui.tsx` | Butonul toggle "Filtrează (N)" poate folosi variant secundar |
| `Card` | `components/ui.tsx` | Opțional pentru container panou filtre |
| Tailwind tokens `--t-surface`, `--t-border`, `--t-text` | via CSS vars | Fundal panou filtre |
| `brand-primary` (CSS var) | `tailwind.config.js` + CSS vars | Accent culoare filtre active |

**Nota:** `brand-primary` nu este un token Tailwind direct configurat în `tailwind.config.js` (acolo există `brand.DEFAULT`, `brand.dark`, `brand.light`). Clasa `bg-brand-primary/20` folosită în `InscrieriView.tsx` este o clasă arbitrară Tailwind care referă variabila CSS `--brand-primary` injectată de theme system (Phase 5). [VERIFIED: codebase grep]

### No new packages needed

Această fază nu instalează niciun pachet extern. Nu este necesară verificarea legitimității.

---

## Package Legitimacy Audit

**Nu se instalează pachete noi în această fază.** Secțiunea nu se aplică.

---

## Architecture Patterns

### System Architecture Diagram

```
Phase 6 Output (artefacte shared)
┌─────────────────────────────────────────────────────┐
│  hooks/useCompetitieFilters.ts                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  useState: gen (Set), probaId, varstaMin,    │   │
│  │           varstaMax, gradMin, gradMax        │   │
│  │  useMemo:  nrFiltreActive                    │   │
│  │                                              │   │
│  │  export: { filtre, toggleGen, setFiltre,     │   │
│  │            resetFiltre, nrFiltreActive }     │   │
│  │                                              │   │
│  │  export function aplicaFiltreCategorie(      │   │
│  │    categorii: CategorieCompetitie[],         │   │
│  │    filtre: CompetitieFiltre                  │   │
│  │  ): CategorieCompetitie[]                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  components/Competitii/CompetitieFilterBar.tsx       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Props: filtre + toggleGen + setFiltre +     │   │
│  │         resetFiltre + nrFiltreActive +       │   │
│  │         probe[] + grade[]                   │   │
│  │                                              │   │
│  │  UI: toggle button → panou collapsibil       │   │
│  │       chips gen | select probă               │   │
│  │       inputs vârstă range | select grad      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │
         │ consumat de (Phase 7)
         ▼
┌─────────────────────────────┐
│  Tab Categorii (index.tsx)  │
│  Tab Înscrieri (InscrieriView.tsx) │
│  Tab Raport (RaportInscrieri.tsx)  │
│  Tab Template (CategoriiTemplateManager.tsx) │
└─────────────────────────────┘
```

### Recommended Project Structure

```
hooks/
└── useCompetitieFilters.ts    # hook + CompetitieFiltre interface + aplicaFiltreCategorie

components/Competitii/
├── CompetitieFilterBar.tsx    # componentă UI prezentațională (NOU)
├── InscrieriView.tsx          # NEATINS în Phase 6 (modificat în Phase 7)
├── index.tsx                  # NEATINS în Phase 6
└── ...
```

### Pattern 1: Hook de Stare UI cu Funcție Pură Co-locată

**What:** Hook-ul gestionează starea și calculele derivate. Funcția pură de filtrare este exportată din același fișier pentru un singur punct de import.

**When to use:** Când logica de stare și operația pe date sunt strâns legate și vor fi consumate împreună.

**Example:**
```typescript
// Source: InscrieriView.tsx:36-84 (extracție directă)
// hooks/useCompetitieFilters.ts

import { useState, useMemo } from 'react';
import { CategorieCompetitie, ProbaCompetitie, Grad } from '../types';

export interface CompetitieFiltre {
  gen: Set<string>;
  probaId: string;
  varstaMin: string;
  varstaMax: string;
  gradMin: string;
  gradMax: string;
}

const FILTRE_INITIALE: CompetitieFiltre = {
  gen: new Set(),
  probaId: '',
  varstaMin: '',
  varstaMax: '',
  gradMin: '',
  gradMax: '',
};

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

  const resetFiltre = () => setFiltreState(FILTRE_INITIALE);

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
    if (filtre.varstaMin !== '' && cat.varsta_min < Number(filtre.varstaMin)) return false;
    if (filtre.varstaMax !== '' && (cat.varsta_max === null || cat.varsta_max > Number(filtre.varstaMax))) return false;
    if (filtre.gradMin !== '' && (cat.grad_min_ordine === null || cat.grad_min_ordine < Number(filtre.gradMin))) return false;
    if (filtre.gradMax !== '' && (cat.grad_max_ordine === null || cat.grad_max_ordine > Number(filtre.gradMax))) return false;
    return true;
  });
}
```

**Nota critică:** Funcția originală din `InscrieriView.tsx:44-58` returnează un `Set<string>` de ID-uri (pentru filtrarea înscrierilorprincipale). Funcția `aplicaFiltreCategorie` conform D-07 returnează `CategorieCompetitie[]` — array filtrat, nu Set. Aceasta este diferența intenționată față de sursă. [VERIFIED: codebase]

### Pattern 2: Componentă Prezentațională Pur Props-Driven

**What:** `CompetitieFilterBar` nu deține stare. Primește tot via props și emite callback-uri. Toggle intern pentru expand/collapse este singurul `useState` permis.

**When to use:** Când același UI trebuie montat în contexte multiple cu surse de date diferite (Phase 7: 4 tab-uri diferite).

**Example (structura componentei):**
```typescript
// Source: InscrieriView.tsx:134-236 (UI pattern extras)
// components/Competitii/CompetitieFilterBar.tsx

import React, { useState } from 'react';
import { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { ProbaCompetitie, Grad } from '../../types';

export interface CompetitieFilterBarProps {
  filtre: CompetitieFiltre;
  toggleGen: (gen: string) => void;
  setFiltre: (partial: Partial<CompetitieFiltre>) => void;
  resetFiltre: () => void;
  nrFiltreActive: number;
  probe: ProbaCompetitie[];
  grade: Grad[];
}

export const CompetitieFilterBar: React.FC<CompetitieFilterBarProps> = ({
  filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, probe, grade
}) => {
  const [filtreVisible, setFiltreVisible] = useState(false);
  // ... render
};
```

**Nota D-10 — Grad dropdown:** `grade` prop primite sunt sortate după `ordine`. Dropdown-ul mapează `grad.ordine.toString()` la `filtre.gradMin`/`filtre.gradMax`. Valoarea din state rămâne string (ordine ca string), dar UI-ul arată `grad.nume`. [VERIFIED: types.ts — `Grad.ordine: number`, `Grad.nume: string`]

### Anti-Patterns to Avoid

- **Duplicarea logicii:** Nu re-implementa `aplicaFiltreCategorie` în fiecare tab. Toți consumatorii importă din `hooks/useCompetitieFilters.ts`.
- **State în FilterBar:** Cu excepția `filtreVisible`, niciun `useState` în `CompetitieFilterBar`. Starea vine din hook via props.
- **Exportul `CompetitieFiltre` din `types.ts`:** Interfața `CompetitieFiltre` NU merge în `types.ts`. Aparține hook-ului — este o preocupare de UI state, nu un tip de domeniu. [ASSUMED — convenție derivată din pattern-ul existent al proiectului]
- **Folosirea `number` pentru inputs:** `varstaMin`, `varstaMax`, `gradMin`, `gradMax` sunt `string` în state. Input `type="number"` cu `value` string este pattern standard React pentru controlled inputs.
- **`new Set()` referință nouă la fiecare render:** `FILTRE_INITIALE` trebuie definit în afara componentei/hook-ului ca constantă pentru a evita crearea unui nou obiect la fiecare render la `resetFiltre`. Folosește `{ ...FILTRE_INITIALE, gen: new Set() }` la reset.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Badge număr filtre | Counter personalizat | Pattern existent `CategoriiTemplateManager.tsx:462` | `bg-brand-primary text-white rounded-full px-1.5` — deja testat |
| Toggle collapse animat | Animație personalizată | `rotate-180` Tailwind + `transition-transform` | Pattern deja în `InscrieriView.tsx:145` |
| Checkbox gen cu stil | Component custom | Label cu input hidden, pattern deja în `InscrieriView.tsx:163-168` | Accesibil, funcțional, consistent |
| Select dropdown grad | Picker custom | Native `<select>` — pattern deja în `InscrieriView.tsx:175-185` | Consistent cu dropdown probă |

**Key insight:** Toată logica UI necesară există deja în `InscrieriView.tsx`. Extracția înseamnă copiere + adaptare, nu invenție.

---

## Common Pitfalls

### Pitfall 1: `FILTRE_INITIALE` cu `new Set()` înăuntrul funcției de reset

**What goes wrong:** `resetFiltre` apelează `setFiltreState({ gen: new Set(), ... })` la fiecare apel — creează referințe noi. Nu cauzează bug funcțional dar poate declanșa re-rendere dacă consumatorul face comparații shallow.

**Why it happens:** `new Set()` este mereu o referință nouă.

**How to avoid:** Definește `FILTRE_INITIALE` ca constantă la nivel de modul. La reset, creează un nou obiect shallow din constantă: `setFiltreState({ ...FILTRE_INITIALE, gen: new Set() })`.

**Warning signs:** ESLint (dacă activ) warning despre referință instabilă în deps array.

### Pitfall 2: `aplicaFiltreCategorie` returnează array vs. Set

**What goes wrong:** Funcția originală din `InscrieriView.tsx:44-58` returnează `Set<string>` (ID-uri categorii). Dacă implementezi `aplicaFiltreCategorie` să returneze Set în loc de array, Phase 7 va trebui să filtreze array-urile de categorii manual.

**Why it happens:** Confuzie între funcția originală (optimizată pentru lookup) și funcția shared (D-07 — returnează array filtrat direct).

**How to avoid:** Conform D-07, returnează `CategorieCompetitie[]`. Consumatorii Phase 7 vor folosi direct acest array.

### Pitfall 3: Importul circular între hook și componente

**What goes wrong:** `CompetitieFilterBar.tsx` importă `CompetitieFiltre` din `hooks/useCompetitieFilters.ts`. Dacă `hooks/useCompetitieFilters.ts` importă ceva din `components/`, apare circular import.

**Why it happens:** Separarea hook/componentă necesită că hook-ul nu cunoaște componente.

**How to avoid:** Hook-ul importă doar din `types.ts` și React. Componenta importă din hook. Niciodată invers. [VERIFIED: structura folderelor din proiect — hooks/ nu importă din components/]

### Pitfall 4: `filtreVisible` state în hook vs. în componentă

**What goes wrong:** Dacă `filtreVisible` (expand/collapse) este în hook, toți consumatorii (4 tab-uri în Phase 7) vor împărtăși starea expand/collapse, ceea ce nu e dorit — fiecare tab ar trebui să aibă panel-ul independent.

**Why it happens:** Tentația de a centraliza tot în hook.

**How to avoid:** `filtreVisible` rămâne `useState` LOCAL în `CompetitieFilterBar` — singurul state intern permis conform D-12.

### Pitfall 5: Grad filter cu `ordine` vs. `id`

**What goes wrong:** Starea `gradMin`/`gradMax` stochează valoarea câmpului `ordine` (ca string), nu `id`-ul gradului. Dacă `<select>` mapează `value={grad.id}`, logica din `aplicaFiltreCategorie` (care compară `cat.grad_min_ordine` cu `Number(filtre.gradMin)`) nu va funcționa.

**Why it happens:** `CategorieCompetitie.grad_min_ordine` este ordine numerică, nu FK la `grade.id`.

**How to avoid:** `<select value>` = `grad.ordine.toString()`. `<option value={grad.ordine.toString()}>` afișează `grad.nume`. [VERIFIED: types.ts — `CategorieCompetitie.grad_min_ordine: number | null`, `Grad.ordine: number`]

---

## Code Examples

### Extracție completă logica toggle gen (sursă verificată)

```typescript
// Source: InscrieriView.tsx:69-75 [VERIFIED: codebase]
const toggleGen = (gen: string) => {
  setFilterGen(prev => {
    const next = new Set(prev);
    if (next.has(gen)) next.delete(gen); else next.add(gen);
    return next;
  });
};
// Adaptat pentru hook: operează pe filtre.gen nu pe filterGen separat
```

### Calcul nrFiltreActive (sursă verificată)

```typescript
// Source: InscrieriView.tsx:60-67 [VERIFIED: codebase]
const nrFiltreActive = useMemo(() => {
  let n = 0;
  if (filterGen.size > 0) n++;
  if (filterProbaId) n++;
  if (filterVarstaMin !== '' || filterVarstaMax !== '') n++;
  if (filterGradMin !== '' || filterGradMax !== '') n++;
  return n;
}, [filterGen, filterProbaId, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);
// Adaptat: deps array = [filtre] (obiect grupat din hook)
```

### Badge filtre active în buton toggle (sursă verificată)

```typescript
// Source: CategoriiTemplateManager.tsx:462 [VERIFIED: codebase]
// Pattern badge:
{nrFiltreActive > 0 && (
  <span className="bg-brand-primary text-white rounded-full px-1.5">
    {nrFiltreActive}
  </span>
)}

// Source: InscrieriView.tsx:139-148 [VERIFIED: codebase]
// Pattern buton toggle complet:
<button
  onClick={() => setFiltreVisible(v => !v)}
  style={{ touchAction: 'manipulation' }}
  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
    nrFiltreActive > 0
      ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary'
      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
  }`}
>
  {/* SVG filter icon */}
  {`Filtrează${nrFiltreActive > 0 ? ` (${nrFiltreActive})` : ''}`}
  {/* SVG chevron cu rotate-180 când deschis */}
</button>
```

### Dropdown probă native select (sursă verificată)

```typescript
// Source: InscrieriView.tsx:175-185 [VERIFIED: codebase]
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
```

### Dropdown grad (pattern adaptat — ordine ca value)

```typescript
// Adaptat din pattern probă de mai sus, cu mapare ordine→nume
<select
  value={filtre.gradMin}
  onChange={e => setFiltre({ gradMin: e.target.value })}
  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-primary/60"
>
  <option value="">Orice grad</option>
  {[...grade].sort((a, b) => a.ordine - b.ordine).map(g => (
    <option key={g.id} value={g.ordine.toString()}>{g.nume}</option>
  ))}
</select>
// Nota: value = ordine ca string pentru compatibilitate cu aplicaFiltreCategorie
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Filtre locale în InscrieriView | Hook reutilizabil shared | Phase 6 | 4 tab-uri pot folosi același hook fără duplicare |
| Grad filter cu inputs numerice | Grad filter cu `<select>` + nume grade | Phase 6 (D-10) | UX mai bun — user vede "Galben 1" nu "ordine: 3" |

**Deprecated/outdated:**
- `filterGen`, `filterProbaId`, `filterVarstaMin/Max`, `filterGradMin/Max` ca state separat în `InscrieriView.tsx` → înlocuit în Phase 7 cu `useCompetitieFilters()`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `CompetitieFiltre` interface aparține hook-ului, nu `types.ts` | Architecture Patterns → Anti-Patterns | Dacă plannerul pune interfața în `types.ts`, nu este o eroare critică — funcționează oricum, dar încalcă convenția separării preocupărilor |
| A2 | `filtreVisible` state inițial = `false` (colapsat) | Claude's Discretion | Impact UX minor — dacă `true` (expanded), FilterBar ocupă spațiu la mount fără filtre active |

**Toate celelalte afirmații sunt VERIFIED din codebase (grep direct).**

---

## Open Questions

1. **Grad filter — opțiune "Fără grad minim / maxim" (grad_min_ordine = null)**
   - Ce știm: `CategorieCompetitie.grad_min_ordine` poate fi `null` (categorii deschise oricărui grad)
   - Ce e neclar: Dacă un filtru `gradMin = "3"` ar trebui să excludă sau include categoriile cu `grad_min_ordine = null`
   - Recomandare: Logica existentă din `InscrieriView.tsx:53` tratează `null` ca exclus (`cat.grad_min_ordine === null` → returnează `false`). Copiază comportamentul exact conform D-08.

2. **Export nume componentă — named vs. default**
   - Ce știm: `InscrieriView` este named export; `CategoriiTemplateManager` este default export
   - Ce e neclar: Conventia pentru `CompetitieFilterBar`
   - Recomandare: Named export (`export const CompetitieFilterBar`) — consistent cu `InscrieriView` și celelalte componente noi din folder.

---

## Environment Availability

Secțiunea nu se aplică — faza este cod/configurare pur, fără dependențe externe.

---

## Validation Architecture

`nyquist_validation: false` în `.planning/config.json` — secțiunea omisă.

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` în `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (parțial) | Conversie `Number()` pentru string inputs numerice — deja în cod existent |
| V6 Cryptography | no | — |

### Security Notes

- **V5 — Input Validation:** `Number(filtre.varstaMin)` poate returna `NaN` dacă userul introduce caractere non-numerice în input `type="number"`. Inputul `type="number"` previne la nivel browser, dar logica din `aplicaFiltreCategorie` ar trebui să verifice `isNaN(Number(filtre.varstaMin))` înainte de comparare.
  - Logica existentă din `InscrieriView.tsx` nu face această verificare — dar `type="number"` garantează string numeric valid sau string gol, deci risc minim.
  - **Recomandare:** Adaugă `&& !isNaN(Number(filtre.varstaMin))` în `aplicaFiltreCategorie` ca guard defensiv, conform best practice ASVS L1.

- **Client-side filtering only:** Filtrarea este pur client-side pe date deja încărcate via React Query. Nu sunt query-uri Supabase noi — RLS nu este afectat de această fază.

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| NaN injection în Number() cast | Tampering (UX) | Guard `isNaN()` + `type="number"` HTML input attribute |

---

## Project Constraints (from CLAUDE.md)

- **Tech Stack:** React 18 + TypeScript + Tailwind — fără librării externe noi [ENFORCED]
- **UI:** `components/ui.tsx` design system intern — nu Shadcn, nu MUI [ENFORCED]
- **Tipuri:** Tipuri de domeniu în `types.ts` unic. EXCEPȚIE: `CompetitieFiltre` aparține hook-ului (tip UI state, nu tip domeniu) [INFERRED]
- **Navigare:** SPA fără URL routing — nu afectează această fază
- **Performanță:** Filtrare client-side pe date deja încărcate — fără query-uri noi Supabase [ENFORCED de REQUIREMENTS.md Out of Scope]
- **Limbă:** Variabile domeniu în română, hooks/patterns în engleză. `useCompetitieFilters`, `aplicaFiltreCategorie` — mixt intenționat (convenție proiect verificată în codebase) [VERIFIED]
- **Scope fișier:** Nu se modifică `index.tsx` în Phase 6 — Phase 7 face integrarea [ENFORCED de CONTEXT.md]
- **Compatibilitate:** API-ul componentelor existente rămâne intact în Phase 6 [ENFORCED]

---

## Sources

### Primary (HIGH confidence)
- `components/Competitii/InscrieriView.tsx:36-84` — Cod sursă logica de filtrare (extracție directă)
- `components/Competitii/InscrieriView.tsx:134-236` — UI pattern FilterBar existent
- `components/Competitii/CategoriiTemplateManager.tsx:252-296` — Pattern alternativ filtrare + badge filtre active
- `types.ts:235-242` — Interface `Grad` (`ordine: number`, `nume: string`)
- `types.ts:611-630` — Interface `ProbaCompetitie`, `CategorieCompetitie`
- `components/ui.tsx` — Button, Card design system
- `tailwind.config.js` — Tailwind tokens configurați
- `.planning/config.json` — `nyquist_validation: false`, `security_enforcement: true`

### Secondary (MEDIUM confidence)
- `components/Competitii/index.tsx:1-82` — Context integrare (cum sunt consumate componentele în tab-uri)
- `components/Competitii/RaportInscrieri.tsx:1-50` — Structura tab Raport (pentru Phase 7 awareness)

### Tertiary (LOW confidence)
- Niciuna — toate afirmațiile sunt verificate din codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — fără pachete noi, totul din codebase existent
- Architecture: HIGH — extracție 1:1 din cod testat în producție
- Pitfalls: HIGH — identificate din analiza directă a codului sursă și a diferențelor de interfață

**Research date:** 2026-06-08
**Valid until:** 2026-12-08 (cod stabil, fără dependențe externe)
