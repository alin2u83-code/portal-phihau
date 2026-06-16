# Roadmap: v1.1 Rapoarte & Analytics per Club

## Overview

Milestone v1.1 adaugă rapoarte analitice per club:

1. **Raport Financiar** — tabel restanțe per sportiv, filtrare interval dată, export CSV + PDF
2. **Raport Grade & Examene** — distribuție grade, promovabilitate per sesiune, eligibili next grad, istoric per sportiv

Toate datele vin din tabele existente (plati, examene, rezultate_examene, grade, sportivi). Zero migrații DB.

**Milestone anterior (v1.0):** Faze 1–8 complete. Continuare de la Phase 9.

## Phases

- [ ] **Phase 9: Raport Financiar** - Tabel restanțe per sportiv cu filtrare dată și export CSV/PDF
- [ ] **Phase 10: Raport Grade & Examene** - Distribuție grade, promovabilitate, eligibili, istoric per sportiv

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
- [ ] 09-01-PLAN.md — Tab Restanțe (tabel + filtru perioadă + export CSV/PDF) — FIN-01..FIN-04
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

## Progress

**Execution Order:**
Phase 9 și 10 sunt independente — pot fi executate în orice ordine. Recomandat: 9 → 10.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Raport Financiar | 0/? | Not started | - |
| 10. Raport Grade & Examene | 0/? | Not started | - |

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
