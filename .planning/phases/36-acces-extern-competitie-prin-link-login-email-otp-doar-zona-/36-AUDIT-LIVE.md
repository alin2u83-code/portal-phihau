# 36-AUDIT-LIVE — Audit read-only pe baza LIVE (Faza 36, Wave 0)

- **Data:** 2026-11-05
- **Proiect Supabase:** `wuhidifzsutwgdfkwhmd`
- **Mod:** READ-ONLY (doar `SELECT`/`WITH`; nicio migratie, niciun DDL/DML). Executat inline de orchestrator prin MCP `execute_sql` (subagentul `gsd-executor` nu are tool-urile MCP Supabase — precedent 15-01/16-01).
- **GDPR:** documentul contine doar nume de politici/tabele/functii, UUID-uri de roluri de sistem si contoare. Nicio data personala.
- Output-ul de mai jos este extras din rezultatul brut `execute_sql` (predicatele sunt copiate exact; spatiile/newline-urile sunt comprimate).

---

## 1. Politici live (pg_policies)

Legenda: `RISC` = politica PERMISSIVE de scriere al carei predicat NU contine `has_access_to_club`/`is_super_admin`/comparatie cu un club ales din headerul de context. `ROL-ANY` = predicatul verifica doar ca utilizatorul ARE (la orice club) un rol din lista, nu ca rolul activ apartine clubului randului.

### 1.1 `inscrieri_competitie` (9 politici, RLS on + FORCE)

| politica | cmd | roles | predicat (qual / with_check) | verdict |
|---|---|---|---|---|
| `inscrieri_insert_club` | INSERT | public | `club_id = (SELECT club_id FROM urm WHERE user_id=auth.uid() LIMIT 1) OR EXISTS(urm WHERE user_id=auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))` | **RISC / ROL-ANY** — orice ADMIN_CLUB (la orice club) poate insera inscrieri pentru ORICE club |
| `inscrieri_update_club` | UPDATE | public | acelasi predicat ca mai sus (qual, fara with_check) | **RISC / ROL-ANY** |
| `inscrieri_delete_club` | DELETE | public | acelasi predicat | **RISC / ROL-ANY** |
| `rbv_ic_insert` | INSERT | authenticated | `has_access_to_club(club_id)` | OK (scoped) |
| `rbv_ic_update` | UPDATE | authenticated | `has_access_to_club(club_id)` (+ with_check) | OK |
| `rbv_ic_delete` | DELETE | authenticated | `has_access_to_club(club_id) AND EXISTS(urm ... rol IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))` | OK |
| `inscrieri_select` | SELECT | public | `auth.uid() IS NOT NULL` | **SELECT larg** — orice autentificat citeste toate inscrierile (D-16: se pastreaza pt rolurile interne; vezi DEC-7) |
| `rbv_ic_own` | SELECT | authenticated | `sportiv_id = get_own_sportiv_id()` | OK |
| `rbv_ic_staff` | SELECT | authenticated | `has_access_to_club(club_id)` | OK |

### 1.2 `echipe_competitie` (4) si `echipa_sportivi` (2)

| tabel | politica | cmd | predicat | verdict |
|---|---|---|---|---|
| echipe_competitie | `echipe_insert_club` | INSERT | `club_id = (SELECT club_id FROM urm WHERE user_id=auth.uid() LIMIT 1) OR EXISTS(urm ... IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))` | **RISC / ROL-ANY** |
| echipe_competitie | `echipe_update_club` | UPDATE | acelasi | **RISC / ROL-ANY** |
| echipe_competitie | `echipe_delete_club` | DELETE | acelasi | **RISC / ROL-ANY** |
| echipe_competitie | `echipe_select` | SELECT | `auth.uid() IS NOT NULL` | SELECT larg |
| echipa_sportivi | `echipa_sportivi_manage` | ALL | `EXISTS(echipe_competitie e WHERE e.id=echipa_id AND (e.club_id=(SELECT club_id FROM urm WHERE user_id=auth.uid() LIMIT 1) OR EXISTS(urm ... IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))))` | **RISC / ROL-ANY** (ALL = si SELECT/INSERT/UPDATE/DELETE) |
| echipa_sportivi | `echipa_sportivi_select` | SELECT | acelasi predicat ca `manage` | **SELECT larg efectiv** (orice ADMIN_CLUB citeste tot) |

Nota: `(SELECT club_id FROM urm WHERE user_id=auth.uid() LIMIT 1)` alege un rand ARBITRAR al utilizatorului (nu cel din headerul `active-role-context-id`) — un utilizator multi-rol poate scrie pe clubul gresit. Niciuna din cele 7 politici de mai sus nu verifica statusul competitiei sau deadline-ul.

### 1.3 `competitii`, `probe_competitie`, `categorii_competitie`

| tabel | politica | cmd | roles | predicat | verdict |
|---|---|---|---|---|---|
| competitii | `competitii_insert_admin` | INSERT | public | `EXISTS(urm WHERE user_id=auth.uid() AND rol IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))` | **RISC** — orice ADMIN_CLUB creeaza competitii |
| competitii | `competitii_update_admin` | UPDATE | public | acelasi | **RISC** — orice ADMIN_CLUB modifica ORICE competitie (status, deadline, taxe) |
| competitii | `competitii_delete_admin` | DELETE | public | acelasi | **RISC** — orice ADMIN_CLUB sterge ORICE competitie |
| competitii | `competitii_select_all` | SELECT | public | `auth.role()='authenticated'` | SELECT larg (citirea competitiei e dorita si pt extern) |
| probe_competitie | `probe_manage_admin` | ALL | public | `EXISTS(urm ... IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))` | **RISC** |
| probe_competitie | `probe_select_all` | SELECT | public | `auth.role()='authenticated'` | SELECT larg |
| categorii_competitie | `categorii_manage_admin` | ALL | public | `EXISTS(urm ... IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))` | **RISC** |
| categorii_competitie | `categorii_select_all` | SELECT | public | `auth.role()='authenticated'` | SELECT larg |

### 1.4 Tabele de referinta si adiacente

| tabel | politici (cmd) | note |
|---|---|---|
| `cereri_coechipier` | `_super_admin` ALL `is_super_admin()`; `_club_insert` INSERT (`club_solicitant_id=get_active_club_id()` + rol ADMIN_CLUB); `_club_select` SELECT (`club_solicitant_id=get_active_club_id() OR is_super_admin()`); `_club_anulare` UPDATE | scoped pe club; extern = DENY (inter-club dezactivat, D-14) |
| `solicitari_echipe_incomplete` | insert/select/update/delete; `_select` = orice rol din (SUPER_ADMIN_FEDERATIE, ADMIN, ADMIN_CLUB, INSTRUCTOR) la ORICE club | select larg pe staff intern; extern = DENY |
| `inlantuiri`, `inlantuiri_grade` | `_select_all` SELECT `true` (public); `_write_federatie` ALL doar SUPER_ADMIN_FEDERATIE | referinta citibila; scriere federatie |
| `arme` | `arme_select` SELECT `true`; `arme_write_federatie` ALL `get_active_role()='SUPER_ADMIN_FEDERATIE'` | referinta |
| `cerinte_stagii_cvd` | `_select_all` SELECT `true`; `_write_federatie` ALL SUPER_ADMIN_FEDERATIE | referinta |
| `sportiv_arme`, `competitie_sportiv_arme` | select/insert/update/delete scoped prin `has_access_to_club(s.club_id)` + (`get_active_role() IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB')`) + (csa: `competitii.status='inscrieri_deschise'`) | corecte; scrierea necesita rol ADMIN_CLUB/SUPER_ADMIN → extern NU va putea scrie arme decat daca se extinde (vezi DEC-7) |
| `stagii_cvd_participare` | insert/update/delete: `EXISTS(urm ... IN ('ADMIN_CLUB','SUPER_ADMIN_FEDERATIE','ADMIN_FEDERATIE'))` (ROL-ANY); select: sportivi din clubul determinat de `sportivi.user_id=auth.uid()` sau federatie | **RISC ROL-ANY** (in afara scopului 36-04: stagii, nu competitii; se noteaza ca risc rezidual) |
| `sportivi` | 9 politici; `Select_Sportivi_Unified` SELECT public: `is_super_admin() OR club_id=<club din headerul de context> OR EXISTS(inscrieri_competitie ic WHERE ic.sportiv_id=sportivi.id) OR EXISTS(echipa_sportivi es WHERE es.sportiv_id=sportivi.id) OR is_sportiv_candidat_comisie(id)` | **ATENTIE**: orice sportiv cu o inscriere la competitie este citibil de ORICE autentificat (inclusiv extern) → cross-club leak pt extern (DEC-7); `POLITICA_FINALA_SPORTIVI_V3` ALL (`user_id=auth.uid() OR este_staff_club(club_id) OR familie`); `Staff - Manage Own Club Sportivi` ALL `has_access_to_club(club_id)`; `rbv_sportivi_insert` INSERT: orice urm cu rol IN (SUPER_ADMIN_FEDERATIE, ADMIN_CLUB, INSTRUCTOR) la ORICE club (ROL-ANY, fara club in with_check) |
| `vize_sportivi` | select scoped (`is_super_admin() OR has_access_to_club(club_id) OR sportiv in club OR urm.sportiv_id`); insert/update/delete doar `is_super_admin()` | extern = DENY direct (taxele clubului se citesc prin RPC, D-08) |
| `grade` | 6 politici: `Anyone read grade`/`Grade vizibile tuturor`/`grade_public_select` SELECT `true` (3 duplicate), `Staff_Full_Access` ALL `este_staff_autorizat()`, `SuperAdmin*` ALL | referinta citibila |
| `cluburi` | 10 politici; `cluburi_public_select` SELECT `true` (authenticated), `CLUBURI_SELECT` SELECT authenticated; scriere: super admin / ADMIN_CLUB propriu | referinta citibila |
| `tipuri_competitie` | `_select_all` SELECT `true`; `_admin_only` ALL (SUPER_ADMIN_FEDERATIE,'ADMIN') | referinta |
| `utilizator_roluri_multicont` | `SuperAdmin_Gestioneaza_Toate_Rolurile` ALL `is_super_admin()`; `Utilizator_Isi_Vede_Propriile_Roluri` SELECT `(SELECT auth.uid())=user_id` | doar SELECT propriu pt utilizator (scrierea e doar super admin / service role) — OWN-ONLY |
| `roluri` | `Bypass_Super_Admin` ALL (urm cu rol SUPER_ADMIN_FEDERATIE, la orice club) | scriere doar federatie; **fara politica SELECT pt non-admin** (RLS+FORCE → un utilizator obisnuit nu citeste `roluri`) |
| `mfa_email_verificari` | insert/select/update `user_id=auth.uid()` | own |
| `cereri_inregistrare` | `Public Insert` INSERT public (`club_id IN (SELECT id FROM cluburi)`); staff select/update `has_access_to_club(club_id)` | referinta pt modelul "cerere publica" |

**Politici fantoma (live dar absente din fisierele de migrare):** NU s-a rulat o comparatie fisier-vs-live exhaustiva in acest plan (cere `grep` pe numele de politici in `supabase/migrations/**` + `sql/**`). Constatare partiala: `echipe_*_club`, `inscrieri_*_club`, `echipa_sportivi_manage`, `competitii_*_admin`, `probe_manage_admin`, `categorii_manage_admin` sunt exact politicile din `20260319_competitii_schema.sql` (bug D-15, nu fantome). Politicile `rbv_ic_*` provin din migrarea RLS role-based-views. Nicio politica cu `USING (true)` pe scriere in tabelele de competitie → **nu exista scriere deschisa publica**; riscul real este ROL-ANY (cross-club prin rol la alt club).

### 1.5 Candidati DROP (lista consumata de 36-04)

`inscrieri_competitie`: `inscrieri_insert_club`, `inscrieri_update_club`, `inscrieri_delete_club`
`echipe_competitie`: `echipe_insert_club`, `echipe_update_club`, `echipe_delete_club`
`echipa_sportivi`: `echipa_sportivi_manage` (ALL) — inlocuita cu politici separate scoped
`competitii`: `competitii_insert_admin`, `competitii_update_admin`, `competitii_delete_admin`
`probe_competitie`: `probe_manage_admin`
`categorii_competitie`: `categorii_manage_admin`

---

## 2. RLS flags si view-uri

- **Tabele (relkind `r`):** TOATE cele 120+ tabele din `public` au `relrowsecurity = true`. FORCE RLS (`relforcerowsecurity = true`) este activ pe aproape toate; exceptii (FORCE = false, RLS = true): `auth_alerte_trimise`, `auth_dispozitive_cunoscute`, `auth_email_events`, `auth_email_praguri`, `auth_tentative_login`.
- **(a) Tabele cu RLS dezactivat:** niciuna.
- **(b) View-uri fara `security_invoker=true` (candidate "definer", pot ocoli RLS):** `vedere_istoric_grade_sportiv` (reloptions null), `vedere_prezenta_sportiv` (reloptions null). Toate celelalte ~85 de view-uri au `security_invoker=true` (sau `=on`: `view_istoric_grade_sportivi`). `rbv_sportivi_complet`: `security_invoker=true` — OK.
- **(c) FORCE RLS:** vezi mai sus (memoria `feedback_rls_force_security_definer_recursion`: functiile SECURITY DEFINER detinute de `postgres` ocolesc RLS doar daca rolul owner are BYPASSRLS; verificat mai jos la helperi: owner = `postgres`).
- Tabele noi ale fazei (`acces_competitie_extern`, `cereri_acces_competitie`) NU exista inca (se creeaza in 36-02).
- Tabele cu 0 politici (RLS on + FORCE = totul blocat): `mfa_dispozitive_incredere`, mai multe `scoala_ioncreanga_*` — irelevante pentru acest plan.

---

## 3. utilizator_roluri_multicont si roluri

**Coloane `utilizator_roluri_multicont`:** `id uuid NOT NULL default gen_random_uuid()`, `user_id uuid NOT NULL`, `rol_denumire text NOT NULL`, `club_id uuid NULL`, `sportiv_id uuid NULL`, `rol_id uuid NULL`, `is_primary boolean NOT NULL default false`, `nume_utilizator_cache text NULL`, `created_at timestamptz NULL default now()`.

**Coloane `roluri`:** `id uuid NOT NULL default gen_random_uuid()`, `nume text NOT NULL`, `created_at timestamptz NULL default now()`.

**Constrangeri:**
- `roluri_pkey PRIMARY KEY (id)`, `roluri_nume_key UNIQUE (nume)`.
- `utilizator_roluri_multicont`: PK(id); FK `user_id → auth.users(id) ON DELETE CASCADE`; FK `club_id → cluburi(id)` (nullable); FK `sportiv_id → sportivi(id) ON DELETE CASCADE`; FK `rol_id → roluri(id) ON DELETE CASCADE`; UNIQUE `(user_id, rol_denumire, club_id, sportiv_id)`, UNIQUE `(user_id, rol_denumire, sportiv_id)` (`unique_user_role_context_final`), UNIQUE `(user_id, rol_denumire, club_id)` (`user_role_club_unique`).
- **NU exista CHECK pe `rol_denumire`** (text liber) si **NU exista NOT NULL pe `club_id`**.
- Atentie la unicitati cu NULL: in Postgres NULL-urile sunt distincte in UNIQUE, deci mai multe randuri `(user, 'REPREZENTANT_COMPETITIE', NULL, NULL)` NU sunt respinse de constrangeri (nici nu e dorit mai mult de un rand per user in logica aplicatiei).

**Continut `roluri` (live):** `ADMIN_CLUB` (18f77e02-…), `SUPER_ADMIN_FEDERATIE` (379f605c-…), `Admin` (578cbbca-…), `INSTRUCTOR` (62c9e326-…), `SPORTIV` (d00ca8ec-…). **`REPREZENTANT_COMPETITIE` nu exista.**

**Triggere pe `utilizator_roluri_multicont` (nu-interne):**
1. `tr_fill_role_id` BEFORE INSERT → `tr_completeaza_rol_id()` (SECURITY DEFINER): daca `rol_id IS NULL` il completeaza din `roluri WHERE nume = rol_denumire` (ramane NULL daca rolul nu exista in `roluri`); daca `nume_utilizator_cache IS NULL` il seteaza din `auth.jwt() ->> 'full_name'` (NULL cand inserarea se face cu service role — acceptabil, coloana e nullable).
2. `tr_automatizeaza_roluri` BEFORE INSERT OR UPDATE → `fn_automatizeaza_legatura_utilizator()` (SECURITY DEFINER): daca `sportiv_id IS NULL`, **leaga automat de un sportiv dupa email** (`sportivi.email = auth.users.email`, `LIMIT 1`) — pentru un cont extern al carui email coincide cu al unui sportiv, `sportiv_id` s-ar seta automat (DEC-9); daca `is_primary = true` pune `is_primary=false` pe celelalte randuri ale user-ului; daca `is_primary IS NULL` il deduce.
3. `tr_first_role_primary` BEFORE INSERT → `handle_first_role_primary()`: daca utilizatorul nu are niciun rand primar, noul rand devine primar.
4. `on_role_change_sync_metadata` AFTER INSERT OR UPDATE → `sync_user_metadata()` (SECURITY DEFINER): scrie `raw_user_meta_data.has_multiple_roles = true` in `auth.users` (indiferent de rol; inofensiv).
5. `audit_roluri` AFTER INSERT/UPDATE/DELETE → `audit_trigger_fn()`.

**Triggere pe `auth.users`:** doar `on_auth_user_email_updated` AFTER UPDATE OF email → `sync_email_to_sportivi()` (actualizeaza `sportivi.email` unde `sportivi.user_id = new.id`). **NU exista trigger de INSERT pe auth.users** (nu se creeaza automat sportiv/rol la crearea contului — `handle_new_user_phihau` exista ca functie dar nu e atasata la `auth.users`).

**Triggere pe `inscrieri_competitie`:** `audit_inscrieri_competitie` (audit), `trg_taxa_anuala_inscrieri_competitie` AFTER INSERT → `trg_activeaza_taxa_anuala('sportiv_id')` (SECURITY DEFINER, `activeaza_taxa_anuala(sportiv_id)`) — **la inscriere se activeaza taxa anuala a sportivului**; efect secundar legitim, la fel pentru extern. **`echipe_competitie` si `echipa_sportivi`:** niciun trigger.

---

## 4. Helperi (definitii live)

Toti `postgres`-owned, `SECURITY DEFINER`, `search_path` fixat, STABLE.

- `has_access_to_club(p_club_id)`: `EXISTS(urm WHERE user_id=auth.uid() AND id = <active-role-context-id din header> AND (rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN') OR (club_id = p_club_id AND rol_denumire IN ('ADMIN_CLUB','INSTRUCTOR'))))` → context-aware prin header. **Un rand REPREZENTANT_COMPETITIE nu va satisface niciodata aceasta functie** (bine: extern nu primeste acces prin helperii existenti).
- `is_super_admin()`: header + `rol_denumire='SUPER_ADMIN_FEDERATIE'`. Context-aware.
- `get_active_role()`: citeste rolul din randul `urm.id = header AND user_id = auth.uid()`; fallback la randul `is_primary`; **fallback final `'SPORTIV'`** (!). Pt un cont extern fara header valid → `REPREZENTANT_COMPETITIE` doar daca randul e primar sau headerul e corect.
- `get_active_club_id()` (fara arg): din header → `club_id` al randului; fallback `is_primary`. Cu `club_id NULL` intoarce NULL.
- `este_staff_club(p_club_id)`: header + `club_id = p_club_id` + rol IN (ADMIN_CLUB, INSTRUCTOR).
- `este_staff_autorizat()`: `get_active_role_context()` + ADMIN_CLUB/INSTRUCTOR la clubul activ.
- `get_own_sportiv_id()`: `SELECT sportiv_id FROM urm WHERE user_id = auth.uid() AND rol_denumire = 'SPORTIV' LIMIT 1` (NU context-aware, dar legat de rolul SPORTIV).

Concluzie: helperii sunt context-aware prin `active-role-context-id` (ca in `sql/migrations/fix_rls_context_aware_role_helpers.sql`). Clientul extern trebuie sa trimita headerul; 36-02 va adauga helperi proprii (`este_reprezentant_competitie`, `are_acces_extern_competitie(competitie, club)`), nu va modifica pe cei existenti.

**Coloane reale (live):**
- `inscrieri_competitie`: id, competitie_id, categorie_id, club_id, sportiv_id, status, taxa_achitata, observatii, created_at, echipa_incompleta, club_partener_id, borderou_club_id, inlantuire_id, inlantuire_id_2, arma_id.
- `echipe_competitie`: id, competitie_id, categorie_id, club_id, denumire_echipa, status, taxa_achitata, observatii, created_at, echipa_incompleta, inlantuire_id, arma_id.
- `echipa_sportivi`: id, echipa_id, sportiv_id, rol.
- `competitii`: id, denumire, tip, data_inceput, data_sfarsit, locatie, organizator, status, deadline_inscrieri, club_id, taxa_individual, taxa_echipa, observatii, created_at, updated_at, legacy_eveniment_id, config_taxe.
- `vize_sportivi`: id, sportiv_id, an, plata_id, data_platii, status_viza, observatii, created_at, tip, club_id, scutit, motiv_scutire, scutit_de, scutit_la.
- `cluburi`: id, nume, cif, oras, federatie_id, created_at, theme_config, logo_url, slug, tema_config, perioada_gratie_zile, factura_automata_inscriere.
- Confirmat: `taxa_achitata`, `status`, `echipa_incompleta`, `inlantuire_id`, `arma_id`, `tip`, `an`, `scutit`, `plata_id` exista. (`plati` nu s-a interogat; read-only taxe se face prin RPC din `vize_sportivi`.)

---

## 5. Inventar tabele public

Total: ~120 tabele (toate RLS on) + ~85 view-uri (toate `security_invoker` exceptand 2). Impartire pentru rolul `REPREZENTANT_COMPETITIE` (verificat cu `grep from('` in `components/Competitii/**`, `services/armeCvdService.ts`, `hooks/useArmeCvd.ts`, `hooks/useTipuriCompetitie.ts`, `hooks/useInlantuiriGrade.ts`):

- **(a) ALLOW-SCOPED** (citire/scriere doar pt competitia + clubul din grant): `competitii` (SELECT doar competitia granted), `probe_competitie`, `categorii_competitie` (SELECT doar ale competitiei granted), `inscrieri_competitie`, `echipe_competitie`, `echipa_sportivi` (SELECT+scriere doar `club_id` din grant si `competitie_id` din grant), `sportivi` (doar sportivii clubului din grant), `sportiv_arme`, `competitie_sportiv_arme`, `stagii_cvd_participare` (citire doar club din grant, daca wizardul CVD le citeste).
- **(b) ALLOW-REFERINTA-READ** (SELECT global, date non-personale): `grade`, `cluburi` (doar coloane non-sensibile — vezi nota), `tipuri_competitie`, `inlantuiri`, `inlantuiri_grade`, `arme`, `cerinte_stagii_cvd`. `drepturi_grad_competitie`: NU exista in `public` (nu apare in inventar) — de ignorat.
- **(c) OWN-ONLY:** `utilizator_roluri_multicont` (SELECT propriu — politica existenta `Utilizator_Isi_Vede_Propriile_Roluri` e suficienta), `roluri` (nu e necesar), `acces_competitie_extern` si `cereri_acces_competitie` (noi, 36-02: extern vede doar propriile randuri).
- **(d) DENY** (restul): plati/facturi/tranzactii/decont*, sali/grupe/orar/prezenta, examene*, istoric_grade, vize_medicale, produse*, sms_*, familii, notificari, knowledge_base, audit_log, federatie, cereri_gdpr, cereri_inregistrare, mfa_*, auth_*, scoala_ioncreanga_*, **`cereri_coechipier`, `solicitari_echipe_incomplete`** (inter-club dezactivat D-14), `rezultate`, `evenimente`, `categorii_template`, `vize_sportivi` (acces direct; taxele se arata prin RPC), `tipuri_stagii`, `plati`.
- Tabele citite in cod de `Competitii/index.tsx` dar in afara listelor: `rezultate`, `evenimente` (tab Rezultate/legacy) → ascunse in modul `extern` (36-03) si DENY in RLS.

Nota `cluburi`: `cluburi_public_select` da SELECT `true` pe toate coloanele pt orice autentificat (cif, perioada_gratie_zile, factura_automata_inscriere). Pt extern e acceptabil ca ALLOW-REFERINTA-READ dar nu e sensibil financiar; se noteaza ca risc scazut.

---

## 6. Suprafata RPC

Interogare: functii `public`, `prosecdef`, EXECUTE pentru `authenticated`. Rezultat: ~140 functii. Flag "garda aparenta" = corpul contine `auth.uid()`, `has_access_to_club`, `is_super_admin`, `get_active_role` sau `este_staff`.

**Functii FARA garda aparenta care returneaza/modifica date (risc rezidual pt un cont extern; euristica — pot exista verificari prin alte helpere, de reconfirmat in 36-11):**

| functie | returneaza | severitate | nota |
|---|---|---|---|
| `adauga_sportiv_complet(...p_parola, p_club_id...)` | uuid | **CRITIC** | creeaza cont+sportiv la orice club; fara garda |
| `export_sportivi_selectati(p_sportivi_ids uuid[])` | TABLE cu CNP, adresa, pasaport | **CRITIC** | export date personale pe lista de UUID-uri arbitrara |
| `decrypt_cnp(cnp_encrypted)` / `encrypt_cnp` | text | **RIDICAT** | decripteaza CNP daca primesti ciphertext |
| `get_all_app_data()` | jsonb | **RIDICAT** | dump aplicatie (de verificat filtrarea) |
| `cauta_utilizatori_comisie(p_query)` | TABLE(nume, prenume, club) | MEDIU | cautare nume cross-club |
| `check_user_access`, `get_user_context(s)`, `get_primary_user_context`, `get_active_club_id(p_user_id)` | context/rol pe orice user_id | MEDIU | enumerare roluri altor useri |
| `generare_factura_examen`, `genereaza_taxe_anuale`, `process_exam_row_v4`, `proceseaza_incasare_normalizata`, `recalculare_stare_plata`, `raport_taxe_anuale_cluburi`, `get_next_eligible_grade` | json/jsonb/TABLE | RIDICAT (financiar/scriere) | fara garda aparenta |
| `*_club_id` (cerere_gdpr_sportiv_club_id, fisa_practicant_club_id, incasare_club_id, obligatie_club_id, plata_club_id) | uuid | SCAZUT | lookup id→club |
| `inregistreaza_email_auth(p_tip,p_reusit)` | void | SCAZUT | log |
| `scoala_ioncreanga_*` | diverse | n/a | protejate de `p_secret`, alt proiect |
| trigger functions (`sync_*`, `tr_*`, `handle_*`, `set_default_*`, `audit_*`) | trigger | n/a | nu sunt apelabile direct ca RPC util |

Nu s-a modificat nicio functie. Revoke EXECUTE pentru `authenticated`/`anon` pe cele CRITIC/RIDICAT = obiectiv 36-11 / 36-12 (sau faza dedicata), NU in 36-08.

---

## 7. storage.objects

Politici `storage` (live):
- `Avatare accesibile public` SELECT `bucket_id='avatars'` (role public) — avatarele sunt publice (nu sensibil).
- `Utilizatorii logati pot incarca poze` INSERT `bucket_id='avatars' AND auth.role()='authenticated'` → un cont extern **POATE incarca** in bucket-ul `avatars` (fara filtru de proprietar/club). Risc: abuz de stocare; severitate SCAZUTA, fara citire cross-club (bucket public oricum).
- `chitante_deconturi_insert_club` / `_select_club`: filtrate prin `poate_gestiona_taxe_club(club din cale)` → un rol extern nu satisface (functia verifica roluri interne) → blocat. OK.
Nicio politica `authenticated` fara filtru de bucket cu acces la documente/fotografii private.

---

## 8. Proba A4 signInWithOtp

Apel echivalent cu `signInWithOtp({ email, options: { shouldCreateUser: false } })`:
`POST {SUPABASE_URL}/auth/v1/otp` cu `{"email":"zz-nu-exista-faza36@example.com","create_user":false}` (cheie anon, email inexistent; nu s-a trimis niciun mail real, nu s-a creat utilizator).

Raspuns real: **HTTP 422**, body `{"code":422,"error_code":"otp_disabled","msg":"Signups not allowed for otp"}`.

Concluzie: **A4 CONFIRMAT** — pentru un email fara cont raspunsul NU este silentios: `status=422`, `error_code=otp_disabled`, `message="Signups not allowed for otp"`. Este distinct de limita de emailuri (Supabase intoarce `429` cu `over_email_send_rate_limit` / `over_request_rate_limit`). Deci UI-ul poate ramifica sigur: `error_code === 'otp_disabled'` (sau status 422) → afiseaza "Nu ai cont? Solicita acces" (formularul `SolicitaContForm`); `429`/`over_*_rate_limit` → "Prea multe incercari, reincearca mai tarziu". Atentie enumerare de conturi: raspunsul dezvaluie daca un email are cont (acceptat; cererea de cont oricum necesita aprobare federatie, iar `emailMfaService` are acelasi comportament deja in productie). Limita implicita de emailuri Auth: vezi `docs/auth-configurare-supabase.md` (SMTP custom spatiul.ro, plan 32-08 pe checkpoint).

---

## 9. DECIZII

- DEC-1: **`rol_denumire` se scrie EXPLICIT** la INSERT (nu il completeaza niciun trigger; coloana e `NOT NULL` si fara default). Randul REPREZENTANT_COMPETITIE se insereaza cu: `user_id` (NOT NULL), `rol_denumire='REPREZENTANT_COMPETITIE'`, `club_id=NULL`, `sportiv_id=NULL`, `is_primary=true` (vezi DEC-9), `rol_id` completat de `tr_fill_role_id` din `roluri.nume` (doar daca randul exista — vezi DEC-3), `nume_utilizator_cache` lasat NULL sau setat explicit de endpoint. Fapt: coloane + trigger `tr_completeaza_rol_id`. Consumatori: 36-02 (test), 36-06 (endpoint).
- DEC-2: **`club_id` este NULLABLE** pe `utilizator_roluri_multicont` (FK spre `cluburi`, fara NOT NULL, fara CHECK, niciun trigger nu cere club_id) → **NU este nevoie de `DROP NOT NULL`**. Recomandarea din RESEARCH Q4.6 se CONFIRMA: randul de rol are `club_id = NULL`, iar clubul (si competitia) traiesc doar in `acces_competitie_extern`. Fapt: `information_schema.columns` (`is_nullable=YES`), `pg_constraint` (doar FK). Consumator: 36-02. De urmarit: politicile existente care compara `urm.club_id = ...` nu vor potrivi niciodata randul extern (comportament dorit).
- DEC-3: **`roluri` NU contine `REPREZENTANT_COMPETITIE`** (live: ADMIN_CLUB, SUPER_ADMIN_FEDERATIE, Admin, INSTRUCTOR, SPORTIV). Forma: `INSERT INTO roluri (nume) VALUES ('REPREZENTANT_COMPETITIE') ON CONFLICT (nume) DO NOTHING` (coloane: `id` default, `nume` NOT NULL UNIQUE, `created_at` default). `rol_id` nu este obligatoriu (nullable), dar insertia in `roluri` face ca `tr_fill_role_id` sa-l completeze si pastreaza consecventa cu rolurile interne. Politica `Bypass_Super_Admin` e singura pe `roluri` (scriere doar federatie; un non-admin nu citeste `roluri`). Consumator: 36-02.
- DEC-4: **Politici PERMISSIVE de scriere de eliminat** (toate ROL-ANY; din `20260319_competitii_schema.sql`, aplicate live exact asa):
  - `inscrieri_competitie`: `inscrieri_insert_club` (INSERT), `inscrieri_update_club` (UPDATE), `inscrieri_delete_club` (DELETE) — predicat: `club_id = (SELECT club_id FROM urm WHERE user_id=auth.uid() LIMIT 1) OR EXISTS(urm WHERE user_id=auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))`.
  - `echipe_competitie`: `echipe_insert_club`, `echipe_update_club`, `echipe_delete_club` — acelasi predicat.
  - `echipa_sportivi`: `echipa_sportivi_manage` (ALL) — predicat prin `echipe_competitie` cu aceeasi logica; **include SELECT** (deci `echipa_sportivi_select` e redundanta si egal de larga).
  - Inlocuire in 36-04 prin politici `has_access_to_club(<club_id al echipei/inscrierii>)` + gate-uri status/deadline/coerenta (D-13: si INSTRUCTOR; politicile `rbv_ic_*` existente pe inscrieri raman). Nu exista politici fantoma suplimentare descoperite pe aceste 3 tabele. **NU se ating politicile SELECT** (`inscrieri_select`, `echipe_select`, `echipa_sportivi_select` — vezi DEC-7).
- DEC-5: **DA, scrierea pe `competitii`, `probe_competitie`, `categorii_competitie` este permisa oricarui ADMIN_CLUB** (la orice club): `competitii_insert_admin`/`competitii_update_admin`/`competitii_delete_admin`, `probe_manage_admin` (ALL), `categorii_manage_admin` (ALL); predicat `EXISTS(urm WHERE user_id=auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))`. **36-04 le inlocuieste** cu `get_active_role() IN ('SUPER_ADMIN_FEDERATIE','ADMIN')` pe context activ (header). **ATENTIE (impact app):** in portalul curent adminii de club creeaza/gestioneaza competitii (si competitii cu `club_id` propriu — coloana `competitii.club_id` exista). Restrictionarea la federatie ar rupe fluxul clubului organizator; recomandare: permitere scriere pentru `has_access_to_club(competitii.club_id)` (organizator) SAU federatie, nu doar federatie. Decizie finala la planificarea 36-04 (marcata **SCHIMBARE FATA DE PLAN: de rafinat**).
- DEC-6: **View-uri fara `security_invoker`**: `vedere_istoric_grade_sportiv`, `vedere_prezenta_sportiv` (reloptions null). Niciuna nu este in zona competitii; expun istoric grade / prezenta. Risc pentru extern: citire cross-club daca view-ul face join pe tabele cu acces deschis → de inclus in lista DENY (REVOKE SELECT de la extern nu este posibil per rol aplicativ → rezolvat prin `security_invoker=true` in 36-08 sau 36-11 dupa verificarea consumatorilor). `rbv_sportivi_complet` OK (`security_invoker=true`). Consumatori: 36-08, 36-11.
- DEC-7: **Liste finale** = sectiunea 5 (ALLOW-SCOPED / ALLOW-REFERINTA-READ / OWN-ONLY / DENY). **Probleme de scoping pentru 36-08 (SELECT-urile largi existente nu pot fi lasate asa pt extern):** (i) `inscrieri_select`, `echipe_select` = `auth.uid() IS NOT NULL`; `echipa_sportivi_manage`/`_select` = orice ADMIN_CLUB; `competitii_select_all`/`probe_select_all`/`categorii_select_all` = orice autentificat; (ii) `Select_Sportivi_Unified` expune orice sportiv care are inscriere/echipa. Deoarece politicile PERMISSIVE se aduna prin OR, scopingul extern se obtine prin **politici RESTRICTIVE** `AS RESTRICTIVE ... USING (get_active_role() IS DISTINCT FROM 'REPREZENTANT_COMPETITIE' OR <conditie de scope>)` pe fiecare tabel din (a) si DENY, nu prin modificarea politicilor interne (D-16: rolurile interne neatinse). **Storage:** extern poate INSERT in `avatars` (scazut); chitante blocate. **RPC fara garda** (sectiunea 6): `adauga_sportiv_complet` si `export_sportivi_selectati` CRITIC, `decrypt_cnp`/`get_all_app_data` RIDICAT → risc rezidual DOCUMENTAT; REVOKE EXECUTE in 36-11/12 sau faza de hardening (nu in 36-08). Consumatori: 36-08, 36-11, 36-12.
- DEC-8: **Ramura UI "fara cont" pe baza A4**: raspunsul pentru email inexistent este DISTINCT (HTTP 422, `error_code='otp_disabled'`, msg `Signups not allowed for otp`), deci `LoginOtp` poate detecta `error.code === 'otp_disabled'` (fallback `error.status === 422`) si afisa direct "Nu ai cont? Solicita acces"; pe `429`/`over_email_send_rate_limit`/`over_request_rate_limit` afiseaza mesaj de limita ("Prea multe cereri, reincearca peste cateva minute"). Pastreaza si linkul "Nu ai cont? Solicita acces" vizibil permanent (UX), nu doar ca ramura de eroare. Consumator: 36-05.
- DEC-9: **Efecte secundare triggere**: (1) `fn_automatizeaza_legatura_utilizator` (BEFORE INSERT/UPDATE) **leaga automat `sportiv_id` dupa email** (`LOWER(sportivi.email)=LOWER(auth.users.email)`) daca `sportiv_id IS NULL` → un reprezentant extern al carui email coincide cu al unui sportiv ar primi `sportiv_id` si ar putea satisface `get_own_sportiv_id()`/politici "own"; endpointul de aprobare (36-06) trebuie fie sa verifice ca emailul nu apartine unui sportiv, fie sa reseteze `sportiv_id := NULL` printr-un UPDATE dupa INSERT (triggerul ruleaza si la UPDATE, deci nu e suficient) — solutie recomandata: inserare cu `sportiv_id` explicit NULL nu ajuta (triggerul il completeaza); prin urmare **36-06 respinge/avertizeaza emailurile care exista in `sportivi.email`** sau 36-02 adauga o conditie in functia de trigger `IF NEW.rol_denumire = 'REPREZENTANT_COMPETITIE' THEN RETURN NEW` (modificare minimala, recomandata, in migratia 36-02). (2) `is_primary=true` dezactiveaza `is_primary` pe celelalte roluri ale aceluiasi user: pentru un user nou (fara alte roluri) e inofensiv; pentru un user intern existent care primeste ca al doilea rol REPREZENTANT_COMPETITIE, setarea `is_primary=false` explicit evita sa-i schimbe contextul implicit (triggerul `tr_first_role_primary` il face primar doar daca nu are alt primar). (3) `sync_user_metadata` scrie `has_multiple_roles=true` in `auth.users.raw_user_meta_data` — inofensiv. (4) `tr_completeaza_rol_id` lasa `rol_id` NULL daca `roluri` nu are randul (vezi DEC-3). (5) `auth.users` nu are trigger de INSERT → crearea contului prin Admin API (36-06) nu creeaza sportiv/rol automat; endpointul scrie singur randul de rol si grantul. (6) `trg_activeaza_taxa_anuala` (pe `inscrieri_competitie` INSERT) se declanseaza si pt inscrieri facute de extern — comportament dorit, de mentionat in UI. Consumator: 36-02, 36-06.

**SCHIMBARE FATA DE RESEARCH / PLAN:** (a) DEC-5 — restrictionarea scrierii pe `competitii/probe/categorii` doar la federatie ar rupe cluburile organizatoare; se rafineaza (organizator SAU federatie). (b) DEC-9 — trigger-ul de auto-legare `sportiv_id` dupa email este o capcana pentru rolul extern; se recomanda bypass in functia de trigger (36-02) si verificare in 36-06. (c) DEC-7 — SELECT-urile largi existente (`inscrieri_select`, `echipe_select`, `Select_Sportivi_Unified`) cer politici RESTRICTIVE in 36-08 (nu doar politici noi PERMISSIVE).
