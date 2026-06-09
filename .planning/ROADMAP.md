# Roadmap: Restructurare Modul Grupe & Stagii

## Overview

Două axe de lucru paralele:

1. **Modul Grupe** — navigare drill-down (card → detalii grupă), calendar lunar antrenamente, anulare antrenament cu motiv, adăugare antrenament one-off.

2. **Stagii** — completare flux stagii de club (nu doar federație), preț dinamic per tip stagiu, verificare factură la înregistrare, raport participanți + export.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases: Urgent insertions (marked with INSERTED)

- [x] **Phase 1: DB & Types** - Migrație `program_antrenamente` + tip preț stagiu + update Antrenament type (completed 2026-06-04)
- [ ] **Phase 2: Navigare Grupe Drill-Down** - Card → GrupaDetailView cu tab-uri Antrenamente | Orar | Sportivi
- [ ] **Phase 3: Calendar & CRUD Antrenamente** - Calendar lunar, add one-off, anulare cu motiv
- [ ] **Phase 4: Stagii Completare** - Stagii club, preț dinamic, verificare facturi, export participanți
- [ ] **Phase 5: Color Theme System** - Sistem teme CSS vars, ThemeEditor, Button follow-theme, Supabase persist
- [x] **Phase 8: Button Design System** - Extindere Button cu variante pill/ghost/outline, icoane, ConfirmButton, catalog vizual SUPER_ADMIN (completed 2026-06-09)

## Phase Details

### Phase 1: DB & Types

**Goal**: Schema DB completă pentru noile feature-uri — zero erori la runtime din cauza coloanelor lipsă
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03
**Success Criteria** (what must be TRUE):

  1. `program_antrenamente` are coloanele `status` (enum: planificat/anulat/efectuat) și `motiv_anulare` (text nullable) — migrație aplicată în Supabase
  2. `Antrenament` în types.ts are câmpurile `status` și `motiv_anulare` cu tipuri corecte
  3. Tabelul `preturi_stagii` există (sau coloana `pret` pe `tipuri_stagii`) — permite preț diferit per tip stagiu per club

**Plans**: 1 plan
Plans:

- [x] 01-01-PLAN.md — Migrații status+motiv_anulare & pret + update types.ts (DB-01, DB-02, DB-03)

**UI hint**: no

### Phase 2: Navigare Grupe Drill-Down

**Goal**: Utilizatorul poate accesa detaliile unei grupe specifice (antrenamente, orar, sportivi) dintr-un singur loc coerent
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):

  1. GrupaCard are buton/acțiune "Detalii" care deschide GrupaDetailView (componentă nouă sau modal fullscreen)
  2. GrupaDetailView afișează tab-uri: `[Antrenamente]` | `[Orar]` | `[Sportivi]` — tab activ persistent la navigare back/forward
  3. Tab Orar: conține funcționalitatea existentă din OrarEditorModal inline (fără regresii)
  4. Tab Sportivi: afișează lista sportivi din grupă + buton Adaugă Sportivi (funcționalitate existentă din AdaugaSportiviModal)

**Plans**: 2 plans
Plans:

- [x] 02-01-PLAN.md — GrupaDetailView nou: tab bar + Tab Antrenamente placeholder + Tab Orar inline + Tab Sportivi read-only (NAV-02, NAV-03)
- [ ] 02-02-PLAN.md — Wiring: buton Detalii pe GrupaCard + render condiționat în index.tsx + checkpoint vizual (NAV-01, NAV-02, NAV-03)

**UI hint**: yes

### Phase 3: Calendar & CRUD Antrenamente

**Goal**: Utilizatorul poate vedea, adăuga și anula antrenamente dintr-un calendar lunar per grupă
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04
**Success Criteria** (what must be TRUE):

  1. Tab Antrenamente din GrupaDetailView afișează calendar lunar cu antrenamentele din `program_antrenamente` — dot-uri colorate pe zile cu antrenamente (verde=planificat, roșu=anulat)
  2. Clic pe o zi din calendar expandează lista antrenamentelor zilei cu statusul vizual și acțiuni (Anulează / Șterge)
  3. Modal "Anulare Antrenament": câmp text liber "Motiv anulare" (required) → update status='anulat' + motiv_anulare în DB
  4. Buton "Adaugă Antrenament" → formular one-off: grupă (pre-filled), dată, oră start, oră sfârșit → insert în `program_antrenamente` cu `is_recurent=false`

**Plans**: TBD
**UI hint**: yes

### Phase 4: Stagii Completare

**Goal**: Stagiile de club funcționează end-to-end: creare, înscriere sportiv, factură corectă, raport exportabil
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: STG-01, STG-02, STG-03, STG-04, STG-05
**Success Criteria** (what must be TRUE):

  1. Formularul de creare stagiu permite club_id !== null (stagiu de club) — nu doar federație; switch "Eveniment de Federație" off = stagiu de club vizibil doar clubului propriu
  2. La înregistrare sportiv la stagiu, suma generată în `plati` provine din configurarea per tip stagiu (nu taxa globală fixă) — dacă nu există configurare specifică, fallback la taxa globală
  3. Plata generată la înscriere stagiu apare corect în componenta PlatiScadente (filtru tip='Taxa Stagiu', status='Neachitat')
  4. Tab/secțiune participanți stagiu afișează tabel: sportiv | data înscriere | taxă | status plată; buton Export CSV funcțional

**Plans**: 3 plans
Plans:

- [x] 04-01-PLAN.md — Migrații DB (pret_copii/pret_grade/pret_centuri pe evenimente + eveniment_id pe plati) + update types.ts (STG-02, STG-03, STG-04, STG-05)
- [x] 04-02-PLAN.md — Fix preturiConfig fetch + EvenimentForm câmpuri preț + handleAddParticipant cu calcul categorie și eveniment_id (STG-01, STG-02, STG-03, STG-05)
- [x] 04-03-PLAN.md — Tab Participanți cu tabel status plată + Export CSV (STG-04)

**UI hint**: yes

### Phase 5: Color Theme System

**Goal**: Sistemul de teme permite oricărui club să-și personalizeze culorile portalului, iar butoanele urmează tema activă — fără rebuild
**Mode**: mvp
**Depends on**: Nothing (independent feature)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**Success Criteria** (what must be TRUE):

  1. `ThemeContext` injectează 12 variabile CSS `--t-*` în `:root` la mount — tema clubului activ din Supabase, cu override per user
  2. `Button` (primary + secondary) folosește `var(--t-primary)` / `var(--t-secondary)` via style prop — culoarea se schimbă vizibil la schimbarea temei
  3. `ThemeEditor` modal cu 8 teme predefinite + tab editor custom + save cu scope `user|club` — accesibil din Sidebar footer
  4. `cluburi.tema_config` și `utilizatori.tema_config` (jsonb) există în Supabase cu RLS corect

**Plans**: 3 plans
Plans:

- [ ] 05-01-PLAN.md — ThemeConfig în types.ts + lib/themes.ts (8 teme) + index.css --t-* vars + PaletteIcon + sql/add_tema_config.sql (THEME-01, THEME-04)
- [ ] 05-02-PLAN.md — contexts/ThemeContext.tsx (fetch + applyTheme + saveTheme) + Button migration primary/secondary la CSS vars (THEME-01, THEME-02)
- [ ] 05-03-PLAN.md — ThemeEditor modal (3 taburi) + ThemeProvider în index.tsx + Sidebar footer buton + AppLayout wiring (THEME-01, THEME-02, THEME-03, THEME-04)

**UI hint**: yes

### Phase 6: Infrastructură Filtrare Unificată

**Goal**: Hook `useCompetitieFilters` și componentă `CompetitieFilterBar` create și testate — baza tehnică pentru filtrarea unificată pe toate tab-urile din modul Competiții
**Mode**: mvp
**Depends on**: Nothing (independent feature — logică extrasă din cod existent)
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):

  1. `hooks/useCompetitieFilters.ts` exportă hook cu state complet (gen, varstaMin, varstaMax, gradMin, gradMax, probaId) + funcții toggle/reset — zero logică UI
  2. `components/Competitii/CompetitieFilterBar.tsx` acceptă props de la hook și randează chips gen, inputs vârstă range, inputs grad range, pills probă + badge filtre active — zero state propriu
  3. Funcție pură `aplicaFiltreCategorie(categorii, filtre)` în hook sau utils — extrasă din CategoriiTemplateManager, returnează array filtrat

**Plans**: 1 plan
Plans:

- [x] 06-01-PLAN.md — useCompetitieFilters hook + aplicaFiltreCategorie pură + CompetitieFilterBar componentă prezentațională (INFR-01, INFR-02, INFR-03)

**UI hint**: yes

### Phase 7: Aplicare Filtre pe Tab-uri

**Goal**: Toate tab-urile principale (Categorii, Înscrieri, Raport, Template) folosesc `CompetitieFilterBar` identic — nicio regresia față de comportamentul actual
**Mode**: mvp
**Depends on**: Phase 6
**Requirements**: TAB-01, TAB-02, TAB-03, INSC-01, INSC-02, INSC-03, RAP-01, RAP-02, TMPL-01, TMPL-02
**Success Criteria** (what must be TRUE):

  1. Tab Categorii: `CompetitieFilterBar` înlocuiește pills-urile de probe standalone + adaugă gen/vârstă/grad — lista categorii se actualizează live
  2. Tab Înscrieri: `InscrieriView.tsx` folosește `useCompetitieFilters` + `CompetitieFilterBar` în loc de state local duplicat — comportament identic sau superior
  3. Tab Raport: `RaportInscrieri.tsx` primește filtre și afișează `CompetitieFilterBar` — datele de raport se filtrează consistent
  4. Tab Template: `CategoriiTemplateManager.tsx` folosește `useCompetitieFilters` + `CompetitieFilterBar` în loc de filterGenSet local — zero regresii pentru admin

**Plans**: 4 plans
Plans:

- [x] 07-01-PLAN.md — Hook instanțiere în CompetitieDetail + resetFiltre în handleSetActiveTab + CompetitieFilterBar în tab Categorii (TAB-01, TAB-02, TAB-03, INSC-03)
- [x] 07-02-PLAN.md — InscrieriView refactorizare: elimină 7 useState + bloc JSX 104 linii, adaugă props + CompetitieFilterBar (INSC-01, INSC-02, INSC-03)
- [x] 07-03-PLAN.md — RaportInscrieri: adaugă 6 props noi + CompetitieFilterBar + filtrare categorii (RAP-01, RAP-02)
- [x] 07-04-PLAN.md — CategoriiTemplateManager: înlocuiește filterGenSet cu filtre.gen din hook (TMPL-01, TMPL-02)

**UI hint**: yes

### Phase 8: Button Design System

**Goal**: Button component extins backward-compatible (pill, ghost, outline, leftIcon, rightIcon, xs/lg) + ConfirmButton + catalog vizual SUPER_ADMIN — zero regresii în componentele existente
**Mode**: mvp
**Depends on**: Phase 5 (Color Theme System — CSS vars)
**Requirements**: BTN-01, BTN-02, BTN-03, BTN-04
**Success Criteria** (what must be TRUE):

  1. `Button` din `components/ui.tsx` acceptă `pill?: boolean`, `ghost?: boolean`, `outline?: boolean`, `leftIcon?: ReactNode`, `rightIcon?: ReactNode`, `size?: 'xs' | 'sm' | 'md' | 'lg'` — API existent neschimbat, zero breaking changes
  2. `ConfirmButton` componentă nouă exportată din `components/ui.tsx`: la primul click afișează "Ești sigur? [Da] [Nu]" inline; la [Da] apelează `onConfirm`; la [Nu] revine la starea inițială
  3. `components/ButtonCatalog.tsx` pagina existentă afișată ca `activeView='button-catalog'` — vizibilă în Sidebar doar pentru `SUPER_ADMIN_FEDERATIE` — arată toate variantele × size × state (normal/hover/disabled/loading)
  4. Nicio componentă existentă din aplicație nu arată erori TypeScript sau comportament schimbat față de înainte

**Plans**: 2 plans
Plans:

- [x] 08-01-PLAN.md — Extindere Button (pill/ghost/outline/leftIcon/rightIcon/xs/lg) + ConfirmButton exportat (BTN-01, BTN-02)
- [x] 08-02-PLAN.md — ButtonCatalog.tsx + wiring types.ts/LazyComponents/AppRouter/NavMenu (BTN-03, BTN-04)

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 (depends on 2) | 4 (depends on 1, parallel cu 2-3) | 6 → 7 | 8 (independent)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB & Types | 1/1 | Complete   | 2026-06-04 |
| 2. Navigare Grupe Drill-Down | 2/2 | Complete   | 2026-06-04 |
| 3. Calendar & CRUD Antrenamente | 0/? | Not started | - |
| 4. Stagii Completare | 3/3 | Complete   | 2026-06-05 |
| 5. Color Theme System | 3/3 | Complete   | 2026-06-06 |
| 6. Infrastructură Filtrare | 1/1 | Complete   | 2026-06-08 |
| 7. Aplicare Filtre pe Tab-uri | 4/4 | Complete   | 2026-06-09 |
| 8. Button Design System | 2/2 | Complete   | 2026-06-09 |
