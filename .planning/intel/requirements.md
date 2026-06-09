# Intel: Requirements

Generated: 2026-06-09
Mode: merge (additive — requirements derived from DOC research, tagged as future/candidate)

---

## Active requirements (from existing .planning/REQUIREMENTS.md)

These requirements are already tracked by the active roadmap. Listed here for completeness
as the single source of truth for downstream consumers.

source: C:\Users\lungu\portal-phihau\.planning\REQUIREMENTS.md

### INFR-01 — Hook useCompetitieFilters
Source PRD: REQUIREMENTS.md (v1 / Infrastructura)
Description: Hook gestioneaza starea filtrelor (gen, varstaMin, varstaMax, gradMin, gradMax, probaId) si returneaza functii toggle/reset
Acceptance criteria: Hook exportat din hooks/useCompetitieFilters.ts, zero logica UI
Status: Pending | Phase 6

### INFR-02 — Componenta CompetitieFilterBar
Source PRD: REQUIREMENTS.md (v1 / Infrastructura)
Description: Componenta inline — chips gen, inputs varsta range, inputs grad range, pills proba + badge numar filtre active
Acceptance criteria: Componenta accepta props de la hook, zero state propriu
Status: Pending | Phase 6

### INFR-03 — Functie pura aplicaFiltreCategorie
Source PRD: REQUIREMENTS.md (v1 / Infrastructura)
Description: Logica AND extrasa din tab Template, reutilizabila pe orice tip de date
Acceptance criteria: aplicaFiltreCategorie(categorii, filtre) returneaza array filtrat
Status: Pending | Phase 6

### TAB-01 — Filtre proba integrate in CompetitieFilterBar
Source PRD: REQUIREMENTS.md (v1 / Tab Categorii)
Status: Pending | Phase 7

### TAB-02 — Filtre gen+varsta+grad pe lista categorii
Source PRD: REQUIREMENTS.md (v1 / Tab Categorii)
Status: Pending | Phase 7

### TAB-03 — Numar categorii se actualizeaza live
Source PRD: REQUIREMENTS.md (v1 / Tab Categorii)
Status: Pending | Phase 7

### INSC-01 — CompetitieFilterBar deasupra listei inscrisi
Source PRD: REQUIREMENTS.md (v1 / Tab Inscrieri)
Status: Pending | Phase 7

### INSC-02 — Filtrare sportivi inscrisi dupa gen/varsta/grad
Source PRD: REQUIREMENTS.md (v1 / Tab Inscrieri)
Status: Pending | Phase 7

### INSC-03 — Reset filtre la schimbarea tab-ului
Source PRD: REQUIREMENTS.md (v1 / Tab Inscrieri)
Status: Pending | Phase 7

### RAP-01 — CompetitieFilterBar pe tab Raport
Source PRD: REQUIREMENTS.md (v1 / Tab Raport)
Status: Complete | Phase 7

### RAP-02 — Filtre aplicate pe datele agregate din raport
Source PRD: REQUIREMENTS.md (v1 / Tab Raport)
Status: Complete | Phase 7

### TMPL-01 — Inlocuire cod local filtrare din tab Template
Source PRD: REQUIREMENTS.md (v1 / Tab Template)
Status: Pending | Phase 7

### TMPL-02 — Comportament identic cu cel existent pe Template
Source PRD: REQUIREMENTS.md (v1 / Tab Template)
Status: Pending | Phase 7

---

## Candidate future requirements (derived from DOC research — adservio-ui-research.md)

These are NOT active requirements. They are extracted from reference research as candidates
for a future feature ("Vizualizare Note si Prezenta" equivalent for portal-phihau).
They must be validated and accepted into an active PRD before routing.

source: C:\Users\lungu\portal-phihau\docs\adservio-ui-research.md

### REQ-catalog-sportiv-bloc
ID: REQ-catalog-sportiv-bloc
Description: Catalog per sportiv in format BLOC — tabel separat per tip examinare/proba, similar view-ului BLOC din Adservio (25 tabele per materie)
Acceptance criteria: Profil sportiv → tab Examene afiseaza un card-tabel per tip examinare cu note/calificative si date
Origin: Adservio — catalog per elev BLOC view; section 6 in research doc
Status in portal-phihau: Nu exista (tabel relevanta: GestiuneExamene)
Candidate phase: Future — not yet scoped

### REQ-catalog-sportiv-liniar
ID: REQ-catalog-sportiv-liniar
Description: Catalog per sportiv in format LINIAR — un singur tabel cu toate examinarile, alternativa la BLOC view
Acceptance criteria: Toggle BLOC/LINIAR in header profil sportiv → schimba layout-ul tabelului de examene/note
Origin: Adservio — catalog per elev LINIAR view, URL param `/1`; section 6 in research doc
Status in portal-phihau: Nu exista
Candidate phase: Future — not yet scoped

### REQ-notare-simultana-grup
ID: REQ-notare-simultana-grup
Description: Modal notare simultana pe grup — instructor selecteaza data + tip evaluare + nota globala sau individuala per sportiv + checkbox per sportiv → aplica dintr-o actiune
Acceptance criteria: Modal "Noteaza grupa" cu data + tip (Oral/Test/Proiect equivalent) + nota + checkbox per sportiv; buton Aplica; update batch in GestiuneExamene
Origin: Adservio — pattern "Notarea simultana pe clasa"; sections 4 and 9 in research doc
Status in portal-phihau: Partial (GestiuneExamene exista dar fara notare simultana)
Candidate phase: Future — not yet scoped

### REQ-absente-selectall-motivat
ID: REQ-absente-selectall-motivat
Description: Form absente cu selectAll checkbox + toggle motivat/nemotivat — instructor poate marca absent toata grupa sau selectie si indica daca absenta e motivata
Acceptance criteria: Checkbox selectAll bifeaza/debifeaza toti; toggle motivat salveaza flag in DB; obs textarea optional
Origin: Adservio — pattern "Absente cu selectAll"; sections 5 and 9 in research doc
Status in portal-phihau: Existent (Prezenta/index.tsx) — verificat partial
Candidate phase: Verification needed — may already be implemented

### REQ-report-card-sportiv
ID: REQ-report-card-sportiv
Description: Report card rezumat per sportiv — tabel Proba | Calificative | Activitate | Medie, similar cu Adservio report card
Acceptance criteria: Sectiune/tab in profil sportiv sau dashboard sportiv cu tabel rezumat examene si prezenta agregata
Origin: Adservio — section 7 (report card) in research doc
Status in portal-phihau: Nu exista
Candidate phase: Future — not yet scoped

### REQ-filtre-cascada-an-grupa-sportiv
ID: REQ-filtre-cascada-an-grupa-sportiv
Description: Filtre cascada an-competitional → grupa → sportiv — select-uri dependente, urmatorul activ abia dupa selectarea precedentului
Acceptance criteria: Select an → populeaza grupe → select grupa → populeaza sportivi; fiecare level disabled pana la selectia precedenta
Origin: Adservio — pattern "Filtre cascada"; section 6 and 9 in research doc
Status in portal-phihau: Partial (useSortConfig + filtre existente; lipseste cascada stricta)
Candidate phase: Future — candidate for filtrare unificata v2

### REQ-view-sportiv-parinte-same-url
ID: REQ-view-sportiv-parinte-same-url
Description: View sportiv = view parinte pe aceeasi pagina — rolul determina ce actiuni sunt vizibile, nu ce date sunt afisate
Acceptance criteria: SportivDashboard accesibil si din cont parinte — aceleasi date, actiunile de editare ascunse daca rolul nu permite
Origin: Adservio — pattern "Elev = Parinte (aceeasi pagina)"; section 8 and 9 in research doc
Status in portal-phihau: Existent (SportivDashboard) — pattern validat
Candidate phase: Already implemented — no action needed
