# Phase 27: Sezoane Abonamente si Grupe - Research

**Researched:** 2026-09-02
**Domain:** Supabase schema extension (nou tabel `sezoane` + FK-uri opționale pe `grupe`/`tipuri_abonament`) + React/TS UI pentru un portal existent, cu RLS per-club multi-tenant deja matur (Faza 25)
**Confidence:** HIGH (schema, RLS, integrare) / MEDIUM (fluxul exact de arhivare-clonare, care e nou și fără precedent 1:1 în cod)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sezon = interval de date liber (`data_start`, `data_final`), NU format fix an școlar. Adminul alege ambele date manual la creare.
- **D-02:** Sezoanele sunt per club (nu globale la nivel de federație). ADMIN_CLUB creează/gestionează sezoanele propriului club.
- **D-03:** Doar un singur sezon poate fi "activ" per club la un moment dat (implicit — nu s-a cerut suprapunere de sezoane active).
- **D-04:** Fiecare grupă are un flag/tip: **permanentă** sau **per-sezon**, ales de instructor/admin la creare (editabil ulterior). Nu există un mod global unic — flexibilitate maximă per grupă, per club.
- **D-05:** Grupă permanentă: NU se leagă de un sezon anume, rămâne activă indiferent de schimbarea sezonului, sportivii rămân automat asignați.
- **D-06:** Grupă per-sezon: legată de sezonul curent. La creare sezon nou, grupa per-sezon veche se **arhivează automat** (nu se șterge — rămâne vizibilă în istoric/rapoarte/prezență).
- **D-07:** Clonarea grupei per-sezon în sezonul nou este o acțiune **manuală** a adminului (ex. buton "Dublează în sezon nou") — nu automată.
- **D-08:** La grupa clonată (per-sezon, sezon nou), re-asignarea sportivilor e **manuală** — nu se copiază automat lista de sportivi din grupa veche.
- **D-09:** `tipuri_abonament` se leagă de sezon — fiecare sezon își are propriile tipuri de abonament (permite creșteri de preț anuale). Tipurile din sezoanele vechi rămân ca istoric (pentru facturile deja emise).

### Claude's Discretion

- Denumire exactă a câmpurilor noi în DB (`sezon_id`, `tip_grupa` enum permanent/per_sezon, etc.) — decizie tehnică la planificare.
- UI exact pentru "sezon activ" (selector în header Grupe? tab dedicat?) — decizie la UI-phase/planning.
- Ce se întâmplă cu facturile/plățile deja emise pe un `tip_abonament` dintr-un sezon arhivat — rămân neschimbate (istoric), fără migrare.

### Deferred Ideas (OUT OF SCOPE)

None — discuția a rămas în limitele scope-ului fazei.
</user_constraints>

<phase_requirements>
## Phase Requirements

> Faza nu are încă ID-uri de requirement în `.planning/REQUIREMENTS.md` (proiect nou de fază, fără milestone dedicat definit acolo). Se propun mai jos ID-uri cu prefixul `SEZ-`, derivate 1:1 din deciziile D-01..D-09 din CONTEXT.md, pentru ca planner-ul să aibă trasabilitate. Confirmarea/adăugarea lor formală în REQUIREMENTS.md rămâne la latitudinea planner-ului/orchestratorului.

| ID | Description | Research Support |
|----|-------------|------------------|
| SEZ-01 | ADMIN_CLUB poate crea un sezon cu interval de date liber (data_start, data_final) per club | Pattern schemă + RLS write în Architecture Patterns (Pattern 3), Code Examples (tabel `sezoane`) |
| SEZ-02 | Sezoanele sunt izolate per club (RLS), doar ADMIN_CLUB/SUPER_ADMIN_FEDERATIE pot gestiona | Security Domain, Architecture Patterns Pattern 3 (predicat de rol explicit, A1) |
| SEZ-03 | Maxim un sezon activ per club, impus la nivel de date | Don't Hand-Roll (index unic parțial), Code Examples (`idx_sezoane_activ_per_club`) |
| SEZ-04 | Fiecare grupă are flag permanent/per-sezon, editabil de instructor/admin | Common Pitfalls Pitfall 4 (`tip_grupa DEFAULT 'permanent'`), Code Examples (ALTER TABLE grupe) |
| SEZ-05 | Grupă permanentă rămâne neschimbată/neafectată de schimbarea sezonului | Architectural Responsibility Map, Pattern 1 diagram (ramura "permanent, sezon_id=NULL") |
| SEZ-06 | Grupă per-sezon se arhivează automat la creare sezon nou (fără ștergere) | Don't Hand-Roll (pattern `activ`/`arhivat` boolean, nu enum `stare`), Open Question 2 |
| SEZ-07 | Admin poate clona manual o grupă per-sezon în sezonul nou (fără copiere automată a sportivilor) | Architecture diagram, Anti-Patterns to Avoid (ultimul punct) |
| SEZ-08 | `tipuri_abonament` legate de sezon, tipurile din sezoane vechi rămân istoric pentru facturile emise | Pattern 1 (versionare fără hard-delete), Common Pitfalls Pitfall 1 (fallback PlatiScadente) |
| SEZ-09 | Facturile deja emise pe tipuri de abonament din sezoane arhivate rămân neschimbate | Code Examples (`sezon_id` nullable, `ON DELETE SET NULL`), Assumptions Log A3 |
</phase_requirements>

## Summary

Faza 27 adaugă un concept nou — **sezon** (interval liber de date, per club) — peste două module existente și deja hardening-uite din punct de vedere RLS: `grupe` și `tipuri_abonament`. Ambele tabele au fost tocmai (28.08.2026, Faza 25) migrate pe un pattern RLS canonic bazat pe `public.has_access_to_club(club_id)` / `public.este_staff_club(club_id)` / `public.is_super_admin()` — orice politică nouă pentru `sezoane` **trebuie** să refolosească exact aceste helpere (nu variantele vechi `get_my_clubs()`/`get_my_club_ids()`, deprecate de facto și eliminate din toate policy-urile documentate).

Nu există în cod niciun precedent de tabel "sezon" — dar există **exact** modelul de date de care e nevoie: `perioade_vacanta` (interval liber `data_start`/`data_end`, per `club_id`, cu RLS scoping identic celui cerut pentru `sezoane`) și un pattern de **versionare istorică fără hard-delete** deja implementat în `ConfigurarePreturi.tsx` (`grade_preturi_config`: rândul vechi se dezactivează cu `is_activ:false`, se inserează un rând nou `is_activ:true`, niciodată delete) — exact ce cere D-09 pentru `tipuri_abonament` legate de sezon.

Cel mai important risc tehnic găsit: `PlatiScadente.tsx` (generarea automată a facturilor lunare) are un **fallback silențios** — `tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id) || tipuriAbonament.find(ab => ab.numar_membri === 1)` — care, odată ce vor exista MAI MULTE rânduri "Individual" (`numar_membri===1`) în `tipuri_abonament` (unul per sezon, conform D-09), va prelua **primul găsit în array**, nu neapărat cel din sezonul activ. Fără o corecție explicită (filtrare pe sezon activ înainte de fallback), acest bug va factura silențios prețul unui sezon arhivat.

**Primary recommendation:** Creează `sezoane` ca tabel nou, independent, cu RLS clonat 1:1 din pattern-ul `tipuri_abonament_write` (Faza 25) + un index unic parțial `WHERE activ=true` per club (pattern deja folosit la `sportiv_grupa_istoric.idx_sgi_activ`) ca să impună D-03 la nivel de DB. Adaugă `sezon_id` (nullable) + `tip_grupa` pe `grupe`, `sezon_id` pe `tipuri_abonament`, ambele coloane FK simple fără schimbare de RLS (politicile existente pe club_id rămân valabile). Reutilizează pattern-ul "dezactivează + inserează" din `ConfigurarePreturi.tsx` pentru arhivarea automată a grupelor per-sezon și pentru istoricul `tipuri_abonament`. Repară explicit fallback-ul din `PlatiScadente.tsx` ca task separat, obligatoriu în același plan (nu poate fi lăsat pentru mai târziu — e un bug de facturare, nu doar de UX).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Creare/editare sezon (interval date, activ) | Frontend (React component nou `Sezoane/`) | API/Backend (Supabase PostgREST + RLS) | CRUD simplu per club, fără logică server-side custom — pattern identic `PerioadaVacanta.tsx` |
| Enforcement "un singur sezon activ per club" | Database (index unic parțial) | Frontend (dezactivează vechiul înainte de a activa noul) | Regulă de integritate — nu poate fi garantată doar în UI (race condition multi-tab/multi-admin) |
| Flag permanent/per-sezon pe grupă | Database (coloană `tip_grupa` pe `grupe`) | Frontend (`GrupaFormModal.tsx`) | Proprietate persistentă a entității, nu stare UI tranzitorie |
| Arhivare automată grupe per-sezon la sezon nou | Frontend (acțiune declanșată de admin la creare sezon) SAU Database (trigger) | — | Vezi Open Questions — decizie planificare: trigger SQL vs. acțiune explicită în UI |
| Clonare manuală grupă în sezon nou | Frontend (buton dedicat + INSERT nou rând `grupe`) | Database (FK `sezon_id` pe rândul clonat) | Acțiune manuală explicită per D-07 — nu automatizare server-side |
| Legare `tipuri_abonament` de sezon + istoric prețuri | Database (coloană `sezon_id` + pattern versionare `is_activ`) | Frontend (`TipuriAbonament.tsx`, filtrare pe sezon activ) | Integritate istorică a facturilor — DB e sursa de adevăr, UI doar filtrează afișarea |
| Filtrare "tip abonament activ" în generarea facturilor | Frontend (`PlatiScadente.tsx`, `FamilieWidget.tsx`) | — | Query-urile Supabase deja aduc tot catalogul client-side (pattern existent `useDataProvider.ts`); filtrarea pe sezon activ se face în JS, nu în query nou |

## Standard Stack

Nicio librărie nouă necesară — feature complet acoperit de stack-ul existent (React 18 + TS + Supabase + Tailwind, fără Shadcn/MUI, conform CLAUDE.md).

### Core
| Componentă | Status | Scop | De ce e standard aici |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` 2.98.0 | deja instalat | CRUD `sezoane`, `grupe`, `tipuri_abonament` | client unic folosit peste tot în proiect |
| React Query v5 (deja instalat) | deja instalat | cache/staleTime pentru `sezoane` (pattern `useGrupe.ts`) | consistent cu restul modulelor de date |

### Alternatives Considered
| În loc de | S-ar putea folosi | Tradeoff |
|------------|-----------|----------|
| Coloană `sezon_id` nullable pe `grupe`/`tipuri_abonament` | Tabel junction M:N `grupa_sezoane` | Junction ar permite o grupă legată de mai multe sezoane simultan — dar D-04/D-06 cer relație 1:1 (o grupă per-sezon aparține unui singur sezon la un moment dat); coloană FK simplă e suficientă și consistentă cu restul schemei (toate relațiile 1:club/1:grupă din proiect sunt FK simple, nu M:N, cu excepția `sportivi_grupe_secundare` care e explicit M:N pentru un caz de business diferit) |
| Index unic parțial pentru "un singur sezon activ" | Constraint aplicat doar în UI/JS | Un index DB e singura garanție reală împotriva race condition (2 admini simultan, sau retry pe eroare de rețea) — pattern deja folosit în cod (`idx_sgi_activ ... WHERE data_iesire IS NULL`) |

**Installation:** Niciuna — nu se instalează npm packages noi.

**Version verification:** N/A — nicio dependință nouă.

## Package Legitimacy Audit

**Nu se aplică.** Această fază nu instalează pachete externe noi — este strict schemă DB (SQL) + componente React folosind stack-ul deja prezent în `package.json` (verificat prin `docs/module.md` și `package.json`, ambele citite integral). Gate-ul slopcheck nu a fost rulat pentru că nu există niciun pachet de verificat.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN_CLUB (UI nouă: tab/ecran "Sezoane")                        │
│   creează sezon (data_start, data_final) ──┐                     │
└──────────────────────────────────────────┬─┘                     │
                                            ▼
                          INSERT public.sezoane (club_id, activ=true)
                          UPDATE public.sezoane SET activ=false
                             WHERE club_id=X AND id != noul_id
                                            │
                                            ▼
                    ┌───────────────────────────────────────┐
                    │  Acțiune admin: "Arhivează + clonează" │
                    └───────────────┬─────────────┬─────────┘
                                    ▼             ▼
                    UPDATE grupe             (opțional, manual per grupă)
                    SET arhivat=true          INSERT grupe (denumire,
                    WHERE sezon_id=vechi       club_id, sezon_id=nou,
                    AND tip_grupa='per_sezon'  tip_grupa='per_sezon',
                                                sportivi NU se copiază — D-08)
                                    │
                                    ▼
        grupe (permanent, sezon_id=NULL) ── neatinse, sportivii rămân (D-05)
                                    │
                                    ▼
        Modul Grupe (index.tsx / GrupaCard.tsx)
          afișează badge PERMANENT / PER-SEZON + (dacă arhivat) badge ARHIVAT
                                    │
                                    ▼
        Modul Plăți (TipuriAbonament.tsx / PlatiScadente.tsx)
          tipuri_abonament.sezon_id filtrează catalogul activ
          PlatiScadente genereaza facturi DOAR din tipuri legate
          de sezonul activ al clubului sportivului
                                    │
                                    ▼
        Facturi deja emise (plati.tip_abonament_id) ── rămân neschimbate
        (tipuri_abonament vechi NU se șterg, D-09)
```

### Recommended Project Structure
```
components/
├── Sezoane/                      # NOU — ecran dedicat CRUD sezoane (ADMIN_CLUB)
│   ├── index.tsx                 # listă sezoane per club + activare/dezactivare
│   └── SezonFormModal.tsx        # creare/editare sezon (data_start, data_final)
├── Grupe/
│   ├── GrupaFormModal.tsx        # EXTINDE: selector permanent/per-sezon + sezon curent
│   ├── GrupaCard.tsx             # EXTINDE: badge tip_grupa + arhivat
│   └── ArhiveazaCloneazaModal.tsx  # NOU — acțiunea D-07 "Dublează în sezon nou"
sql/migrations/
└── add_sezoane_grupe_abonamente.sql   # tabel sezoane + coloane sezon_id/tip_grupa
```

### Pattern 1: Versionare fără hard-delete (dezactivare + inserare)
**What:** La schimbarea unei configurații "istorice" (preț, tip abonament), NU se face UPDATE pe rândul existent și NU se șterge — se dezactivează rândul vechi (`is_activ:false` sau echivalent) și se inserează unul nou.
**When to use:** Orice dată care e referențiată de facturi deja emise (`plati.tip_abonament_id`) — regula D-09 explicită.
**Example (pattern existent, reutilizabil ca atare pentru `tipuri_abonament`):**
```typescript
// Source: components/Plati/ConfigurarePreturi.tsx (linii 97-134), pattern deja live în producție
// Pas 1: Dezactivează tipul vechi (NU delete)
const { error: updateError } = await supabase.from('tipuri_abonament')
    .update({ activ: false }).eq('id', oldTip.id);
// Pas 2: Inserează tipul nou, legat de sezonul curent
const { error: insertError } = await supabase.from('tipuri_abonament').insert({
    denumire: oldTip.denumire, pret: newPret,
    numar_membri: oldTip.numar_membri, club_id: oldTip.club_id,
    sezon_id: sezonActivId, activ: true
});
// Facturile vechi (plati.tip_abonament_id -> oldTip.id) rămân intacte și corecte istoric.
```

### Pattern 2: Index unic parțial pentru "o singură instanță activă"
**What:** Constrângere DB care garantează maxim un rând `activ=true` per club.
**When to use:** D-03 — un singur sezon activ per club.
**Example:**
```sql
-- Source: pattern existent sql/migrations/add_sportiv_grupa_istoric.sql
-- (idx_sgi_activ ... WHERE data_iesire IS NULL), aplicat aici la sezoane
CREATE UNIQUE INDEX IF NOT EXISTS idx_sezoane_activ_per_club
    ON public.sezoane(club_id) WHERE activ = true;
```
Aplicație: fluxul de activare a unui sezon nou TREBUIE să dezactiveze explicit sezonul vechi ÎNAINTE de a insera/activa noul (în aceeași tranzacție logică din UI, sau printr-un `UPDATE ... SET activ=false WHERE club_id=X` urmat de `INSERT`), altfel indexul unic respinge INSERT-ul — comportament dorit (fail-fast, nu fail-silent).

### Pattern 3: RLS canonic per-club (Faza 25) — de reutilizat identic
**What:** Toate tabelele scopate pe club din acest modul folosesc DOAR 3 helpere centrale.
**Example (SELECT + WRITE pentru `sezoane`, calchiat exact după `tipuri_abonament` — Secțiunea 3, `20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`):**
```sql
-- Source: supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql (Secțiunea 3)
ALTER TABLE public.sezoane ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sezoane_select" ON public.sezoane
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.has_access_to_club(club_id)
        -- SPORTIV nu are nevoie de citire directă pe sezoane în acest scope
        -- (dacă un ecran de sportiv va afișa vreodată "sezonul curent", se
        -- adaugă aici pe modelul get_own_sportiv_id() folosit la tipuri_abonament)
    );

-- WRITE: DOAR SUPER_ADMIN_FEDERATIE/ADMIN/ADMIN_CLUB — NU INSTRUCTOR (D-02).
-- este_staff_club() include INSTRUCTOR, deci NU se poate folosi aici ca gate
-- unic — trebuie replicat exact predicatul de rol din tipuri_abonament_write.
CREATE POLICY "sezoane_write" ON public.sezoane
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
        )
        AND public.has_access_to_club(club_id)
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
        )
        AND public.has_access_to_club(club_id)
    );
```
**IMPORTANT:** `grupe` folosește deja `has_access_to_club(club_id)` FĂRĂ gate de rol suplimentar (INSTRUCTOR poate scrie) — asta e CORECT și NU trebuie schimbat, pentru că D-04 permite explicit instructorului să seteze flagul permanent/per-sezon la creare/editare grupă. Doar `sezoane` (tabelul nou) restricționează la ADMIN_CLUB+ pentru creare/gestionare sezon, conform D-02.

### Anti-Patterns to Avoid
- **`SELECT USING(true)` pe `sezoane`:** exact pattern-ul pe care Faza 25 tocmai l-a reparat pe `perioade_vacanta`/`tipuri_abonament`/`grupe`. Tabelul `sezoane` NU trebuie creat cu acest pattern vechi (era în `create_perioade_vacanta.sql`, migrația originală, azi înlocuit).
- **`get_my_clubs()` / `get_my_club_ids()`:** deprecate de facto (0 call-site-uri rămase în `pg_policies` după Faza 25-04, conform STATE.md). Nu le folosi în nicio politică nouă.
- **Hard DELETE pe `tipuri_abonament`:** UI-ul curent (`TipuriAbonament.tsx`, linia ~104) face `supabase.from('tipuri_abonament').delete()`. Odată ce un tip e legat de facturi emise (`plati.tip_abonament_id`), delete-ul rupe istoricul FK. Trebuie schimbat pe pattern-ul din `ConfigurarePreturi.tsx` (dezactivare, nu ștergere) — vezi Common Pitfalls.
- **Copiere automată a listei de sportivi la clonarea unei grupe per-sezon:** D-08 interzice explicit asta — clonarea creează un rând `grupe` gol (fără sportivi asignați), re-asignarea e strict manuală.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| "Un singur activ per club" | Verificare JS înainte de INSERT | Index unic parțial DB (`WHERE activ=true`) | JS-only e vulnerabil la race condition (2 admini simultan) — DB e singura garanție atomică |
| Istoric prețuri/tipuri abonament | Coloană JSON cu istoric embedded | Pattern rând-nou + `activ:false` (deja folosit în `grade_preturi_config`) | Consistent cu restul schemei, ușor de interogat (`WHERE activ=true`), FK-uri din `plati` rămân valide pe rândurile vechi |
| Tracking cine/când a schimbat grupa unui sportiv | Nimic nou | `sportiv_grupa_istoric` (deja există, `services/grupeIstoricService.ts`) | La arhivarea unei grupe per-sezon, dacă vreun sportiv era încă asignat, folosește `scoateDinGrupa()`/`mutaInGrupa()` existente ca să nu se piardă istoricul de prezență |

**Key insight:** Acest modul nu are nevoie de nicio bibliotecă sau algoritm nou — toate componentele (versionare istorică, index unic parțial, RLS per-club, tracking istoric grupă) au deja un precedent funcțional în producție în acest repo. Riscul real e de INTEGRARE (fallback-uri silențioase care presupun "un singur tip per club"), nu de arhitectură.

## Common Pitfalls

### Pitfall 1: Fallback silențios în generarea facturilor (`PlatiScadente.tsx`)
**What goes wrong:** Odată ce vor exista mai multe rânduri `tipuri_abonament` cu `numar_membri===1` per club (câte unul per sezon, per D-09), linia `(tipuriAbonament || []).find(ab => ab.id === sportiv.tip_abonament_id) || (tipuriAbonament || []).find(ab => ab.numar_membri === 1)` (PlatiScadente.tsx, linia 252) poate prelua tipul dintr-un sezon arhivat dacă `sportiv.tip_abonament_id` e `null`/invalid — facturează greșit, silențios, fără eroare vizibilă.
**Why it happens:** Fallback-ul a fost scris când exista un singur tip `numar_membri===1` per club; presupunerea nu mai e validă odată cu sezoanele.
**How to avoid:** Filtrează `tipuriAbonament` pe `sezon_id === sezonActivId` ÎNAINTE de orice `.find()` folosit pentru generarea de facturi (nu doar la afișare în `TipuriAbonament.tsx`). Verifică toate cele 12 fișiere care citesc `tip_abonament_id`/`tipuriAbonament` (listă completă mai jos) pentru fallback-uri similare.
**Warning signs:** Facturi generate cu sumă diferită de prețul afișat curent în `TipuriAbonament.tsx` pentru clubul respectiv.

**Fișiere care citesc `tip_abonament_id` — de verificat pe rând pentru presupuneri "un singur tip activ":**
`components/Plati/JurnalIncasari.tsx`, `components/UserProfile/FinanciarTab.tsx`, `components/Plati/PlatiScadente.tsx`, `components/Plati/GestiuneFacturi.tsx`, `components/Plati/PerioadaVacanta.tsx`, `components/GestiuneExamene/ImportExcelExamen.tsx`, `components/Plati/LuniLipsaWizard.tsx`, `components/Plati/Familii.tsx`, `components/Sportivi/SportivFormFields.tsx`, `components/SportivDashboard/FamilieWidget.tsx`, `components/UserManagement.tsx`, `components/UserProfile/FamilieTab.tsx`.

### Pitfall 2: `sportivi.tip_abonament_id` nu se actualizează automat la sezon nou
**What goes wrong:** Când se creează un sezon nou, sportivii existenți rămân cu `tip_abonament_id` care indică spre un tip din sezonul vechi (acum "istoric", posibil `activ:false`). Dacă `TipuriAbonament.tsx`/`SportivFormFields.tsx` ascund tipurile inactive din dropdown, sportivul pare "fără tip valid" fără nicio acțiune vizibilă din partea adminului.
**Why it happens:** CONTEXT.md D-09 rezolvă doar soarta facturilor deja emise, NU spune explicit ce se întâmplă cu asignarea curentă a sportivului la un tip de abonament al sezonului vechi.
**How to avoid:** Documentat ca Open Question mai jos — planner-ul trebuie să decidă explicit: (a) sportivul rămâne pe tipul vechi până e reasignat manual (analog cu D-08 pentru grupe), sau (b) generarea facturilor cade automat pe primul tip cu aceeași `denumire`/`numar_membri` din sezonul nou. Recomandare: opțiunea (a), consistentă cu filozofia "totul manual" din D-07/D-08.
**Warning signs:** Sportivi fără factură generată automat după trecerea la sezon nou, fără mesaj de eroare vizibil.

### Pitfall 3: Politici RLS "fantomă" aplicate direct pe DB, nedocumentate în migrații
**What goes wrong:** Faza 25 (20260828) a descoperit că `grupe`, `tipuri_abonament`, `program_antrenamente`, `evenimente` aveau politici RLS live pe Supabase care NU existau în niciun fișier de migrație din repo — aplicate direct din Supabase Studio/SQL Editor, niciodată comise. Orice migrație nouă pentru `sezoane`/`grupe`/`tipuri_abonament` scrisă doar pe baza fișierelor din `sql/migrations/`+`supabase/migrations/` riscă să coexiste permisiv (OR) cu politici vechi nedocumentate și să NU repare nimic.
**Why it happens:** Modificări RLS aplicate manual din UI-ul Supabase, fără disciplină de migrare.
**How to avoid:** Înainte de a scrie orice `CREATE POLICY` pentru `grupe`/`tipuri_abonament` în această fază, interoghează live `pg_policies` (nu presupune că fișierele din repo reflectă starea reală) — pattern deja documentat explicit în `20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`. Pentru tabelul NOU `sezoane` acest risc nu există (tabel nou, fără istoric de politici vechi).
**Warning signs:** După aplicarea unei migrații RLS, testul de izolare cross-club (`tests/rls_izolare_cross_club_faza25.ts`) tot arată leak.

### Pitfall 4: Coloane noi pe tabele cu date live, fără default sigur
**What goes wrong:** `grupe` are deja date reale (7 cluburi active, conform CLAUDE.md). Adăugarea `tip_grupa` NOT NULL fără `DEFAULT` sparge orice INSERT existent din cod (`GrupaFormModal.tsx` nu trimite acest câmp azi) și orice rând existent rămâne cu valoare nedefinită.
**Why it happens:** Migrație scrisă fără să se țină cont de codul UI care încă nu populează noua coloană.
**How to avoid:** `tip_grupa` trebuie să aibă `DEFAULT 'permanent'` (comportament identic cu azi — toate grupele existente devin implicit "permanente", cea mai sigură alegere pentru păstrarea comportamentului curent fără migrare de date suplimentară) și `sezon_id` trebuie să fie nullable fără default (permanent = fără sezon, per D-05).
**Warning signs:** Erori `null value in column "tip_grupa" violates not-null constraint` la creare grupă imediat după deploy.

## Code Examples

### Creare tabel `sezoane` (schema completă recomandată)
```sql
-- Source: pattern compus din sql/migrations/create_perioade_vacanta.sql (interval liber + club_id)
-- și sql/migrations/add_sportiv_grupa_istoric.sql (index unic parțial pentru "activ")
CREATE TABLE IF NOT EXISTS public.sezoane (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    club_id     UUID NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    denumire    TEXT NOT NULL,              -- ex: "Sezon 2026-2027"
    data_start  DATE NOT NULL,
    data_final  DATE NOT NULL,
    activ       BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT sezon_date_valide CHECK (data_final >= data_start)
);

CREATE INDEX IF NOT EXISTS sezoane_club_id_idx ON public.sezoane(club_id);
-- Enforcement D-03: un singur sezon activ per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_sezoane_activ_per_club
    ON public.sezoane(club_id) WHERE activ = true;
```

### Extindere `grupe` și `tipuri_abonament`
```sql
-- grupe: flag permanent/per-sezon + FK opțional către sezon
ALTER TABLE public.grupe
    ADD COLUMN IF NOT EXISTS tip_grupa TEXT NOT NULL DEFAULT 'permanent'
        CHECK (tip_grupa IN ('permanent', 'per_sezon')),
    ADD COLUMN IF NOT EXISTS sezon_id UUID REFERENCES public.sezoane(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS arhivat BOOLEAN NOT NULL DEFAULT false;
-- Note: DEFAULT 'permanent' păstrează comportamentul curent pentru toate grupele
-- existente (Pitfall 4). arhivat urmează pattern-ul boolean deja folosit în
-- produse (ProdusDB.activ, ProdusVariantaDB.activa) — NU un enum "stare" nou.

-- tipuri_abonament: legare de sezon (nullable pentru compatibilitate cu rânduri istorice)
ALTER TABLE public.tipuri_abonament
    ADD COLUMN IF NOT EXISTS sezon_id UUID REFERENCES public.sezoane(id) ON DELETE SET NULL;
-- Fără NOT NULL — rândurile existente (create înainte de sezoane) rămân valide,
-- vizibile ca "fără sezon asignat" până la o migrare de date explicită sau
-- prima creare de sezon per club.
```

### Filtrare pe sezon activ (client-side, pattern `useDataProvider.ts`)
```typescript
// Source: pattern existent — useDataProvider.ts filtrează deja tot catalogul
// client-side pe club_id (nicio query nouă necesară, doar filtrare JS suplimentară)
const sezonActiv = sezoane.find(s => s.club_id === activeRoleContext?.club_id && s.activ);
const tipuriAbonamentActive = tipuriAbonament.filter(
    ab => !sezonActiv || ab.sezon_id === sezonActiv.id || ab.sezon_id === null
);
```

## State of the Art

| Vechi (înainte de Faza 25) | Curent (după 28.08.2026) | Când s-a schimbat | Impact pentru Faza 27 |
|--------------|------------------|--------------|--------|
| `SELECT USING(true)` pe `grupe`/`tipuri_abonament`/`perioade_vacanta` | `has_access_to_club(club_id)` + `este_staff_club(club_id)` + `is_super_admin()` | 28.08.2026, migrația `20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql` | `sezoane` (tabel nou) TREBUIE creat direct cu noul pattern — nu are sens să repete greșeala reparată acum 5 zile |
| `get_my_clubs()`/`get_my_club_ids()` | deprecate de facto, 0 referințe live în `pg_policies` (STATE.md, notă 25-04) | 28.08.2026 | Nu folosi aceste funcții în nicio politică nouă |

**Deprecated/outdated:**
- Pattern-ul `perioade_vacanta` original (`sql/migrations/create_perioade_vacanta.sql`, `SELECT USING(true)`) — folosit doar ca exemplu istoric de "ce să NU faci", varianta corectă e în `supabase/migrations/20260828_...sql`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `este_staff_club(club_id)` include INSTRUCTOR, deci NU poate fi folosit ca gate unic pentru scrierea în `sezoane` (D-02 cere doar ADMIN_CLUB+) — trebuie replicat predicatul de rol explicit din `tipuri_abonament_write` | Architecture Patterns, Pattern 3 | Dacă planner-ul folosește `este_staff_club` direct, INSTRUCTOR ar putea crea/edita sezoane, contrazicând D-02 — verificat prin citirea directă a definiției funcției (`fix_rls_context_aware_role_helpers.sql`), risc scăzut dar de confirmat la scriere efectivă a migrației |
| A2 | Recomandarea `tip_grupa DEFAULT 'permanent'` pentru toate grupele existente e comportamentul dorit (nu li se cere adminilor să reclasifice manual grupele existente la deploy) | Common Pitfalls, Pitfall 4 | Dacă un club dorește ca toate grupele lui existente să fie reclasificate ca "per_sezon" la activare, defaultul greșit ar necesita un pas manual suplimentar — CONTEXT.md nu specifică explicit acest caz, decizie rezonabilă dar neconfirmată de user |
| A3 | Sportivii cu `tip_abonament_id` pointing la un tip arhivat (sezon vechi) rămân neschimbați până la reasignare manuală (opțiunea (a) din Pitfall 2), nu se auto-migrează | Common Pitfalls, Pitfall 2 | Dacă planner-ul alege opțiunea (b) fără să documenteze explicit regula de matching (denumire/numar_membri), generarea facturilor poate deveni imprevizibilă — necesită decizie explicită la planificare, marcat ca Open Question |

## Open Questions

1. **Ce se întâmplă cu `sportivi.tip_abonament_id` la trecerea la sezon nou?**
   - What we know: D-09 rezolvă doar soarta facturilor deja emise (rămân neschimbate). CONTEXT.md nu menționează reasignarea sportivilor la noul catalog de tipuri.
   - What's unclear: Rămâne sportivul "orfan" (tip vechi arhivat) până la reasignare manuală de admin, sau trebuie un flux de migrare/mapare automată?
   - Recommendation: Tratează la fel ca D-08 (reasignare manuală, fără automatizare) — consistent cu filozofia explicit-manual a deciziilor D-07/D-08. Planner-ul trebuie să decidă explicit și să documenteze în PLAN.md, pentru că afectează direct generarea facturilor (`PlatiScadente.tsx`).

2. **Arhivarea automată a grupelor per-sezon: trigger SQL sau acțiune UI explicită?**
   - What we know: D-06 cere "arhivare automată" la crearea sezonului nou. D-07 cere clonarea "manuală" (buton dedicat).
   - What's unclear: "Automată" înseamnă declanșată de un trigger DB la INSERT în `sezoane` (activare sezon nou), sau declanșată de UI ca parte a aceleiași acțiuni de admin ("creează sezon nou" → apel client care face și UPDATE arhivare + oferă opțiunea de clonare)?
   - Recommendation: UI-driven (nu trigger SQL) — mai ușor de testat, de aliniat cu restul codebase-ului (niciun trigger complex nu există azi pentru `grupe`; toate mutațiile trec prin `services/`/componente React), și evită riscul de comportament surprinzător dacă cineva creează un sezon direct din SQL Editor (posibil, dat fiind istoricul de politici/migrări aplicate manual documentat la Faza 25).

3. **UI exact pentru selectarea sezonului activ** — marcat explicit ca "Claude's Discretion" în CONTEXT.md (selector în header Grupe? tab dedicat?). Nu necesită research suplimentar, decizie de UI-phase.

## Environment Availability

Nu se aplică — nicio dependință externă nouă (fără CLI-uri, servicii, runtime-uri suplimentare). Toată infrastructura (Supabase, Node/npm, Vite) e deja confirmată funcțională de fazele anterioare recent completate (25, 26).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | da | RLS Postgres pe `sezoane` — pattern identic `tipuri_abonament_write` (rol explicit ADMIN_CLUB+ AND `has_access_to_club(club_id)`), fail-closed by design (fără `club_id IS NULL OR`) |
| V5 Input Validation | da | `CHECK (data_final >= data_start)` la nivel DB (pattern deja folosit în `perioade_vacanta`); validare `tip_grupa IN ('permanent','per_sezon')` via `CHECK` constraint, nu doar TypeScript |
| V1 Architecture/Design | da | Index unic parțial (`idx_sezoane_activ_per_club`) ca invariant de business impus la nivel DB, nu doar aplicație — previne stare inconsistentă chiar dacă UI-ul are un bug sau request-urile se suprapun |

### Known Threat Patterns for acest modul

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-club data leak pe `sezoane` (un ADMIN_CLUB de la clubul A vede/editează sezoanele clubului B) | Information Disclosure / Tampering | RLS cu `has_access_to_club(club_id)` — exact gap-ul reparat de Faza 25 pe tabelele surori; tabelul nou `sezoane` trebuie să pornească direct corect |
| Privilege escalation: INSTRUCTOR creează/șterge sezoane deși D-02 rezervă asta ADMIN_CLUB+ | Elevation of Privilege | Predicat de rol explicit `rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN','ADMIN_CLUB')` în politica de WRITE — NU folosi `este_staff_club()` singur (include INSTRUCTOR) |
| Race condition pe activare sezon (2 cereri simultane, ambele reușesc să seteze `activ=true`) | Tampering (stare inconsistentă) | Index unic parțial `WHERE activ=true` — a doua tranzacție eșuează cu `unique_violation`, UI trebuie să trateze eroarea (retry cu mesaj clar, nu 500 silențios) |

## Sources

### Primary (HIGH confidence — cod citit direct din acest repo)
- `supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql` — pattern RLS canonic curent pentru `grupe`/`tipuri_abonament`/`perioade_vacanta`, inclusiv istoricul complet al politicilor "fantomă" descoperite live
- `sql/migrations/fix_rls_context_aware_role_helpers.sql` — definițiile exacte ale `is_super_admin()`, `este_staff_club()`, `has_access_to_club()`
- `sql/migrations/create_perioade_vacanta.sql` — precedent schemă "interval liber + club_id", inclusiv versiunea VECHE de RLS (folosită ca exemplu negativ)
- `sql/migrations/add_sportiv_grupa_istoric.sql` — precedent index unic parțial (`idx_sgi_activ`) + tracking istoric
- `components/Plati/ConfigurarePreturi.tsx` — pattern versionare istorică fără hard-delete (dezactivare + inserare)
- `components/Plati/PlatiScadente.tsx` (linia 252) — fallback-ul silențios identificat ca risc critic
- `components/Grupe/index.tsx`, `GrupaFormModal.tsx`, `GrupaCard.tsx`, `GrupeSecundareModal.tsx` — flux CRUD grupe curent, punct de extindere
- `components/Plati/TipuriAbonament.tsx` — CRUD curent tipuri abonament, inclusiv hard-delete de reparat
- `hooks/useGrupe.ts`, `hooks/useDataProvider.ts` — pattern de cache/fetch client-side per club, reutilizabil pentru `sezoane`
- `types.ts` (interfețele `Grupa`, `TipAbonament`, `ProdusDB`/`ProdusVariantaDB` pentru pattern `activ`/`activa`)
- `.planning/STATE.md`, `.planning/phases/27-.../27-CONTEXT.md`, `.planning/config.json`

### Secondary (MEDIUM confidence)
- Niciuna — toate afirmațiile tehnice din acest document sunt verificate direct din codul/schema/migrațiile prezente în repo, nu din surse externe.

### Tertiary (LOW confidence)
- Niciuna.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — fără dependințe noi, integral verificat din `package.json`/`CLAUDE.md`
- Architecture (RLS, schema): HIGH — pattern-uri citite direct din migrațiile aplicate cel mai recent (28.08.2026), inclusiv definițiile funcțiilor helper
- Pitfalls: HIGH pentru fallback-ul din `PlatiScadente.tsx` (citit direct, linia exactă identificată) / MEDIUM pentru fluxul exact de arhivare-clonare (nu are precedent 1:1, e design nou, marcat explicit ca Open Question)

**Research date:** 2026-09-02
**Valid until:** 30 zile (schema DB stabilă, dar zona RLS a acestui proiect a avut 3 valuri de fix-uri corective consecutive în ultimele săptămâni — recomand re-verificare `pg_policies` live chiar înainte de a scrie migrația finală, conform Pitfall 3)
