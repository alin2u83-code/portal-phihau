# Requirements — v1.1 Rapoarte & Analytics per Club

**Defined:** 2026-06-16
**Core Value:** Fiecare admin de club poate vedea dintr-un singur loc situația financiară (cine datorează ce și de când) și situația gradelor (cine e eligibil pentru examen, cât de bine promovează), cu export pentru contabilitate și raportare.

## Milestone v1.1 Requirements

### Financiar

- [ ] **FIN-01**: Admin de club poate vedea tabelul restanțelor per sportiv: nume sportiv, sumă totală datorată, data celei mai vechi facturi neachitate
- [ ] **FIN-02**: Admin poate filtra restanțele pe interval dată (câmp "De la" și "Până la" — aplicate pe data_scadenta a facturilor neachitate)
- [ ] **FIN-03**: Admin poate exporta tabelul restanțelor în format CSV (compatibil Excel)
- [ ] **FIN-04**: Admin poate exporta tabelul restanțelor în format PDF (antet cu numele clubului, data generării, tabel cu coloane: sportiv, sumă, vechime)

### Grade & Examene

- [ ] **GRD-01**: Admin poate vedea distribuția gradelor actuale în club — grafic + tabel cu nr. sportivi per grad (afișează toate gradele, inclusiv cele cu 0 sportivi)
- [ ] **GRD-02**: Admin poate vedea promovabilitatea per sesiune de examen: % promovați, nr. prezenți, nr. promovați — pentru toate sesiunile clubului
- [ ] **GRD-03**: Admin poate vedea lista sportivilor eligibili pentru next grad (condiție: timp minim la gradul curent — luat din nomenclatorul de grade dacă există, altfel configurat)
- [ ] **GRD-04**: Admin poate vedea istoricul examenelor per sportiv: timeline cu grad obținut, dată examen, sesiune — selectând sportivul dintr-un dropdown sau din lista de sportivi

### Prezenta

- [ ] **PRZ-01**: Instructorul vede antrenamentele tuturor grupelor sale simultan într-un singur calendar lunar, cu dots colorate per grupă
- [ ] **PRZ-02**: Click pe o zi în calendar deschide direct form de marcare prezență (fără navigare prin Configurare Orar → Calendar → antrenament)
- [ ] **PRZ-03**: Dacă 2+ grupe au antrenament în același interval orar, sportivii tuturor grupelor sunt vizibili împreună și marcarea se face într-o singură acțiune; prezența se salvează DOAR în antrenamentul grupei principale a fiecărui sportiv
- [ ] **PRZ-04**: GeneratorProgramMasiv este accesibil direct din tab "Grupe" (nu doar din tab "Rapid")
- [ ] **PRZ-05**: Există 3 rapoarte de prezență separate cu numere absolute (fără procente): (a) lunar per sportiv per lună; (b) per grupă per sportiv; (c) per interval examen — [start→examen1]→[examen1→examen2]→[ultimul examen→azi]

### Securitate (v1.1 — hardening RLS)

- [ ] **SEC-01**: Izolare cross-club stricta pe cele 8 tabele financiare (alocari_plati, tranzactie_plata, incasari_efective, obligatii_plata, aplicare_reduceri, detalii_decont, sesiune_activitate, staging_inscrieri) — RLS restrictioneaza randurile la clubul activ (`club_id = public.get_active_club_id()` sau echivalent prin FK), nu doar la existenta unui club activ
- [ ] **SEC-02**: SUPER_ADMIN_FEDERATIE pastreaza accesul cross-club legitim pe cele 8 tabele financiare (exceptia `public.is_super_admin()` pastrata in fiecare politica)
- [ ] **SEC-03**: `public.users` — politica de SELECT nu mai expune intreg tabelul (email + tema_config) catre orice utilizator autentificat; SELECT restrictionat la propriul rand (`id = auth.uid()`) sau super-admin (`public.is_super_admin()`); politica de UPDATE existenta (`own_row_update`, scope `id = auth.uid()`) ramane neatinsa
- [ ] **SEC-04**: `public.knowledge_base` — SELECT ramane deschis tuturor utilizatorilor autentificati (continut de ajutor partajat, sensibilitate mica), dar INSERT/UPDATE/DELETE sunt restrictionate la `public.is_super_admin()` (previne vandalizarea/alterarea bazei de cunostinte AI de catre orice utilizator autentificat)
- [ ] **SEC-05**: `public.fisa_inscriere` — izolare cross-club pe date GDPR medicale/familiale; politica `Club_Admin_Examen_Access` (anterior doar verificare de rol ADMIN_CLUB, fara scoping de club) restrictioneaza randurile la sportivii propriului club activ (`practicant_id -> sportivi.club_id = public.get_active_club_id()`); exceptia super-admin ramane prin politica `Bypass_Super_Admin`

### Multi-club (Faza 25 — hardening RLS Grupe/Prezenta/Abonamente)

- [x] **MCLB-01**: `perioade_vacanta`, `participare_vacanta`, `tipuri_abonament` — elimina `USING (true)` pe SELECT si adauga scoping de club pe WRITE
- [x] **MCLB-02**: `grupe` + `evenimente` — migrate de pe `get_my_club_ids()` (non context-aware) pe helperele context-aware (`has_access_to_club`)
- [x] **MCLB-03**: `program_antrenamente` — fail-closed pe randurile orfane + backfill din `grupa_id` daca e recuperabil
- [x] **MCLB-04**: `plati` / `rbv_plati_*` + `orar_exceptii` — predicat verificat live, reparat (gap real gasit pe WRITE, fara scoping de club)
- [x] **MCLB-05**: `sesiune_activitate` — coloana `club_id` reala + backfill + RLS scopat
- [x] **MCLB-06**: Zero derivari de club din profil in locul contextului activ, in Grupe / Prezenta / Abonamente
- [x] **MCLB-07**: Empty-state cu mesaj + CTA pe ecranele principale Grupe / Prezenta / TipuriAbonament pentru club fara date
- [x] **MCLB-08**: Aplicare live + dovada de izolare cross-club (SQL + test automat + UI) pe date reale din 2 cluburi

### Sezoane (Faza 27 — sezoane per club, grupe permanente/per-sezon, taxe pe sezon)

> ID-uri derivate 1:1 din deciziile D-01..D-09 din `.planning/phases/27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-/27-CONTEXT.md`, propuse in 27-RESEARCH.md si confirmate la planificare (2026-09-02).

- [ ] **SEZ-01**: ADMIN_CLUB poate crea un sezon cu interval de date liber (`data_start`, `data_final`) per club (D-01)
- [ ] **SEZ-02**: Sezoanele sunt izolate per club prin RLS; doar ADMIN_CLUB / ADMIN / SUPER_ADMIN_FEDERATIE pot crea sau modifica sezoane (INSTRUCTOR nu) (D-02)
- [ ] **SEZ-03**: Maxim un sezon activ per club, impus la nivel de date printr-un index unic partial, nu doar in UI (D-03)
- [ ] **SEZ-04**: Fiecare grupa are flag `tip_grupa` permanent/per-sezon, editabil de instructor sau admin la creare si ulterior (D-04)
- [ ] **SEZ-05**: Grupa permanenta ramane neafectata de schimbarea sezonului, iar sportivii ei raman asignati automat (D-05)
- [ ] **SEZ-06**: Grupa per-sezon se arhiveaza automat la activarea unui sezon nou, fara stergere — ramane vizibila in istoric (D-06)
- [ ] **SEZ-07**: Adminul poate clona manual o grupa per-sezon arhivata in sezonul nou, fara copierea automata a sportivilor (D-07, D-08)
- [ ] **SEZ-08**: `tipuri_abonament` sunt legate de sezon; tipurile din sezoane arhivate raman ca istoric si nu mai sunt folosite ca fallback la generarea facturilor (D-09)
- [ ] **SEZ-09**: Facturile deja emise raman neschimbate, iar tipurile de abonament inca referite de sportivi/familii/participari la vacanta nu pot fi sterse (D-09)

### Conformitate GDPR & AI Act (Faza 28)

> ID-uri preluate 1:1 din `.planning/phases/28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s/28-SPEC.md` (9 requirements locked, ambiguity 0.16). Deciziile de implementare D-01..D-19 sunt in 28-CONTEXT.md.

- [ ] **REQ-1**: Registru evidenta prelucrari (`docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md`) — categorie date, scop, baza legala, destinatar, retentie, tabel DB, fara "TBD"
- [ ] **REQ-2**: DPIA modul AI Assistant (`docs/gdpr/DPIA-AI-ASSISTANT.md`) — citeaza fluxul real `services/agents/*` + `api/llm-proxy.ts`, nu fisierul mort `services/claudeService.ts`
- [ ] **REQ-3**: Lista subprocesatori (`docs/gdpr/SUBPROCESATORI.md`) — Supabase, Groq, Google/Gemini, Anthropic, furnizor SMS, Vercel, cu status DPA si transfer extra-UE
- [ ] **REQ-4**: Nota de informare GDPR in `SportivFormModal` la creare sportiv nou — accordion inchis implicit, sus in tabul General, cu link catre pagina "Protectia datelor"
- [ ] **REQ-5**: Consimtamant parinte digital pentru minori sub 16 ani — coloane `consimtamant_parinte_nume`/`consimtamant_parinte_data` pe `sportivi`, camp obligatoriu conditional, blocant si la editarea sportivilor existenti
- [ ] **REQ-6**: Minimizare date la furnizorul LLM — `userName` eliminat din `AgentContext`, din toate cele 9 `buildSystemPrompt()` si din `contexts/AIAssistantContext.tsx`
- [ ] **REQ-7**: Politica de retentie (`docs/gdpr/POLITICA-RETENTIE.md`) — termene numerice per categorie, 3 ani inactivitate pentru date operationale sportiv
- [ ] **REQ-8**: View nou `protectia-datelor` accesibil tuturor rolurilor autentificate, cu rezumat drepturi si formular de cerere
- [ ] **REQ-9**: Flux cerere export/stergere — tabel `cereri_gdpr` cu RLS scopat pe club, coada de aprobare ADMIN_CLUB (`cereri-gdpr`), aprobarea schimba doar statusul

### Taxa Anuala Federatie FRQKD (Faza 29 - activare automata club->federatie)

> ID-uri create la planificarea fazei 29 (feature nou, absent din requirements-urile v1.1). Deciziile de implementare D-01..D-11 sunt mapate in tabela din `29-01-PLAN.md`, derivate din `29-CONTEXT.md` si din `docs/superpowers/specs/2026-09-12-taxa-anuala-federatie-design.md`.

- [ ] **TAF-01**: `deconturi_federatie` reparata aditiv (club_id, an_fiscal, tip_activitate, nr_participanti, status_plata, metoda_plata, data_generare) cu unicitate `(club_id, an_fiscal)` (D-02)
- [ ] **TAF-02**: Tabela `taxa_anuala_config` cu `an_fiscal` unic si `suma >= 0`, scriabila doar de SUPER_ADMIN_FEDERATIE, citibila de orice utilizator autentificat, seed `(2026, 170)` (D-05)
- [ ] **TAF-03**: Backfill idempotent al celor 37 facturi FRQKD sezon 2025-2026 in `deconturi_federatie` / `vize_sportivi` / `decont_sportivi`, cu `status_plata='In asteptare'` (D-11)
- [ ] **TAF-04**: Prima participare a unui sportiv intr-un sezon la examen de grad, stagiu CVD, stagiu sau competitie activeaza automat taxa FRQKD: factura `plati` tip='FRQKD' + decont club->federatie (D-06, D-07)
- [ ] **TAF-05**: Activarea este idempotenta (o singura data per sportiv per sezon) si esueaza zgomotos, fara randuri orfane, cand pretul sezonului nu e configurat (D-07, D-08)
- [ ] **TAF-06**: Lista sportivilor acoperiti de un decont vine din `decont_sportivi`, fara selectie manuala in `FederationInvoices.tsx` (D-09)
- [ ] **TAF-07**: Confirmarea platii unui decont cere metoda (Cash / Transfer Bancar / Revolut) si persista `metoda_plata`, `status_plata='Platit'`, `confirmata_federatie=true` si dovada incarcata (D-09)
- [ ] **TAF-08**: SUPER_ADMIN_FEDERATIE seteaza si corecteaza pretul unui sezon dintr-un tab al ecranului existent Taxe Anuale, cu avertisment vizibil cand sezonul curent nu are pret (D-05, D-10)

## Future Requirements (deferred)

- Dashboard federație cu agregate multi-club (SUPER_ADMIN) — v2.0
- Raport prezență antrenamente per club/grupă — v2.0
- Notificări WhatsApp/email din interfața de raport — v2.0
- Predicții AI: sportivi cu risc abandon, recomandare sesiune examen — v3.0

## Out of Scope (v1.1)

- Migrații DB — tabele existente (plati, examene, rezultate_examene, grade, sportivi) conțin toate datele necesare
- Filtrare server-side nouă — React Query cache suficient
- Rapoarte pentru INSTRUCTOR — ADMIN_CLUB și SUPER_ADMIN only în v1.1
- Sold pozitiv / avansuri — raportul se focusează pe restanțe (status='Neachitat')

**Notă (Faza 27):** excepția "Migrații DB" de mai sus se aplică milestone-ului v1.1 original (Fazele 9-14). Faza 27 introduce deliberat o migrație nouă (tabelul `sezoane` + coloane pe `grupe`/`tipuri_abonament`), aprobată prin deciziile D-01..D-09 din 27-CONTEXT.md.

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| FIN-01 | Phase 9 | — |
| FIN-02 | Phase 9 | — |
| FIN-03 | Phase 9 | — |
| FIN-04 | Phase 9 | — |
| GRD-01 | Phase 10 | — |
| GRD-02 | Phase 10 | — |
| GRD-03 | Phase 10 | — |
| GRD-04 | Phase 10 | — |
| PRZ-01 | Phase 11 | 11-01-PLAN.md |
| PRZ-02 | Phase 11 | 11-02-PLAN.md |
| PRZ-03 | Phase 11 | 11-02-PLAN.md |
| PRZ-04 | Phase 11 | 11-02-PLAN.md |
| PRZ-05 | Phase 11 | 11-03-PLAN.md, 11-04-PLAN.md |
| SEC-01 | Phase 15 | 15-01-PLAN.md |
| SEC-02 | Phase 15 | 15-01-PLAN.md |
| SEC-03 | Phase 16 | 16-01-PLAN.md |
| SEC-04 | Phase 16 | 16-01-PLAN.md |
| SEC-05 | Phase 16 | 16-01-PLAN.md |
| MCLB-01 | Phase 25 | 25-01-PLAN.md, 25-04-PLAN.md |
| MCLB-02 | Phase 25 | 25-01-PLAN.md, 25-04-PLAN.md |
| MCLB-03 | Phase 25 | 25-01-PLAN.md, 25-04-PLAN.md |
| MCLB-04 | Phase 25 | 25-01-PLAN.md, 25-04-PLAN.md |
| MCLB-05 | Phase 25 | 25-01-PLAN.md, 25-04-PLAN.md |
| MCLB-06 | Phase 25 | 25-03-PLAN.md |
| MCLB-07 | Phase 25 | 25-02-PLAN.md |
| MCLB-08 | Phase 25 | 25-04-PLAN.md |
| SEZ-01 | Phase 27 | 27-01-PLAN.md, 27-02-PLAN.md |
| SEZ-02 | Phase 27 | 27-01-PLAN.md, 27-02-PLAN.md |
| SEZ-03 | Phase 27 | 27-01-PLAN.md, 27-02-PLAN.md |
| SEZ-04 | Phase 27 | 27-01-PLAN.md, 27-03-PLAN.md |
| SEZ-05 | Phase 27 | 27-03-PLAN.md |
| SEZ-06 | Phase 27 | 27-01-PLAN.md, 27-02-PLAN.md |
| SEZ-07 | Phase 27 | 27-03-PLAN.md |
| SEZ-08 | Phase 27 | 27-01-PLAN.md, 27-04-PLAN.md, 27-05-PLAN.md |
| SEZ-09 | Phase 27 | 27-01-PLAN.md, 27-04-PLAN.md, 27-05-PLAN.md |
| REQ-1 | Phase 28 | 28-03-PLAN.md |
| REQ-2 | Phase 28 | 28-02-PLAN.md |
| REQ-3 | Phase 28 | 28-02-PLAN.md |
| REQ-4 | Phase 28 | 28-04-PLAN.md |
| REQ-5 | Phase 28 | 28-01-PLAN.md, 28-04-PLAN.md |
| REQ-6 | Phase 28 | 28-02-PLAN.md |
| REQ-7 | Phase 28 | 28-03-PLAN.md |
| REQ-8 | Phase 28 | 28-05-PLAN.md |
| REQ-9 | Phase 28 | 28-01-PLAN.md, 28-05-PLAN.md |
| TAF-01 | Phase 29 | 29-01-PLAN.md |
| TAF-02 | Phase 29 | 29-01-PLAN.md |
| TAF-03 | Phase 29 | 29-01-PLAN.md |
| TAF-04 | Phase 29 | 29-02-PLAN.md |
| TAF-05 | Phase 29 | 29-02-PLAN.md |
| TAF-06 | Phase 29 | 29-03-PLAN.md |
| TAF-07 | Phase 29 | 29-03-PLAN.md |
| TAF-08 | Phase 29 | 29-04-PLAN.md |
