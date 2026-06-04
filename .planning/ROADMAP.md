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

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 (depends on 2) | 4 (depends on 1, parallel cu 2-3)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB & Types | 1/1 | Complete   | 2026-06-04 |
| 2. Navigare Grupe Drill-Down | 1/2 | In Progress|  |
| 3. Calendar & CRUD Antrenamente | 0/? | Not started | - |
| 4. Stagii Completare | 0/? | Not started | - |
