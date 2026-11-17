# Faza 44 — 44-VERIFICARE (read-only, DB live)

Data: 2026-11-17. Proiect Supabase `wuhidifzsutwgdfkwhmd`. Doar SELECT (execute_sql), list_edge_functions, get_edge_function, Grep pe repo. NIMIC scris/deployat. Fără date personale (doar nume obiecte, numere, UUID-uri, nume cluburi).

Legendă: INTERogat LIVE = din catalog/DB live. GREP = doar căutare în repo.

## A. Tabele

| tabel | RLS | FORCE RLS | rânduri |
|---|---|---|---|
| plati | da | da | 978 |
| tranzactii | da | da | 400 |
| tranzactie_plata | da | da | 412 |
| obligatii_plata | da | da | 159 |
| incasari_efective | da | da | 83 |
| alocari_plati | da | da | 83 |
| plata | da | da | 50 (pg_stat n_tup_ins=272, deci au existat și rânduri șterse) |
| catalog_pret | da | da | 2 |
| tipuri_plati | da | da | 7 |
| nomenclator_tipuri_plati | da | da | 7 |
| familii | da | da | 7 |

Coloane `plati` (live): id, sportiv_id (null), familie_id (null), suma (NOT NULL), data, status (NOT NULL), descriere (NOT NULL), tip (default 'ALTA_PLATA'), observatii, created_at, tip_plata (default 'Abonament'), examen_id, reducere_id, valoare_reducere, suma_initiala, "descriereDetaliata", "reducereDetalii", club_id (**nullable, fără default**), suma_ramasa (default 0), tip_plata_id, tip_abonament_id, sesiune_id, luna, an.

Răspunsuri explicite:
- `plati.eveniment_id`: **NU EXISTĂ live**.
- `plati.examen_id`: există. `plati.sesiune_id`: există.
- `plati.tip_plata` există (text, default 'Abonament', fără FK). `plati.tip_plata_id` există, FK -> `tipuri_plati(id)`. `plati.tip_abonament_id` există, FK -> `tipuri_abonament(id)`.
- `familii.club_id`: **EXISTĂ** (folosit de politicile RLS pe familii).
- `plati.club_id` nullable, fără default.
- CHECK `tranzactii.metoda_plata` IN ('Cash','Transfer Bancar','Revolut') (`incasari_efective` are doar Cash/Transfer Bancar).
- CHECK `plati.status` IN ('Achitat','Neachitat','Achitat Parțial','Anulat') sau NULL. Atenție: `sms-parse-bank` scrie 'achitat'/'pending' (vezi I2).
- Coloane `tranzactii`: id, plata_ids uuid[], sportiv_id, familie_id, suma NOT NULL, data_platii NOT NULL, metoda_plata NOT NULL, created_at, club_id (nullable), suma_totala (default 0), suma_incasata (default 0).
- Coloane `tranzactie_plata`: id, tranzactie_id, plata_id, suma_alocata (toate NOT NULL), created_at.

FK-uri relevante (live):
- `tranzactie_plata.plata_id -> plati` ON DELETE CASCADE; `tranzactie_plata.tranzactie_id -> tranzactii` ON DELETE CASCADE. Nicio constrângere UNIQUE pe (tranzactie_id, plata_id).
- `plati.club_id -> cluburi` (NO ACTION); `plati.sportiv_id -> sportivi` SET NULL; `plati.familie_id -> familii` SET NULL; `plati.tip_plata_id -> tipuri_plati`; `plati.tip_abonament_id -> tipuri_abonament`; `plati.sesiune_id -> sesiuni_examene` SET NULL.
- Intrări spre `plati`: aplicare_reduceri (CASCADE), cereri_produse, decont_sportivi, produse_vanzari, vize_sportivi (SET NULL), inscrieri_examene.plata_id (NO ACTION), sms_incoming.plata_id (NO ACTION).
- Modele paralele: alocari_plati -> incasari_efective, obligatii_plata; **aplicare_reduceri.obligatie_id -> obligatii_plata (CASCADE)**; **detalii_decont.obligatie_id -> obligatii_plata**; obligatii_plata -> cluburi, familii, sportivi, nomenclator_tipuri_plati; plata -> catalog_pret; incasari_efective -> cluburi.

## B. Triggere

LIVE, `NOT tgisinternal`, pe tabelele de interes + cele a căror funcție citește plati/tranzactii:

| tabel | trigger | enabled | funcție | secdef |
|---|---|---|---|---|
| plati | `audit_plati` (AFTER I/U/D) | O | audit_trigger_fn | da |
| plati | `plati_sync_suma_ramasa_trg` (BEFORE INSERT OR UPDATE OF suma, status) | O | plati_sync_suma_ramasa | nu |
| plati | `trg_plata_sms` (AFTER INSERT OR UPDATE OF status) | O | trg_plata_confirmare_sms | da |
| tranzactie_plata | `tranzactie_plata_change_trigger` (AFTER I/U/D) | O | on_tranzactie_plata_change -> recalculare_stare_plata | da |
| tranzactii | `audit_tranzactii` (AFTER I/U/D) | O | audit_trigger_fn | da |
| alocari_plati | `trg_actualizeaza_finante` (I/U/D) | O | fn_actualizeaza_restanta_obligatie | nu |
| alocari_plati | `trg_actualizeaza_restanta` (INSERT) | O | fn_actualizeaza_restanta | nu |
| echipa_sportivi / inscrieri_competitie | `trg_echipa_sportivi_fram`, `trg_inscrieri_fram` | O | trg_participant_fram | da (matched pe regex, nelegat de plati) |

Nume exacte pentru planurile următoare:
- recalculare stare plată: `tranzactie_plata_change_trigger` pe `tranzactie_plata` (NU există trigger pe `tranzactii`).
- SMS pe status plată: `trg_plata_sms` (INSERT sau UPDATE OF status). **Orice UPDATE pe plati.status trimite SMS**; nicio migrare a fazei nu face UPDATE pe status.
- sync `suma_ramasa`: `plati_sync_suma_ramasa_trg`.
- audit: `audit_plati`, `audit_tranzactii` (nu pe tranzactie_plata).
- Pe `tranzactii`: nu există trigger de calcul. Funcția `on_tranzactie_change` (citește plata_ids) și `update_transaction_status` (citește NEW.suma_totala/suma_incasata) NU sunt atașate niciunui trigger (funcții orfane, verificat: nicio intrare în pg_trigger).
- Funcția SMS (`trg_plata_confirmare_sms`) folosește pg_net/coadă: neinspectat în detaliu (nu influențează planul; se ține doar nota de mai sus).
- Pentru `plati.club_id` nu există `plati_completeaza_club_id_trg` (vezi STOP b).

## C. Functii

LIVE, `pg_proc` schema public, potrivire pe pattern-urile din plan:

| funcție | argumente | secdef | potriviri | observații |
|---|---|---|---|---|
| delete_exam_registration | p_inscriere_id uuid | da | plata_ids | CITEȘTE: `v_plata.id = ANY(t.plata_ids)` (linia 34) |
| factureaza_viza_taxa | p_viza_id uuid | da | (insert plati) | INSERT plati (sportiv_id, club_id, suma, descriere, data, tip, status, an) — furnizează club_id |
| fn_actualizeaza_restanta | () | nu | suma_totala, obligatii_plata | WRITE obligatii_plata (trigger pe alocari_plati) |
| fn_actualizeaza_restanta_obligatie | () | nu | suma_totala, obligatii_plata, alocari_plati | WRITE obligatii_plata (trigger pe alocari_plati) |
| generare_factura_examen | p_sportiv_id uuid, p_sesiune_id uuid | da | (insert plati) | 2 INSERT-uri plati cu club_id (v_club_id; raise dacă NULL) |
| generate_monthly_fees | p_month int, p_year int, p_club_id uuid | nu | suma_totala, obligatii_plata, tip_plata, tip_abonament_id | WRITE obligatii_plata; referă `public.tip_abonament` (tabel inexistent?) — nicio apelare în repo (GREP), niciun cron |
| incasare_club_id | p_incasare_id uuid | da | incasari_efective | helper RLS pentru alocari_plati/incasari_efective |
| obligatie_club_id | p_obligatie_id uuid | da | obligatii_plata | helper RLS pentru obligatii_plata/alocari_plati |
| inregistreaza_plata_federatie | p_club_id, p_tip, p_an, p_sportiv_ids[], p_metoda_plata, p_data_plata, p_dovada_url, p_observatii | da | suma_totala | fals pozitiv: `suma_totala` aparține `deconturi_federatie` |
| on_tranzactie_change | () | da | plata_ids | CITEȘTE NEW/OLD.plata_ids; FĂRĂ trigger atașat (orfană) |
| proceseaza_plata_factura | p_plata_id, p_suma_incasata, p_metoda_plata, p_data_plata, p_descriere_aditionala | da | plata_ids, suma_incasata | **SCRIE** `tranzactii.plata_ids`: `insert into tranzactii (plata_ids, ...) values (array[p_plata_id], ...)` (linia 33-34) |
| recalculare_stare_plata | p_plata_id uuid | da | suma_totala | variabilă locală `v_suma_totala` (fals pozitiv) |
| seteaza_scutire_taxa | p_sportiv_id, p_tip, p_an, p_scutit, p_motiv | da | plata_ids | CITEȘTE: `v_pl.id = ANY(t.plata_ids)` (linia 37) |
| update_transaction_status | () | nu | suma_totala, suma_incasata | pe NEW.*; FĂRĂ trigger (orfană; referă coloane care nu mai aparțin tabelului-țintă) |

### Funcții care fac INSERT în plati (D-03)
| funcție | sportiv_id | familie_id | club_id |
|---|---|---|---|
| factureaza_viza_taxa | da | nu | da (COALESCE(viza.club_id, sportivi.club_id)) |
| generare_factura_examen (x2) | da | nu | da (din sportivi, raise dacă NULL) |

`proceseaza_incasare_normalizata` nu apare ca INSERT în plati (nu a potrivit patternul).

### Funcții care scriu tranzactii.plata_ids (D-02)
- `proceseaza_plata_factura(p_plata_id uuid, p_suma_incasata numeric, p_metoda_plata text, p_data_plata date, p_descriere_aditionala text)` — INSERT cu `array[p_plata_id]`. Verificat în DB: fluxul legacy mai e scris de funcția asta.

### Funcții care citesc tranzactii.plata_ids
- `delete_exam_registration(p_inscriere_id uuid)` (linia 34)
- `seteaza_scutire_taxa(p_sportiv_id, p_tip, p_an, p_scutit, p_motiv)` (linia 37)
- `on_tranzactie_change()` (orfană, nu rulează)
- `proceseaza_plata_factura` (pe lângă scriere)

Nota despre 44-02: `on_tranzactie_change` și `update_transaction_status` nu sunt apelate de nimic; pot fi eliminate odată cu `plata_ids`/modelele paralele (candidate pentru același drop).

## D. Views

LIVE, toate cu `security_invoker=true`:

| view | potriviri | nota |
|---|---|---|
| articol_catalog | catalog_pret | depinde de modelul paralel |
| tranzactie_club | catalog_pret (+cluburi) | depinde de modelul paralel |
| vedere_catalog_preturi_phi_hau | catalog_pret | depinde de modelul paralel |
| vedere_cluburi_catalog | catalog_pret | depinde de modelul paralel |
| vw_fisa_financiara_detaliata | obligatii_plata (+nomenclator_tipuri_plati, familii, sportivi), suma_totala, tip_plata | depinde de modelul paralel |
| rbv_deconturi_federatie / vedere_cluburi_deconturi_federatie | suma_totala | fals pozitiv (deconturi_federatie) |
| rbv_plati_club | tip_plata, tip_plata_id, tip_abonament_id (pe plati) | depinde de coloane plati |
| vedere_cluburi_plati | tip_plata, tip_plata_id, tip_abonament_id (pe plati) | idem |
| vedere_cluburi_financiar | tip_plata, suma_incasata | idem (tip_plata) |
| view_plata_sportiv | tip_plata, suma_incasata | depinde de plati.tip_plata |
| vedere_cluburi_tranzactii | plata_ids, suma_totala, suma_incasata | depinde de 3 coloane tranzactii |
| view_istoric_plati_detaliat | plata_ids, suma_incasata | depinde de plata_ids; `vedere_cluburi_istoric_plati_detaliat` depinde de ea |
| rbv_sportivi_complet, vedere_cluburi_sportivi, vedere_sportivi_*, vizibilitate_sportivi_dinamica | tip_abonament_id | coloana de pe `sportivi`, nu pe plati |

Dependențe pe coloane (pg_depend, exacte):
- `tranzactii.plata_ids`: vedere_cluburi_tranzactii, view_istoric_plati_detaliat.
- `tranzactii.suma_totala` / `suma_incasata`: vedere_cluburi_tranzactii (ambele).
- `plati.tip_plata`: rbv_plati_club, vedere_cluburi_financiar, vedere_cluburi_plati, view_plata_sportiv.
- `plati.tip_plata_id` / `tip_abonament_id`: rbv_plati_club, vedere_cluburi_plati.
- Pe modelele paralele (pg_depend): articol_catalog, tranzactie_club, vedere_catalog_preturi_phi_hau, vedere_cluburi_catalog (catalog_pret); vw_fisa_financiara_detaliata (obligatii_plata).
Cod: nicio folosire a acestor view-uri în repo, cu excepția comentariilor "NU folosi view_plata_sportiv" (GREP). Matview-uri: niciunul.

## E. Politici RLS

LIVE (`pg_policies`):
- `plati`: `ext_r_deny_all` (ALL), `rbv_plati_delete`, `rbv_plati_insert`, `rbv_plati_admin_club` (SELECT, `has_access_to_club(COALESCE(club_id, sportiv.club_id))`), `rbv_plati_own` (SELECT), `rbv_plati_super_admin` (SELECT), `rbv_plati_update`. **Atenție D-03:** SELECT/UPDATE derivă clubul prin COALESCE(club_id, club sportivului) — o plată familie-only fără club_id (6 rânduri) nu e vizibilă prin această cale decât prin altă politică; după backfill devine vizibilă normal.
- `tranzactii`: `Filtru_Club_Universal`, `Power roles can manage transactions`, `Staff - Full Access Tranzactii`, `Staff_Full_Access`, `Super Admin acces total tranzactii`, `SuperAdmin_Total_Access`, `UNIFIED_CLUB_ACCESS`, `ext_r_deny_all`, `Sportiv - View Own Tranzactii` (SELECT, propriile tranzacții).
- `tranzactie_plata`: `club_member_access` (ALL: `is_super_admin() OR plata_club_id(plata_id) = get_active_club_id()`) + `ext_r_deny_all`.
- modelele paralele au `club_member_access`/`Bypass_Super_Admin`/`Staff_Full_Access` + `ext_r_deny_all`.
- Nicio politică (pe nicio tabelă) nu menționează `plata_ids` în qual/with_check (căutat regex).

Verdict embed (plan 44-06): `tranzactie_plata` are SELECT prin `club_member_access` pentru orice rol cu club activ egal cu clubul plății (ADMIN_CLUB, INSTRUCTOR, SPORTIV în același club; SUPER_ADMIN prin is_super_admin()). Acoperă cine citește tranzacția. Observație: nu există politică "sportiv doar propriile alocări" (e club-wide, exces preexistent, în afara scope-ului fazei).
Politici ne-din-migrare: **neverificat** (nu am comparat cu fișierele de migrare în acest plan; precedentul Faza 25 rămâne valabil).

## F. Alte obiecte

- Indexuri `plati`: idx_plati_club_id, idx_plati_familie_id, idx_plati_sportiv_id, plati_abonament_familie_unique, plati_abonament_sportiv_unique, plati_taxa_anuala_unique, plati_taxa_examen_unique, plati_pkey. `tranzactii`: doar pkey. **Niciun index pe plata_ids.** `obligatii_plata`: idx_unica_viza_anuala, pkey.
- `cron.job`: 2 joburi (`sms-schedule-reminders` -> schedule_training_reminders; `sync-locatii-grupe`). Niciunul nu atinge plati/tranzactii/modele paralele.
- Event triggers: ensure_rls_on_create, issue_graphql_placeholder, issue_pg_cron_access, issue_pg_graphql_access, issue_pg_net_access, pgrst_ddl_watch, pgrst_drop_watch (nu influențează migrările, dar `ensure_rls_on_create` rulează la CREATE TABLE — relevant pentru tabelele de backup din 44-02/05).
- Extensii: pg_cron 1.6.4, pg_net 0.19.5.

## G. Dormanta modele paralele

| tabel | rânduri | n_tup_ins/upd/del | ultim write (max created_at) | ultim autoanalyze | FK-uri | scrisă recent |
|---|---|---|---|---|---|---|
| obligatii_plata | 159 | 159/249/0 | 2026-03-10 | 2026-03-18 | spre cluburi, familii, sportivi, nomenclator; din alocari_plati, aplicare_reduceri, detalii_decont | nu |
| incasari_efective | 83 | 83/1/0 | 2026-03-18 | 2026-03-18 | spre cluburi; din alocari_plati | nu |
| alocari_plati | 83 | 83/0/0 | (fără created_at; autoanalyze 2026-03-18) | 2026-03-18 | spre incasari_efective, obligatii_plata, auth.users | nu |
| plata | 50 | 272/0/0 | 2026-01-30 | 2026-02-01 | spre catalog_pret | nu |
| catalog_pret | 2 | 2/0/0 | 2026-02-01 | — | din plata; view-uri dependente | nu |

Concluzie: toate "scrisă recent: nu" (ultima scriere martie 2026 la cel mai recent, în fața lui 2026-11-16 pe plati/tranzactii). Contoarele pg_stat pot fi resetate; `max(created_at)` e dovada principală.

## H. Context date

### (1) Cluburi — candidați reali
Criteriu: plăți/tranzacții recente sau prezență în ultimele 90 zile. CONFIRMAREA o face userul în 44-07.

| club | id | sportivi | plati (inclusiv derivate) | tranzactii | ultima plată | prezență 90z | marcaj |
|---|---|---|---|---|---|---|---|
| C.S. Phi Hau | cbb0b228-b3e0-4735-9658-70999eb256c6 | 483 | 464 | 187 | 2026-11-10 | 246 | CANDIDAT_REAL |
| Kim Long Dao Falticeni | 83e7f771-46cf-4c4e-b70f-356d7b0bff06 | 140 | 363 | 212 | 2026-11-05 | 0 | CANDIDAT_REAL |
| Club Bogdan | 99aaa7ed-e6bb-4ef4-b678-f96eccc31b54 | 1 | 3 | 1 | 2026-03-03 | 0 | de confirmat (probabil TEST, 1 sportiv) |
| Hâc Long Dao Brașov | aafad92d-f709-49c1-8769-13c8a492ff06 | 40 | 19 | 0 | 2026-11-09 | 0 | de confirmat |
| Long Ho Pascani | bff943b9-a111-422a-9e76-eb135f1e0a29 | 54 | 17 | 0 | 2026-11-09 | 0 | de confirmat |
| Long Dao | 3ee694af-35d8-4806-9e14-1e37826ad103 | 62 | 13 | 0 | 2026-10-16 | 0 | de confirmat |
| Bao Bacau | f41fc868-1b32-4481-b228-86bac9e21d38 | 93 | 13 | 0 | 2026-11-09 | 0 | de confirmat |
| Dao Iasi | bb86b534-c499-402a-8186-e7508db77ecf | 29 | 11 | 0 | 2026-11-09 | 0 | de confirmat |
| He Pai Suceava | 80c0bd76-7e60-41f4-ae3e-720ccc6d662f | 95 | 9 | 0 | 2026-11-09 | 0 | de confirmat |

Restul clubului (cluburi cu ≤8 plăți, tranzacții 0, prezență 0, ultima plată 2026-11-09 — probabil taxe anuale/examen generate la import) NU sunt listate aici; lista completă de 37 cluburi se reia din SQL în 44-07. Singurele cu tranzacții și prezență reală: C.S. Phi Hau și Kim Long Dao Falticeni. "Cele 7 cluburi reale" ale userului NU pot fi deduse din date; **userul le confirmă în 44-07**. Nu s-a marcat niciun club ca TEST pe nume (niciun nume nu conține test/clona/demo).

### (2) Re-măsurare (toată baza, 37 cluburi)
- plati cu `club_id` NULL: **96** (audit: 96). Derivabile din `sportivi.club_id`: **90**. Familie-only (sportiv_id NULL, familie_id setat): **6**. Fără nicio cale: **0** către `sportivi`; **dar cele 6 familie-only sunt derivabile din `familii.club_id` (6/6)** — deci D-03 NU mai are rânduri fără club derivabil (audit: "6 fără sportiv și fără club"). Recomandare: backfill din familii pentru ele, în loc de listă pentru decizia userului. Confirmarea rămâne la user (44-07).
- tranzactii pe clase (array x rânduri tranzactie_plata): array gol + tp>0: **110**; array nevid + tp=0: **5**; array nevid + tp>0: **285**; array gol + tp=0: 0. Array != join (ca mulțime): **117** (audit 117).
- plati Achitat fără niciun tranzactie_plata, pe club: Kim Long Dao Falticeni **69**, C.S. Phi Hau **20**, Club Bogdan **2** (total 91; Faza 37 spunea 68/20/2).
- `tranzactii.suma_totala`/`suma_incasata` nenule: **0** rânduri (coloane moarte).

### (3) Tipuri
- `plati.tip`: Abonament 527, FRQKD 201, Taxa Examen 206, FRAM 37, Taxa Stagiu 7.
- `plati.tip_plata`: 'Abonament' pe toate 978.
- `plati.tip_plata_id` NOT NULL: 0. `plati.tip_abonament_id` NOT NULL: 0.
- `tipuri_plati`: Abonament a82f7c80-d66d-4bd9-8318-5e6a3d9016a3, Echipament 3fcfd22a-632f-4dfb-a642-ceb7132b6195, Taxa Competitie b8e87959-04c7-4e69-9b2a-efeb8c9e90f9, Taxa Examen adfe0804-0d23-4da9-9173-30cf0ae24f7a, Taxa FRAM 0f619896-2a1e-4f71-b351-1e8f64feacab, Taxa FRQKD 103bc170-5808-4dea-94fa-30f5a525b796, Taxa Stagiu 17e5a543-9b50-45ed-ac74-bc3e4174b1fe.

## I. Inventar cod (GREP, repo, exclus node_modules/dist/.planning/migrații/docs)

1. Modele paralele (`from('obligatii_plata'|'incasari_efective'|'alocari_plati'|'catalog_pret'|'plata')` și cuvintele în supabase/functions, scripts, services, hooks, components, utils, contexts, types.ts, tests): **zero potriviri**. Doar DB (funcții/view-uri/triggere de mai sus).
2. `plata_ids`:
   - WRITE: components/UserProfile.tsx:471 (update plata_ids), :537 (update plata_ids); components/Plati/JurnalIncasari.tsx:127 (`plata_ids: []` la insert avans). components/Plati/GestiuneFacturi.tsx:269 (comentariu: nu mai scrie).
   - READ: components/Plati/FinancialDashboard.tsx:92-93; services/facturaService.ts:372 (`.contains('plata_ids', [plataId])`, guard la ștergere); components/UserProfile.tsx:466, 533 (select id, plata_ids), :931 (filter); components/Plati/JurnalIncasari.tsx:518-523, 561, 631, 663, 805, 809; utils/facturaDetaliu.ts:111, 117, 135.
   - TYPE-ONLY: types.ts:150.
   - COMMENT: services/soldService.ts:13, services/facturaService.ts:318,325.
   - TEST: services/facturaService.test.ts:237,250,257; utils/facturaDetaliu.test.ts:76-127.
3. `suma_totala` / `suma_incasata`: toate potrivirile sunt (a) `deconturi_federatie.suma_totala` (FederationInvoices.tsx, taxeAnualeService.ts, tests Faza 33, UnifiedDashboard.tsx:40, PlataFederatieModal.tsx:137), (b) câmpuri calculate `suma_incasata` din view_istoric_plati_detaliat / utils/facturiSportiv.ts / RaportFinanciar / RevenueBarChart / PaymentTypePieChart (alias, nu coloana reală a `tranzactii`), (c) parametrul RPC `p_suma_incasata`. **Nicio citire/scriere a coloanei reale `tranzactii.suma_totala/suma_incasata` din cod**; types.ts:221 (`suma_incasata`) și :562 (`suma_totala`) sunt tipuri (alias view / decont). Legătura exactă types.ts:221 ↔ view_istoric_plati_detaliat: de confirmat în 44-10 (cu `pg_get_viewdef`).
4. `tip_plata_id` pe plati: **services/produseService.ts:209,221** și **services/comenziService.ts:507,515,536** inserează `tip_plata_id` în `plati`; components/Produse/VanzareModal.tsx:132 și components/Produse/ComenziProduse/PredareModal.tsx:59 îl transmit. `tip_plata` (fără _id) pe plati: **zero** în cod (doar DB: view-uri). `tip_abonament_id`: legitim pe `sportivi`/`tipuri_abonament` (utils/abonamente.ts, Grupe, FinanciarTab, FamilieWidget, PerioadaVacanta, etc.); pe `plati`: zero scrieri/citiri în cod. Notă: `plati.tip_plata_id` e NULL pe toate cele 978 rânduri live, deci aceste fluxuri (produse/comenzi) nu au scris niciodată un rând sau trimit valoare goală — **verificare necesară înainte de orice drop** (44-10).
5. `.insert(` în `plati` (club_id furnizat: **neverificat per loc**; doar locurile numite în CONTEXT D-03 sunt cunoscute fără club_id — CalendarView.tsx:213, :243):
   components/CalendarView.tsx:213, 243; components/Competitii/StagiiCompetitii.tsx:320; components/GestiuneExamene/ManagementInscrieri.tsx:866, 994; ImportSportiviExamen.tsx:476; ExamenRegistrationPreview.tsx:52; components/Plati/GestiuneFacturi.tsx:257; JurnalIncasari.tsx:428; PlatiScadente.tsx:370 (bulk sportiv), 378 (bulk familie); services/comenziService.ts:532; services/facturaService.ts:113; services/produseService.ts:217; teste: services/facturaService.test.ts:82, tests/rls_definer_garzi_bani_faza37.ts:90, 121.
6. Funcții edge din repo care ating domeniul: `supabase/functions/sms-parse-bank/index.ts` (interoghează `plati` pentru potrivire SMS; vezi I2). `sms-callback`, `sms-process-queue`, `sms-schedule-reminders`: nu ating plati/tranzactii.

## I2. Edge functions deployate

Citite prin MCP (`list_edge_functions` + `get_edge_function` pentru fiecare). Deployate: 4.

| slug | versiune | status | verify_jwt | în repo | corp repo = deployat | potriviri |
|---|---|---|---|---|---|---|
| sms-parse-bank | 3 | ACTIVE | false | da | **neverificat byte-exact** (repo 10 651 B/300 linii; corpul deployat are ~7 KB — probabil diferit; hash deployat 57e2e773...) | `from('plati')` SELECT (club_id, status='pending', suma în ±0.5) + **UPDATE plati SET status='achitat'**; ZERO referințe la modele paralele, plata_ids, suma_totala/incasata, tip_* |
| sms-callback | 2 | ACTIVE | false | da | neverificat | doar sms_queue; nicio potrivire |
| sms-schedule-reminders | 2 | ACTIVE | true | da | neverificat | doar RPC schedule_training_reminders; nicio potrivire |
| sms-process-queue | 3 | ACTIVE | true | da | neverificat | doar sms_queue/sms_config/sms_rate_log; nicio potrivire |

Constatări:
- **sms-parse-bank (deployat) este defect față de schema live**: filtrează `status = 'pending'` și scrie `status = 'achitat'`, dar `plati_status_check` acceptă doar 'Achitat'/'Neachitat'/'Achitat Parțial'/'Anulat'. Selectul nu returnează niciodată rânduri (nu există 'pending'); UPDATE-ul ar fi respins de CHECK. Nu atinge obiecte aflate în drop în 44-10. Nu e blocker; e raportat pentru decizia userului (în afara fazei).
- Funcții în repo și lipsă din deployat: `create-user-admin`, `delete-user-admin`, `send-push-notifications` (nu apar în listă — posibil deployate sub alt mecanism sau nedeployate; irelevante pentru domeniul financiar).
- Nicio funcție edge deployată nu folosește modele paralele, `plata_ids`, `suma_totala`, `suma_incasata`, `tip_plata`, `tip_abonament_id` -> nu se adaugă nimic la STOP.

## Verdict D-01

| tabel | rânduri | ultim write | referințe DB | referințe cod | verdict |
|---|---|---|---|---|---|
| alocari_plati | 83 | autoanalyze 2026-03-18 | FK -> incasari_efective, obligatii_plata; triggere trg_actualizeaza_finante, trg_actualizeaza_restanta; politica club_member_access; funcții fn_actualizeaza_restanta*, | zero | **SAFE-TO-ARCHIVE** (după drop funcții/triggere proprii) |
| incasari_efective | 83 | 2026-03-18 | FK din alocari_plati; funcția incasare_club_id; politica club_member_access | zero | **SAFE-TO-ARCHIVE** (după alocari_plati) |
| obligatii_plata | 159 | 2026-03-10 | FK din alocari_plati, **aplicare_reduceri (CASCADE), detalii_decont**; view vw_fisa_financiara_detaliata; funcții generate_monthly_fees, obligatie_club_id, fn_actualizeaza_restanta*; index idx_unica_viza_anuala | zero | **BLOCKED-BY** `aplicare_reduceri.obligatie_id` (FK CASCADE: un drop/DELETE ar șterge rânduri de reduceri; verificat nr. rânduri în 44-10), `detalii_decont.obligatie_id`, view `vw_fisa_financiara_detaliata` (de eliminat întâi) |
| plata | 50 | 2026-01-30 | FK spre catalog_pret; politica Staff_Full_Access | zero | **SAFE-TO-ARCHIVE** |
| catalog_pret | 2 | 2026-02-01 | FK din plata; view-uri articol_catalog, tranzactie_club, vedere_catalog_preturi_phi_hau, vedere_cluburi_catalog | zero | **BLOCKED-BY** cele 4 view-uri (de eliminat întâi, fără consumatori în cod) și tabelul `plata` |

Ordinea de drop fără CASCADE (copii primii):
1. view-uri: vw_fisa_financiara_detaliata, articol_catalog, tranzactie_club, vedere_catalog_preturi_phi_hau, vedere_cluburi_catalog.
2. triggere: trg_actualizeaza_finante, trg_actualizeaza_restanta pe alocari_plati; funcții: fn_actualizeaza_restanta, fn_actualizeaza_restanta_obligatie.
3. `alocari_plati`.
4. `incasari_efective` (+ incasare_club_id), `aplicare_reduceri.obligatie_id` (rezolvat explicit) și `detalii_decont.obligatie_id` (rezolvat explicit) apoi `obligatii_plata` (+ obligatie_club_id, generate_monthly_fees).
5. `plata`, apoi `catalog_pret`.
Exclusiv-pentru-ele (candidate la același drop): generate_monthly_fees, obligatie_club_id, incasare_club_id, fn_actualizeaza_restanta, fn_actualizeaza_restanta_obligatie, on_tranzactie_change? (nu: aceasta e pentru plata_ids), update_transaction_status (orfană, referă suma_totala/suma_incasata).
`aplicare_reduceri` și `detalii_decont`: NU sunt în lista D-01 — au FK spre `obligatii_plata`; contează rândurile lor (neinterogate aici; de numărat în 44-10/11).

## Verdict D-02

DB — scriitori `tranzactii.plata_ids`: `proceseaza_plata_factura(p_plata_id, p_suma_incasata, p_metoda_plata, p_data_plata, p_descriere_aditionala)`.
DB — cititori: `delete_exam_registration(p_inscriere_id)`, `seteaza_scutire_taxa(...)`, `on_tranzactie_change()` (orfană), `proceseaza_plata_factura` (citește). View-uri: `vedere_cluburi_tranzactii`, `view_istoric_plati_detaliat` (+ `vedere_cluburi_istoric_plati_detaliat` dependent). Politici: niciuna. Indexuri: niciunul.

Cod — trebuie schimbate ÎNAINTE de drop (scriitori + selecturi explicite):
- UserProfile.tsx:466-471 (update plata_ids la mutare factură), :533-538 (select explicit + update).
- services/facturaService.ts:372 (`.contains('plata_ids', ...)`).
- components/Plati/JurnalIncasari.tsx:127 (`plata_ids: []` la insert), :518-523 (select/destructurare + update status), :561, :805, :809.
- components/Plati/FinancialDashboard.tsx:92-93 (citește plata_ids[0]).
Acoperite de câmpul derivat în memorie din 44-06 (select('*')): utils/facturaDetaliu.ts:111,117,135; components/Plati/JurnalIncasari.tsx:631,663; UserProfile.tsx:931; types.ts:150.
DB — de schimbat înainte de drop: `proceseaza_plata_factura` (stop scrierea), `delete_exam_registration` și `seteaza_scutire_taxa` (citire prin tranzactie_plata), view-urile `vedere_cluburi_tranzactii`, `view_istoric_plati_detaliat`.
Edge functions deployate: nicio utilizare.

## Verdict D-03

Căile INSERT în `plati`:
- DB: `factureaza_viza_taxa` (club_id: da), `generare_factura_examen` x2 (club_id: da).
- Cod (16 locuri, secțiunea I.5): club_id furnizat **neverificat per loc**; CalendarView.tsx:213/243 sunt cunoscute fără club_id (CONTEXT).
Derivabil (sportiv_id sau familie_id mereu setat): la rândurile existente DA (0 rânduri fără nicio cale; 90 din sportivi + 6 din familii). La inserturi viitoare: neverificat per loc.
**Recomandare: NOT NULL sigur: doar după** (1) backfill din sportivi (90) și din `familii.club_id` (6), (2) trigger BEFORE INSERT care completează club_id din sportiv/familie (planul 44-03), (3) corectarea inserturilor din CalendarView.tsx:213/243 și verificarea per loc a celorlalte (44-04).

## Verdict SC-01

| coloană | referită | drop sigur |
|---|---|---|
| plati.tip_plata | da: view-uri rbv_plati_club, vedere_cluburi_financiar, vedere_cluburi_plati, view_plata_sportiv; cod: zero | **nu** (după reimplementarea celor 4 view-uri; atenție: default 'Abonament' pe toate 978, fără FK) |
| plati.tip_plata_id | da: view-uri rbv_plati_club, vedere_cluburi_plati; cod: services/produseService.ts:209,221, services/comenziService.ts:507,515,536 (scrie în plati); FK -> tipuri_plati | **nu** (scris din produse/comenzi; 0/978 rânduri completate) |
| plati.tip_abonament_id | da: view-uri rbv_plati_club, vedere_cluburi_plati; FK -> tipuri_abonament; cod: zero pe plati | **nu** până la reimplementarea view-urilor; 0/978 rânduri |
| tranzactii.suma_totala / suma_incasata | da: vedere_cluburi_tranzactii (ambele); cod: zero (doar alias/RPC/decont); 0 rânduri nenule | **nu** până la schimbarea view-ului vedere_cluburi_tranzactii; apoi da |

## Verdict SC-02 (Stagii eveniment_id)

`plati.eveniment_id` **NU EXISTĂ live** (secțiunea A). `StagiiCompetitii` este accesibilă: `components/Competitii/StagiiManagement.tsx` îl importează și îl montează cu `type="Stagiu"`.
Consecință: `components/Competitii/StagiiCompetitii.tsx:308-320` trimite `eveniment_id: eveniment.id` în INSERT -> PostgREST răspunde **PGRST204** (coloană inexistentă în cache-ul de schemă) și factura nu se creează; ștergerea la :623 (`.delete().eq('eveniment_id', id)`) eșuează/nu filtrează; filtrul din :369 (`p.eveniment_id === eveniment.id`) nu găsește nimic. Există 7 rânduri `Taxa Stagiu` live (create pe altă cale, ex. `sesiune_id`/vize). Bug confirmat din catalog; NEexecutat în aplicație (nu am rulat fluxul).

## Cluburi reale (candidați)

Singurul loc din care citesc planurile următoare. Candidați din activitate (userul confirmă în 44-07):
- CANDIDAT_REAL: C.S. Phi Hau `cbb0b228-b3e0-4735-9658-70999eb256c6` (483 sportivi, 464 plăți, 187 tranzacții, prezență 90z 246), Kim Long Dao Falticeni `83e7f771-46cf-4c4e-b70f-356d7b0bff06` (140, 363, 212, 0).
- De confirmat (activitate financiară mică, ultima plată 2026-11-09): Hâc Long Dao Brașov, Long Ho Pascani, Long Dao, Bao Bacau, Dao Iasi, He Pai Suceava (ID-urile în secțiunea H.1); Club Bogdan (1 sportiv, ultima plată 2026-03-03) — probabil TEST.
- "7 cluburi reale" nu se pot deduce din date; nu s-au marcat TEST pe nume.

## STOP

Nicio condiție STOP majoră. Verificat explicit:
- (a) Scrieri în modelele paralele din căi canonice: nu. Singurii scriitori sunt `generate_monthly_fees` (fără apelant în cod, cron sau edge function) și `fn_actualizeaza_restanta*` (triggere pe `alocari_plati`, care nu se mai scrie). Nicio edge function nu atinge modelele paralele. D-01 rămâne valid.
- (b) `plati.club_id` NU e NOT NULL (nullable, fără default) și `plati_completeaza_club_id_trg` NU există -> starea live coincide cu auditul.
- (c) `tranzactie_plata` are politică de SELECT pentru personalul clubului (club_member_access, ALL). Fără blocaj pentru 44-06.
- (d) Nicio funcție INSERT-into-plati fără sportiv/familie/club; ambele furnizează club_id.

De ținut cont (NU STOP, dar schimbă planurile):
1. **D-03: cele 6 plăți familie-only fără club sunt derivabile din `familii.club_id` (6/6)**; lista "pentru decizia userului" din auditul inițial devine goală. Recomandă backfill (cu OK).
2. **BLOCKED-BY în D-01:** `obligatii_plata` ← `aplicare_reduceri` (CASCADE) și `detalii_decont`; `catalog_pret` ← 4 view-uri. Rânduri din `aplicare_reduceri`/`detalii_decont` nenumărate.
3. **SC-01:** `plati.tip_plata_id` e scris de produseService/comenziService; nu poate fi drop-at fără schimbare de cod. Toate 4 coloanele candidate sunt referite de view-uri.
4. `sms-parse-bank` deployat e incompatibil cu `plati_status_check` ('pending'/'achitat'); nu atinge obiecte din faza 44, doar raportat.
5. `on_tranzactie_change` și `update_transaction_status` sunt funcții orfane (fără trigger).
6. `proceseaza_plata_factura` încă scrie `plata_ids` (singurul scriitor DB).

## Neverificat
- Corpurile deployate ale edge functions vs repo (doar comparație de dimensiune la sms-parse-bank).
- Funcția `trg_plata_confirmare_sms` (cum trimite SMS) — doar numele și că există.
- club_id per loc de INSERT din cod (16 locuri).
- Politicile RLS vs fișierele de migrare (politici ne-din-migrare).
- Numărul de rânduri din `aplicare_reduceri` și `detalii_decont`.
- Fluxul StagiiCompetitii nerulat în aplicație.
