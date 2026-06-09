# Requirements: Sistem Filtrare Unificat — Competiții

**Defined:** 2026-06-04
**Core Value:** Orice admin sau instructor poate filtra rapid sportivii/categoriile după gen + vârstă + grad simultan, pe orice tab din competiție, folosind o interfață identică pretutindeni.

## v1 Requirements

### Infrastructură (Hook + Componentă)

- [ ] **INFR-01**: Hook `useCompetitieFilters` extras din codul existent — gestionează starea filtrelor (gen, vârstă min/max, grad min/max, probă) și returnează funcțiile de toggle/reset
- [ ] **INFR-02**: Componentă `CompetitieFilterBar` inline — afișează chips gen, inputs vârstă range, inputs grad range, pills probă + badge număr filtre active
- [ ] **INFR-03**: Funcție pură `aplicaFiltreCategorie(categorii, filtre)` — logica AND extrasă din tab Template, reutilizabilă pe orice tip de date

### Tab Categorii

- [ ] **TAB-01**: Filtrul de probă (pills existente) integrat în `CompetitieFilterBar` — nu dispare, devine parte din bara unificată
- [ ] **TAB-02**: Filtrele gen + vârstă + grad aplicate pe lista de categorii din tab Categorii
- [ ] **TAB-03**: Numărul de categorii afișate se actualizează live la modificarea filtrelor

### Tab Înscrieri

- [ ] **INSC-01**: `CompetitieFilterBar` afișată deasupra listei de sportivi înscriși
- [ ] **INSC-02**: Filtrele gen + vârstă + grad filtrează sportivii înscriși după datele lor (gen, data_nasterii, grad_actual_id)
- [ ] **INSC-03**: Filtrele se resetează la schimbarea tab-ului activ

### Tab Raport

- [x] **RAP-01**: `CompetitieFilterBar` afișată deasupra datelor de raport
- [x] **RAP-02**: Filtrele aplicate pe datele agregate din raport (per club/categorie)

### Tab Template (Admin)

- [ ] **TMPL-01**: Codul local de filtrare din tab Template (`filterGen`, `filterVarstaMin/Max`, `filterGradMin/Max`) înlocuit cu `useCompetitieFilters` + `CompetitieFilterBar`
- [ ] **TMPL-02**: Comportament identic cu cel existent — nicio regresia vizibilă pentru admin

## v2 Requirements

### Persistență filtre

- **PERS-01**: Filtrele active salvate în localStorage per competiție — reluate la revenire pe pagină
- **PERS-02**: Filtrele active exportate ca URL params — sharable

### Filtre avansate

- **ADV-01**: Filtru după club (pentru super admin — vizualizare cross-club)
- **ADV-02**: Filtru după status (înscris/retras/confirmat)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Wizard Înscriere (Pas2/3/4) | Wizard are logică proprie de eligibilitate — nu e filtrare vizuală |
| Tab Admin, Financiar, Cereri Interclub | Nu conțin liste de categorii/sportivi filtrabile în același sens |
| Filtrare server-side (query Supabase) | Date deja în memorie — overhead nejustificat |
| Filtre URL-persistente | v2 — complexitate nejustificată pentru uz intern curent |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 6 | Pending |
| INFR-02 | Phase 6 | Pending |
| INFR-03 | Phase 6 | Pending |
| TAB-01 | Phase 7 | Pending |
| TAB-02 | Phase 7 | Pending |
| TAB-03 | Phase 7 | Pending |
| INSC-01 | Phase 7 | Pending |
| INSC-02 | Phase 7 | Pending |
| INSC-03 | Phase 7 | Pending |
| RAP-01 | Phase 7 | Complete |
| RAP-02 | Phase 7 | Complete |
| TMPL-01 | Phase 7 | Pending |
| TMPL-02 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-04*
*Last updated: 2026-06-04 after initial definition*
