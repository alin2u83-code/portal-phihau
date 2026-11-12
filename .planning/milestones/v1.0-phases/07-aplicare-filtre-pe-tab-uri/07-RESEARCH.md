# Phase 7: Aplicare Filtre pe Tab-uri - Research

**Researched:** 2026-06-08
**Domain:** React component wiring — montarea infrastructurii de filtrare (Phase 6) pe 4 tab-uri existente din modulul Competiții
**Confidence:** HIGH — cod sursă citit direct, fără dependențe externe noi

---

<phase_requirements>
## Phase Requirements

| ID | Descriere | Research Support |
|----|-----------|-----------------|
| TAB-01 | Filtrul de probă (pills existente în tab Categorii) integrat în `CompetitieFilterBar` — nu dispare | `selectedProbaId` + pills inline în `CompetitieDetail` liniile 291–308; înlocuit cu `CompetitieFilterBar` care are deja controlul `probaId` |
| TAB-02 | Filtrele gen + vârstă + grad aplicate pe lista de categorii din tab Categorii | `filteredCategorii` din `index.tsx:117–119` folosește doar `selectedProbaId`; se extinde cu `aplicaFiltreCategorie` |
| TAB-03 | Numărul de categorii afișate se actualizează live la modificarea filtrelor | `categorii.length` din label tab devine `filteredCategorii.length` după aplicarea filtrelor |
| INSC-01 | `CompetitieFilterBar` afișată deasupra listei de sportivi înscriși | Înlocuiește blocul inline `<div>...</div>` liniile 133–237 din `InscrieriView.tsx` |
| INSC-02 | Filtrele gen + vârstă + grad filtrează sportivii înscriși după datele lor | Logic existentă în `categoriiVizibile` useMemo reutilizată — filtrele se aplică pe `cat.gen/varsta_min/varsta_max/grad_min/grad_max` |
| INSC-03 | Filtrele se resetează la schimbarea tab-ului activ | `resetFiltre()` apelată în `handleSetActiveTab` din `index.tsx` sau via `useEffect` pe `activeTab` |
| RAP-01 | `CompetitieFilterBar` afișată deasupra datelor de raport | `RaportInscrieri` nu are niciun filtru; se adaugă bara + props noi |
| RAP-02 | Filtrele aplicate pe datele agregate din raport (per club/categorie) | Raportul filtrează `filteredIns`/`filteredEc` prin `categorie_id` — se poate adăuga filtru pe `categorii` vizibile |
| TMPL-01 | `filterGen`, `filterVarstaMin/Max`, `filterGradMin/Max` din Template înlocuite cu `useCompetitieFilters` | Liniile 253–258, 262–266, 381–393 din `CategoriiTemplateManager.tsx` — identificate exact |
| TMPL-02 | Comportament identic cu cel existent — nicio regresia vizibilă pentru admin | Filtrul de probă tab (`filterTipProba`) și participare (`filterParticipare`) și vârste discrete (`filterVarsteValues`) rămân locale — nu le înlocuim |
</phase_requirements>

---

## Summary

Phase 7 nu creează cod nou de infrastructură — consumă artefactele din Phase 6 (`useCompetitieFilters`, `CompetitieFilterBar`, `aplicaFiltreCategorie`) și le montează pe 4 tab-uri existente. Fiecare tab are un profil diferit de migrare: InscrieriView are cel mai mult state local duplicat de eliminat (6 useState + 2 useMemo + 2 funcții), CategoriiTemplateManager elimină parțial (doar gen), iar tab Categorii și Raport primesc filtrele ca adăugiri nete.

Punctul central de orchestrare este `CompetitieDetail` din `index.tsx` (liniile 47–658). Hookul `useCompetitieFilters` se instanțiază la nivelul `CompetitieDetail` — **un singur hook, partajat între tab-uri** — și se resetează explicit la schimbarea tab-ului activ.

**Recomandare primară:** Hook unic în `CompetitieDetail`, filtre pasate ca props la fiecare componentă de tab. Nu se instanțiază hook-ul în interiorul componentelor individuale de tab — ar crea state izolat necorelat.

---

## Architectural Responsibility Map

| Capabilitate | Tier Primar | Tier Secundar | Raționale |
|--------------|-------------|---------------|-----------|
| State filtre (gen, probă, vârstă, grad) | `CompetitieDetail` (orchestrator) | — | Filtrele trebuie să persiste la schimbarea tab-ului și să poată fi resetate central |
| Reset filtre la schimbare tab | `CompetitieDetail.handleSetActiveTab` | — | Orchestratorul controlează tab-ul activ — e singurul loc care știe când se schimbă |
| Render bara de filtre | Fiecare tab component | — | Bara e vizibilă per-tab; fiecare tab o montează în propriul header |
| Aplicare filtre pe categorii | `aplicaFiltreCategorie` (pură) | `useMemo` în fiecare consumator | Funcție pură din Phase 6 — nu e state, e transformare |
| Aplicare filtre pe înscrieri | `InscrieriView` (via `categoriiVizibile`) | — | Logica existentă reutilizată după refactorizare |
| Aplicare filtre pe raport | `RaportInscrieri` (nou) | — | Filtrare pe `categorii` vizibile, nu pe sportivi direct |

---

## Analiza Exactă a State-ului de Eliminat / Modificat

### 1. `InscrieriView.tsx` — State de eliminat

**Locație:** liniile 36–84 (bloc complet de filtrare)

**useState-uri de eliminat (6 piese de state):**
```
linia 36: const [filtreVisible, setFiltreVisible] = useState(false);
linia 37: const [filterGen, setFilterGen] = useState<Set<string>>(new Set());
linia 38: const [filterProbaId, setFilterProbaId] = useState<string>('');
linia 39: const [filterVarstaMin, setFilterVarstaMin] = useState('');
linia 40: const [filterVarstaMax, setFilterVarstaMax] = useState('');
linia 41: const [filterGradMin, setFilterGradMin] = useState('');
linia 42: const [filterGradMax, setFilterGradMax] = useState('');
```

**useMemo de eliminat (2):**
```
liniile 44–58: categoriiVizibile (logica de filtrare inline)
liniile 60–67: nrFiltreActive
```

**Funcții de eliminat (2):**
```
liniile 69–75: toggleGen
liniile 77–84: resetFiltre
```

**Bloc JSX de eliminat (liniile 133–237):**
Întreg blocul `{/* Panou filtre */}` — buton toggle + panou collapsibil cu gen/probă/vârstă/grad. Înlocuit cu `<CompetitieFilterBar ... />`.

**Ce rămâne din filteredInscrieri/filteredEchipe:**
Liniile 88–96 folosesc `categoriiVizibile` — aceasta se recalculează bazat pe filtrele din hook. Semnătura useMemo se schimbă: în loc de 6 useState-uri locale, primește `filtre: CompetitieFiltre` din props.

**ATENȚIE — diferență semantică grad filter:**
Filtrul local din InscrieriView folosea `Number(filterGradMin/Max)` direct (ordine ca număr din input text). `useCompetitieFilters` stochează același lucru ca string (e.g., `'3'`). Comportamentul este identic — `aplicaFiltreCategorie` face `Number(filtre.gradMin)`. Nicio schimbare de comportament.

**ATENȚIE — filtru prob în InscrieriView:**
`filterProbaId` era string UUID (id-ul probei, nu ordine). `CompetitieFiltre.probaId` este același tip. Compatibil direct.

**Schimbări de props necesare pentru `InscrieriView`:**
Se adaugă 4 props noi (din destructuring hook la nivel `CompetitieDetail`):
```typescript
filtre: CompetitieFiltre;
toggleGen: (gen: string) => void;
setFiltre: (partial: Partial<CompetitieFiltre>) => void;
resetFiltre: () => void;
nrFiltreActive: number;
```

---

### 2. `CategoriiTemplateManager.tsx` — State de înlocuit parțial

**IMPORTANT:** CategoriiTemplateManager are un sistem de filtrare propriu, mai complex, care nu este un subset al `CompetitieFiltre`. Analiza detaliată:

**State care SE ÎNLOCUIEȘTE (mapat la `CompetitieFiltre`):**
```
linia 254: const [filterGenSet, setFilterGenSet] = useState<Set<string>>(new Set());
```
→ Înlocuit cu `filtre.gen` din hook + `toggleGen`

**State care RĂMÂNE LOCAL (nu se înlocuiește):**
```
linia 253: const [filterTipProba, setFilterTipProba] = useState<string>('all');
   → Nu există în CompetitieFiltre (template folosește tip_proba string, nu proba_id UUID)
linia 255: const [filterParticipare, setFilterParticipare] = useState<...>('all');
   → Câmp absent din CompetitieFiltre
linia 256: const [filterVarsteValues, setFilterVarsteValues] = useState<Set<number>>(new Set());
   → Model diferit: valori discrete (not range min/max)
linia 257: const [search, setSearch] = useState('');
   → Search text, absent din CompetitieFiltre
linia 258: const [filtreVisible, setFiltreVisible] = useState(false);
   → filtreVisible RĂMÂNE local (D-12 Phase 6: filtreVisible e în componentă, nu hook)
```

**Funcții de eliminat:**
```
liniile 262–266: toggleFilterGen → înlocuită cu toggleGen din hook
```

**Funcții care RĂMÂN:**
```
toggleVarstaValue, setFilterTipProba, setFilterParticipare, resetFiltre (parțial modificată)
```

**`nrFiltreActive` din Template (liniile 381–386):**
Calculul actual include `filterTipProba`, `filterGenSet`, `filterParticipare`, `filterVarsteValues`, `search`. După migrare, `filterGenSet.size > 0` devine `filtre.gen.size > 0` din hook. Restul rămân locale.

**`resetFiltre` din Template (liniile 388–394):**
Se modifică: în loc de `setFilterGenSet(new Set())`, se apelează `resetFiltre()` din hook. Restul rămâne.

**Logica de filtrare `filtered` useMemo (liniile 284–296):**
`filterGenSet.has(t.gen)` devine `filtre.gen.has(t.gen)`.

**Schimbări de props necesare pentru `CategoriiTemplateManager`:**
```typescript
filtre: CompetitieFiltre;
toggleGen: (gen: string) => void;
resetFiltre: () => void;    // din hook — pentru gen
nrFiltreActive: number;     // din hook — contribuie la badge total
```

**CE NU SE SCHIMBĂ:** UI-ul existent cu `filterTipProba` tabs, `filterParticipare` pills, `filterVarsteValues` grid, `search` input — rămân neatinse. `CompetitieFilterBar` NU se montează în CategoriiTemplateManager — template-ul are filtrul de gen deja vizibil în propriul panou de filtre, nu în bara unificată.

**Decizie de design pentru TMPL-01:** Înlocuim doar `filterGenSet` cu `filtre.gen` din hook (gen este singurul câmp comun). Nu se montează `CompetitieFilterBar` ca UI separat — design-ul existent al panoului de filtre din Template rămâne intact, dar conectat la hook-ul partajat.

---

### 3. Tab Categorii în `index.tsx` — Adăugare filtre

**Locație:** `CompetitieDetail` liniile 288–454 (bloc `activeTab === 'categorii'`)

**State de eliminat:**
```
linia 64: const [selectedProbaId, setSelectedProbaId] = useState<string>('');
```
Aceasta devine `filtre.probaId` din hook. Pills-urile de probă rămân în UI, dar butonul lor apelează `setFiltre({ probaId: id })`.

**Alternativă mai curată (recomandată):** Eliminăm complet pills-urile standalone din tab Categorii (liniile 291–308) și le înlocuim cu `<CompetitieFilterBar>`. FilterBar are deja controlul de Probă built-in.

**`filteredCategorii` (liniile 117–119) — modificat:**
```typescript
// ÎNAINTE:
const filteredCategorii = selectedProbaId
  ? categorii.filter(c => c.proba_id === selectedProbaId)
  : categorii;

// DUPĂ:
const filteredCategorii = aplicaFiltreCategorie(categorii, filtre);
```

**Numărul în label tab (linia 212):**
`categorii.length` → `filteredCategorii.length` (TAB-03)

**Import necesar în `index.tsx`:**
```typescript
import { useCompetitieFilters, aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
```

---

### 4. `RaportInscrieri.tsx` — Adăugare filtre (net nou)

**Situație curentă:** Zero filtre, zero state de filtrare. Preia `inscrieri` și `echipe` și construiește un `raport` agregat per sportiv.

**Strategie de filtrare:**
Raportul agregă sportivi per categorie. Filtrul trebuie aplicat pe categorii vizibile (la fel ca în InscrieriView). Se adaugă:

```typescript
// La nivel de filteredIns și filteredEc — filtrare adițională după categorii vizibile
const categoriiVizibile = useMemo(
  () => aplicaFiltreCategorie(categorii, filtre).map(c => c.id),
  [categorii, filtre]
);
const filteredIns = inscrieri.filter(i =>
  i.status?.toLowerCase() !== 'retras' &&
  (isAdmin || i.club_id === myClubId) &&
  categoriiVizibile.includes(i.categorie_id)  // NOU
);
const filteredEc = echipe.filter(e =>
  e.status?.toLowerCase() !== 'retrasa' &&
  (isAdmin || e.club_id === myClubId) &&
  categoriiVizibile.includes(e.categorie_id)  // NOU
);
```

**Schimbări de props necesare pentru `RaportInscrieri`:**
```typescript
// Props noi adăugate la RaportInscrieriProps:
filtre: CompetitieFiltre;
toggleGen: (gen: string) => void;
setFiltre: (partial: Partial<CompetitieFiltre>) => void;
resetFiltre: () => void;
nrFiltreActive: number;
grade: Grad[];    // CompetitieFilterBar are nevoie de grade[]
```

**Import necesar în `RaportInscrieri.tsx`:**
```typescript
import { aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import type { Grad } from '../../types';
import { CompetitieFilterBar } from './CompetitieFilterBar';
```

---

## Locul de Instanțiere a Hook-ului

**Decizia: `useCompetitieFilters()` se instanțiază O SINGURĂ DATĂ în `CompetitieDetail`.**

**Raționale:**
- Filtrele sunt partajate între tab-uri (un admin poate filtra, trece pe alt tab, să vadă același set filtrat)
- INSC-03 cere reset la schimbarea tab-ului — e mai ușor dacă orchestratorul controlează resetul
- Alternativa (hook per componentă) ar crea 4 state-uri independente, niciun reset comun posibil

**Implementare în `CompetitieDetail` (liniile 47–127):**
```typescript
// Adăugat după linia 73 (expandedCats useState):
const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();

// În handleSetActiveTab (linia 79):
const handleSetActiveTab = useCallback((tab: ...) => {
  setActiveTab(tab);
  ssSet(SS_KEY_TAB, tab);
  resetFiltre();  // INSC-03: reset la schimbare tab
}, [resetFiltre]);
```

**ATENȚIE — dependency array:** `resetFiltre` e o funcție stabilă (creată în useState setter — nu se recreează). Adăugarea în `useCallback` dependencies este corectă și nu cauzează re-instanțiere infinită.

---

## Pasarea Props la Componentele de Tab

### Tab Categorii (inline în `CompetitieDetail`)
Nu este componentă separată — logica e direct în JSX-ul lui `CompetitieDetail`. Filtrele se aplică via `filteredCategorii` calculat cu `aplicaFiltreCategorie`. `CompetitieFilterBar` se randează inline deasupra tabelului.

### Tab Înscrieri → `InscrieriView`
```typescript
// index.tsx linia 495 (aproximativ):
<InscrieriView
  // ...props existente...
  filtre={filtre}
  toggleGen={toggleGen}
  setFiltre={setFiltre}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
/>
```

### Tab Raport → `RaportInscrieri`
```typescript
// index.tsx linia 516 (aproximativ):
<RaportInscrieri
  // ...props existente...
  filtre={filtre}
  toggleGen={toggleGen}
  setFiltre={setFiltre}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
  grade={grade}
/>
```

### Tab Template → `CategoriiTemplateManager`
```typescript
// index.tsx linia 611 (aproximativ):
<CategoriiTemplateManager
  // ...props existente...
  filtre={filtre}
  toggleGen={toggleGen}
  resetFiltre={resetFiltre}
  nrFiltreActive={nrFiltreActive}
/>
```

---

## Riscuri de Regresie per Tab

### Tab Categorii — Risc: MEDIU
**Risc 1:** Eliminarea `selectedProbaId` poate sparge referințe în alt cod.
- Verificat: `selectedProbaId` e folosit EXCLUSIV în `filteredCategorii` (linia 117) și în pills UI (291–308). Nicio altă referință în fișier.
- Mitigation: Înlocuire directă — `selectedProbaId` devine `filtre.probaId`.

**Risc 2:** `filteredCategorii.length` în label tab devine 0 când nu există filtre active — diferit de `categorii.length`.
- `aplicaFiltreCategorie` returnează `categorii` neschimbat când `areFiltre` este false. Deci când zero filtre active, `filteredCategorii === categorii` (aceeași referință array). Nicio schimbare vizuală.

### Tab Înscrieri — Risc: MEDIU
**Risc 1:** `categoriiVizibile` useMemo în InscrieriView returnează `null` când zero filtre (nu Set gol). Noul cod bazat pe `aplicaFiltreCategorie` returnează `categorii` întreg când zero filtre. Logica de filtrare pe inscrieri se schimbă minimal:
```typescript
// ÎNAINTE: !categoriiVizibile (null check)
// DUPĂ: categoriiVizibile e array de ids, mereu prezent
```
Se ajustează `.filter(i => categoriiVizibile.has(i.categorie_id))` la `.filter(i => !areFiltre || categoriiVizibileSet.has(i.categorie_id))`.

**Risc 2:** Filtrul de grad local din InscrieriView folosea `Number(filterGradMin)` fără garduri isNaN. Noul `aplicaFiltreCategorie` are garduri. Comportamentul este mai corect, nu mai slab.

### Tab Raport — Risc: SCĂZUT
Raportul nu are filtre existente — adăugarea e net nouă. Singurul risc e o eroare TypeScript în props noi.

### Tab Template — Risc: SCĂZUT
Înlocuim doar `filterGenSet` cu `filtre.gen`. Restul filtrelor (TipProba, Participare, Varste, Search) rămân exact neatinse. Cel mai izolat change.

---

## Patternuri de Import/Export de Urmat

### Imports necesare în `index.tsx`
```typescript
import { useCompetitieFilters, aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
```

### Imports necesare în `InscrieriView.tsx`
```typescript
import { CompetitieFilterBar } from './CompetitieFilterBar';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
```

### Imports necesare în `RaportInscrieri.tsx`
```typescript
import { CompetitieFilterBar, CompetitieFilterBarProps } from './CompetitieFilterBar';
import { aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import type { Grad } from '../../types';
```

### Imports necesare în `CategoriiTemplateManager.tsx`
```typescript
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
```
Nu se importă `CompetitieFilterBar` — template-ul nu montează bara unificată ca UI separat, ci conectează `filtre.gen` la panoul propriu de filtre.

---

## Patternuri de Filtrare în Context

### Pattern 1: Filtrare inscrieri via categorii vizibile
```typescript
// [ASSUMED] — pattern recomandat bazat pe logica existentă verificată în InscrieriView.tsx
const categoriiVizibileSet = useMemo(() => {
  const cats = aplicaFiltreCategorie(categorii, filtre);
  return new Set(cats.map(c => c.id));
}, [categorii, filtre]);

const filteredInscrieri = inscrieri
  .filter(i => i.status?.toLowerCase() !== 'retras')
  .filter(i => categoriiVizibileSet.has(i.categorie_id));
```

### Pattern 2: Montare CompetitieFilterBar
```typescript
// Toate tab-urile (Categorii, Inscrieri, Raport) urmează același pattern:
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

### Pattern 3: Resetare filtre la schimbare tab
```typescript
// În handleSetActiveTab din CompetitieDetail:
const handleSetActiveTab = useCallback((tab: TabType) => {
  setActiveTab(tab);
  ssSet(SS_KEY_TAB, tab);
  resetFiltre();  // INSC-03
}, [resetFiltre]);
```

---

## Standard Stack

Faza 7 nu adaugă nicio librărie externă nouă. [VERIFIED: project package.json] Toate dependențele sunt deja instalate.

| Artifact | Versiune | Sursă | Rol |
|----------|---------|-------|-----|
| `useCompetitieFilters` | Phase 6 | `hooks/useCompetitieFilters.ts` | Hook de stare filtre |
| `aplicaFiltreCategorie` | Phase 6 | `hooks/useCompetitieFilters.ts` | Funcție pură filtrare |
| `CompetitieFilterBar` | Phase 6 | `components/Competitii/CompetitieFilterBar.tsx` | UI componentă filtre |
| React 18 `useMemo` | 18.3.1 | deja instalat | Recalculare derivate |
| TypeScript 5.5 | 5.5.3 | deja instalat | Type checking props |

## Package Legitimacy Audit

Nu se instalează pachete noi în această fază. Secțiunea este N/A.

---

## Architecture Patterns

### Diagrama Fluxului de Date (Phase 7)

```
CompetitieDetail (index.tsx)
  │
  ├── useCompetitieFilters()
  │     └── { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive }
  │
  ├── aplicaFiltreCategorie(categorii, filtre)
  │     └── filteredCategorii[]
  │
  ├── handleSetActiveTab(tab)
  │     └── resetFiltre() ──► INSC-03
  │
  ├── [TAB: categorii]
  │     ├── <CompetitieFilterBar filtre={filtre} .../>
  │     └── filteredCategorii.map(cat => ...) ──► TAB-01/02/03
  │
  ├── [TAB: inscrieri]
  │     └── <InscrieriView
  │               filtre={filtre}
  │               toggleGen={toggleGen}
  │               ...
  │           />
  │             ├── <CompetitieFilterBar .../> ──► INSC-01
  │             └── categoriiVizibileSet → filteredInscrieri ──► INSC-02
  │
  ├── [TAB: raport]
  │     └── <RaportInscrieri
  │               filtre={filtre}
  │               grade={grade}
  │               ...
  │           />
  │             ├── <CompetitieFilterBar .../> ──► RAP-01
  │             └── aplicaFiltreCategorie → filteredIns/Ec ──► RAP-02
  │
  └── [TAB: template]
        └── <CategoriiTemplateManager
                  filtre={filtre}      // doar filtre.gen
                  toggleGen={toggleGen}
                  ...
              />
                └── filtre.gen.has(t.gen) ──► TMPL-01/02
```

### Structura Fișiere Modificate

```
components/Competitii/
├── index.tsx               # +import hook+bar, +instanțiere hook, +resetFiltre în handleSetActiveTab
│                           # +filteredCategorii via aplicaFiltreCategorie, -selectedProbaId
│                           # +<CompetitieFilterBar> în tab categorii
│                           # +props noi la InscrieriView, RaportInscrieri, CategoriiTemplateManager
├── InscrieriView.tsx       # -6 useState, -2 useMemo, -2 funcții, -bloc JSX filtre (100 linii)
│                           # +props noi (filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive)
│                           # +<CompetitieFilterBar>, +categoriiVizibileSet cu aplicaFiltreCategorie
├── RaportInscrieri.tsx     # +props noi (filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, grade)
│                           # +<CompetitieFilterBar>, +aplicaFiltreCategorie pe filteredIns/Ec
└── CategoriiTemplateManager.tsx  # -filterGenSet + toggleFilterGen
                                  # +props filtre.gen, toggleGen, resetFiltre (parțial), nrFiltreActive
                                  # filtreVisible rămâne local (D-12)
```

---

## Don't Hand-Roll

| Problemă | Nu construi | Folosește | De ce |
|----------|-------------|-----------|-------|
| Logica de filtrare gen/vârstă/grad | Logică inline repetată per tab | `aplicaFiltreCategorie` din Phase 6 | Deja testată, garduri isNaN incluse |
| UI bara de filtre | HTML/CSS custom per tab | `CompetitieFilterBar` din Phase 6 | Identic pe toate tab-urile — cerința de design |
| State filtre | useState local per tab | `useCompetitieFilters()` la nivel CompetitieDetail | Reset unificat, partajare între tab-uri |

---

## Common Pitfalls

### Pitfall 1: Instanțierea hookului în fiecare tab componentă
**Ce se poate greși:** Apelarea `useCompetitieFilters()` în `InscrieriView`, `RaportInscrieri`, `CategoriiTemplateManager` separat.
**De ce se întâmplă:** Pare mai simplu, colocalizat cu componenta.
**Efectul negativ:** Fiecare tab are propriul state izolat. INSC-03 (reset la schimbare tab) devine imposibil fără lifting state. Filtrele nu se partajează dacă se dorește în viitor.
**Cum se evită:** Hook instanțiat o singură dată în `CompetitieDetail`, props pasate în jos.

### Pitfall 2: Uitarea lui `resetFiltre` în dependency array-ul lui `useCallback`
**Ce se poate greși:** `handleSetActiveTab` omite `resetFiltre` din dependencies.
**Efectul negativ:** `resetFiltre` capturat stale la prima render — resetul nu funcționează după prima schimbare de tab.
**Cum se evită:** `useCallback((tab) => { ...; resetFiltre(); }, [resetFiltre])` — `resetFiltre` e stabilă (setter din `useState`), adăugarea nu cauzează re-creare.

### Pitfall 3: Eliminarea filtrului de probă din tab Categorii fără înlocuire
**Ce se poate greși:** Ștergerea `selectedProbaId` + pills (liniile 291–308) fără a conecta `filtre.probaId` la `CompetitieFilterBar`.
**Efectul negativ:** TAB-01 fails — filtrul de probă dispare din tab Categorii.
**Cum se evită:** `CompetitieFilterBar` are deja un `<select>` pentru probă. Eliminarea pills-urilor locale este corectă NUMAI dacă `CompetitieFilterBar` e montat în schimb.

### Pitfall 4: Modificarea `nrFiltreActive` în CategoriiTemplateManager fără a include contribuția hookului
**Ce se poate greși:** Calcul local rămâne cu `filterGenSet.size > 0` în loc de `nrFiltreActive` din hook.
**Efectul negativ:** Badge-ul de filtre active arată număr greșit (nu include gen din hook).
**Cum se evită:** Calcul local `nrFiltreActive` din CategoriiTemplateManager înlocuiește `filterGenSet.size > 0` cu `nrFiltreActive > 0` (din prop), sau se face suma.

### Pitfall 5: Props interface TypeScript pentru `InscrieriViewProps` — uitarea importului tipului
**Ce se poate greși:** Adăugarea `filtre: CompetitieFiltre` în `InscrieriViewProps` fără a importa tipul.
**Efectul negativ:** Eroare TypeScript la compilare/lint.
**Cum se evită:** `import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';`

### Pitfall 6: RaportInscrieri — filteredIns/filteredEc recalculate cu categoriiVizibile în mod diferit față de InscrieriView
**Ce se poate greși:** Filtrarea în Raport pe `categoriiVizibile.includes(id)` vs `has(id)` — `includes` pe array e O(n), Set.has e O(1).
**Cum se evită:** Folosiți `new Set(aplicaFiltreCategorie(...).map(c => c.id))` + `.has()` — identic cu patternul din InscrieriView.

---

## Inventar Stare Runtime

Phase 7 nu modifică schema DB, nu adaugă coloane, nu migrează date. N/A — zero runtime state.

---

## Environment Availability

Phase 7 este cod-only (TypeScript/React). Nu există dependențe externe suplimentare.

| Dependență | Necesară pentru | Disponibilă | Versiune | Fallback |
|------------|----------------|-------------|---------|----------|
| Node.js | Build, lint | Da | (din nvmrc) | — |
| TypeScript | Verificare tipuri | Da | 5.5.3 | — |
| hooks/useCompetitieFilters.ts | Toate tab-urile | Da (creat Phase 6) | — | Nu există fallback — Phase 6 e prerequisit |
| components/Competitii/CompetitieFilterBar.tsx | Bara UI | Da (creat Phase 6) | — | Nu există fallback |

---

## Validation Architecture

Framework: TypeScript `tsc --noEmit` (script `npm run lint` din `package.json`)
Nu există test framework configurat în proiect — verificare prin compilare + inspecție manuală.

### Phase Requirements → Test Map

| ID | Comportament | Tip Test | Comandă | Fișier Existent? |
|----|-------------|----------|---------|-----------------|
| TAB-01 | Filtru probă apare în tab Categorii | Vizual | — | N/A |
| TAB-02 | Filtrele gen/vârstă/grad filtrează categorii | Vizual | — | N/A |
| TAB-03 | Counter categorii se actualizează | Vizual | — | N/A |
| INSC-01 | FilterBar vizibil în tab Înscrieri | Vizual | — | N/A |
| INSC-02 | Filtrele afectează lista de sportivi | Vizual | — | N/A |
| INSC-03 | Filtrele se resetează la schimbare tab | Vizual | — | N/A |
| RAP-01 | FilterBar vizibil în tab Raport | Vizual | — | N/A |
| RAP-02 | Filtrele afectează raportul | Vizual | — | N/A |
| TMPL-01 | filterGenSet înlocuit cu hook | Compilare | `npm run lint` | — |
| TMPL-02 | Zero regresii template | Vizual | — | N/A |

**Comandă cheie:** `npm run lint` — zero erori TypeScript = prima poartă de calitate.

**Wave 0 Gaps:** Niciun test file nou de creat — proiectul nu are framework de test configurat.

---

## Security Domain

Phase 7 nu adaugă noi suprafețe de securitate. Filtrele operează pe date deja încărcate in-memory (niciun query Supabase nou — [VERIFIED: cod sursă]). Gardurile `isNaN` din `aplicaFiltreCategorie` rămân active (moștenite din Phase 6).

| Categorie ASVS | Aplicabilă | Control |
|----------------|-----------|---------|
| V5 Input Validation | Parțial | garduri isNaN în aplicaFiltreCategorie (Phase 6) |
| V3 Session Management | Nu | — |
| V4 Access Control | Nu | filtrele sunt UI-only, nu securitate |

---

## Assumptions Log

| # | Afirmație | Secțiune | Risc dacă greșit |
|---|-----------|---------|-----------------|
| A1 | Hook instanțiat în CompetitieDetail partajează state între tab-uri fără re-mountare | Locul de Instanțiere | Dacă CompetitieDetail se re-mountează la schimbare tab (nu e cazul — e o componentă fixă), state-ul s-ar pierde. Verificat: tab-urile sunt ramuri condiționale `{activeTab === '...' && <...>}` în interiorul `CompetitieDetail` — componenta nu se demontează. |
| A2 | `resetFiltre` din useCompetitieFilters este stabilă referențial (safe în useCallback deps) | Pitfall 2 | React garantează că funcțiile returnate de useState setter sunt stabile. Totuși `resetFiltre` creează `{ ...FILTRE_INITIALE, gen: new Set() }` — aceasta e implementarea, nu un setter simplu. Este stabilă pentru că e definită ca funcție inline în hook care apelează `setFiltreState`. |
| A3 | CategoriiTemplateManager nu montează CompetitieFilterBar ca UI separat | Tab Template | Dacă echipa dorește UI unificat și în Template, decizia trebuie revizuită. Research-ul recomandă abordarea minimă (doar gen) bazată pe TMPL-02 (zero regresii). |

**Dacă tabelul de mai sus este gol:** Toate afirmațiile sunt verificate din cod sursă. Nu este cazul — există 3 asumpții documentate.

---

## Open Questions

1. **Filtrul de vârstă și grad în Template — se adaugă sau nu?**
   - Ce știm: TMPL-01 cere explicit înlocuirea `filterGen`, `filterVarstaMin/Max`, `filterGradMin/Max`. Dar `CategoriiTemplateManager` nu are vârstă range, ci vârste discrete.
   - Ce e neclar: TMPL-01 spune "înlocuit cu `useCompetitieFilters` + `CompetitieFilterBar`" — dar `filterVarsteValues` este un Set de valori discrete, incompatibil cu `varstaMin/varstaMax` range din hook.
   - Recomandare: Se înlocuiește NUMAI `filterGenSet` (are corespondent direct în `CompetitieFiltre.gen`). Vârstele discrete rămân locale. Aceasta satisface TMPL-02 (zero regresii). Dacă TMPL-01 cere mai mult, e nevoie de clarificare cu utilizatorul înainte de implementare.

2. **Bara FilterBar în CategoriiTemplateManager — vizibilă sau nu?**
   - Ce știm: Template-ul are deja propriul panou de filtre (toggle + gen + participare + vârste + search).
   - Ce e neclar: TMPL-01 spune "înlocuit cu CompetitieFilterBar" — asta implică și UI-ul barei sau doar logica de state?
   - Recomandare: Conectăm `filtre.gen` la panoul de filtre existent al Template-ului fără a adăuga o bară extra. UI-ul Template rămâne neatins vizual.

---

## Sources

### Primary (HIGH confidence)
- `hooks/useCompetitieFilters.ts` — citit complet, 81 linii, API verificat
- `components/Competitii/CompetitieFilterBar.tsx` — citit complet, 154 linii, props verificate
- `components/Competitii/InscrieriView.tsx` — citit complet, 427 linii, state local identificat exact
- `components/Competitii/CategoriiTemplateManager.tsx` — citit complet, 663 linii, filtre locale identificate
- `components/Competitii/RaportInscrieri.tsx` — citit complet, 149 linii, zero filtre confirmate
- `components/Competitii/index.tsx` — citit complet, 915 linii, orchestrare confirmată
- `.planning/phases/06-infrastructur-filtrare-unificat/06-01-SUMMARY.md` — decizii Phase 6 verificate

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — cerințe TAB/INSC/RAP/TMPL verificate
- `.planning/ROADMAP.md` — success criteria Phase 7 verificate

---

## Metadata

**Confidence breakdown:**
- Stat de eliminat/modificat (InscrieriView): HIGH — linii exacte identificate prin citire directă
- Strategie orchestrare (hook în CompetitieDetail): HIGH — pattern confirmat prin analiza cod
- Wiring RaportInscrieri: HIGH — zero filtre existente, adăugare clară
- Migrare parțială CategoriiTemplateManager: MEDIUM — decizia de a înlocui doar gen implică interpretare TMPL-01

**Research date:** 2026-06-08
**Valid until:** Până la modificarea `index.tsx`, `InscrieriView.tsx`, `CategoriiTemplateManager.tsx`, sau `RaportInscrieri.tsx`
