---
phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament
plan: 05
subsystem: payments
tags: [react, typescript, supabase]

requires:
  - phase: 30-02
    provides: "decideGratieReinnoire(), primaZiLunaCurenta()"
  - phase: 30-04
    provides: "numaraReinnoiriConsecutive(), calculeazaBonusLoialitate(), getPoliticiLoialitate(), schema reala aplicare_reduceri"
provides:
  - "handleGenerateSubscriptions cu gratie si loialitate aplicate efectiv pe facturi reale"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: [components/Plati/PlatiScadente.tsx]

key-decisions:
  - "Executat inline (nu prin subagent gsd-executor) — acelasi motiv ca planurile anterioare din faza 30"
  - "aplicare_reduceri nu are coloana politica_id (confirmat 30-04) — jurnalul scrie doar plata_id + valoare_calculata, FARA legatura catre politica exacta (reducere_id ar viola FK, tinteste reduceri nu politici_reducere). Deviatie documentata fata de planul original care presupunea politica_id."
  - "Test live RULAT in browser (2026-09-20), la cererea explicita a utilizatorului dupa ce initial fusese amanat: login real ADMIN_CLUB pe C.S. Phi Hau, click real 'Genereaza Abonamente'. Rezultat: functia a rulat integral pana la capat fara nicio exceptie, a identificat corect ca toti sportivii au deja factura lunii curente (niciun insert nou, deci zero risc financiar din acest rulaj), si NU a resetat data_start_facturare pentru un sportiv verificat manual (AMORARITI ALEXANDRU, ultima factura neanulata luna curenta => gap negativ => 'pastreaza', comportament corect). Zero erori noi in consola (doar 1 warning preexistent, neaferent fazei 30, despre sezon arhivat). Cazul pozitiv (reset efectiv + bonus loialitate real) tot NEtestat — clubul folosit nu avea sportivi eligibili pt reset in acel moment, iar loialitatea ramane blocata de RLS (vezi mai jos)."

patterns-established: []

requirements-completed: [ABX-04, ABX-05, ABX-06]

duration: ~40min
completed: 2026-09-20
---

# Phase 30 Plan 05: Integrare gratie + loialitate in facturarea reala

**`handleGenerateSubscriptions` cuplat efectiv cu `decideGratieReinnoire`/`calculeazaBonusLoialitate` — ambele "Bug 4 TODO" inchise, facturile primesc suma redusa real, `data_start_facturare` se reseteaza in batch, jurnal in `aplicare_reduceri`**

## Performance

- **Duration:** ~40 min
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Etapa de gratie: `pragGratie` citit din `clubs`, harta `ultimaLunaPerSportiv` din `platiProaspete`, `decideGratieReinnoire()` per sportiv, un SINGUR `update(...).in('id', idsDeResetat)` batch, invalidare cache dubla (`data-start-facturare` + `-all`)
- Etapa de loialitate: `getPoliticiLoialitate(clubId)` incarcat o data (esec = continua cu `[]`, nu blocheaza facturarea), `numaraReinnoiriConsecutive` + `calculeazaBonusLoialitate` aplicate atat in bucla de familii cat si in bucla de sportivi individuali, `suma_initiala` + `reducereDetalii` populate pe facturile cu bonus
- Ambele comentarii "Bug 4 TODO" eliminate din cod
- Jurnal `aplicare_reduceri` scris dupa insert (adaptat la schema REALA din 30-04: fara `politica_id`, doar `plata_id` + `valoare_calculata`), cu fallback neblocant (`showError` avertisment, nu `throw`) daca insertul jurnalului esueaza
- Mesajul de succes extins cu numarul de sportivi cu gratie si numarul/suma facturilor cu bonus de loialitate
- Toate garda de regresie enumerate in obiectiv (anti dublu-click, refetch proaspat, excludere retrasi, anti-duplicat, logica de credit) raman NEATINSE — verificat prin citirea codului inainte si dupa editare

## Files Created/Modified
- `components/Plati/PlatiScadente.tsx` — singurul fisier atins, conform planului

## Decizie de schema: jurnal `aplicare_reduceri` fara `politica_id`

30-04-SUMMARY a confirmat ca `aplicare_reduceri` are coloanele reale `obligatie_id` (FK→obligatii_plata), `reducere_id` (FK→**reduceri**, NU politici_reducere), `valoare_calculata`, `plata_id` (adaugat in 30-04) — **fara nicio coloana `politica_id`**. Planul 30-05 lasase decizia deschisa: "reutilizeaza reducere_id (semantic incorect) sau adauga coloana noua".

Decizie luata aici: **niciuna din cele doua.** `reducere_id` NU e populat cu id-ul politicii (ar viola FK-ul catre `reduceri`, insertul ar esua). Adaugarea unei coloane noi ar fi iesit din scope-ul declarat al planului (`files_modified` lista doar `PlatiScadente.tsx`, nicio migratie SQL). Jurnalul scrie deci DOAR `plata_id` + `valoare_calculata` — se stie EXACT ce factura a primit CAT bonus, dar nu (inca) DIN CE politica. Trasabilitatea partiala ramane suficienta pentru auditul financiar imediat (suma e vizibila si in `plati.reducereDetalii`, care contine numele politicii ca text), dar o coloana `politica_id` ar fi necesara pentru rapoarte agregate pe politica — de adaugat intr-un plan viitor daca devine nevoie.

## Decisions Made
- Reducerea se aplica INAINTE de logica de credit existenta (pret - bonus, apoi credit scade din rezultat) — conform ordinii explicite cerute de plan.
- `platiToInsert.push({...} as any)` — cast necesar pentru campurile opționale `suma_initiala`/`reducereDetalii` adaugate conditionat prin spread, desi ambele exista deja pe interfata `Plata`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Executie] Plan rulat inline in orchestrator, nu prin subagent**
- Identic cu planurile 30-01..30-04.

**2. [Rule — Schema Mismatch] Jurnal aplicare_reduceri fara politica_id**
- Vezi sectiunea dedicata de mai sus. Cauza: planul presupunea o coloana `politica_id` care nu exista in schema reala confirmata de 30-04. Adaptare minimala, fara a iesi din scope-ul de fisiere declarat.

---

**Total deviations:** 2 (1 infrastructura identica cu planurile anterioare, 1 adaptare de schema documentata explicit in plan ca posibila)
**Impact on plan:** Trasabilitate partiala pe jurnal (fara legatura la politica exacta) — acceptabil, documentat, nu blocheaza functionalitatea principala (suma redusa efectiv pe factura).

## Issues Encountered
Niciuna in plus.

## User Setup Required
Test live rulat pe cazul "negativ" (nimic de generat/resetat) — vezi Decisions Made. **Ramane netestat cazul "pozitiv"**: reset efectiv de `data_start_facturare` pe un sportiv cu pauza reala peste prag, si bonus de loialitate aplicat pe o factura reala. Pentru loialitate, testul e blocat structural de RLS (`politici_reducere` — doar SUPER_ADMIN_FEDERATIE poate scrie/citi politici azi), nu doar netestat din prudenta. Recomandare: (1) gaseste sau creeaza un sportiv cu pauza reala >30 zile intr-un club de test si ruleaza generarea din nou pentru cazul de gratie pozitiv; (2) rezolva mai intai blocker-ul RLS de la 30-04 inainte de a putea testa vreodata loialitatea end-to-end.

## Next Phase Readiness
- Planul 30-06 (activare procesare coada SMS) e independent de acest plan, poate porni fara sa astepte verificarea umana de mai sus.
- Blocker mostenit din 30-04, inca nerezolvat: RLS pe `politici_reducere` (doar SUPER_ADMIN_FEDERATIE) — pana nu se extinde, `getPoliticiLoialitate()` apelat dintr-un context ADMIN_CLUB va returna mereu `[]`, deci bonusul de loialitate ramane inactiv in productie chiar daca exista politici configurate de federatie. Decizie de business, in afara scope-ului fazei 30.

---
*Phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament*
*Completed: 2026-09-20*
