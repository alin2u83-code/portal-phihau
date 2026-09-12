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

- [x] 14-01-PLAN.md — Fundație: migrație data_start_facturare + usePrezenteLuna + useDataStartFacturare + utils luniLipsa + facturaService — PLF-01, PLF-02, PLF-03, PLF-05
- [x] 14-02-PLAN.md — Prezențe în factură (PlatiScadente inline + modal FinanciarTab) + restricție ștergere — PLF-01, PLF-04
- [x] 14-03-PLAN.md — Generare factură manual (calendar picker, fără duplicate) + restricție ștergere — PLF-02, PLF-04
- [x] 14-04-PLAN.md — Wizard luni lipsă bulk + tab Luni Lipsă în RaportFinanciar + badge profil — PLF-03, PLF-05

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
| 14. Corelare Prezențe-Facturi | 4/4 | Complete   | 2026-06-24 |

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

### Phase 15: Fix RLS izolare cross-club pe tabele financiare (alocari_plati, tranzactie_plata, incasari_efective, obligatii_plata, aplicare_reduceri, detalii_decont, sesiune_activitate, staging_inscrieri)

**Goal:** Elimina scurgerea de date financiare intre cluburi: un ADMIN_CLUB/INSTRUCTOR nu mai poate citi sau scrie randuri (tranzactii, incasari, obligatii, alocari, reduceri, deconturi, sesiuni activitate, staging) apartinand altui club, iar SUPER_ADMIN_FEDERATIE pastreaza accesul cross-club legitim
**Mode**: standard
**Requirements**: SEC-01, SEC-02
**Depends on:** Phase 14
**Success Criteria** (what must be TRUE):

  1. Cele 8 politici `club_member_access` (alocari_plati, tranzactie_plata, incasari_efective, obligatii_plata, aplicare_reduceri, detalii_decont, sesiune_activitate, staging_inscrieri) verifica apartenenta randului la clubul activ (`club_id = public.get_active_club_id()` sau echivalent prin FK), nu doar existenta unui club activ
  2. Un ADMIN_CLUB in contextul clubului A nu returneaza niciun rand apartinand altui club B pe niciuna din cele 8 tabele; accesul legitim in propriul club ramane intact
  3. SUPER_ADMIN_FEDERATIE pastreaza accesul cross-club pe toate cele 8 tabele
  4. Migratia noua este aplicata pe DB live (nu doar scrisa local)

**Plans:** 1/1 plans complete

Plans:

- [x] 15-01-PLAN.md — Inspectie schema live + migratie 8 politici RLS per-club + aplicare live + verificare izolare — SEC-01, SEC-02

### Phase 16: Elimina politici RLS USING(true) ramase (rezultate, facturi_federale, note_examene, etc) si restrictioneaza public.users

**Goal:** Ultimele politici RLS periculoase de tip USING(true) ramase pe DB live sunt eliminate: public.users nu mai expune email-urile tuturor userilor, knowledge_base nu mai poate fi vandalizat de orice user autentificat, iar datele GDPR medicale din fisa_inscriere sunt izolate pe clubul propriu (nu mai sunt vizibile/editabile cross-club de orice ADMIN_CLUB).
**Requirements**: SEC-03, SEC-04, SEC-05
**Depends on:** Phase 15
**Plans:** 1/1 plans complete

Plans:

- [x] 16-01-PLAN.md — Fix RLS USING(true): users (SELECT scoped propriul rand), knowledge_base (scriere doar super-admin), fisa_inscriere (izolare cross-club GDPR via practicant_id -> sportivi.club_id)

### Phase 17: Verifica aplicare live migratie deduplicare sportivi si decide MFA obligatoriu vs opțional

**Goal:** Comentariul stale din migratia de deduplicare (care afirma fals ca nu e aplicata live) este corectat dupa verificare reproductibila, iar MFA (TOTP) devine obligatoriu si blocat imediat pentru rolurile privilegiate ADMIN_CLUB + SUPER_ADMIN_FEDERATIE (INSTRUCTOR/SPORTIV raman voluntari), cu render-gate real fara flash de continut protejat si o plasa de siguranta anti-lockout la rollout
**Requirements**: DEDUP-VERIFY-01, MFA-01, MFA-02, MFA-03
**Depends on:** Phase 16
**Plans:** 3 plans

Plans:

- [ ] 17-01-PLAN.md — Verifica live functiile dedup (pg_get_functiondef) + corecteaza antetul stale al fisierului SQL — DEDUP-VERIFY-01
- [ ] 17-02-PLAN.md — MFA cod: SetupMFAPage TOTP + useMFAGuard scoped 2 roluri + render-gate App.tsx — MFA-01, MFA-02
- [ ] 17-03-PLAN.md — Rollout safety: script audit acoperire MFA (service-role) + checkpoint verificare end-to-end — MFA-03

### Phase 18: Fix suprascriere silentioasa grad in istoric_grade (sportivService) si unifica sursa de adevar grad_actual_id (elimina dual-write manual vs trigger)

**Goal:** `sportivi.grad_actual_id` devine strict derivat din `istoric_grade` printr-un singur trigger canonic (MAX(ordine), recalcul si pe DELETE), iar frontend-ul nu mai scrie niciodata direct acest camp - data reala a examenului nu mai poate fi inlocuita cu data rularii.
**Requirements**: D-01..D-10 (decizii CONTEXT.md; faza de backlog din auditul 2026-07-06, fara ID-uri REQ formale)
**Depends on:** Phase 17
**Plans:** 4 plans (3 valuri)

Plans:

- [x] 18-01-PLAN.md - Consolidare trigger-e DB intr-unul canonic (`sync_grad_actual_canonical`) + migratie versionata + audit D-10 - D-01, D-02, D-05..D-10 [val 1, necesita Supabase MCP inline]
- [x] 18-02-PLAN.md - ManagementInscrieri.tsx: elimina 3 scrieri directe + corecteaza `desyncedInscrieri`/`handleForceSync` - D-03, D-04, D-09 [val 2]
- [x] 18-03-PLAN.md - useExamManager.ts, RapoarteExamen.tsx, ImportExamenModal.tsx (ordine inversata) + comentarii UserProfile.tsx - D-03, D-04, D-09 [val 2]
- [ ] 18-04-PLAN.md - Poarta de iesire: gate repo-wide zero dual-write + verificare live end-to-end pe flux real - D-01..D-04, D-07, D-10 [val 3, necesita Supabase MCP inline]

### Phase 19: Elimina ignoreDuplicates silentios pe upsert istoric_grade (8 locuri) si adauga rollback plati/tranzactii in GestiuneFacturi

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 18
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 19 to break down)

### Phase 20: Fix club_id lipsa in useAttendance si aliniaza retragere individuala competitie (DELETE) cu retragere echipa (UPDATE status)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 19
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 20 to break down)

### Phase 21: Fix race conditions: Pas4Sumar competitii (insert dublu wizard), login dublu-click, bucla schimbare parola obligatorie, refetch lipsa in update/delete PlatiScadente

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 20
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 21 to break down)

### Phase 22: Decizie React Query vs useDataProvider ca sursa de adevar server-state si unifica calcul sold financiar intr-un hook canonic useSoldSportiv

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 21
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 22 to break down)

### Phase 23: Sparge ManagementInscrieri.tsx (1694L) in module separate pe responsabilitate

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 22
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 23 to break down)

### Phase 24: Unifica cele 3 fisiere import Excel examene intr-un serviciu comun promoveazaSportivGrad si migreaza type=date la DateInputDMY pe fisierele cu expunere mobila

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 23
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 24 to break down)

### Phase 25: Audit izolare cross-club Prezenta, Grupe si Abonamente (RLS, hardcodari, empty states club nou)

**Goal:** Grupe, Prezenta si Abonamente sunt izolate real per club (RLS scopat pe contextul activ, fail-closed pe randuri orfane), codul deriva clubul din contextul activ, iar un club nou fara date primeste empty-state cu CTA in loc de ecran gol.
**Requirements**: MCLB-01, MCLB-02, MCLB-03, MCLB-04, MCLB-05, MCLB-06, MCLB-07, MCLB-08
**Depends on:** Nothing (PRIORITATE URGENTA — se executa inaintea fazelor 18-24, vezi STATE.md)
**Plans:** 4/4 plans executed — COMPLETE
Plans:
**Wave 1**

- [x] 25-01-PLAN.md — Audit live (pg_policies + date reale), raspuns la cele 3 Open Questions, scrierea migratiei RLS (wave 1)
- [x] 25-02-PLAN.md — Componenta EmptyState in ui.tsx + aplicare pe Grupe, Prezenta si Tipuri Abonament (wave 1)
- [x] 25-03-PLAN.md — Audit + fix derivare club din contextul activ in Prezenta, GrupaFormModal, PlatiScadente (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 25-04-PLAN.md — [BLOCKING] Aplicare live via MCP apply_migration + test automat izolare cross-club + verificare UI (wave 2)

### Phase 26: Wizard onboarding club nou ghidat de SUPER_ADMIN (club + prim admin + rol intr-un singur flux)

**Goal:** SUPER_ADMIN_FEDERATIE creeaza un club nou impreuna cu primul lui administrator (cont + rol ADMIN_CLUB legat de clubul nou) intr-un singur submit, cu parola temporara generata automat si afisata pe ecran pentru transmitere manuala.
**Requirements**: TBD (faza derivata din decizii D-01..D-07 in 26-CONTEXT.md, fara REQ-ID-uri formale)
**Depends on:** Phase 25
**Plans:** 3/3 plans executed — COMPLETE (UAT 12/12 pass, verificat prin cod 2026-09-02)

Plans:

**Wave 1**

- [x] 26-01-PLAN.md — Generator parola temporara criptografic aleatoare + garda de autentificare/anti-escaladare rol/scoping club pe api/creare-cont.ts + trebuie_schimbata_parola
- [x] 26-02-PLAN.md — ClubFormModal cu secțiune "Date Prim Administrator", orchestrare secventiala club->cont ADMIN_CLUB, afisare credentiale si retry fara duplicare (wave 2)

**Wave 3 (gap closure)**

- [x] 26-03-PLAN.md — Inchide CR-01 (escaladare privilegii cross-club, garda per club testata automat) + CR-02 (rollback auth.users la esec RPC, retry D-07 poate reusi) + CR-03 (Rules-of-Hooks in AppRouter) si consolideaza verificarea umana amanata in 26-UAT.md

### Phase 27: Sezoane Abonamente si Grupe - sistem sezoane cu interval date liber per club, grupe permanente sau per-sezon la alegerea instructorului, taxe legate de sezon

**Goal:** ADMIN_CLUB defineste sezoane proprii cu interval de date liber (maxim unul activ, impus de DB), fiecare grupa este marcata explicit ca permanenta sau per-sezon, grupele per-sezon se arhiveaza automat la activarea sezonului nou si pot fi dublate manual in el fara sportivi, iar tipurile de abonament se leaga de sezon astfel incat generarea facturilor sa nu mai poata cadea silentios pe pretul unui sezon arhivat.
**Requirements**: SEZ-01, SEZ-02, SEZ-03, SEZ-04, SEZ-05, SEZ-06, SEZ-07, SEZ-08, SEZ-09
**Depends on:** Phase 26
**Plans:** 5/5 plans complete

Plans:

**Wave 1**

- [x] 27-01-PLAN.md — [BLOCKING] Migratie sezoane (tabel + RLS + index unic activ/club) + ALTER grupe/tipuri_abonament + aplicare live + test izolare + contracte TS (types, useSezoane, CopyIcon) — SEZ-01..04, SEZ-06, SEZ-08

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 27-02-PLAN.md — Ecran Sezoane (CRUD + activare cu dezactivarea sezonului anterior + arhivare automata grupe per-sezon) + cablare meniu/router — SEZ-01, SEZ-02, SEZ-03, SEZ-06
- [x] 27-03-PLAN.md — Grupe: selector permanent/per-sezon, badge-uri tip/arhivare, dublare manuala in sezonul activ fara sportivi — SEZ-04, SEZ-05, SEZ-07
- [x] 27-04-PLAN.md — utils/abonamente.ts (+ test) si aplicarea regulii de sezon in PlatiScadente, GestiuneFacturi, LuniLipsaWizard, JurnalIncasari — SEZ-08, SEZ-09
- [x] 27-05-PLAN.md — TipuriAbonament: legare automata la sezonul activ, eticheta de sezon, blocarea stergerii tipurilor referite — SEZ-08, SEZ-09

**UI hint**: yes (27-UI-SPEC.md aprobat)

### Phase 28: Conformitate GDPR si AI Act pentru date personale sportivi si modul AI Assistant

**Goal:** Portalul are documentatia de conformitate GDPR/AI Act (registru prelucrari, DPIA, subprocesatori, retentie), consimtamant digital al parintelui pentru minorii sub 16 ani, zero date de identificare trimise catre furnizorul LLM extern, si un mecanism digital prin care persoana vizata isi exercita drepturile (cerere export/stergere cu coada de aprobare ADMIN_CLUB).
**Requirements**: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9 (definite in 28-SPEC.md)
**Depends on:** Phase 27
**Plans:** 5/5 plans complete

Plans:

- [x] 28-01-PLAN.md — Migratie live: coloane consimtamant parinte pe sportivi + tabel cereri_gdpr cu RLS scopat pe club, trigger de audit si functii SECURITY DEFINER — REQ-5, REQ-9
- [x] 28-02-PLAN.md — Minimizare userName in tot lantul services/agents (9 agenti + AgentContext + AIAssistantContext) + DPIA AI Assistant + lista subprocesatori (inclusiv Groq) — REQ-2, REQ-3, REQ-6
- [x] 28-03-PLAN.md — Registru evidenta prelucrari (art. 30) + politica de retentie cu termene numerice — REQ-1, REQ-7
- [x] 28-04-PLAN.md — Consimtamant parinte minori sub 16 (tipuri, gate de validare, camp conditional, persistenta pe calea de creare) + nota de informare GDPR la sportiv nou — REQ-4, REQ-5
- [x] 28-05-PLAN.md — Pagina Protectia datelor (toate rolurile) + coada admin Cereri GDPR + cablare view-uri in LazyComponents/AppRouter/menuConfig — REQ-8, REQ-9

### Phase 29: Taxa Anuala Federatie FRQKD - activare automata club->federatie la participarea sportivului la examen/stagiu/competitie in sezonul curent. Spec: docs/superpowers/specs/2026-09-12-taxa-anuala-federatie-design.md

**Goal:** Prima participare a unui sportiv la examen de grad, stagiu sau competitie intr-un sezon (an fiscal federatie, 1 sept - 31 aug) activeaza automat taxa FRQKD — factura sportiv->club plus obligatie club->federatie, exact o data per sportiv per sezon — cu pret configurabil de federatie, confirmare de plata pe metoda aleasa si istoricul 2025-2026 adus in noul model.
**Requirements**: [TAF-01, TAF-02, TAF-03, TAF-04, TAF-05, TAF-06, TAF-07, TAF-08]
**Depends on:** Phase 28
**Plans:** 4 plans (3 valuri)

Plans:

- [ ] 29-01-PLAN.md — Audit schema live + ALTER deconturi_federatie, constrangeri de unicitate, tabela taxa_anuala_config cu RLS, backfill 37 facturi FRQKD 2025-2026 (val 1)
- [ ] 29-02-PLAN.md — Functia activeaza_taxa_anuala (SECURITY DEFINER) + 4 triggere AFTER INSERT + suita de test tranzactionala (val 2)
- [ ] 29-03-PLAN.md — utils/anFiscal.ts, tipuri aliniate la schema, taxa_anuala_config in starea aplicatiei, FederationInvoices cu lista automata si metoda de plata (val 2)
- [ ] 29-04-PLAN.md — Tab "Taxa Federatie (FRQKD)" in Taxe Anuale: CRUD pret sezon + avertisment sezon neconfigurat (val 3)

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
