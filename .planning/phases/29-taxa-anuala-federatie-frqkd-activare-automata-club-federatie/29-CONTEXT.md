# Phase 29: Taxa Anuala Federatie FRQKD - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning
**Source:** Sesiune brainstorming (superpowers:brainstorming), aprobat de user

<domain>
## Phase Boundary

Cand un sportiv participa prima data intr-un sezon (an fiscal federatie
fix, 1 sept - 31 aug) la examen de grad, stagiu, sau competitie, se
activeaza automat taxa "FRQKD" catre federatie — o singura data per
sportiv per sezon. Activarea creeaza factura sportiv->club (`plati`,
tip='FRQKD') si adauga sportivul la obligatia club->federatie a
sezonului (`deconturi_federatie` + `decont_sportivi`). Include backfill
al celor 37 facturi FRQKD istorice (sezon 2025-2026) si UI de confirmare
plata cu metoda (Cash/Transfer Bancar/Revolut) + lista sportivilor
acoperiti.

Nu intra in scope: redesenarea completa a `deconturi_federatie` (se
repara, nu se recreeaza), taxele existente Taxa Examen/Taxa Stagiu/Taxa
Competitie catre CLUB (raman neschimbate — asta e taxa separata catre
FEDERATIE), UI nou de raportare/analytics pt federatie dincolo de
`FederationInvoices.tsx` extins.

</domain>

<decisions>
## Implementation Decisions

### An fiscal federatie
- Fix, independent de tabela `sezoane` (per-club, date variabile).
- Calcul: `luna(CURRENT_DATE) >= 9 ? anul_curent : anul_curent - 1`.
- Sezon "2026-2027" = `an_fiscal 2026`.

### Schema DB
- `deconturi_federatie` (ALTER, pastreaza coloanele vechi `dovada_transfer_url`/`confirmata_federatie`/`data_decont`): adauga `club_id uuid references cluburi(id)`, `an_fiscal int`, `tip_activitate text default 'FRQKD'`, `nr_participanti int default 0`, `status_plata text default 'In asteptare'` (check `In asteptare|Platit`), `metoda_plata text` (check `Cash|Transfer Bancar|Revolut`). `UNIQUE (club_id, an_fiscal)`.
- `decont_sportivi` (exista): reutilizeaza `an` = an_fiscal. Adauga `UNIQUE (sportiv_id, an)`.
- `vize_sportivi` (exista, 0 randuri live): gate central. Un rand per `(sportiv_id, an)`. Adauga `UNIQUE (sportiv_id, an)` daca lipseste.
- `taxa_anuala_config` (NOU): `id, an_fiscal int unique, suma numeric check(>=0), created_at`. RLS: INSERT/UPDATE doar SUPER_ADMIN_FEDERATIE, SELECT deschis oricui autentificat. Seed: `an_fiscal=2026, suma=170`.

### Trigger + functie
- Functie `activeaza_taxa_anuala(p_sportiv_id uuid)`, SECURITY DEFINER.
- 4 trigger-e AFTER INSERT FOR EACH ROW: `inscrieri_examene.sportiv_id`, `stagii_cvd_participare.sportiv_id`, `participare_stagiu.practicant_id`, `inscrieri_competitie.sportiv_id`.
- Logica idempotenta (vezi spec pt pseudocod SQL complet, sectiunea "Functie + trigger-e"):
  1. calcul an_fiscal
  2. `INSERT INTO vize_sportivi (...) ON CONFLICT (sportiv_id, an) DO NOTHING RETURNING id` — daca NULL, `RETURN` (no-op)
  3. altfel: ia club_id sportivului, ia suma din `taxa_anuala_config` (RAISE EXCEPTION daca lipseste — rollback complet, tranzactia sursa esueaza)
  4. INSERT `plati` (tip='FRQKD', status='Neachitat'), leaga `plata_id` in vize_sportivi
  5. get-or-create `deconturi_federatie` (club_id, an_fiscal) via ON CONFLICT DO NOTHING, apoi UPDATE incremental suma_totala/nr_participanti
  6. INSERT `decont_sportivi`
- Esec pe lipsa pret = comportament acceptat (impact global pana federatia seteaza pretul sezonului).

### UI
- `FederationInvoices.tsx`: lista sportivilor per decont vine din query pe `decont_sportivi` (nu mai e selectie manuala). `PaymentConfirmationModal` primeste camp nou "Metoda Plata" (Select: Cash/Transfer Bancar/Revolut), scrie `metoda_plata` + `status_plata='Platit'` + `confirmata_federatie=true` la confirmare.
- Ecran nou mic pt `SUPER_ADMIN_FEDERATIE`: formular an_fiscal+suma → scrie in `taxa_anuala_config`. Poate fi tab in ecranul existent de administrare federatie, nu modul separat.

### Backfill istoric (rulat o singura data, in migratia care creeaza schema)
- Cele 37 facturi `plati` (`tip='FRQKD'`, `descriere='FRQKD Sezonul 2025-2026'`) → backfill `deconturi_federatie` (an_fiscal=2025, status_plata='In asteptare' — nu exista dovada ca acest club a virat efectiv suma), `vize_sportivi` (an=2025), `decont_sportivi` (an=2025). Vezi spec sectiunea "Migrare / backfill istoric" pt SQL exact.

### Claude's Discretion
- Denumirea exacta a tabului nou din ecranul de administrare federatie.
- Structura interna a functiei SQL (nume variabile) — respecta doar contractul functional descris.
- Daca RLS existent pe `plati`/`deconturi_federatie` permite SECURITY DEFINER sa scrie fara conflicte — de verificat/ajustat daca gsd-plan-checker/executor gaseste blocaje.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design complet (arhitectura, schema, trigger, UI, testare, riscuri)
- `docs/superpowers/specs/2026-09-12-taxa-anuala-federatie-design.md` — spec completa aprobata de user, sursa de adevar pt toate deciziile de mai sus. Contine SQL exact pt schema, functie trigger, backfill, si criterii de testare.

### Cod existent afectat
- `components/FederationInvoices.tsx` — UI de extins (lista sportivi din decont_sportivi, camp metoda_plata)
- `types.ts` — `DecontFederatie`, `DecontSportiv` (interfete de actualizat cu campurile noi)
- `sql/fixes/fix_finalize_exam_function.sql` — RPC vechi `finalizeaza_examen`, INCOMPATIBIL cu schema live, NU se refoloseste (coloane gresite: activitate/data_activitate/numar_sportivi/status in loc de tip_activitate/data_generare/nr_participanti/status_plata)

</canonical_refs>

<specifics>
## Specific Ideas

- Suma istorica taxa FRQKD 2025-2026: 170 lei/sportiv (folosita ca seed pt 2026-2027, editabila din UI).
- Precursor manual gasit live (proiect Supabase `wuhidifzsutwgdfkwhmd`): 37 randuri `plati` tip='FRQKD', un singur club (`club_id='cbb0b228-b3e0-4735-9658-70999eb256c6'`), toate datate 2026-01-20.

</specifics>

<deferred>
## Deferred Ideas

None — spec acopera scope-ul complet al fazei.

</deferred>

---

*Phase: 29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie*
*Context gathered: 2026-09-12 via brainstorming session (manual CONTEXT.md, discuss-phase sarit)*
