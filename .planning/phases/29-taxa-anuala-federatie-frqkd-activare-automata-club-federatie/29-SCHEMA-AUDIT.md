# 29-SCHEMA-AUDIT.md

Audit schema live pe proiectul Supabase `wuhidifzsutwgdfkwhmd`, rulat 2026-09-12 prin `execute_sql` (read-only). Toate afirmatiile de mai jos sunt sustinute de output-ul interogarilor de dedesubt.

## 1. Coloane (information_schema.columns)

**deconturi_federatie** (6 coloane): `id` uuid NOT NULL default gen_random_uuid(), `data_decont` date default CURRENT_DATE, `suma_totala` numeric NOT NULL, `dovada_transfer_url` text, `confirmata_federatie` boolean default false, `created_at` timestamptz default now().

**decont_sportivi** (5 coloane): `id` uuid NOT NULL, `decont_id` uuid NOT NULL, `sportiv_id` uuid NOT NULL, `an` integer NOT NULL, `created_at` timestamptz default now().

**vize_sportivi** (7 coloane): `id` uuid NOT NULL, `sportiv_id` uuid NOT NULL, `an` integer NOT NULL, `plata_id` uuid, `data_platii` date **NOT NULL**, `status_viza` text NOT NULL default 'Activ', `observatii` text, `created_at` timestamptz default now().

**plati**: contine deja `sportiv_id`, `familie_id`, `suma`, `data`, `status`, `descriere`, `tip`, `club_id`, `an` (smallint), `luna` (smallint) — toate relevante pentru filtrele fazei 29.

**taxe_anuale_config** (nume existent, DIFERIT de `taxa_anuala_config` cerut de D-05): `id`, `nume`, `suma`, `data_inceput`, `data_sfarsit`, `is_activ`, `created_at`, `descriere`. Nu are `an_fiscal` — nu poate fi refolosita pentru D-05; tabela noua `taxa_anuala_config` (singular "anuala") nu se ciocneste de nume cu aceasta.

## 2. Constrangeri (pg_constraint)

- `plati_status_check`: status IN ('Achitat','Neachitat','Achitat Parțial','Anulat')
- `decont_sportivi_decont_id_sportiv_id_key`: UNIQUE (decont_id, sportiv_id) — ramane neatinsa
- `decont_sportivi_sportiv_id_fkey`: FOREIGN KEY (sportiv_id) REFERENCES sportivi(id) **ON DELETE RESTRICT**
- `vize_sportivi_sportiv_id_fkey`: FOREIGN KEY (sportiv_id) REFERENCES sportivi(id) ON DELETE CASCADE
- `vize_sportivi_status_viza_check`: status_viza = ANY ('Activ','Inactiv','Suspendat')
- `uq_viza_sportiv_an`: **UNIQUE (sportiv_id, an) EXISTA DEJA** pe `vize_sportivi`
- `deconturi_federatie`: doar PRIMARY KEY (id), nicio alta constrangere

## 3. Indecsi (pg_indexes)

- `decont_sportivi`: PK, `decont_sportivi_decont_id_sportiv_id_key` (unique), `idx_decont_sportivi_decont`, `idx_decont_sportivi_sportiv_an` (NEUNIC, pe sportiv_id+an)
- `deconturi_federatie`: doar PK
- `plati`: `plati_taxa_anuala_unique` UNIQUE (sportiv_id, an) WHERE tip='Taxa Anuala' AND sportiv_id NOT NULL AND an NOT NULL; `plati_taxa_examen_unique` UNIQUE (sportiv_id, sesiune_id) WHERE tip='Taxa Examen'; `plati_abonament_sportiv_unique`/`plati_abonament_familie_unique` scoped pe tip='Abonament'. **Niciun index unic neconditionat sau scoped pe tip='FRQKD' pe (sportiv_id, an).**
- `vize_sportivi`: PK, `uq_viza_sportiv_an` (UNIQUE sportiv_id+an, deja exista), 3 indecsi neunici

## 4. Politici RLS (pg_policies)

- `deconturi_federatie`: 4 politici (`_select`/`_insert`/`_update`/`_delete`) restranse la roluri `SUPER_ADMIN_FEDERATIE`/`ADMIN`(select include si `ADMIN_CLUB`) — pattern `utilizator_roluri_multicont`.
- `decont_sportivi`: 2 politici ALL — club propriu (`este_staff_club` implicit prin club_id match) si federatie full access.
- `vize_sportivi`: `insert_vize_sportivi`/`update_vize_sportivi`/`delete_vize_sportivi` restranse la `SUPER_ADMIN_FEDERATIE`/`ADMIN_CLUB`/`ADMIN`; `select_vize_sportivi` deschis si catre SPORTIV propriu.
- `plati`: `rbv_plati_insert` restrictionat la `SUPER_ADMIN_FEDERATIE`/`ADMIN_CLUB` + `has_access_to_club(...)`.

## 5. FORCE ROW LEVEL SECURITY (pg_class)

| Tabela | relrowsecurity | relforcerowsecurity |
|---|---|---|
| plati | true | **true** |
| deconturi_federatie | true | **true** |
| decont_sportivi | true | **true** |
| vize_sportivi | true | **true** |
| sportivi | true | **true** |

Toate cele 4 tabele tinta au FORCE RLS activ, inclusiv pentru proprietarul tabelei (`postgres`).

## 6. Triggere (pg_trigger, necombinat tgisinternal)

- `inscrieri_examene`: `audit_inscrieri_examene`, `trg_sync_istoric_grade_on_exam` — niciun trigger de taxa anuala existent (asteptat, se adauga in 29-02).
- `inscrieri_competitie`: `audit_inscrieri_competitie`.
- `stagii_cvd_participare`, `participare_stagiu`: zero triggere existente (necombinat tgisinternal).
- Confirmare coloane: `inscrieri_examene.sportiv_id` ✓, `inscrieri_competitie.sportiv_id` ✓, `stagii_cvd_participare.sportiv_id` ✓, `participare_stagiu.practicant_id` ✓ — toate cele 4 tabele exista cu coloana asteptata.

## 7. Numaratori tabele tinta

`deconturi_federatie` = 0, `decont_sportivi` = 0, `vize_sportivi` = 0, `taxe_anuale_config` (tabela veche, alt nume) = 2.

## 8. Profil facturi FRQKD 2025-2026

| club_id | n_facturi | n_sportivi_distincti | n_fara_sportiv | suma_totala | prima_data | ultima_data |
|---|---|---|---|---|---|---|
| cbb0b228-b3e0-4735-9658-70999eb256c6 | 37 | 37 | 0 | 6120 | 2026-01-20 | 2026-01-20 |

1 singur club, 37 facturi = 37 sportivi distincti (fara facturi duplicate per sportiv), zero randuri orfane fara sportiv_id.

## 9. Duplicate care ar bloca indecsi unici noi

`decont_sportivi` GROUP BY (sportiv_id, an) HAVING count(*)>1: **zero randuri** (tabela e goala).
`vize_sportivi` GROUP BY (sportiv_id, an) HAVING count(*)>1: **zero randuri** (tabela e goala).

## 10. Proprietar tabele

`plati`, `deconturi_federatie`, `decont_sportivi`, `vize_sportivi` — toate `tableowner = postgres`.

## Verdict blocaje

- B1 OK — nu exista index/constrangere UNIQUE neconditionat pe `plati(sportiv_id, an)`. Exista doar `plati_taxa_anuala_unique`, un index PARTIAL scoped strict pe `tip='Taxa Anuala'` (interogarea 3). Insert-ul planificat in D-07 foloseste `tip='FRQKD'`, care nu intra in domeniul acestui index partial — deci INSERT-ul in `plati` NU va esua din cauza acestei constrangeri. Nu e nevoie sa opresc planificarea schemei.
- B2 BLOCANT — `relforcerowsecurity=true` pe toate cele 4 tabele (`plati`, `deconturi_federatie`, `decont_sportivi`, `vize_sportivi`) (interogarea 5). FORCE ROW LEVEL SECURITY anuleaza bypass-ul implicit al proprietarului tabelei (`postgres`), deci o functie SECURITY DEFINER definita de `postgres` NU trece automat de RLS. Planul 29-02 trebuie fie sa adauge politici INSERT dedicate pentru functia `activeaza_taxa_anuala`/triggerele ei (de ex. o politica ce verifica `current_setting` sau rol special), fie sa foloseasca un rol cu BYPASSRLS, fie sa apeleze functia cu `SET LOCAL row_security = off` in corpul SECURITY DEFINER (necesita owner cu privilegiul corespunzator). Consemnat pentru 29-02.
- B3 OK — CHECK-ul live pe `vize_sportivi.status_viza` accepta exact `'Activ'`, `'Inactiv'`, `'Suspendat'` (interogarea 2). Valoarea corecta de folosit in toate migratiile/functiile fazei 29 este `'Activ'` (nu `'Activa'` din spec).
- B4 OK/necesita atentie — `vize_sportivi.data_platii` este NOT NULL (interogarea 1). Atat backfill-ul (Task 3, foloseste `data` din `plati` sursa) cat si functia trigger din 29-02 trebuie sa furnizeze intotdeauna o valoare non-null pentru `data_platii`.
- B5 OK/necesita atentie — `decont_sportivi.sportiv_id` are `ON DELETE RESTRICT` (interogarea 2). Confirmat impact asupra `merge_sportivi`/deduplicare: orice merge care sterge sportivul sursa va esua daca acesta are randuri in `decont_sportivi`, la fel ca pentru `vize_sportivi` (CASCADE acolo, deci diferit) — `DeduplicareSportivi/index.tsx` trebuie sa remapeze explicit `decont_sportivi.sportiv_id` inainte de orice delete, nu se poate baza pe CASCADE.
- B6 OK — zero duplicate pe `(sportiv_id, an)` in `decont_sportivi` si `vize_sportivi` (interogarea 9) — ambele tabele sunt goale, deci indecsii unici noi se pot crea fara conflict.

**Concluzie:** B1 si B6 sunt OK → planificarea schemei (Task 2) poate continua. `uq_viza_sportiv_an` (UNIQUE sportiv_id+an) exista deja pe `vize_sportivi` — Task 2 NU trebuie sa creeze un al doilea index unic cu acelasi continut, doar sa il refoloseasca in `ON CONFLICT`. `decont_sportivi` NU are inca UNIQUE(sportiv_id, an) — trebuie creat in Task 2 per D-03. Tabelele fiind goale (numaratoarea 7), `SET NOT NULL` pe `club_id`/`an_fiscal` in `deconturi_federatie` este sigur.
