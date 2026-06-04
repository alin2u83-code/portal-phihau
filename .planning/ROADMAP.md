# Roadmap: Sistem Filtrare Unificat — Competiții

## Overview

Extragere și unificare a două implementări de filtre inconsistente din `components/Competitii/index.tsx` (~3942 linii) într-un hook reutilizabil și o componentă shared, aplicate consistent pe 4 tab-uri: Categorii, Înscrieri, Raport și Template.

## Phases

**Phase Numbering:**
- Integer phases (1, 2): Planned milestone work
- Decimal phases: Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Infrastructure** - Extrage hook `useCompetitieFilters` + creează `CompetitieFilterBar` shared
- [ ] **Phase 2: Integration** - Aplică filtrele pe tab Categorii, Înscrieri, Raport și refactorizează tab Template

## Phase Details

### Phase 1: Infrastructure
**Goal**: Primitiva de filtrare există ca cod independent — hook + componentă + funcție pură gata de consum
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. `useCompetitieFilters` returnează starea (gen, vârstă min/max, grad min/max, probă) și funcțiile toggle/reset fără a depinde de vreun tab specific
  2. `CompetitieFilterBar` se poate randa standalone cu props minimale și afișează chips gen, inputs vârstă/grad și pills probă + badge filtre active
  3. `aplicaFiltreCategorie(categorii, filtre)` returnează subset corect pentru orice combinație AND de filtre, fără efecte de bord
**Plans**: TBD
**UI hint**: yes

### Phase 2: Integration
**Goal**: Toți utilizatorii care deschid tab Categorii, Înscrieri sau Raport văd bara de filtre unificate; tab Template admin funcționează identic cu înainte dar folosind codul shared
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: TAB-01, TAB-02, TAB-03, INSC-01, INSC-02, INSC-03, RAP-01, RAP-02, TMPL-01, TMPL-02
**Success Criteria** (what must be TRUE):
  1. Pe tab Categorii, pills-urile de probă existente sunt parte din `CompetitieFilterBar` și filtrele gen + vârstă + grad filtrează lista de categorii; contorul de categorii se actualizează live
  2. Pe tab Înscrieri, `CompetitieFilterBar` apare deasupra listei și filtrele aplică pe gen/data_nasterii/grad_actual_id ale sportivilor înscriși; filtrele se resetează la schimbarea tab-ului
  3. Pe tab Raport, `CompetitieFilterBar` apare deasupra și filtrele aplică pe datele agregate
  4. Pe tab Template, adminul vede exact același comportament de filtrare ca înainte, fără regresii vizibile, dar codul local `filterGen`/`filterVarstaMin/Max`/`filterGradMin/Max` a fost eliminat în favoarea shared hook
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 0/? | Not started | - |
| 2. Integration | 0/? | Not started | - |
