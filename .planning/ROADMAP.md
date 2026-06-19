# Roadmap: v1.1 Rapoarte & Analytics per Club

## Overview

Milestone v1.1 adaugă rapoarte analitice per club:

1. **Raport Financiar** — tabel restanțe per sportiv, filtrare interval dată, export CSV + PDF
2. **Raport Grade & Examene** — distribuție grade, promovabilitate per sesiune, eligibili next grad, istoric per sportiv

Toate datele vin din tabele existente (plati, examene, rezultate_examene, grade, sportivi). Zero migrații DB.

**Milestone anterior (v1.0):** Faze 1–8 complete. Continuare de la Phase 9.

## Phases

- [x] **Phase 9: Raport Financiar** - Tabel restanțe per sportiv cu filtrare dată și export CSV/PDF (completed 2026-06-16)
- [ ] **Phase 10: Raport Grade & Examene** - Distribuție grade, promovabilitate, eligibili, istoric per sportiv
- [ ] **Phase 11: Prezenta Refactorizata** - Calendar multi-grupă cu marcare directă, grupe simultane pe același interval, generator recurent accesibil din Grupe, rapoarte prezențe (lunar/per grupă/per interval examen)

## Phase Details

### Phase 9: Raport Financiar

**Goal**: Adminul de club poate vedea dintr-un singur ecran cine datorează bani, de cât timp, cu posibilitate de filtrare și export pentru contabilitate
**Mode**: mvp
**Depends on**: Nothing (independent from Phase 10)
**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04
**Success Criteria** (what must be TRUE):

  1. Adminul vede un tabel cu toți sportivii care au facturi neachitate: coloana Sportiv, Sumă Totală Datorată, Data Celei Mai Vechi Facturi Neachitate — sortat descrescător după sumă
  2. Două câmpuri "De la" / "Până la" filtrează tabelul pe `data_scadenta` — tabelul se actualizează live fără reload
  3. Butonul "Export CSV" descarcă un fișier `.csv` cu datele din tabelul curent (filtrele aplicate) — compatibil Excel cu separatorul `;`
  4. Butonul "Export PDF" descarcă un fișier `.pdf` cu antet conținând numele clubului și data generării, urmat de tabelul formatat (Sportiv | Sumă | Vechime)

**Plans**: 1 plan
Plans:

- [x] 09-01-PLAN.md — Tab Restanțe (tabel + filtru perioadă + export CSV/PDF) — FIN-01..FIN-04

**UI hint**: yes

### Phase 10: Raport Grade & Examene

**Goal**: Adminul de club poate analiza starea gradelor în club (distribuție, promovabilitate, cine e gata pentru next grad) și poate vedea istoricul examenelor per sportiv
**Mode**: mvp
**Depends on**: Nothing (independent from Phase 9)
**Requirements**: GRD-01, GRD-02, GRD-03, GRD-04
**Success Criteria** (what must be TRUE):

  1. Tab sau secțiune "Distribuție Grade" afișează grafic Recharts (bar sau pie) + tabel cu numărul de sportivi per grad — afișează toate gradele din nomenclator, inclusiv cele cu 0 sportivi
  2. Tab sau secțiune "Promovabilitate" afișează per fiecare sesiune de examen a clubului: dată sesiune, nr. prezenți, nr. promovați, % promovați — ordonat cronologic descrescător
  3. Tab sau secțiune "Eligibili Next Grad" afișează lista sportivilor care îndeplinesc condiția de timp minim la gradul curent — cu afișarea numelui, gradului curent și timpului petrecut la grad
  4. Selectând un sportiv din dropdown sau din lista de sportivi, adminul vede timeline-ul examenelor acelui sportiv: data, sesiunea, gradul obținut, rezultat Promovat/Respins

**Plans**: TBD
**UI hint**: yes

### Phase 11: Prezenta Refactorizata

**Goal**: Instructorul poate vedea toate grupele sale într-un singur calendar, poate marca prezența direct cu click pe zi, poate gestiona grupe cu același interval orar simultan, și poate accesa rapoarte de prezență (lunar, per grupă, per interval între examene)
**Mode**: mvp
**Depends on**: Nothing (independent)
**Requirements**: PRZ-01, PRZ-02, PRZ-03, PRZ-04, PRZ-05
**Success Criteria** (what must be TRUE):

  1. Calendarul din tab "Grupe" afișează antrenamentele tuturor grupelor instructorului simultan (nu doar o grupă la un moment dat), cu dots colorate per grupă
  2. Click pe o zi în calendar deschide direct un form de marcare prezență (nu necesită navigare prin Configurare Orar → Calendar → antrenament)
  3. Dacă 2 sau mai multe grupe au antrenament în același interval orar, sportivii din toate grupele sunt vizibili împreună și pot fi marcați într-o singură acțiune
  4. GeneratorProgramMasiv este accesibil direct din tab "Grupe" (nu doar din tab "Rapid" → DashboardPrezentaAzi)
  5. Există 3 rapoarte de prezență separate: (a) lunar — count per sportiv per lună; (b) per grupă — count per sportiv per grupă; (c) per interval examen — count per sportiv per interval [data_start → examen1] → [examen1 → examen2] → [ultimul examen → azi]; niciun raport nu afișează procente, doar numere absolute

**Plans**: 4 plans
Plans:

- [ ] 11-01-PLAN.md — useMultiCalendarView + CalendarActivitatiMultiGrupa (fundație calendar multi-grupă, dots colorate) — PRZ-01
- [ ] 11-02-PLAN.md — Cablare navigare calendar-all + click-direct + grupe simultane (FormularPrezentaMultiGrupa) + shortcut Generator — PRZ-02, PRZ-03, PRZ-04
- [ ] 11-03-PLAN.md — Rapoarte fără procente: raport lunar curățat + tab Per Grupă în RaportPrezenta — PRZ-05 (a, b)
- [ ] 11-04-PLAN.md — RaportIntervalExamen nou (count per interval examen) + rută globală — PRZ-05 (c)

**UI hint**: yes

## Progress

**Execution Order:**
Phase 9 și 10 sunt independente — pot fi executate în orice ordine. Recomandat: 9 → 10.

Phase 11 — Wave 1 (paralel): 11-01, 11-03, 11-04 (fără conflicte de fișier). Wave 2: 11-02 (depinde de 11-01, deține index.tsx).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Raport Financiar | 1/1 | Complete   | 2026-06-16 |
| 10. Raport Grade & Examene | 0/? | Not started | - |
| 11. Prezenta Refactorizata | 0/4 | Not started | - |

---

## Archive — Milestone v1.0 (complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB & Types | 1/1 | Complete | 2026-06-04 |
| 2. Navigare Grupe Drill-Down | 2/2 | Complete | 2026-06-04 |
| 3. Calendar & CRUD Antrenamente | 1/1 | Complete | 2026-06-15 |
| 4. Stagii Completare | 3/3 | Complete | 2026-06-16 |
| 5. Color Theme System | 3/3 | Complete | 2026-06-06 |
| 6. Infrastructură Filtrare | 1/1 | Complete | 2026-06-08 |
| 7. Aplicare Filtre pe Tab-uri | 4/4 | Complete | 2026-06-09 |
| 8. Button Design System | 2/2 | Complete | 2026-06-09 |
