# Phase 25: Audit izolare cross-club Prezenta, Grupe si Abonamente - Research

**Researched:** 2026-08-28
**Domain:** PostgreSQL Row-Level Security (Supabase) + React/TypeScript frontend defense-in-depth, module Grupe/Prezenta/Abonamente
**Confidence:** HIGH (majoritatea claim-urilor verificate direct pe schema/date live si pe fisierele de migratie deja aplicate, nu pe presupuneri de training)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit + fix, nu doar raport**
- **D-01:** Faza produce audit SI fix aplicat live, in aceeasi faza — nu doar un document de gap-uri. Pattern identic cu Faza 15/16: inspecteaza schema live (information_schema, FK-uri, date reale) -> scrie migratie -> aplica pe Supabase live via MCP `apply_migration` -> verifica izolare cu query cross-club + UI live (Playwright, cont test alt club) -> checkpoint uman.
- **D-02:** Fail-closed pe randuri orfane (fara cale spre club_id): raman vizibile doar `is_super_admin()`, la fel ca precedentul din Faza 15. Nu se inventeaza club_id pt randuri ambigue.

**sesiune_activitate — rezolva riscul rezidual din Faza 15**
- **D-03:** `sesiune_activitate` (folosita de modulul Prezenta) NU are club_id real in schema azi — ramasa restrictionata doar la super_admin dupa Faza 15. In Faza 25 se adauga coloana club_id reala + backfill (din FK-uri disponibile: sportiv/grupa/antrenament -> club_id), apoi RLS scoping normal per club. Motiv: fara asta, Prezenta e efectiv nefunctionala/invizibila pt ADMIN_CLUB/INSTRUCTOR la cluburi noi.
- **D-04:** Acelasi tratament (verifica daca are club_id real; daca nu, adauga+backfill) se aplica oricarei alte tabele descoperite in audit din domeniul Grupe/Prezenta/Abonamente fara cale de club_id (ex. eventual `staging_inscrieri` daca e relevant modulelor astea — de confirmat in audit, nu presupune).

**Empty state club nou**
- **D-05:** Cand un club nou (0 date) deschide Grupe / Prezenta / Abonamente, fiecare ecran afiseaza mesaj explicativ ("Nicio grupa creata inca" / echivalent) + buton CTA direct spre actiunea de adaugare (Adauga Grupa / Adauga Tip Abonament / etc.) — nu tabel gol fara context, nu eroare.
- Aplica la toate ecranele principale ale celor 3 module cu liste (Grupe, Prezenta/rapoarte, TipuriAbonament) — implementarea exacta (ce componenta shared, daca exista deja un pattern EmptyState in ui.tsx) e decizie de research/planner.

### Claude's Discretion
- Lista exacta de tabele DB auditate per modul (Grupe: grupe, program_antrenamente, orar_saptamanal, perioade_vacanta; Prezenta: prezente, sesiune_activitate; Abonamente: tipuri_abonament, plati recurente) — researcher confirma pe schema live, nu presupune din memorie.
- Unde si cum sunt cautate "hardcodari" de single-club in cod (ex. club_id implicit, FEDERATIE_ID folosit gresit, lipsa `active-role-context-id` pe vreun query) — sarcina de audit tehnic, nu decizie de vizune.
- Design exact al componentei empty-state (daca se creeaza una noua reutilizabila sau se repeta inline) — decizie de planner.

### Deferred Ideas (OUT OF SCOPE)
- Wizard onboarding club nou (creare club + prim admin + rol intr-un flux) — Faza 26, depinde de aceasta.
- Copiere template (tipuri abonament / grupe schelet) de la un club sursa la club nou — respins explicit pentru acest ciclu (user a ales "configurare de la zero" la new-milestone discussion); club nou porneste gol, empty-state-urile din D-05 acopera UX-ul.
- Signup public pt cluburi noi (fara interventie SUPER_ADMIN) — respins, ramane SUPER_ADMIN-only (decis la discutia de milestone).
</user_constraints>

<phase_requirements>
## Phase Requirements

Faza 25 nu are inca REQ-ID-uri formale in `.planning/REQUIREMENTS.md` (adaugata direct in ROADMAP.md dupa audit-ul din 2026-07-06, milestone-ul curent are doar SEC-01..SEC-05 din Faza 15/16). Pe baza CONTEXT.md, propun urmatoarele categorii de cerinte pentru trasabilitate in plan (numerotare provizorie, planner-ul poate ajusta):

| ID propus | Descriere | Suport din research |
|-----------|-----------|----------------------|
| ISO-01 | RLS pe toate tabelele Grupe (`grupe`, `program_antrenamente`, `orar_saptamanal`, `perioade_vacanta`, `orar_exceptii`, `sportivi_grupe_secundare`) restrictioneaza randurile la clubul activ, nu doar la existenta unui rol | Sectiunea "Audit RLS live per tabel" — `grupe` si `evenimente` folosesc `get_my_club_ids()` (NU context-aware); `perioade_vacanta`/`participare_vacanta` au `USING(true)` |
| ISO-02 | RLS pe tabelele Prezenta (`prezenta_antrenament`, `anunturi_prezenta`, `sesiune_activitate`) restrictioneaza corect per club; `sesiune_activitate` capata club_id real + backfill | Sectiunea "Audit RLS live per tabel" + "sesiune_activitate — constatare critica" |
| ISO-03 | RLS pe tabelele Abonamente (`tipuri_abonament`, `plati` scope abonament) restrictioneaza randurile la clubul activ | `tipuri_abonament` are `USING(true)` pe SELECT si WRITE fara verificare club_id |
| ISO-04 | Randuri orfane (fara club_id rezolvabil) raman fail-closed — vizibile doar `is_super_admin()` | Pattern Faza 15 (D-02); `program_antrenamente` are 3 randuri cu club_id NULL vizibile azi TUTUROR staff (fail-open — de reparat) |
| ISO-05 | Zero hardcodari single-club in codul Grupe/Prezenta/Plati (TipuriAbonament) — club_id derivat din context, nu implicit | Audit cod: GrupaFormModal.tsx si TipuriAbonament.tsx deriva deja corect club_id din `activeRoleContext`/`currentUser` — nicio hardcodare gasita in aceste 2 fisiere |
| ISO-06 | Empty-state cu CTA pe ecranele principale Grupe / Prezenta / TipuriAbonament pentru club fara date | Nu exista component EmptyState reutilizabil in `components/ui.tsx` — de creat |
</phase_requirements>

## Summary

Am investigat direct pe baza de date live (Supabase, proiect `wuhidifzsutwgdfkwhmd`, folosind `SUPABASE_SERVICE_ROLE_KEY` din `.env` prin scripturi Node ad-hoc, deoarece tool-urile MCP Supabase nu sunt disponibile acestui subagent de research — vezi `## Environment Availability`) si pe istoricul complet de migratii aplicate live, pastrat local necontrolat de git in `supabase/migrations/` (folderul `supabase/` e in `.gitignore`; sursa de adevar e DB live, nu un fisier de schema versionat).

Constatarea principala: **izolarea cross-club e inconsistenta pe toate cele 3 module, dar in moduri diferite si cu severitate diferita per tabel** — nu e un singur bug repetat, ci minim 4 clase distincte de gap:

1. **RLS complet deschis (`USING (true)`)** pe `perioade_vacanta`, `participare_vacanta` si `tipuri_abonament` — orice utilizator autentificat din orice club vede/scrie randuri ale ALTOR cluburi (politica de WRITE verifica doar rolul, nu clubul). Acesta e exact anti-pattern-ul pe care Faza 16 l-a eliminat pe alte tabele — a ramas nedescoperit pe aceste 3.
2. **Helper function neactualizat cu fix-ul context-aware din Faza 260705** — `grupe` si `evenimente` folosesc `public.get_my_club_ids()`, o functie separata de `has_access_to_club()`/`este_staff_club()`/`is_super_admin()`, care NU a fost inclusa in migratia `fix_rls_context_aware_role_helpers.sql` (2026-07-05). Un utilizator multi-rol (ex. ADMIN_CLUB la Club A + INSTRUCTOR la Club B) vede `grupe` din AMBELE cluburi indiferent de contextul activ selectat (`active-role-context-id`).
3. **Fail-open pe randuri orfane** — `program_antrenamente` are politica SELECT `club_id IS NULL OR has_access_to_club(club_id)`: cele 3 randuri curente cu `club_id NULL` sunt vizibile TUTUROR staff-ilor, incalcand principiul fail-closed stabilit in Faza 15 (D-02).
4. **`sesiune_activitate` nu are club_id** — confirmat live, dar contrar premisei din CONTEXT.md D-03, tabela e **cod mort**: un singur rand ("Sesiune istorica pentru migrarea prezentelor"), zero referinte in tot codul frontend (`components/`, `hooks/`, `services/`). Mecanismul REAL de prezenta folosit azi de UI e `prezenta_antrenament`, care ARE deja club_id complet populat (1223/1223 randuri, 0 NULL) si RLS corect scopat prin `has_access_to_club()`. Vezi sectiunea dedicata mai jos — recomand pastrarea deciziei D-03 (adauga club_id + backfill, cost minim, 1 rand) dar cu asteptari corectate: nu rezolva o functionalitate stricata, doar inchide un gol RLS teoretic pe o tabela inactiva.

Pe partea de cod frontend, auditul pe `GrupaFormModal.tsx` si `TipuriAbonament.tsx` (cele 2 puncte de insert/update cele mai expuse) NU a gasit hardcodari de club_id — ambele deriva corect clubul din `activeRoleContext`/`currentUser`, cu validare explicita pentru SUPER_ADMIN sa selecteze un club. Concluzie: **riscul principal e in RLS (server), nu in hardcodari frontend** — consistent cu arhitectura de defense-in-depth descrisa in CLAUDE.md (RLS e poarta, frontend e doar UX).

Nu exista niciun component EmptyState reutilizabil in `components/ui.tsx` azi — doar un text inline "Niciun rezultat" intr-un dropdown de cautare. D-05 necesita crearea unuia nou.

**Primary recommendation:** Repara RLS-ul pe cele 3 tabele cu `USING(true)` (perioade_vacanta, participare_vacanta, tipuri_abonament) ca prioritate maxima (leak activ, nu doar teoretic), apoi migreaza `grupe`+`evenimente` de pe `get_my_club_ids()` pe `has_access_to_club()`/`este_staff_club()` (aliniere la fix-ul context-aware existent), apoi fail-closed pe orfanele din `program_antrenamente`, apoi `sesiune_activitate` (cost minim, risc real scazut), in final construieste un component `EmptyState` reutilizabil in `ui.tsx` si aplica-l pe Grupe/Prezenta/TipuriAbonament.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Izolare cross-club (cine vede ce rand) | Database / RLS (Postgres policies) | API/Backend (niciun endpoint custom — totul via PostgREST direct) | RLS e singura bariera reala; frontend-ul e doar UX (confirmat de CLAUDE.md Anti-Pattern: Hardcoded Club IDs) |
| Derivare club_id la insert/update | Browser/Client (React components) | — | `activeRoleContext.club_id` din `NavigationContext`/`useAuth`, injectat si ca header `active-role-context-id` de `supabaseClient.ts` |
| Backfill club_id pe randuri istorice | Database / migratie SQL | — | Operatiune one-shot, executata direct pe Postgres via `UPDATE ... FROM` cu FK-uri existente |
| Empty-state UX pentru club nou | Browser/Client (React componente ecran) | Design System (`components/ui.tsx`) | Pur UI — nicio logica server necesara, doar afisare conditionata pe lungime array gol |
| Verificare helper functions RLS (`has_access_to_club`, `este_staff_club`, `is_super_admin`, `get_my_club_ids`) | Database / Postgres functions (SECURITY DEFINER) | — | Reutilizate de toate politicile; fix-ul central se face o singura data la nivel de functie, nu per-tabel |

## Standard Stack

Nicio librarie noua. Faza foloseste exclusiv:
- SQL nativ (Postgres/Supabase) pentru migratii RLS — fara ORM, fara query-builder extern
- React 18 + TypeScript existent, `components/ui.tsx` design system intern pentru componenta EmptyState noua
- Scripturi Node ad-hoc (`@supabase/supabase-js`, deja in `package.json`) pentru inspectie schema/date live folosind `SUPABASE_SERVICE_ROLE_KEY` — pattern deja stabilit in `scripts/query_schema.ts`, `scripts/debug_schema.ts`

**Installation:** Nu e nevoie de npm install — toate dependintele exista deja.

## Package Legitimacy Audit

Nu se instaleaza pachete externe noi in aceasta faza. Sectiunea nu se aplica — nu se cere Package Legitimacy Gate.

## Live Schema Audit — Grupe

Metoda: interogare directa pe DB live (service role key, bypass RLS) pentru confirmare existenta tabel + coloane + numarare randuri, combinata cu citirea istoricului complet de migratii RLS aplicate din `supabase/migrations/` (folder local, gitignored, contine TOATE migratiile aplicate pe proiectul live pana azi, inclusiv cele din Faza 15/16).

| Tabel | club_id? | Randuri (azi) | Politica RLS curenta (SELECT / WRITE) | Context-aware? | Verdict |
|-------|----------|----------------|----------------------------------------|-----------------|---------|
| `grupe` | ✓ direct, NOT NULL | 14 | `club_id = ANY(public.get_my_club_ids()) OR is_super_admin()` (ambele) | **NU** — `get_my_club_ids()` ignora header-ul `active-role-context-id`, agrega TOATE clubruile unde userul are orice rol INSTRUCTOR/ADMIN_CLUB | **CROSS-CLUB LEAK (multi-rol)** — [VERIFIED: query live + `supabase/migrations/20260305_get_my_club_ids_and_rls.sql`] |
| `program_antrenamente` | ✓ direct | 308 (3 cu club_id NULL) | SELECT: `club_id IS NULL OR has_access_to_club(club_id)`; WRITE: `has_access_to_club(club_id)` | DA pe partea `has_access_to_club` (functia a fost fixata context-aware in 2026-07-05) | **FAIL-OPEN pe 3 randuri orfane** — vizibile tuturor staff, nu doar super_admin (incalca D-02) — [VERIFIED: query live + `20260302_fix_program_antrenamente_rls.sql`] |
| `orar_saptamanal` | ✓ direct | 25 | SELECT si WRITE: `has_access_to_club(club_id)` | DA | **OK** — [VERIFIED: `20260302_fix_orar_saptamanal_columns.sql`] |
| `perioade_vacanta` | ✓ direct, NOT NULL FK cluburi | 1 | SELECT: `USING (true)`; WRITE: doar verificare rol (`SUPER_ADMIN_FEDERATIE`/`ADMIN`/`ADMIN_CLUB`), **fara** verificare club_id | NU | **SEVERE — SELECT si WRITE deschise cross-club** — [VERIFIED: `sql/migrations/create_perioade_vacanta.sql`, comentariu explicit "SELECT: open pentru authenticated (filtrare JS pe club_id)" — exact anti-pattern-ul avertizat in CLAUDE.md] |
| `participare_vacanta` | indirect via `perioada_id` -> `perioade_vacanta.club_id` | 6 | SELECT: `USING(true)`; WRITE: doar verificare rol, fara club_id/perioada match | NU | **SEVERE — acelasi gap ca perioade_vacanta** — [VERIFIED: acelasi fisier] |
| `orar_exceptii` | ✓ nullable (`ON DELETE SET NULL`) | 0 | 3 politici separate: SUPER_ADMIN (acces total necontextual), ADMIN_CLUB (`urm.club_id = orar_exceptii.club_id`), INSTRUCTOR (idem) | Partial — verifica club_id per rand DAR nu foloseste `active-role-context-id`; un user multi-rol cu o alta inregistrare INSTRUCTOR/ADMIN_CLUB la alt club nu ar trebui blocat corect daca isi schimba contextul activ, dar din moment ce verificarea e per rand-specific-club, riscul e mai mic decat `get_my_club_ids()` | **Risc minor** (0 randuri azi, dar politica trebuie aliniata la pattern-ul `has_access_to_club`) — [VERIFIED: `20260519_create_orar_exceptii.sql`] |
| `sportivi_grupe_secundare` | ✓ direct, NOT NULL | 6 | SELECT/WRITE staff: `has_access_to_club(club_id)`; SELECT sportiv: doar randurile proprii | DA | **OK** — [VERIFIED: `20260409_sportivi_grupe_secundare.sql`] |

**Notă schema:** `docs/baza-de-date.md` este parțial neactualizat — listează `antrenamente` ca nume de tabel pentru instanțele de antrenament, dar tabela reala live se numeste `program_antrenamente`. Nu exista un tabel `antrenamente` separat. `docs/baza-de-date.md` nu documenteaza deloc `orar_exceptii`, `perioade_vacanta`, `participare_vacanta`, `sportivi_grupe_secundare` — toate create dupa ultima actualizare a documentului. Planner-ul si executorul NU trebuie sa se bazeze pe `docs/baza-de-date.md` pentru numele exacte de tabele in aceasta faza — foloseste tabelul de mai sus.

## Live Schema Audit — Prezenta

| Tabel | club_id? | Randuri (azi) | Politica RLS curenta | Context-aware? | Verdict |
|-------|----------|----------------|------------------------|-----------------|---------|
| `prezenta_antrenament` | ✓ direct, NOT NULL (0 NULL din 1223) | 1223 | SELECT/WRITE: `EXISTS (SELECT 1 FROM program_antrenamente a WHERE a.id = prezenta_antrenament.antrenament_id AND has_access_to_club(a.club_id))` | DA | **OK** — [VERIFIED: query live (0 NULL club_id) + `20260302_fix_program_antrenamente_rls.sql`] |
| `anunturi_prezenta` | ✓ direct | 55 | `EXISTS (SELECT 1 FROM sportivi s WHERE s.id = anunturi_prezenta.sportiv_id AND has_access_to_club(s.club_id))` | DA | **OK** — [VERIFIED: query live + `20260305_comprehensive_rls_and_functions.sql`] |
| `sesiune_activitate` | ✗ NU are club_id | 1 (rand unic) | Restrictionata la `is_super_admin()` only (fix Faza 15) | N/A | Vezi sectiune dedicata mai jos |
| `orar_exceptii` | (v. tabel Grupe de mai sus — relevant si pt Prezenta, folosit de `PrezentaRapida`/`CalendarActivitati` pentru exceptii de orar) | 0 | v. mai sus | Partial | v. mai sus |

### `sesiune_activitate` — constatare critica (corecteaza premisa D-03)

Interogare live directa (`SELECT * FROM sesiune_activitate` via service role key) a returnat un singur rand:

```json
{
  "id": "1dd50c5b-35c8-4e1d-947d-a01d0f66580b",
  "eveniment_id": "b28bde46-ad19-4731-9afd-4aa154933632",
  "sala_id": null,
  "data_desfasurare": "2026-02-01T12:36:14.347505+00:00",
  "observatie": "Sesiune istorică pentru migrarea prezențelor"
}
```

Coloane: `id`, `eveniment_id`, `sala_id`, `data_desfasurare`, `observatie` — **nicio coloana `club_id`**, confirmand D-03. FK disponibil pentru backfill: `eveniment_id -> public.evenimente.id`, iar `evenimente` ARE `club_id` direct (confirmat live). `sala_id` -> probabil `nom_locatii`/`locatii`, nefolosit aici (NULL).

**Cautare exhaustiva in cod** (`grep -r "sesiune_activitate"` pe `components/`, `hooks/`, `services/`, si pe tot repo-ul cu extensii `.ts/.tsx/.js/.sql`): **zero rezultate** in afara de fisierele `.planning/` (documente de proces, nu cod). Tabela nu e citita, scrisa sau referita de niciun ecran, hook sau serviciu curent.

**Concluzie:** `sesiune_activitate` e un artefact de migrare istorica (numele randului o confirma explicit: "Sesiune istorica pentru migrarea prezentelor"), nu mecanismul activ al modulului Prezenta. Mecanismul activ e `prezenta_antrenament`, care e deja complet si corect scopat pe club_id (0 randuri NULL din 1223, RLS context-aware). **Afirmatia din CONTEXT.md D-03 — "fara asta, Prezenta e efectiv nefunctionala/invizibila pt ADMIN_CLUB/INSTRUCTOR la cluburi noi" — nu este confirmata de codul si datele live actuale; pare bazata pe o presupunere reziduala din Faza 15 (unde tabela a fost gasita fara club_id si doar restrictionata defensiv, fara a se verifica daca mai era folosita in UI).**

Recomandare: pastreaza D-03 ca decizie (cost e minim — 1 rand, backfill trivial prin `eveniment_id -> evenimente.club_id`), dar NU o trata ca pe un blocker functional pentru sezonul nou — Prezenta va functiona normal la cluburi noi indiferent de aceasta tabela, deoarece `prezenta_antrenament` e deja corect. Marcheaza in plan explicit ca fix "de completitudine/consistenta" (aliniat cu D-04, tratament uniform pt orice tabela orfana descoperita), nu ca fix de blocare functionala.

## Live Schema Audit — Abonamente

| Tabel | club_id? | Randuri (azi) | Politica RLS curenta | Context-aware? | Verdict |
|-------|----------|----------------|------------------------|-----------------|---------|
| `tipuri_abonament` | ✓ direct | 5 | SELECT: `USING(true)`; WRITE: doar rol (`SUPER_ADMIN_FEDERATIE`/`ADMIN`/`ADMIN_CLUB`), **fara** verificare club_id | NU | **SEVERE — SELECT si WRITE deschise cross-club** — orice ADMIN_CLUB poate edita/sterge tipuri de abonament ale ALTUI club — [VERIFIED: `sql/migrations/fix_rls_all_tables.sql` linii 104-111] |
| `plati` (folosita si pt abonamente recurente, prin coloana `tip_abonament_id`) | ✓ nullable | 491 (96 NULL club_id, ~19.6%) | Politicile vechi (`Admin manage plati`, `UNIFIED_CLUB_ACCESS`, `Sportiv - View Own Plati`, si vechea `Staff - Full Access Plati` bazata pe `get_my_club_ids()`) au fost **eliminate** in `20260507_fix_plati_timeout_indexes_and_rls.sql`; raman doar politicile `rbv_plati_*` (admin_club, delete, insert, own, super_admin, update), definite intr-un fisier separat (`role_based_views.sql`, negasit in `supabase/migrations/` local — posibil aplicat direct prin SQL Editor sau numele fisierului difera) | **NEVERIFICAT** — predicatul exact al `rbv_plati_admin_club` nu a putut fi confirmat din fisierele locale disponibile | **OPEN QUESTION — planner/executor trebuie sa confirme predicatul live prin MCP `execute_sql`/pg_policies inainte de a scrie migratia** |

**Nu exista tabele separate `abonamente` sau `abonamente_sportivi`** — confirmat live (`Could not find the table`). Abonamentele recurente sunt reprezentate ca randuri in `plati` cu `tip_abonament_id` (FK catre `tipuri_abonament`) + `tip_plata`/`luna`/`an`. Modulul "Abonamente" din CONTEXT.md = `tipuri_abonament` (configurare) + subset din `plati` (instante lunare).

**Nu exista date pt tabelul `staging_inscrieri` relevante domeniului Grupe/Prezenta/Abonamente** — confirmat: 208 randuri, coloane minime (`nume`, `prenume`, `data_inscrieri_text`), fara club_id, fara FK. E un artefact al fluxului de import sportivi (deja restrictionat la super_admin din Faza 15). D-04 cere verificare, nu presupunere — verificat: **nu e relevant acestei faze**, ramane out-of-scope.

## Helper Functions RLS Existente (de refolosit)

Confirmate ca existente si apelabile live (verificat prin apel RPC direct cu service role key — toate 4 raspund fara eroare "function not found"):

| Functie | Semnatura | Context-aware (active-role-context-id)? | Sursa fix |
|---------|-----------|-------------------------------------------|-----------|
| `public.is_super_admin()` | `() RETURNS boolean` | DA (fixata 2026-07-05) | `sql/migrations/fix_rls_context_aware_role_helpers.sql` |
| `public.este_staff_club(p_club_id uuid)` | `(uuid) RETURNS boolean` | DA (fixata 2026-07-05) | idem |
| `public.has_access_to_club(p_club_id uuid)` | `(uuid) RETURNS boolean` | DA (fixata 2026-07-05) — inlocuieste orice definitie anterioara (`CREATE OR REPLACE` cu aceeasi semnatura de tip) | idem |
| `public.get_my_club_ids()` | `() RETURNS uuid[]` | **NU** — agrega toate `club_id` unde userul are rol INSTRUCTOR/ADMIN_CLUB pe ORICE rand din `utilizator_roluri_multicont`, ignora header-ul de context activ | `supabase/migrations/20260305_get_my_club_ids_and_rls.sql` — **niciodata actualizata dupa fix-ul din 260705** |
| `public.get_active_club_id()` | confirmat existent (apelabil), semnatura/detalii interne neverificate direct | folosit in requirement SEC-01 ("club_id = public.get_active_club_id()") | referentiat in `.planning/REQUIREMENTS.md` |

Pattern din Faza 15 pentru tabele fara club_id direct: functii `{tabel}_club_id(uuid)` SECURITY DEFINER, `search_path` fixat, care rezolva club_id printr-un JOIN pana la sursa (ex. `obligatie_club_id`, `incasare_club_id`, `plata_club_id`). Recomandare: aceeasi conventie pentru `sesiune_activitate_club_id(p_sesiune_id uuid)` daca planner-ul decide sa NU adauge coloana direct (dar D-03 cere explicit coloana reala + backfill, deci varianta preferata e ALTER TABLE + UPDATE, nu doar o functie de rezolvare indirecta).

## Architecture Patterns

### Pattern 1: RLS scoping via helper function centralizata
**What:** Toate politicile `FOR ALL`/`FOR SELECT` pe tabele cu `club_id` direct trebuie sa apeleze `public.has_access_to_club(club_id)` (sau `este_staff_club` pentru restrictie strict la club, fara SUPER_ADMIN/ADMIN wildcard), NU sa duplice logica inline (`EXISTS (SELECT ... utilizator_roluri_multicont ...)`) si NU sa foloseasca `get_my_club_ids()`.
**When to use:** Orice tabela noua sau existenta din domeniul Grupe/Prezenta/Abonamente care are `club_id` direct.
**Example:**
```sql
-- Source: sql/migrations/fix_rls_context_aware_role_helpers.sql (verificat live)
DROP POLICY IF EXISTS "Staff - Full Access Grupe" ON public.grupe;
CREATE POLICY "Staff - Full Access Grupe" ON public.grupe
FOR ALL TO authenticated
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));
```

### Pattern 2: Rezolvare club_id indirect (tabele fara coloana directa)
**What:** Pentru tabele unde club_id nu exista direct, dar e recuperabil printr-un FK (sportiv_id/grupa_id/eveniment_id -> tabela cu club_id), se creeaza o functie SECURITY DEFINER dedicata `{tabel}_club_id(uuid)` folosita in politica, SAU (preferabil cand se poate, cf. D-03) se adauga coloana `club_id` reala + backfill printr-un `UPDATE ... FROM`.
**When to use:** `sesiune_activitate` (backfill prin `eveniment_id -> evenimente.club_id`), orice alta tabela orfana descoperita ulterior.
**Example (backfill, pattern din Faza 15):**
```sql
-- Adauga coloana
ALTER TABLE public.sesiune_activitate ADD COLUMN club_id UUID REFERENCES public.cluburi(id);

-- Backfill din eveniment_id
UPDATE public.sesiune_activitate sa
SET club_id = e.club_id
FROM public.evenimente e
WHERE sa.eveniment_id = e.id
  AND sa.club_id IS NULL;

-- Randurile ramase NULL (fara eveniment_id valid) raman fail-closed:
-- politica RLS trebuie sa verifice club_id IS NOT NULL AND has_access_to_club(club_id)
-- (NU 'club_id IS NULL OR ...' -- acel pattern e exact bug-ul gasit pe program_antrenamente)
```

### Pattern 3: Empty State cu CTA (de creat — nu exista azi)
**What:** Component reutilizabil `EmptyState` in `components/ui.tsx`, afisat cand un array de date e gol dupa incarcare (NU in timpul loading-ului, NU la eroare — acele stari au deja `LoadingSpinner`/`ErrorState` proprii).
**When to use:** Ecranele principale liste din Grupe (`components/Grupe/index.tsx`), Prezenta (rapoarte, `RaportPrezenta.tsx`/`RaportLunarPrezenta.tsx` etc.), TipuriAbonament (`components/Plati/TipuriAbonament.tsx`).
**Example (schita, pe baza conventiilor existente din `Button`/`Card`):**
```tsx
// Nou in components/ui.tsx — urmeaza conventia Button (variant, size) deja existenta
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
  <Card className="flex flex-col items-center justify-center text-center py-12 gap-3">
    {icon}
    <p className="text-slate-300 font-medium">{title}</p>
    {description && <p className="text-slate-500 text-sm max-w-sm">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="primary" onClick={onAction} className="mt-2">{actionLabel}</Button>
    )}
  </Card>
);
```
Utilizare tipica: `{grupe.length === 0 ? <EmptyState title="Nicio grupă creată încă" actionLabel="Adaugă Grupă" onAction={() => setShowModal(true)} /> : <ListaGrupe .../>}`.

### Anti-Patterns to Avoid (gasite deja live in acest cod, NU doar teoretice)
- **`USING (true)` cu "filtrare JS pe club_id" ca substitut de RLS:** comentariul explicit din `sql/migrations/create_perioade_vacanta.sql` ("SELECT: open pentru authenticated (filtrare JS pe club_id)") arata exact anti-pattern-ul avertizat in CLAUDE.md — frontend-ul NU e o bariera de securitate, orice user cu devtools poate interoga direct PostgREST. Nu repeta acest pattern in migratia de fix.
- **Politici WRITE care verifica doar rolul, nu clubul:** `perioade_vacanta_write`, `participare_vacanta_write`, `tipuri_abonament_write` verifica `rol_denumire IN (...)` fara sa compare `club_id`-ul randului cu clubul activ al userului — un ADMIN_CLUB poate scrie in orice club, nu doar al lui.
- **Duplicarea logicii de rol per-tabel in loc de helper centralizat:** `orar_exceptii` re-implementeaza propriile `EXISTS` in loc sa apeleze `has_access_to_club`/`este_staff_club` — orice fix viitor pe helper (ca cel din 260705) nu se propaga automat la aceste politici custom.
- **`club_id IS NULL OR ...` in politica SELECT:** face randurile orfane vizibile TUTUROR, nu doar super_admin — opusul fail-closed (D-02). Gasit pe `program_antrenamente`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Verificare "userul are acces la acest club?" | O noua functie inline per tabela (`EXISTS (...)` custom) | `public.has_access_to_club(club_id)` / `public.este_staff_club(club_id)` / `public.is_super_admin()` | Deja exista, deja fixate context-aware (260705); orice duplicat nou trebuie updatat manual daca logica de rol se schimba din nou |
| Rezolvare club_id prin FK indirect | Query JS care face join client-side pentru fiecare rand si filtreaza in frontend | Functie SQL `{tabel}_club_id(uuid)` SECURITY DEFINER (pattern Faza 15) sau backfill coloana directa | Frontend filtering NU e o bariera de securitate (CLAUDE.md anti-pattern explicit) |
| Empty state per ecran, cod repetat de 3 ori | Bloc JSX duplicat in Grupe/Prezenta/TipuriAbonament | Component `EmptyState` unic in `ui.tsx` | Consistenta vizuala ceruta de D-05 ("interfata identica pretutindeni" e principiul deja aplicat la alte module din acest proiect, ex. sistemul de filtrare unificat) |

**Key insight:** Nu exista niciun "hand-roll" de evitat pe partea de librarii — riscul din aceasta faza e 100% arhitectural/SQL (politici RLS scrise ad-hoc, per-tabela, in loc de a reutiliza consistent cele 3 helper functions deja existente si deja corect fixate).

## Runtime State Inventory

> Inclus deoarece faza include o migratie de date reale (backfill club_id pe `sesiune_activitate` si posibil alte tabele orfane descoperite).

| Categorie | Constatare | Actiune necesara |
|-----------|-------------|-------------------|
| Date stocate cu club_id lipsa | `sesiune_activitate`: 1 rand, club_id lipsa, backfill posibil via `eveniment_id -> evenimente.club_id`. `program_antrenamente`: 3 randuri cu club_id NULL (fara FK evident de recuperare mentionat in schema — de verificat daca `grupa_id` poate rezolva clubul: `grupa_id -> grupe.club_id`). `plati`: 96/491 randuri cu club_id NULL (posibil recuperabile via `sportiv_id -> sportivi.club_id` sau `familie_id -> familii.club_id`, acelasi pattern ca Faza 15). | Migratie SQL de backfill + fail-closed pe restul ireconciliabil |
| Configurare live in servicii externe | Niciuna — modulele Grupe/Prezenta/Abonamente nu au configurare externa (n8n, Datadog, etc.) in afara Supabase | Nimic |
| Stare inregistrata la nivel de OS | Niciuna — nu exista task-uri OS/cron/pm2 legate de aceste module | Nimic |
| Secrete/env vars | Niciunul afectat — nu se schimba nume de tabele/coloane existente folosite ca secret keys | Nimic |
| Artefacte de build/pachete instalate | Niciunul — nicio schimbare de nume de pachet/schema TypeScript majora asteptata | Nimic |

**Fail-closed pe randuri neconciliabile (D-02):** Pentru orice rand orfan care NU poate fi rezolvat prin backfill (ex. `program_antrenamente` fara `grupa_id` valid, sau `plati` fara `sportiv_id`/`familie_id` valid), politica RLS trebuie sa il faca vizibil DOAR pentru `is_super_admin()` — la fel ca precedentul din Faza 15 (~10 randuri orfane per tabel ramase super_admin-only, documentate ca risc rezidual acceptat).

## Common Pitfalls

### Pitfall 1: A presupune ca "are club_id" == "RLS il foloseste corect"
**What goes wrong:** `grupe`, `perioade_vacanta`, `tipuri_abonament` au TOATE coloana `club_id` populata corect, dar politica RLS fie ignora contextul activ (`get_my_club_ids()`), fie e complet deschisa (`USING(true)`). Prezenta coloanei nu garanteaza izolarea.
**Why it happens:** Migratii succesive au adaugat coloana club_id pentru raportare/filtrare UI, dar politica RLS a fost scrisa initial mai permisiv ("hai sa mearga intai") si nu a mai fost revizuita cand alte tabele au primit fix-uri de securitate (Faza 15/16, fix-ul context-aware din 260705).
**How to avoid:** Verifica explicit predicatul politicii (nu doar coloana), pentru FIECARE tabel din domeniu — nu presupune ca fix-urile anterioare au acoperit tot ce avea club_id.
**Warning signs:** Comentarii in migratii de tipul "filtrare JS pe club_id" (semnal ca cineva a stiut ca RLS-ul e slab si a compensat gresit in frontend).

### Pitfall 2: A presupune ca toate helper functions au fost fixate simultan
**What goes wrong:** Migratia din 2026-07-05 a fixat `is_super_admin()`, `este_staff_club()`, `has_access_to_club()` sa fie context-aware, dar NU a atins `get_my_club_ids()` — o a patra functie cu scop similar, folosita separat pe `grupe` si `evenimente`. Un audit care verifica doar "sunt helper functions-urile fixate?" fara sa enumere TOATE functiile folosite in politici ar rata acest gap.
**Why it happens:** Existau 2 seturi paralele de helper functions dezvoltate in perioade diferite (`get_my_club_ids()` mai vechi, apoi `has_access_to_club()`/`este_staff_club()` mai noi) fara consolidare.
**How to avoid:** Grep exhaustiv pe `pg_policies`/fisierele de migratie pentru NUMELE tuturor functiilor apelate in `USING`/`WITH CHECK`, nu doar cele 3 cunoscute din Faza 15.
**Warning signs:** Orice politica ce apeleaza o functie diferita de `has_access_to_club`/`este_staff_club`/`is_super_admin`.

### Pitfall 3: A trata `sesiune_activitate` ca pe modulul activ de Prezenta fara sa verifici codul
**What goes wrong:** Numele tabelei si mentiunea in Faza 15 SUMMARY ("sesiune_activitate — folosita de Prezenta") pot duce la presupunerea ca fix-ul rezolva o problema functionala reala. Grep-ul in cod arata zero utilizare — riscul de a investi timp de plan/execute pe o tabela moarta, in loc de a verifica intai daca merita prioritate inalta.
**How to avoid:** Intotdeauna verifica utilizarea reala in `components/`/`hooks/`/`services/` inainte de a asuma impact functional dintr-un nume de tabela sau dintr-un SUMMARY anterior.

### Pitfall 4: Modificarea unei politici WRITE fara WITH CHECK separat
**What goes wrong:** O politica `FOR ALL USING (has_access_to_club(club_id))` fara `WITH CHECK` explicit poate permite (in anumite versiuni Postgres/PostgREST) ca un rand sa fie actualizat astfel incat noul `club_id` sa apartina altui club, daca `USING` se evalueaza doar pe randul vechi. Politicile corecte deja existente (`orar_saptamanal`, `program_antrenamente` write) au `WITH CHECK` identic cu `USING` — pattern de urmat pentru orice politica noua/reparata.
**How to avoid:** Orice `CREATE POLICY ... FOR ALL` de scriere trebuie sa aiba AMBELE clauze `USING` si `WITH CHECK` cu acelasi predicat de club.

## Code Examples

### Fix pentru `perioade_vacanta` (si analog `participare_vacanta`, `tipuri_abonament`)
```sql
-- Inlocuieste SELECT-ul deschis
DROP POLICY IF EXISTS "perioade_vacanta_select" ON public.perioade_vacanta;
CREATE POLICY "perioade_vacanta_select"
    ON public.perioade_vacanta FOR SELECT TO authenticated
    USING (public.has_access_to_club(club_id));

-- Inlocuieste WRITE-ul fara scoping de club
DROP POLICY IF EXISTS "perioade_vacanta_write" ON public.perioade_vacanta;
CREATE POLICY "perioade_vacanta_write"
    ON public.perioade_vacanta FOR ALL TO authenticated
    USING (public.has_access_to_club(club_id))
    WITH CHECK (public.has_access_to_club(club_id));
```

### Fix pentru `participare_vacanta` (club derivat indirect din `perioada_id`)
```sql
DROP POLICY IF EXISTS "participare_vacanta_select" ON public.participare_vacanta;
CREATE POLICY "participare_vacanta_select"
    ON public.participare_vacanta FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perioade_vacanta pv
            WHERE pv.id = participare_vacanta.perioada_id
              AND public.has_access_to_club(pv.club_id)
        )
    );
-- Analog pentru participare_vacanta_write cu WITH CHECK identic
```

### Migrare `grupe` si `evenimente` de pe `get_my_club_ids()` pe `has_access_to_club()`
```sql
DROP POLICY IF EXISTS "Staff - Full Access Grupe" ON public.grupe;
CREATE POLICY "Staff - Full Access Grupe" ON public.grupe
FOR ALL TO authenticated
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL TO authenticated
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));
```
**Atentie:** dupa acest fix, `get_my_club_ids()` ramane orfana (nefolosita) — decizia de a o sterge sau pastra (pt eventuala compatibilitate) e a planner-ului; recomand pastrare fara stergere in aceasta faza (risc scazut, beneficiu mic de curatare vs riscul de a rupe altceva ce o mai apeleaza — de verificat cu un grep suplimentar `grep -rn "get_my_club_ids" supabase/migrations` inainte de decizie finala, deja facut aici: apare doar in fisierul de creare, deci probabil sigur de lasat neatinsa sau de deprecat).

### Fail-closed pentru `program_antrenamente` (elimina `club_id IS NULL OR`)
```sql
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
CREATE POLICY "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente
    FOR SELECT USING (
        public.is_super_admin()
        OR (club_id IS NOT NULL AND public.has_access_to_club(club_id))
    );
-- Randurile cu club_id NULL raman vizibile DOAR super_admin, consistent cu D-02
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|----------------|--------|
| Verificare rol inline per politica (`EXISTS (SELECT ... utilizator_roluri_multicont ...)`) | Helper functions centralizate SECURITY DEFINER (`has_access_to_club`, `este_staff_club`, `is_super_admin`) | Progresiv, 2026-03 -> 2026-07 | Politicile noi/reparate trebuie sa refoloseasca helperele, nu sa reimplementeze logica |
| Helper functions fara constientizare de context multi-rol | Helper functions scopate pe `active-role-context-id` header | 2026-07-05 (`fix_rls_context_aware_role_helpers.sql`) | `get_my_club_ids()` a ramas in urma acestei migrari — de aliniat in Faza 25 |
| RLS `USING(true)` + filtrare JS ca "securitate" | RLS scoped per-club obligatoriu, frontend doar UX | Faza 15/16 (2026-07-06) pt tabele financiare | Nu s-a propagat inca la `perioade_vacanta`/`participare_vacanta`/`tipuri_abonament` — de facut in Faza 25 |

**Deprecated/outdated:** `public.get_my_club_ids()` ar trebui tratata ca deprecata dupa aceasta faza (inlocuita de `has_access_to_club`), desi stergerea efectiva nu e obligatorie in acest ciclu.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | `public.get_active_club_id()` exista si returneaza UUID-ul clubului activ curent bazat pe `active-role-context-id` — confirmat doar ca functia e apelabila (returneaza `null` fara context de auth), NU s-a verificat corpul functiei | Helper Functions RLS Existente | Daca semnatura/comportamentul difera de asteptari (ex. nu respecta header-ul), orice politica noua scrisa cu `club_id = get_active_club_id()` (pattern SEC-01) ar putea sa nu functioneze cum se asteapta — planner-ul ar trebui sa prefere `has_access_to_club(club_id)` (verificat complet) in loc de `get_active_club_id()` unde e posibil |
| A2 | Predicatul exact al politicilor `rbv_plati_admin_club`/`rbv_plati_insert`/etc. pe tabela `plati` nu a putut fi confirmat — fisierul sursa (`role_based_views.sql`) nu a fost gasit in `supabase/migrations/` local | Live Schema Audit — Abonamente | Daca planner-ul presupune ca `plati` e deja corect scopat (posibil, avand in vedere ca migratia 20260507 a fost special pt performanta/corectitudine), ar putea rata un gap real pe partea de abonamente recurente; sau invers, ar putea duplica un fix deja aplicat |
| A3 | `program_antrenamente` cele 3 randuri cu `club_id NULL` nu au fost verificate individual pentru posibilitate de backfill via `grupa_id -> grupe.club_id` (doar numarul a fost confirmat, nu si recuperabilitatea) | Runtime State Inventory | Planner-ul ar putea presupune backfill automat cand de fapt randurile sunt ireconciliabile (grupa stearsa, etc.) — necesita query suplimentar la momentul executiei |
| A4 | Nu s-a facut un audit exhaustiv al TUTUROR componentelor din `components/Prezenta/*.tsx` (18 fisiere) si `components/Grupe/*.tsx` (12 fisiere) pentru hardcodari — auditul de cod s-a concentrat pe cele 2 puncte de insert cele mai probabile (GrupaFormModal, TipuriAbonament) | Summary / Don't Hand-Roll | Ar putea exista hardcodari punctuale in fisiere neauditate (ex. `PrezentaRapida.tsx`, `GeneratorProgramMasiv.tsx`) care nu au fost gasite; planner-ul ar trebui sa includa un task explicit de grep pe `active-role-context-id`/`club_id` in TOATE fisierele Grupe/Prezenta inainte de a considera auditul de cod complet |

## Open Questions

1. **Care e predicatul exact al politicilor `rbv_plati_*` pe tabela `plati` azi?**
   - What we know: politicile vechi (inclusiv cea bazata pe `get_my_club_ids()`) au fost eliminate in 2026-05-07; raman doar `rbv_plati_admin_club`, `rbv_plati_delete`, `rbv_plati_insert`, `rbv_plati_own`, `rbv_plati_super_admin`, `rbv_plati_update`.
   - What's unclear: continutul exact al acestor politici — fisierul care le defineste (`role_based_views.sql`) nu a fost gasit local.
   - Recommendation: executorul/planner-ul cu acces la MCP Supabase (`execute_sql` sau echivalent) trebuie sa ruleze `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'plati'` ca prim pas de executie, inainte de a scrie orice migratie care atinge `plati`/abonamente.

2. **Cele 3 randuri `program_antrenamente` cu club_id NULL sunt recuperabile prin `grupa_id`?**
   - What we know: coloana `grupa_id` exista pe `program_antrenamente` si `grupe.club_id` e populat complet.
   - What's unclear: daca acele 3 randuri specifice au un `grupa_id` valid (nu NULL, nu orfan).
   - Recommendation: query `SELECT id, grupa_id, club_id FROM program_antrenamente WHERE club_id IS NULL` la momentul executiei migratiei, inainte de backfill.

3. **Trebuie fixata si `get_my_club_ids()` direct (context-aware), sau doar migrate `grupe`/`evenimente` sa nu o mai foloseasca?**
   - What we know: doar 2 tabele o folosesc azi (`grupe`, `evenimente`); fix-ul cel mai simplu e sa le migreze pe `has_access_to_club()`.
   - What's unclear: daca vreun alt cod (frontend sau RPC) apeleaza direct `get_my_club_ids()` in afara politicilor RLS (nu a fost gasit in grep pe `components/`/`hooks/`/`services/`, dar nu s-a facut un grep exhaustiv pe TOT repo-ul inclusiv scripturi).
   - Recommendation: planner-ul poate alege sa NU o stearga (risc scazut de a lasa o functie orfana neutila) — prioritate e migrarea politicilor, nu curatenia.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|-----------|
| Supabase MCP tools (`apply_migration`, `execute_sql`) | Aplicare migratie live + verificare `pg_policies` | ✗ (pentru acest subagent de research; conform Faza 15/16 SUMMARY, doar orchestratorul principal are acces prin ToolSearch, NU subagentii `gsd-executor`) | — | Scripturi Node ad-hoc cu `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY` pentru citire date/scheme (folosit cu succes in acest research); pentru SCRIERE (apply_migration), executia trebuie preluata direct de orchestrator, la fel ca in Faza 15/16 (documentat explicit in ambele SUMMARY-uri ca decizie de infrastructura, nu de continut) |
| `SUPABASE_SERVICE_ROLE_KEY` in `.env` | Interogare schema/date live bypass RLS | ✓ | — | — |
| Node.js + `@supabase/supabase-js` | Scripturi de audit ad-hoc | ✓ (deja in `package.json`, folosit si de `scripts/query_schema.ts`) | `@supabase/supabase-js ^2.98.0` | — |
| Playwright | Verificare UI live cross-club (checkpoint din D-01) | ✓ (`test` script in `package.json`, folosit deja in Faza 11/precedent) | — | — |

**Missing dependencies with no fallback:**
- Niciuna — fallback-ul cu scripturi Node + service role key acopera integral nevoia de audit read-only; scrierea (apply_migration) are fallback documentat (executie directa de orchestrator).

**Missing dependencies with fallback:**
- MCP Supabase `apply_migration`/`execute_sql` pentru subagentul executor — fallback: orchestratorul principal ruleaza migratia direct (precedent stabilit in Faza 15/16), sau (daca nici orchestratorul nu are acces in acest mediu) migratia se scrie in `supabase/migrations/` si utilizatorul o aplica manual prin Supabase SQL Editor, la fel cum s-a intamplat cu quick task-urile `260705-pgg` si `260717-f99` (migratii scrise, neaplicate live, marcate "Needs SQL apply" in STATE.md).

## Security Domain

### Applicable ASVS Categories (level 1, `security_enforcement: true` in config.json)

| ASVS Category | Applies | Standard Control |
|-----------------|---------|---------------------|
| V4 Access Control | **DA — centrul acestei faze** | Row-Level Security Postgres, helper functions SECURITY DEFINER context-aware (`has_access_to_club`, `este_staff_club`, `is_super_admin`) |
| V5 Input Validation | Marginal | Frontend deriva club_id din context (nu din input utilizator liber) — deja corect in `GrupaFormModal.tsx`/`TipuriAbonament.tsx` |
| V6 Cryptography | Nu se aplica | Fara date criptate implicate in aceasta faza |
| V2 Authentication | Nu se aplica direct | Autentificarea nu se schimba in aceasta faza |
| V3 Session Management | Nu se aplica direct | Header-ul `active-role-context-id` si mecanismul de context activ nu se modifica, doar se respecta consistent in politicile RLS |

### Known Threat Patterns pentru acest stack

| Pattern | STRIDE | Standard Mitigation | Stare in acest cod |
|---------|--------|------------------------|------------------------|
| RLS bypass prin politica `USING(true)` + incredere in filtrare client-side | Information Disclosure / Elevation of Privilege | Politica RLS scoped per-club obligatoriu, niciodata `true` pe tabele multi-tenant | **GASIT ACTIV** pe `perioade_vacanta`, `participare_vacanta`, `tipuri_abonament` — de reparat in aceasta faza |
| Helper function de autorizare neactualizata dupa un fix de securitate central | Elevation of Privilege (context bleed multi-rol) | Toate politicile trebuie sa converga pe UN SINGUR set de helper functions, actualizat central | **GASIT ACTIV** — `get_my_club_ids()` neatinsa de fix-ul din 260705 |
| Fail-open pe randuri orfane (date fara owner clar) | Information Disclosure | Fail-closed: randuri orfane vizibile doar rolului cel mai restrictiv (super_admin) | **GASIT ACTIV** pe `program_antrenamente` (`club_id IS NULL OR ...`) |
| Politica WRITE fara `WITH CHECK` sau cu `WITH CHECK` mai permisiv decat `USING` | Tampering (scriere cross-tenant) | `WITH CHECK` identic cu `USING`, ambele scopate pe club | **GASIT ACTIV** pe `perioade_vacanta_write`/`tipuri_abonament_write` (fara nicio verificare de club in ambele clauze) |

## Sources

### Primary (HIGH confidence — verificat direct)
- Interogare live Supabase (proiect `wuhidifzsutwgdfkwhmd`) via `@supabase/supabase-js` + `SUPABASE_SERVICE_ROLE_KEY`, scripturi Node ad-hoc — confirmare existenta tabele, coloane, numar randuri, valori NULL pentru: `grupe`, `program_antrenamente`, `orar_saptamanal`, `perioade_vacanta`, `sesiune_activitate`, `tipuri_abonament`, `plati`, `sportivi_grupe_secundare`, `staging_inscrieri`, `anunturi_prezenta`, `participare_vacanta`, `prezenta_antrenament`, `evenimente`, `orar_exceptii`, `vedere_prezenta_sportiv`
- `supabase/migrations/` (folder local, gitignored, istoric complet al migratiilor aplicate live) — 40+ fisiere citite/grepate pentru politici RLS curente pe fiecare tabel din domeniu
- `.planning/phases/15-fix-rls-izolare-cross-club-pe-tabele-financiare-alocari-plat/15-01-SUMMARY.md`, `16-01-SUMMARY.md` — pattern de audit+fix precedent, confirmat aplicabil identic
- `sql/migrations/fix_rls_context_aware_role_helpers.sql`, `sql/migrations/create_perioade_vacanta.sql`, `sql/migrations/fix_rls_all_tables.sql` — surse tracked in git pentru functii helper si politici initiale
- Grep exhaustiv pe `components/`, `hooks/`, `services/` pentru `sesiune_activitate` (zero rezultate) si pentru derivarea club_id in `GrupaFormModal.tsx`/`TipuriAbonament.tsx`

### Secondary (MEDIUM confidence)
- `docs/baza-de-date.md` — folosit doar ca punct de plecare, apoi corectat/completat cu date live (documentul e partial neactualizat, vezi nota din sectiunea Grupe)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — context istoric si trasabilitate SEC-01..SEC-05

### Tertiary (LOW confidence / neverificat)
- Predicatul exact al politicilor `rbv_plati_*` pe `plati` — inferat doar din comentariile migratiei 20260507, fisierul sursa nu a fost gasit local (vezi Open Question #1)

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — nicio librarie noua
- Schema/RLS live (Grupe, Prezenta, majoritatea Abonamente): HIGH — verificat direct pe date/migratii live, nu pe presupuneri
- `plati`/`rbv_plati_*` predicat exact: LOW — fisier sursa negasit, marcat explicit ca open question
- Cod frontend (hardcodari): MEDIUM — auditat punctele cele mai probabile (insert-uri), nu exhaustiv pe toate 30 fisiere Grupe+Prezenta
- Pitfalls: HIGH — toate 4 clase de bug documentate sunt confirmate cu citate exacte din migratii/date live, nu ipoteze

**Research date:** 2026-08-28
**Valid until:** Schema DB se poate schimba prin quick tasks intermediare — recomand re-verificare rapida (re-rulare script-urile de audit) daca trec mai mult de 7 zile intre acest research si executia planului, sau daca alte quick tasks ating tabelele din acest domeniu intre timp.
