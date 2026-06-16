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

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| FIN-01 | — | — |
| FIN-02 | — | — |
| FIN-03 | — | — |
| FIN-04 | — | — |
| GRD-01 | — | — |
| GRD-02 | — | — |
| GRD-03 | — | — |
| GRD-04 | — | — |
