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
- [x] **Phase 13: Sistem Tracking Comenzi Produse** - Ciclu complet comandă echipamente: 3 fluxuri (sportiv→club→furnizor, federație→cluburi, club→federație), stări SOLICITATĂ→PREDATĂ, notificări in-app, factură automată, export PDF/Excel (completed 2026-06-23)

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

**Plans**: 4 plans
Plans:

- [ ] 14-01-PLAN.md — Fundație: migrație data_start_facturare + usePrezenteLuna + useDataStartFacturare + utils luniLipsa + facturaService — PLF-01, PLF-02, PLF-03, PLF-05
- [ ] 14-02-PLAN.md — Prezențe în factură (PlatiScadente inline + modal FinanciarTab) + restricție ștergere — PLF-01, PLF-04
- [ ] 14-03-PLAN.md — Generare factură manual (calendar picker, fără duplicate) + restricție ștergere — PLF-02, PLF-04
- [ ] 14-04-PLAN.md — Wizard luni lipsă bulk + tab Luni Lipsă în RaportFinanciar + badge profil — PLF-03, PLF-05
**UI hint**: yes

### Phase 12: Modul Produse/Echipamente

**Goal**: ADMIN_CLUB gestionează un catalog de produse sportive per club (Vo-phuc, esarfe, mănuși, tibiere etc.) cu variante pe mărime/culoare, prețuri intrare/vânzare, jurnal stoc cu intrări marfă, vânzări integrate care generează facturi în modulul Plăți, raport financiar cu profit brut. Sportivii văd catalogul și istoricul propriu de achiziții.
**Mode**: mvp
**Depends on**: Nothing (independent)
**Requirements**: PRD-01, PRD-02, PRD-03, PRD-04, PRD-05, PRD-06
**Success Criteria** (what must be TRUE):

  1. ADMIN_CLUB vede "Echipamente > Catalog Produse" în sidebar, poate adăuga/edita/șterge produse cu variante (culoare + mărime + pret_intrare + pret_vanzare + stoc_minim) — badge "Stoc redus" apare când stoc_curent < stoc_minim
  2. Admin înregistrează intrare marfă (furnizor, nr. factură, linii produs+cantitate) — stocul variantelor crește automat
  3. Admin creează vânzare (selectează sportiv + produse + cantități) → se generează Plata în modulul Plăți cu suma totală; stocul scade
  4. Sportivul vede tab "Echipamente" în dashboard: catalog produse cu prețuri de vânzare + istoricul achizițiilor proprii — fără pret_intrare
  5. Tab "Raport" în modulul Produse: tabel per produs cu cantitate vândută, venit total, cost total, profit brut, margin % — filtrare perioadă live + export Excel + PDF

**Plans**: 5 plans
Plans:

- [x] 12-01-PLAN.md — DB Schema (7 tabele) + RLS + seed 8 categorii + TypeScript types
- [x] 12-02-PLAN.md — Service CRUD + Admin Catalog UI + ProdusFormModal + integrare LazyComponents/AppRouter/menuConfig
- [x] 12-03-PLAN.md — Intrări Marfă (modal + tab + actualizare stoc)
- [x] 12-04-PLAN.md — Vânzări (VanzareModal + tab + Plata generată + SportivDashboard tab Echipamente)
- [x] 12-05-PLAN.md — Raport vânzări cu profit + export Excel/PDF

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

- [x] 11-01-PLAN.md — useMultiCalendarView + CalendarActivitatiMultiGrupa (fundație calendar multi-grupă, dots colorate) — PRZ-01
- [x] 11-02-PLAN.md — Cablare navigare calendar-all + click-direct + grupe simultane (FormularPrezentaMultiGrupa) + shortcut Generator — PRZ-02, PRZ-03, PRZ-04
- [x] 11-03-PLAN.md — Rapoarte fără procente: raport lunar curățat + tab Per Grupă în RaportPrezenta — PRZ-05 (a, b)
- [x] 11-04-PLAN.md — RaportIntervalExamen nou (count per interval examen) + rută globală — PRZ-05 (c)

**UI hint**: yes

### Phase 13: Sistem Tracking Comenzi Produse

**Goal**: ADMIN_CLUB gestionează ciclul complet al unei comenzi de echipamente: de la cererea sportivului până la predare și plată, cu 3 fluxuri (sportiv→club→furnizor, federație→cluburi top-down, club→federație agregat), vizualizare comenzi agregate, notificări in-app și export documente.
**Mode**: mvp
**Depends on**: Phase 12 (Modul Produse/Echipamente)
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, CMD-07, CMD-08, CMD-09
**Success Criteria** (what must be TRUE):

  1. O comandă are stările SOLICITATĂ → CONFIRMATĂ → PLASATĂ → SOSITĂ → PREDATĂ + PLĂTITĂ (oricând, inclusiv după predare = datorie) + ANULATĂ — ADMIN_CLUB poate avansa manual orice stare
  2. Sportivul poate plasa cerere de produse din dashboard personal (tab Echipamente); adminul vede badge notificare + lista cererilor noi
  3. Adminul vede sumar comenzi agregate per produs (cantitate totală) + detaliu expandabil cu sportivii aferenți; poate adăuga cereri noi la comanda activă (dacă nu a plecat la furnizor) sau le poate amâna
  4. Fluxul federație→cluburi: SUPER_ADMIN_FEDERATIE creează comandă cu cantități per club (top-down) — clubul primește notificare + confirmă recepția
  5. Fluxul club→federație: clubul trimite cerere la federație; federația agregă și comandă central; clubul primește produsele și distribuie sportivilor dacă e `per_sportiv`
  6. La predare: se generează factură automată în portofelul sportivului (integrare module Plăți existente); sportivii cu plată restantă primesc notificare reminder
  7. Export: PDF bon predare per sportiv + Excel cu lista produse+cantități pentru furnizor + raport lunar extins în tab Raport din ProduseManagement

**Plans**: 5 plans
Plans:

- [x] 13-01-PLAN.md — DB Schema (4 tabele noi + ALTER produse tip_produs + RLS + TypeScript types) — CMD-01, CMD-09
- [x] 13-02-PLAN.md — Service comenzi + cerere sportiv din dashboard + notificare admin + selector tip_produs — CMD-02, CMD-09
- [x] 13-03-PLAN.md — Tab Comenzi admin: agregare, mașină de stări, predare + factură automată + notificări — CMD-01, CMD-03, CMD-06
- [x] 13-04-PLAN.md — Fluxuri federație (B top-down + C bottom-up) + confirmare recepție + cele 4 notificări — CMD-04, CMD-05
- [x] 13-05-PLAN.md — Export PDF bon predare + Excel furnizor + RaportProduse extins cu date comenzi — CMD-07, CMD-08

**UI hint**: yes

## Progress

**Execution Order:**
Phase 9 și 10 sunt independente — pot fi executate în orice ordine. Recomandat: 9 → 10.

Phase 11 — Wave 1 (paralel): 11-01, 11-03, 11-04 (fără conflicte de fișier). Wave 2: 11-02 (depinde de 11-01, deține index.tsx).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Raport Financiar | 1/1 | Complete   | 2026-06-16 |
| 10. Raport Grade & Examene | 0/? | Not started | - |
| 11. Prezenta Refactorizata | 4/4 | Complete | 2026-06-19 |
| 12. Modul Produse/Echipamente | 5/5 | Complete   | 2026-06-20 |
| 13. Tracking Comenzi Produse | 5/5 | Complete   | 2026-06-23 |
| 14. Corelare Prezențe-Facturi | 0/4 | Not started | - |

### Phase 14: Corelare Prezențe-Facturi

**Goal**: ADMIN_CLUB poate vedea prezențele unui sportiv corelate cu factura lunară (număr + liste date expandabilă în modalul facturii), poate genera facturi manual pentru orice lună (trecut/viitor) și bulk pentru lunile lipsă, poate șterge facturi neplatite, și are vizibilitate completă asupra lunilor fără factură pentru sportivii activi (badge pe profil + raport centralizat).
**Mode**: mvp
**Depends on**: Phase 13
**Requirements**: PLF-01, PLF-02, PLF-03, PLF-04, PLF-05
**Success Criteria** (what must be TRUE):

  1. Modalul de detalii factură (din PlatiScadente și din profilul sportivului) afișează câmpul "Prezențe în [luna]: N ▾" — click expandează lista datelor exacte (din tabelul prezente) pentru luna facturii
  2. ADMIN_CLUB poate genera o factură lunară pentru orice lună (trecut sau viitor) selectând sportivul + luna din calendar picker — fără a duplica facturi existente
  3. ADMIN_CLUB vede wizard "Luni fără factură" care detectează automat lunile lipsă per sportiv activ (față de o dată de start configurabilă per sportiv) și permite generare bulk cu un singur click
  4. Butonul "Șterge factură" este activ doar pentru facturi cu status neplatit; pentru facturi platite, butonul e dezactivat (tooltip explicativ)
  5. Badge "X luni fără factură" apare pe profilul fiecărui sportiv activ care are luni neacoperite; secțiune/tab "Luni Lipsă" în modulul Plăți listează toți sportivii activi cu numărul de luni neacoperite

**Plans**: 4 plans
Plans:
- [ ] 14-01-PLAN.md — Fundație: migrație data_start_facturare + usePrezenteLuna + util luni lipsă + serviciu factură — PLF-01..03,05
- [ ] 14-02-PLAN.md — Prezențe în factură (PlatiScadente inline + modal FinanciarTab) + restricție ștergere — PLF-01, PLF-04
- [ ] 14-03-PLAN.md — Generare Abonament per lună (month picker, fără duplicate) + restricție ștergere — PLF-02, PLF-04
- [ ] 14-04-PLAN.md — Wizard luni lipsă + generare bulk + tab Luni Lipsă + badge profil — PLF-03, PLF-05


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
