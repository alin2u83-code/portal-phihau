# Taxa Anuala Federatie — activare automata club→FRQKD

Status: aprobat de user (brainstorming chat), 2026-09-12. Nu implementat inca.

## Context

`deconturi_federatie` e o tabela live orfana (id, data_decont, suma_totala,
dovada_transfer_url, confirmata_federatie, created_at — fara `club_id`),
0 randuri. `FederationInvoices.tsx` si RPC-ul din repo
`sql/fixes/fix_finalize_exam_function.sql` (`finalizeaza_examen`) folosesc
coloane diferite intre ele si fata de schema live — niciunul n-ar functiona
daca ar rula acum. Fluxul "Taxa Anuala" descris in memoria proiectului
(aprilie 2026: `vize_sportivi`, `decont_sportivi`) exista ca tabele dar
`vize_sportivi` are 0 randuri — nefolosit niciodata in productie.

**Precursor manual gasit** (2026-09-12): 37 randuri reale in `plati`, `tip='FRQKD'`,
`descriere='FRQKD Sezonul 2025-2026'`, `suma=170` (una `0`), toate pt un
singur club (`cbb0b228-...`), generate manual pe 2026-01-20, status mixt
Achitat/Neachitat. Fara nicio legatura la `vize_sportivi`/`decont_sportivi`/
`deconturi_federatie` — clubul a facturat sportivii direct, fara trecere prin
niciun mecanism de urmarire a platii catre federatie.

## Obiectiv

Cand un sportiv participa prima data intr-un sezon (an fiscal federatie) la
examen de grad, stagiu, sau competitie, se activeaza automat "Taxa Anuala"
catre federatie — o singura data per sportiv per sezon. Activarea creeaza
factura sportiv→club si adauga sportivul la obligatia club→federatie a
sezonului respectiv.

## An fiscal federatie

Fix, independent de tabela `sezoane` (care e per-club, cu date variabile).
Calculat din data curenta: daca luna >= 9, `an_fiscal = anul curent`,
altfel `an_fiscal = anul curent - 1`. Sezonul "2026-2027" = `an_fiscal 2026`.

## Schema DB

### `deconturi_federatie` (ALTER, pastreaza coloanele existente)

Adauga:
- `club_id uuid references cluburi(id)` — NOT NULL pt randuri noi
- `an_fiscal int` — NOT NULL pt randuri noi
- `tip_activitate text default 'FRQKD'`
- `nr_participanti int default 0`
- `status_plata text default 'In asteptare'` — check in ('In asteptare','Platit')
- `metoda_plata text` — check in ('Cash','Transfer Bancar','Revolut'), nullable pana la confirmare plata
- `UNIQUE (club_id, an_fiscal)` — un singur decont agregat per club per sezon

Coloanele vechi (`dovada_transfer_url`, `confirmata_federatie`, `data_decont`)
raman; `confirmata_federatie` se sincronizeaza cu `status_plata='Platit'` la
confirmare (setate in aceeasi tranzactie din UI).

### `decont_sportivi` (exista, fara schimbare de coloane)

Reutilizeaza `an` ca `an_fiscal`. Adauga `UNIQUE (sportiv_id, an)` (in plus
fata de orice constraint existent pe `decont_id, sportiv_id`) — garanteaza ca
un sportiv nu poate fi numarat de doua ori intr-un sezon indiferent de decont.

### `vize_sportivi` (exista, fara schimbare de coloane)

Devine gate-ul central de idempotenta: un rand per `(sportiv_id, an)` =
"viza activata" pentru acel sezon. Adauga `UNIQUE (sportiv_id, an)` daca nu
exista deja.

### `taxa_anuala_config` (NOU)

```sql
create table public.taxa_anuala_config (
  id uuid primary key default gen_random_uuid(),
  an_fiscal int not null unique,
  suma numeric not null check (suma >= 0),
  created_at timestamptz default now()
);
```

RLS: doar `SUPER_ADMIN_FEDERATIE` poate INSERT/UPDATE; SELECT deschis oricui
autentificat (ca sa poata calcula/afisa suma in UI club).

## Functie + trigger-e

`activeaza_taxa_anuala(p_sportiv_id uuid)`, `SECURITY DEFINER`, apelata din
4 trigger-e `AFTER INSERT FOR EACH ROW`:

| Tabela | Coloana sportiv |
|---|---|
| `inscrieri_examene` | `sportiv_id` |
| `stagii_cvd_participare` | `sportiv_id` |
| `participare_stagiu` | `practicant_id` |
| `inscrieri_competitie` | `sportiv_id` |

Logica (idempotenta, safe la rulari concurente):

1. `v_an_fiscal := ` calcul din `CURRENT_DATE` (vezi mai sus)
2. `INSERT INTO vize_sportivi (sportiv_id, an, status_viza) VALUES (p_sportiv_id, v_an_fiscal, 'Activa') ON CONFLICT (sportiv_id, an) DO NOTHING RETURNING id INTO v_viza_id`
3. Daca `v_viza_id IS NULL` (exista deja) → `RETURN` (no-op, sportivul are deja viza pe sezonul asta)
4. Altfel:
   a. `SELECT club_id INTO v_club_id FROM sportivi WHERE id = p_sportiv_id`
   b. `SELECT suma INTO v_suma FROM taxa_anuala_config WHERE an_fiscal = v_an_fiscal` — daca `NULL`, `RAISE EXCEPTION` (rollback complet, inclusiv pasul 2 — tranzactia intreaga cade, sportivul ramane fara viza pana federatia seteaza pretul sezonului)
   c. `INSERT INTO plati (sportiv_id, club_id, suma, descriere, data, tip, status, an) VALUES (p_sportiv_id, v_club_id, v_suma, 'FRQKD Sezonul ' || v_an_fiscal || '-' || (v_an_fiscal+1), CURRENT_DATE, 'FRQKD', 'Neachitat', v_an_fiscal) RETURNING id INTO v_plata_id` — `tip='FRQKD'`, nu `'Taxa Anuala'`: pastreaza consistenta cu cele 37 randuri istorice (aceeasi denumire, deja vazuta de sportivi/admini)
   d. `UPDATE vize_sportivi SET plata_id = v_plata_id, data_platii = CURRENT_DATE WHERE id = v_viza_id`
   e. `INSERT INTO deconturi_federatie (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata) VALUES (v_club_id, v_an_fiscal, 'FRQKD', 0, 0, 'In asteptare') ON CONFLICT (club_id, an_fiscal) DO NOTHING`
   f. `UPDATE deconturi_federatie SET suma_totala = suma_totala + v_suma, nr_participanti = nr_participanti + 1 WHERE club_id = v_club_id AND an_fiscal = v_an_fiscal RETURNING id INTO v_decont_id`
   g. `INSERT INTO decont_sportivi (decont_id, sportiv_id, an) VALUES (v_decont_id, p_sportiv_id, v_an_fiscal)`

Toti pasii 4a-4g in aceeasi tranzactie ca trigger-ul (implicit — un trigger AFTER INSERT ruleaza in tranzactia statement-ului care l-a declansat). Orice `RAISE EXCEPTION` face rollback pe tot, inclusiv insert-ul din tabela sursa (examen/stagiu/competitie) — comportament acceptat: inscrierea sportivului la activitate esueaza daca federatia n-a setat pretul sezonului, cu mesaj clar.

## UI

### `FederationInvoices.tsx` (modificat)

- Lista sportivilor acoperiti de un decont vine direct din `decont_sportivi`
  (query dupa `decont_id`) — elimina selectia manuala din
  `PaymentConfirmationModal` (nu mai e nevoie, sportivii sunt deja legati
  automat la activare).
- `PaymentConfirmationModal` primeste camp nou "Metoda Plata"
  (Select: Cash / Transfer Bancar / Revolut) — trimis la `UPDATE
  deconturi_federatie SET metoda_plata = ..., status_plata = 'Platit',
  confirmata_federatie = true`.

### Ecran nou (mic) — configurare pret sezon

Pentru `SUPER_ADMIN_FEDERATIE`: formular simplu (an_fiscal + suma) care
scrie in `taxa_anuala_config`. Poate fi un tab in ecranul existent de
administrare federatie (nu un modul nou separat).

## Migrare / backfill istoric

Rulat o singura data, in aceeasi migratie care creeaza schema noua:

1. **Seed pret sezon curent**: `INSERT INTO taxa_anuala_config (an_fiscal, suma) VALUES (2026, 170)` — valoare implicita preluata din istoric (2025-2026), editabila oricand din UI de `SUPER_ADMIN_FEDERATIE`.
2. **Backfill cele 37 facturi FRQKD 2025-2026** (`an_fiscal=2025`, sezon deja incheiat, fara risc de coliziune cu gate-ul care porneste de la 2026):
   - `INSERT INTO deconturi_federatie (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata) SELECT club_id, 2025, 'FRQKD', SUM(suma), COUNT(*), 'In asteptare' FROM plati WHERE tip='FRQKD' AND descriere='FRQKD Sezonul 2025-2026' GROUP BY club_id` (status ramane `'In asteptare'` — nu exista dovada ca acest club a virat efectiv suma catre federatie, doar ca a facturat sportivii)
   - `INSERT INTO vize_sportivi (sportiv_id, an, status_viza, plata_id, data_platii) SELECT sportiv_id, 2025, 'Activa', id, data FROM plati WHERE tip='FRQKD' AND descriere='FRQKD Sezonul 2025-2026'`
   - `INSERT INTO decont_sportivi (decont_id, sportiv_id, an) SELECT d.id, p.sportiv_id, 2025 FROM plati p JOIN deconturi_federatie d ON d.club_id = p.club_id AND d.an_fiscal = 2025 WHERE p.tip='FRQKD' AND p.descriere='FRQKD Sezonul 2025-2026'`

Rezultat: cei 37 de sportivi apar cu viza activa pe 2025-2026 (nu vor mai declansa gate-ul retroactiv daca ar exista vreun insert vechi reprocesat), iar clubul lor are un decont FRQKD 2025 vizibil in `FederationInvoices.tsx` — admin-ul federatiei poate confirma acum plata (cu metoda_plata) pentru un decont istoric.

## Testare

- Insert direct in fiecare din cele 4 tabele sursa, pentru acelasi
  `sportiv_id`, in aceeasi sesiune de test → al doilea+ insert nu trebuie
  sa creeze randuri noi in `plati`/`vize_sportivi`/`decont_sportivi`, nici
  sa incrementeze `deconturi_federatie`.
- Insert cu `taxa_anuala_config` lipsa pt anul curent → tranzactia sursa
  (insert in `inscrieri_examene` etc.) trebuie sa esueze cu mesaj clar,
  fara niciun rand orfan in `vize_sportivi`/`plati`.
- Doi sportivi din acelasi club, acelasi an → un singur `deconturi_federatie`
  cu `nr_participanti=2`, `suma_totala = 2 x suma_configurata`.
- Doi sportivi din cluburi diferite → doua randuri separate in
  `deconturi_federatie`.

## Riscuri / decizii asumate

- Coloanele vechi `dovada_transfer_url`/`confirmata_federatie` raman fara
  sa fie curatate — repara in loc de redesenare, per decizia userului.
- Daca un club nu are `taxa_anuala_config` setat pt sezon, ORICE inscriere
  la examen/stagiu/competitie pt un sportiv fara viza activa pe sezonul
  curent esueaza — impact global, nu doar pe sportivul respectiv. Necesita
  ca SUPER_ADMIN_FEDERATIE sa seteze pretul la inceput de sezon, inainte de
  prima inscriere din tot sistemul.
