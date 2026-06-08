# Phase 07: Aplicare Filtre pe Tab-uri — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning
**Source:** Research + Pattern Analysis

<decisions>
## Implementation Decisions

### D-01: Hook instanțiat O SINGURĂ DATĂ în CompetitieDetail
**Status:** LOCKED
`useCompetitieFilters()` se apelează exclusiv în `CompetitieDetail` (index.tsx). Filtrele se pasează ca props în jos la toate componentele-tab: InscrieriView, RaportInscrieri, CategoriiTemplateManager. Nicio componentă de tab nu instanțiază propriul hook.

### D-02: INSC-03 — resetFiltre în handleSetActiveTab
**Status:** LOCKED
`resetFiltre()` este adăugat ca primă acțiune în `handleSetActiveTab` din index.tsx și inclus în dependency array-ul `useCallback`. Filtrele se șterg automat la orice schimbare de tab.

### D-03: TMPL-01 scope — doar filterGenSet înlocuit în CategoriiTemplateManager
**Status:** LOCKED — decizie justificată tehnic
Cerința TMPL-01 originală menționează înlocuirea tuturor filtrelor locale (filterGen, filterVarstaMin/Max, filterGradMin/Max). Această reducere de scope este autorizată din motiv tehnic:
- `CategoriiTemplateManager` folosește **vârste discrete** (`filterVarsteValues: Set<number>`) — un grid de checkboxuri cu ani specifici (ex: 8, 10, 12, 14...)
- `CompetitieFiltre` expune **range numeric** (`varstaMin: string`, `varstaMax: string`)
- Cele două modele sunt incompatibile; conversia ar distruge UX-ul existent al grid-ului
- `CompetitieFilterBar` NU se montează în Template — panoul vizual existent rămâne intact (TMPL-02)
- SINGURUL filtru înlocuit: `filterGenSet` → `filtre.gen` (corespondent direct, același tip `Set<string>`)

### D-04: RaportInscrieri primește filtre ca props externe (nu hook intern)
**Status:** LOCKED
RaportInscrieri urmează același pattern ca InscrieriView — primește toate 6 props (filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, grade) din CompetitieDetail. Nu instanțiază hook propriu. Asigură reset consistent la schimbarea tab-ului.

### D-05: Tab Categorii — pills probe înlocuite cu CompetitieFilterBar complet
**Status:** LOCKED
Blocul `{probe.length > 1 && (...)}` cu pills standalone (liniile ~291-308 din index.tsx) este înlocuit complet cu `<CompetitieFilterBar />`. Filtrul de probă intră în bara unificată — nu se pierde funcționalitate (TAB-01).

</decisions>

<canonical_refs>
## Canonical References

- `hooks/useCompetitieFilters.ts` — hook + CompetitieFiltre interface + aplicaFiltreCategorie (creat Phase 6)
- `components/Competitii/CompetitieFilterBar.tsx` — componentă prezentațională (creată Phase 6)
- `.planning/phases/06-infrastructur-filtrare-unificat/06-01-SUMMARY.md` — summary Phase 6
- `.planning/phases/07-aplicare-filtre-pe-tab-uri/07-RESEARCH.md` — analiză detaliată per componentă
- `.planning/phases/07-aplicare-filtre-pe-tab-uri/07-PATTERNS.md` — patterns exacte per fișier

</canonical_refs>

---
*Phase: 07-aplicare-filtre-pe-tab-uri*
*Context gathered: 2026-06-08*
