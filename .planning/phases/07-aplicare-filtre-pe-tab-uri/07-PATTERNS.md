# Phase 7: Aplicare Filtre pe Tab-uri — Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 4 fișiere modificate + 2 fișiere noi existente (hook + componentă)
**Analogs found:** 4 / 4

---

## File Classification

| Fișier modificat | Rol | Data Flow | Cel mai apropiat analog | Calitate match |
|------------------|-----|-----------|-------------------------|----------------|
| `components/Competitii/InscrieriView.tsx` | component | request-response (filtrare client-side) | Sine însuși — are deja filtre inline de eliminat | exact (replace) |
| `components/Competitii/index.tsx` — tab Categorii | component | request-response (filtrare client-side) | `InscrieriView.tsx` după refactorizare | role-match |
| `components/Competitii/RaportInscrieri.tsx` | component | transform (agregare sportivi) | `InscrieriView.tsx` | role-match |
| `components/Competitii/CategoriiTemplateManager.tsx` | component | CRUD + filtrare client-side | Sine însuși — are filtre proprii de tip diferit | partial-match |

---

## Pattern Assignments

### 1. `components/Competitii/InscrieriView.tsx` (înlocuire filtre inline cu hook + componentă)

**Strategie:** Elimină 7 `useState` + 2 `useMemo` de filtrare, înlocuiește cu `useCompetitieFilters()` + `<CompetitieFilterBar>`.

**Import-uri de adăugat** (după linia 8, după importul existent):
```typescript
import { useCompetitieFilters, aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
```

**State de ELIMINAT** (liniile 36–84 — tot blocul de filtrare existent):
```typescript
// ELIMINA — toate liniile de mai jos:
const [filtreVisible, setFiltreVisible] = useState(false);           // linia 36
const [filterGen, setFilterGen] = useState<Set<string>>(new Set());  // linia 37
const [filterProbaId, setFilterProbaId] = useState<string>('');      // linia 38
const [filterVarstaMin, setFilterVarstaMin] = useState('');          // linia 39
const [filterVarstaMax, setFilterVarstaMax] = useState('');          // linia 40
const [filterGradMin, setFilterGradMin] = useState('');              // linia 41
const [filterGradMax, setFilterGradMax] = useState('');              // linia 42

const categoriiVizibile = useMemo(() => { ... }, [...]);             // liniile 44–58
const nrFiltreActive = useMemo(() => { ... }, [...]);                // liniile 60–67
const toggleGen = (gen: string) => { ... };                          // liniile 69–75
const resetFiltre = () => { ... };                                   // liniile 77–84
```

**State de ADĂUGAT** (după `const { showError }` la linia 29):
```typescript
const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();
```

**Logica `categoriiVizibile` de ÎNLOCUIT** — după hook call:
```typescript
// Diferenta intentionata fata de aplicaFiltreCategorie: returneaza Set<string> (nu array)
// pentru a folosi .has() in filtrarea filteredInscrieri / filteredEchipe
const categoriiVizibile = useMemo(() => {
  const areFiltre = filtre.gen.size > 0 || filtre.probaId || filtre.varstaMin ||
    filtre.varstaMax || filtre.gradMin || filtre.gradMax;
  if (!areFiltre) return null;
  return new Set(aplicaFiltreCategorie(categorii, filtre).map(c => c.id));
}, [categorii, filtre]);
```

**JSX de ÎNLOCUIT** (liniile 133–237 — tot blocul `<div>` cu butonul toggle + panoul filtre):
```tsx
{/* Panou filtre — înlocuieste blocul inline cu componenta */}
<CompetitieFilterBar
  filtre={filtre}
  toggleGen={toggleGen}
  setFiltre={setFiltre}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
  probe={probe}
  grade={grade}
/>
```

**Locul de inserție JSX:** Linia 133 din `InscrieriView.tsx` — primul `<div>` din return, imediat înainte de secțiunea `{/* Individual */}`.

---

### 2. `components/Competitii/index.tsx` — tab Categorii (adăugare filtre noi)

**Strategie:** Tab-ul Categorii are deja un filtru rudimentar `selectedProbaId` (linia 64) care filtrează categorii per probă. Se adaugă `useCompetitieFilters` în plus, **fără a elimina** `selectedProbaId` (acesta serveste tab-urile de probe, nu `CompetitieFilterBar`).

**Import-uri de adăugat** (după linia 28, după `import { InscrieriView }`):
```typescript
import { useCompetitieFilters, aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
```

**Hook call de adăugat** în `CompetitieDetail` (după linia 64, după `const [selectedProbaId...]`):
```typescript
const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();
```

**`filteredCategorii` de ÎNLOCUIT** (linia 117–118):
```typescript
// Inainte:
const filteredCategorii = selectedProbaId
  ? categorii.filter(c => c.proba_id === selectedProbaId)
  : categorii;

// Dupa — combina filtrul de proba cu CompetitieFiltre:
const filteredCategorii = useMemo(() => {
  const bazaProba = selectedProbaId
    ? categorii.filter(c => c.proba_id === selectedProbaId)
    : categorii;
  return aplicaFiltreCategorie(bazaProba, filtre);
}, [categorii, selectedProbaId, filtre]);
```

**Atentie:** `useMemo` trebuie importat — verificati daca exista deja la linia 1 (da, exista: `import React, { useState, useEffect, useCallback, useMemo, useRef }`).

**JSX de ADĂUGAT** în tab Categorii — imediat după `{probe.length > 1 && (...)}` (linia 291), înainte de `{/* Category list */}` (linia 311):
```tsx
{/* Filtre unificate categorii */}
<CompetitieFilterBar
  filtre={filtre}
  toggleGen={toggleGen}
  setFiltre={setFiltre}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
  probe={probe}
  grade={grade}
/>
```

---

### 3. `components/Competitii/RaportInscrieri.tsx` (adăugare filtre pe sportivi agregati)

**Strategie:** RaportInscrieri nu are filtre în prezent. Filtrarea se aplică pe `categorii` înainte de agregare — categoriile vizibile determină ce înregistrări intră în raport.

**Import-uri de adăugat** (după linia 1):
```typescript
import { useCompetitieFilters, aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
```

**Prop nou necesar — `grade: Grad[]`** — interfata `RaportInscrieriProps` (linia 4–12):
```typescript
export interface RaportInscrieriProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  isAdmin: boolean;
  myClubId: string | null;
  grade: Grad[];  // NOU — necesar pentru CompetitieFilterBar
}
```

**Import `Grad` de adăugat** la linia 2 (deja importat `Competitie`, adăugam `Grad`):
```typescript
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
```

**Hook call** de adăugat în componenta (după linia 14, primul rând al componentei):
```typescript
const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();
```

**Filtrare categorii vizibile** de adăugat (după hook call, înainte de `filteredIns`):
```typescript
const categoriiVizibile = useMemo(
  () => new Set(aplicaFiltreCategorie(categorii, filtre).map(c => c.id)),
  [categorii, filtre]
);
```

**`filteredIns` și `filteredEc` de ÎNLOCUIT** (liniile 32–37):
```typescript
const filteredIns = inscrieri.filter(i =>
  i.status?.toLowerCase() !== 'retras' &&
  (isAdmin || i.club_id === myClubId) &&
  categoriiVizibile.has(i.categorie_id)   // NOU
);
const filteredEc = echipe.filter(e =>
  e.status?.toLowerCase() !== 'retrasa' &&
  (isAdmin || e.club_id === myClubId) &&
  categoriiVizibile.has(e.categorie_id)   // NOU
);
```

**Adaugare `useMemo` la import** (linia 1 — adaugam `useMemo` la destructurare React):
```typescript
import React, { useMemo } from 'react';
```

**JSX de ADĂUGAT** (în return, înainte de `if (raport.length === 0)` — se mută după header, linia 91):
```tsx
<CompetitieFilterBar
  filtre={filtre}
  toggleGen={toggleGen}
  setFiltre={setFiltre}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
  probe={probe}
  grade={grade}
/>
```

**Locul exact:** Între `<div className="flex items-center justify-between...">` (header cu buton Imprimă, linia 92) și `<div className="border border-[var(--t-border)]...">` (lista sportivi, linia 106).

**Apel de la `index.tsx`** — trebuie adăugat prop `grade` la linia 516–522:
```tsx
<RaportInscrieri
  competitie={competitie}
  categorii={categorii}
  probe={probe}
  inscrieri={inscrieri}
  echipe={echipe}
  isAdmin={isAdmin}
  myClubId={myClubId || null}
  grade={grade}   // NOU
/>
```

---

### 4. `components/Competitii/CategoriiTemplateManager.tsx` (NE-modificat în faza 7)

**Decizie:** CategoriiTemplateManager are propriile filtre specializate (`filterTipProba`, `filterParticipare`, `filterVarsteValues`, `search`) care sunt diferite de `CompetitieFiltre` standard (gen/vârstă/grad/probă). Acestea nu se înlocuiesc — sunt filtere specifice bibliotecii de template-uri, nu filtre de competiție activă.

**Concluzie:** CategoriiTemplateManager rămâne neschimbat în faza 7. Dacă se dorește unificare în viitor, se creează un hook separat `useTemplateFilters`.

---

## Shared Patterns

### Pattern: apel `useCompetitieFilters` în componentă
**Sursă:** `hooks/useCompetitieFilters.ts` liniile 52–81
**Se aplică în:** InscrieriView, CompetitieDetail (index.tsx tab Categorii), RaportInscrieri
```typescript
const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();
```

### Pattern: `aplicaFiltreCategorie` — filtrare array categorii
**Sursă:** `hooks/useCompetitieFilters.ts` liniile 27–50
**Se aplică în:** index.tsx (filteredCategorii), RaportInscrieri (categoriiVizibile)
```typescript
// Returneaza CategorieCompetitie[] — se poate mapa la Set<string> local dupa nevoie
const categoriiFiltre = aplicaFiltreCategorie(categorii, filtre);
const categoriiVizibile = new Set(categoriiFiltre.map(c => c.id));
```

### Pattern: `<CompetitieFilterBar>` — props obligatorii
**Sursă:** `components/Competitii/CompetitieFilterBar.tsx` liniile 5–13
**Se aplică în:** toate cele 3 tab-uri
```tsx
<CompetitieFilterBar
  filtre={filtre}
  toggleGen={toggleGen}
  setFiltre={setFiltre}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
  probe={probe}      // ProbaCompetitie[] — disponibil in toate contextele
  grade={grade}      // Grad[] — din useData() sau prop
/>
```

### Pattern: diferenta `categoriiVizibile` vs `aplicaFiltreCategorie`
**Critică — NU confunda:**
- `aplicaFiltreCategorie(categorii, filtre)` → returneaza `CategorieCompetitie[]` — folosit când ai nevoie de obiectele complete (index.tsx `filteredCategorii`)
- `new Set(aplicaFiltreCategorie(...).map(c => c.id))` → returneaza `Set<string>` — folosit pentru `.has(categorie_id)` în filtrarea înregistrărilor (InscrieriView, RaportInscrieri)

Comentariul din `InscrieriView.tsx` linia 26: `// Diferență intenționată față de InscriereView.tsx:44-58 (D-07)` — păstrează această logică, nu unifica.

---

## Dependente de propagat

| Prop nou | In ce fișier se adaugă | Unde se trimite prop-ul |
|----------|----------------------|-------------------------|
| `grade: Grad[]` | `RaportInscrieriProps` (RaportInscrieri.tsx linia 12) | `index.tsx` linia ~516 — adaugă `grade={grade}` |

`grade` este deja disponibil în `CompetitieDetail` via `const { ..., grade, ... } = useData()` (linia 49 din index.tsx).

---

## No Analog Found

Niciun fișier fără analog — toate cele 4 fișiere au pattern clar de referință.

---

## Metadata

**Scope căutat:** `components/Competitii/`, `hooks/`
**Fișiere scanate:** 6 fișiere citite integral
**Data mapping:** 2026-06-08
