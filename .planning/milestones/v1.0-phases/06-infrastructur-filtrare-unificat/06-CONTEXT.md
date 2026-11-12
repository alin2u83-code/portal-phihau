# Phase 6: Infrastructură Filtrare Unificată - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Creează infrastructura de filtrare reutilizabilă: hook `useCompetitieFilters` + componentă `CompetitieFilterBar` + funcție pură `aplicaFiltreCategorie`. Aceste artefacte sunt baza pe care Phase 7 le aplică pe tab-uri (Categorii, Înscrieri, Raport, Template). Phase 6 nu modifică niciun tab existent — doar produce și exportă codul shared.

</domain>

<decisions>
## Implementation Decisions

### Hook API — useCompetitieFilters

- **D-01:** Hook returnează obiect grupat: `{ filtre: CompetitieFiltre, toggleGen: (gen: string) => void, setFiltre: (partial: Partial<CompetitieFiltre>) => void, resetFiltre: () => void, nrFiltreActive: number }`
- **D-02:** `CompetitieFiltre` interface: `{ gen: Set<string>, probaId: string, varstaMin: string, varstaMax: string, gradMin: string, gradMax: string }` — string pentru inputs numerice (nu number) pentru a evita conversii forțate în input fields
- **D-03:** `toggleGen(gen)` separat de `setFiltre` deoarece operează pe Set (adăugare/ștergere) — pattern diferit față de set simplu
- **D-04:** `setFiltre(partial)` actualizează orice câmp prin spread: `prev => ({ ...prev, ...partial })`
- **D-05:** `resetFiltre()` resetează toate câmpurile la valori inițiale (gen=new Set(), probaId='', varstaMin='', etc.)

### Funcție pură aplicaFiltreCategorie

- **D-06:** Exportată din `hooks/useCompetitieFilters.ts` alături de hook — un singur import pentru consumatori
- **D-07:** Semnătură: `aplicaFiltreCategorie(categorii: CategorieCompetitie[], filtre: CompetitieFiltre): CategorieCompetitie[]` — funcție pură, fără side effects
- **D-08:** Logica AND copiată din `InscrieriView.tsx:48-56` — identică cu implementarea testată în producție

### Componentă CompetitieFilterBar

- **D-09:** Vizibilitate collapsibilă — buton "Filtre (N)" toggle-ează panoul expand/collapse. Badge cu număr filtre active vizibil chiar și când e colapsat
- **D-10:** Grad filter: dropdown-uri cu nume grade (nu inputs numerice) — FilterBar primește `grade: Grad[]` ca prop și mapează `grad_min_ordine`/`grad_max_ordine` la nume vizibil
- **D-11:** Props directe (zero context nou): `filtre: CompetitieFiltre` + `toggleGen` + `setFiltre` + `resetFiltre` + `nrFiltreActive` + `probe: ProbaCompetitie[]` + `grade: Grad[]`
- **D-12:** Componentă zero state propriu — toate valorile vin din hook via props. FilterBar = UI pur, hook = logica de stare

### Fișiere produse

- **D-13:** `hooks/useCompetitieFilters.ts` — hook + interfețe + `aplicaFiltreCategorie`
- **D-14:** `components/Competitii/CompetitieFilterBar.tsx` — componentă UI collapsibilă

### Claude's Discretion

- Structura exactă a UI-ului dropdown grad (native `<select>` vs custom pills) — plannerul alege bazat pe patternul existent în `ui.tsx`
- Valoarea inițială pentru `filtreVisible` (expanded/collapsed la mount) — plannerul decide (probabil colapsat = false)
- Ordinea vizuală a controalelor în FilterBar (gen → probă → vârstă → grad sau altă ordine) — plannerul decide din perspectivă UX

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Cod sursă cu logica de filtrare existentă (extractie directă)
- `components/Competitii/InscrieriView.tsx` liniile 36-84 — state filtre, toggleGen, resetFiltre, nrFiltreActive, logica filtrare categorii (D-02, D-03, D-05, D-08)
- `components/Competitii/CategoriiTemplateManager.tsx` liniile 253-296 — implementare alternativă (filterGenSet, filterVarsteValues discret) — ATENȚIE: folosește alt model (Set de valori nu range), nu copiat direct

### Tipuri relevante
- `types.ts` — `CategorieCompetitie` (câmpurile `gen`, `varsta_min`, `varsta_max`, `grad_min_ordine`, `grad_max_ordine`), `ProbaCompetitie`, `Grad` (câmpul `ordine` pentru mapare)

### Design system
- `components/ui.tsx` — Button, Card, design tokens existente — FilterBar trebuie să folosească clasele Tailwind și componentele din ui.tsx

### Requirements
- `.planning/REQUIREMENTS.md` §Infrastructură — INFR-01, INFR-02, INFR-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InscrieriView.tsx:37-84`: State complet de filtrare + funcții deja implementate — codul din hook este extras aproape 1:1 din această sursă
- `InscrieriView.tsx:60-67`: `nrFiltreActive` useMemo — același calcul merge în hook
- `components/ui.tsx`: Button, Card, clasele Tailwind brand-primary — FilterBar va reutiliza aceleași stiluri ca pills-urile existente din InscrieriView

### Established Patterns
- Filtrele gen folosesc `Set<string>` cu `has()` check — nu array cu `includes()` (performanță + imutabilitate)
- Inputs vârstă/grad sunt `string` nu `number` în state (React input value must be string)
- Badge filtre active: pattern deja stabilit în CategoriiTemplateManager.tsx:462 (`bg-brand-primary text-white rounded-full px-1.5`)

### Integration Points
- Hook și componentă sunt consumate de fiecare tab în Phase 7; nu modifică nimic în Phase 6
- `aplicaFiltreCategorie` va fi importată în `index.tsx` (tab Categorii) și `RaportInscrieri.tsx` în Phase 7
- `InscrieriView.tsx` va înlocui state-ul local cu `useCompetitieFilters` în Phase 7

</code_context>

<specifics>
## Specific Ideas

- FilterBar trebuie să arate identic cu panoul de filtre din `InscrieriView.tsx` — toggle buton + panou inline sub el, nu modal sau overlay
- Badge badge filtre active în buton-ul toggle: "Filtre (2)" când 2 filtre active, "Filtre" când zero
- Grade dropdown: nu inputs numerice `gradMin/gradMax` — user vede "Galben 1" nu "ordine: 3". Dropdown select cu opțiunile din `grade[]` prop sortate după ordine

</specifics>

<deferred>
## Deferred Ideas

- Persistență filtre în localStorage per competiție — v2 (PERS-01, PERS-02 din REQUIREMENTS.md)
- Filtru după club pentru super admin — v2 (ADV-01)
- Filtru după status înscris/retras — v2 (ADV-02)

</deferred>

---

*Phase: 6-infrastructur-filtrare-unificat*
*Context gathered: 2026-06-08*
