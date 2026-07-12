# Quick Task 260709-kr1: SearchableSelect pentru filtre lună/an Gestiune Sesiuni Examen și alte filtre listă lungă - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Task Boundary

În Gestiune Sesiuni Examen (`components/GestiuneExamene/index.tsx`), filtrele "De la — Lună", "De la — An", "Până la — Lună", "Până la — An" sunt `<select>` native. Se cere adăugarea sistemului de scriere combinat cu listă (search + select) la aceste filtre — componenta **`SearchableSelect`** din `components/ui.tsx` (deja existentă, deja folosită în `components/Competitii/CategoriiTemplateManager.tsx`, `CategorieForm.tsx`, `BulkCategoryWizard.tsx`, `CategoryWizard.tsx`).

Suplimentar, s-a făcut un audit al altor filtre din aplicație cu liste lungi (dropdown-uri native cu multe opțiuni) care sunt candidate bune pentru aceeași conversie.

</domain>

<decisions>
## Implementation Decisions

### Componentă de folosit
- Se refolosește `SearchableSelect` existent din `components/ui.tsx` — NU se construiește un combobox nou. Componenta are deja fallback la `<select>` nativ pe mobil (<768px).

### Gestiune Sesiuni Examen — scope exact
- Toate cele 4 select-uri: De la-Lună, De la-An, Până la-Lună, Până la-An (`components/GestiuneExamene/index.tsx` ~liniile 296-353) devin `SearchableSelect`, pentru consistență completă (nu doar An).

### Alte filtre de convertit — scope confirmat de user: "Sportivi + Rapoarte (Prezență/Plăți/Competiții)"

Candidate identificate prin audit (fișier, filtru, linie aproximativă):

**Sportivi**
- `components/Sportivi/SportiviFilter.tsx:57-69` — Grupă
- `components/Sportivi/SportiviFilter.tsx:78-85` — Grad (~20 opțiuni, sortate după `ordine`)
- `components/Sportivi/SportiviFilter.tsx:86-92` — Club (prin `ClubSelect`, până la 35 cluburi pt. federație). `ClubSelect` (ui.tsx ~712-725) e un wrapper subțire peste `<Select>` nativ — candidat de convertit el însuși sau de creat variantă `SearchableSelect`-based.
- Rol (linia 70-77) — SKIP, prea puține opțiuni (~5-8 roluri)

**Prezență**
- `components/Prezenta/RaportLunarPrezenta.tsx:363-369` — Grupă
- `components/Prezenta/RaportPrezenta.tsx:301-304` — Grupă
- `components/Prezenta/TabelPrezentaVedere.tsx:254-262` — Grupă ("Filtrează după grupă")
- `ListaPrezentaAntrenament.tsx:841-849` — "Filtru Sportiv" (~15-30 per grupă) — candidat borderline, planner decide dacă intră în scope
- Restul (An/Lună/Sală/Tip/Status) — SKIP, opțiuni fixe puține (≤12)

**Plăți**
- `components/Plati/RaportFinanciar.tsx:474-477` — Sportiv (panou filtre colapsabil, tab Încasări) — 30-300+ opțiuni, candidat puternic
- `components/Plati/RaportFinanciar.tsx:478-481` — Familie (~10-80/club)
- `components/Plati/PlatiScadente.tsx:639-645` — Club (`ClubSelect`, doar federație-admin, până la 35)
- `components/Plati/PlatiScadente.tsx:654-657` — Tip Plată (dinamic, `[...new Set(...)]`, borderline)
- Restul (Metodă plată, Lună, Status, câmpuri din formulare de creare factură/tranzacție) — SKIP/EXCLUS, sunt câmpuri de formular pt. o singură înregistrare, nu filtre de listare

**Competiții**
- `components/Competitii/CompetitieFilterBar.tsx:85-94` — Probă (~10-30 opțiuni) — PRIORITATE ÎNALTĂ, e componenta de filtrare unificată numită în CLAUDE.md
- `components/Competitii/CompetitieFilterBar.tsx:125-145` — Grad min / Grad max (pereche range, ~20 grade) — necesită atenție, e control de interval nu valoare unică
- Restul selecturilor din Competitii (StagiiCompetitii, CategoriiTemplateManager etc.) sunt câmpuri de formular de creare, nu filtre — EXCLUSE

### Excluse explicit din scope (nu sunt filtre de listare, ci câmpuri de formular pt. o singură înregistrare)
- Orice `<select>` dintr-un modal de creare/editare a unei singure entități (ex: creare factură, creare familie, creare stagiu, mutare sportiv în grupă)
- Select-uri de paginare (page size)
- Select-uri cu opțiuni fixe puține (<8 opțiuni tipic)

### Claude's Discretion
- Ordinea exactă de implementare pe fișiere/task-uri (planner grupează logic, ex: 1 task GestiuneExamene, 1 task Sportivi, 1 task Prezență+Plăți+Competiții — sau cum consideră planner mai atomic)
- Dacă `ClubSelect` devine el însuși SearchableSelect intern (schimbă toate locurile care-l folosesc) sau se creează variantă separată — planner decide, dar trebuie păstrat API-ul existent al `ClubSelect` (constraint din CLAUDE.md: nu se sparge API-ul componentelor existente)
- Tratarea perechii Grad min/max din `CompetitieFilterBar.tsx` ca range control — planner decide implementarea (două SearchableSelect independente cu validare min≤max, păstrând comportamentul curent)
- `ListaPrezentaAntrenament.tsx` "Filtru Sportiv" și `PlatiScadente.tsx` "Tip Plată" (borderline) — planner decide dacă le include

</decisions>

<specifics>
## Specific Ideas

Observație din audit: `CompetitieFilterBar` e cablat momentan doar pe tab-ul "Categorii" din `Competitii/index.tsx` (linia ~288) — nu a fost găsit refolosit pe tab-urile Înscrieri/Raport/Template. Dacă sistemul de filtrare unificat descris în CLAUDE.md trebuie să acopere toate cele 4 tab-uri, acesta e un gap separat de task-ul curent — planner poate nota ca deferred item, NU trebuie rezolvat în acest quick task (scope-ul e conversia la SearchableSelect, nu extinderea filtrului unificat la alte tab-uri).

</specifics>

<canonical_refs>
## Canonical References

- CLAUDE.md — "Project" section: sistem de filtrare unificat Competiții (context, nu scope-ul acestui task)
- `components/ui.tsx` — `SearchableSelect` (linia ~760), `ClubSelect` (linia ~712), `Select` (linia ~576)

</canonical_refs>
