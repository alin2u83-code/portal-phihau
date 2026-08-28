# Faza 25 — Audit RLS CORECTAT (live pg_policies, 2026-08-28, dupa esec de aplicare)

**Motiv:** aplicarea initiala a `20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`
a picat pe eroare de sintaxa (`get_my_club_ids()` — nume gresit intr-un comentariu/query
de verificare, nu in cod executabil, dar suficient sa opreasca tranzactia). Rollback
complet — DB neschimbat. Investigand cauza, orchestratorul a interogat direct
`pg_policies` si `pg_proc` pe DB-ul live si a descoperit ca **`25-AUDIT.md` (varianta
initiala) e sever depasit** fata de starea reala: DB-ul are mult mai multe politici RLS
decat documentase arheologia de migratii, acumulate probabil din scripturi/editari SQL
directe, niciodata comise ca fisiere de migratie in acest repo.

**Metoda:** acest document a fost scris pornind de la un dump complet `pg_policies`
pentru toate cele 9 tabele relevante (grupe, evenimente, orar_exceptii,
participare_vacanta, perioade_vacanta, plati, program_antrenamente,
sesiune_activitate, tipuri_abonament) si de la definitiile curente ale functiilor
helper, ambele interogate live de orchestrator chiar inainte de acest task. Nu s-a
re-interogat DB-ul — datele sunt considerate curente si de incredere.

---

## Constatarea centrala: politici "fantoma"

Grep exhaustiv pe tot repo-ul (`supabase/migrations/`, `sql/`, restul codebase-ului)
pentru numele exacte ale politicilor/functiilor gasite live a dat **0 rezultate** pentru:

- `UNIFIED_CLUB_ACCESS` (politica)
- `has_power_role()` (functie)
- `este_staff_autorizat()` (functie)
- `get_my_clubs()` (functie)
- `Staff_Full_Access` (politica)
- `SuperAdmin_Total_Access` (politica)
- `Filtru_Club_Universal`, `Acces Club Grupe`, `Staff-ul clubului gestionează grupele
  proprii`, `Super Admin - Acces total la grupe` (politici pe `grupe`)
- `orar_exceptii_select/insert/update/delete` (politici pe `orar_exceptii`)
- `Acces Club: Admin si Instructor`, `Gestionare antrenamente instructori`,
  `Staff manage program_antrenamente`, `Vizualizare antrenamente club`,
  `Bypass_Super_Admin`, `Power roles can manage training sessions`,
  `Staff_Manage_Program` (politici pe `program_antrenamente`)
- `Staff-ul clubului gestioneaza tipurile de abonament proprii` (politica pe
  `tipuri_abonament`)
- `evenimente_public_select` (politica pe `evenimente`)

**Toate acestea exista live, active, combinate PERMISIV (OR) cu politicile documentate
de `25-AUDIT.md`.** Postgres RLS evalueaza toate politicile permisive ale unei comenzi
cu OR — o singura politica prea larga anuleaza efectul oricarui numar de politici
corecte coexistente. Acesta e exact riscul pe care metodologia `25-AUDIT.md` il
semnala explicit ("daca vreo politica a fost modificata direct din Supabase Studio SQL
Editor fara a salva un fisier corespunzator, acea schimbare nu apare in acest audit")
— s-a materializat pe scara mare (minim 9 tabele, ~20 politici fantoma).

**Consecinta directa:** varianta initiala a migratiei (inainte de acest task) ar fi
"reusit" logic (DROP pe nume documentate, CREATE politici noi corecte) dar **NU ar fi
reparat nimic** — politicile fantoma, nedropuite (nume diferite), ar fi ramas active si
ar fi continuat sa gaureasca izolarea prin OR, exact ca inainte de migratie. Pe
`program_antrenamente` in particular, niciunul din numele vizate de DROP in varianta
initiala a Sectiunii 6 nu exista live sub acel nume — toate DROP-urile ar fi fost no-op.

---

## Gauri de securitate active identificate (nu doar teoretice)

| # | Tabela | Politica | Bug | Severitate |
|---|--------|----------|-----|------------|
| 1 | `program_antrenamente` | `Power roles can manage training sessions` (`has_power_role()`) | FOR ALL, **zero verificare de club_id**. Orice user cu rol primar ADMIN_CLUB/INSTRUCTOR/SUPER_ADMIN_FEDERATIE poate INSERT/UPDATE/DELETE in programul de antrenament al **oricarui club**, nu doar al lui. | **CRITICA** — cross-club write nerestrictionat |
| 2 | `grupe`, `program_antrenamente`, `tipuri_abonament`, `evenimente` | `Staff_Full_Access` (`este_staff_autorizat()`) | FOR ALL, verifica DOAR ca userul e staff la clubul **activ din context**, FARA sa compare cu `club_id`-ul randului tinta. Un staff cu contextul activ pe Clubul A vede/scrie randuri din **orice club**, nu doar A. | **CRITICA** — cross-club read+write pe 4 tabele |
| 3 | `grupe`, `program_antrenamente`, `tipuri_abonament`, `evenimente` | `UNIFIED_CLUB_ACCESS` (`club_id = get_active_role_context()`) | FOR ALL, context-aware pe club dar **fara nicio verificare de rol** — un SPORTIV al carui context activ e la clubul propriu primeste acces de scriere (INSERT/UPDATE/DELETE), nu doar citire, la acel club. | **MEDIE** — escaladare de rol (nu cross-club, dar SPORTIV nu ar trebui sa scrie niciodata in aceste tabele) |
| 4 | `grupe` | `Acces Club Grupe`, `Filtru_Club_Universal`, `Staff-ul clubului gestionează grupele proprii`, `Super Admin - Acces total la grupe` | Non-context-aware (folosesc toate clubs-urile userului sau `is_primary`, nu header-ul `active-role-context-id`). Nu sunt cross-club leak in sine, dar ocolesc modelul de "context activ" pe care restul aplicatiei se bazeaza. | **MICA** — inconsistenta de model, nu leak |
| 5 | `orar_exceptii` | `orar_exceptii_select/insert/update/delete` | Scoping pe club corect (fiecare rand ramane restrictionat la clubul unde userul are efectiv rolul), dar non-context-aware. | **MICA** |
| 6 | `sesiune_activitate` | `Bypass_Super_Admin` | Duplicat redundant al `is_super_admin()`, fara club_id — nu adauga acces peste ce super-adminul are deja. | **NULA** (curatenie) |

Gaura #1 (`has_power_role()` pe `program_antrenamente`) e cea semnalata explicit ca
prioritate de orchestrator si confirmata identica cu descrierea primita.

---

## Corectii per tabela fata de `25-AUDIT.md`

### `grupe` (Sectiunea 4 din migratie — regandita complet)

**25-AUDIT.md documenta:** 2 politici (`Admin_Select_Grupe` corecta + `Staff - Full
Access Grupe` cu `get_my_club_ids()`, de inlocuit).

**Live real:** 9 politici (cele 2 documentate + 7 fantoma, vezi tabelul de mai sus).

**Decizie finala:** DROP toate cele 9, CREATE un singur set canonic:
```sql
CREATE POLICY "Staff - Full Access Grupe" ON public.grupe
    FOR ALL TO authenticated
    USING (public.has_access_to_club(club_id))
    WITH CHECK (public.has_access_to_club(club_id));
```
`has_access_to_club()` acopera deja SUPER_ADMIN_FEDERATIE/ADMIN (orice club) +
ADMIN_CLUB/INSTRUCTOR (clubul activ din context). SPORTIV nu primeste nicio cale directa
— identic cu comportamentul documentat de `25-AUDIT.md` (SPORTIV vedea deja 0 randuri
directe), fara regresie. Politica `Admin_Select_Grupe`, desi corecta, devine redundanta
fata de noua politica FOR ALL si e eliminata pentru un singur set canonic (mai putine
politici = mai putin risc viitor de acest tip).

### `orar_exceptii` (Sectiunea 5 — extinsa)

**25-AUDIT.md documenta:** 4 politici (3 de staff inline + 1 SPORTIV read).

**Live real:** 8 politici — cele 4 documentate + 4 fantoma
(`orar_exceptii_select/insert/update/delete`, non-context-aware dar scopate corect pe
club).

**Decizie finala:** DROP toate cele 7 politici de staff/scriere (3 vechi + 4 fantoma),
pastreaza politica SPORTIV neatinsa, CREATE un singur set canonic folosind
`este_staff_club()` + `is_super_admin()` (identic cu propunerea originala a planului,
doar cu lista de DROP completata).

### `program_antrenamente` (Sectiunea 6 — regandita complet)

**25-AUDIT.md documenta:** 5 politici, sub nume care **nu exista live** (`Admin_Select_
Program`, `Admin Club - Full Access Antrenamente`, `Instructor - Read Access
Antrenamente`, `Sportiv - Read Access Antrenamente`, `Sportiv - Read Access
Antrenamente Secundare`).

**Live real:** 10 politici, complet diferite de nume (in afara de "Secundare", care
exista si live): `Acces Club: Admin si Instructor`, `Bypass_Super_Admin`, `Gestionare
antrenamente instructori`, `Power roles can manage training sessions`, `Staff manage
program_antrenamente`, `Staff_Manage_Program`, `SuperAdmin_Total_Access`,
`UNIFIED_CLUB_ACCESS`, `Vizualizare antrenamente club`, `Sportiv - Read Access
Antrenamente Secundare`.

**Consecinta:** varianta initiala a migratiei ar fi rulat DROP pe nume inexistente
(no-op complet) si ar fi lasat gaura #1 (`has_power_role()`, CRITICA) complet
nereparata dupa aplicare.

**Decizie finala:**
- PASTREAZA neatinse: `Staff_Manage_Program` (`este_staff_club(club_id)`, deja canonic,
  deja context-aware) si `SuperAdmin_Total_Access` (`is_super_admin()`, deja canonic).
  Acestea singure acopera deja corect SUPER_ADMIN_FEDERATIE (orice club) si
  ADMIN_CLUB/INSTRUCTOR (clubul activ) pentru FOR ALL.
- PASTREAZA neatinsa: `Sportiv - Read Access Antrenamente Secundare` (scop diferit,
  grupe secundare).
- DROP: `Power roles can manage training sessions` (gaura #1, CRITICA),
  `UNIFIED_CLUB_ACCESS` (gaura #3), `Acces Club: Admin si Instructor`, `Gestionare
  antrenamente instructori`, `Staff manage program_antrenamente` (3 duplicate
  redundante non-context-aware ale lui `Staff_Manage_Program`), `Vizualizare
  antrenamente club` (SELECT redundant, fara filtrare de rol), `Bypass_Super_Admin`
  (duplicat redundant).
- CREATE: o singura politica noua SPORTIV (SELECT-only, context-aware prin header),
  ca sa nu se piarda calea de citire pe care `Vizualizare antrenamente club` o oferea
  azi oricarui rol inclusiv SPORTIV (Invariant 5).
- Backfill-ul celor 3 randuri orfane (`club_id IS NULL`) ramane neschimbat fata de
  planul original.

Rezultat: setul final e mai simplu decat cel din varianta initiala a migratiei
(2 politici pastrate neatinse + 1 noua, in loc de 3 politici recreate de la zero),
pentru ca `Staff_Manage_Program`/`SuperAdmin_Total_Access` erau deja corecte live —
doar ingropate sub 8 politici fantoma care le anulau efectul prin OR.

### `tipuri_abonament` (Sectiunea 3 — DROP-uri completate)

**25-AUDIT.md documenta:** `tipuri_abonament_select`/`tipuri_abonament_write`
(`USING(true)`, leak activ) din `sql/migrations/fix_rls_all_tables.sql`.

**Live real:** acele 2 politici **nu exista live sub acele nume** — au fost inlocuite
la un moment dat de 3 politici fantoma: `Staff-ul clubului gestioneaza tipurile de
abonament proprii` (non-context-aware dar scopata corect pe club), `Staff_Full_Access`
(gaura #2) si `UNIFIED_CLUB_ACCESS` (gaura #3).

**Decizie finala:** DROP toate cele 3 politici fantoma (plus DROP defensiv pe numele
vechi documentate, in caz ca exista in alt mediu), pastreaza politicile noi
`tipuri_abonament_select`/`tipuri_abonament_write` exact ca in varianta originala a
migratiei (deja corecte: `is_super_admin() OR has_access_to_club(club_id) OR
get_own_sportiv_id()` pentru SELECT; `este_staff_club(club_id) OR is_super_admin()`
pentru WRITE). Fara aceasta completare, politica noua ar fi coexistat permisiv cu cele
3 fantoma si leak-ul ar fi ramas activ.

### `evenimente` (Sectiunea 9 — NOUA, in afara cerintei initiale)

**25-AUDIT.md documenta:** "deja corecta, NEATINSA", bazat pe politicile `View
Evenimente`/`Manage Evenimente` din `20260310_fix_rezultate_rls.sql`.

**Live real:** acele politici **nu mai exista** — tabela are azi 4 politici complet
diferite: `Staff_Full_Access` (gaura #2), `UNIFIED_CLUB_ACCESS` (gaura #3),
`SuperAdmin_Total_Access` (corecta) si `evenimente_public_select` (`SELECT
USING(true)`, pare pagina publica de listare evenimente).

**Decizie:** desi `evenimente` nu era in lista explicita a orchestratorului
(grupe/orar_exceptii/program_antrenamente + tipuri_abonament), am inclus un fix pentru
ca tabela prezinta exact acelasi tipar de bug (gaurile #2 si #3) confirmat direct din
datele live furnizate, iar a lasa o gaura cunoscuta nereparata pentru ca nu a fost
enumerata explicit ar fi o omisiune iresponsabila. DROP `Staff_Full_Access` +
`UNIFIED_CLUB_ACCESS`, CREATE o politica de staff canonica (`is_super_admin()` pentru
`club_id IS NULL` — evenimente federale — si `has_access_to_club(club_id)` altfel).
`SuperAdmin_Total_Access` si `evenimente_public_select` raman neatinse.

**Marcat ca PROPUS, in afara cerintei stricte — orchestratorul poate alege sa nu aplice
Sectiunea 9 daca vrea sa limiteze scope-ul acestei migratii strict la cele 4 tabele
cerute.** Daca se omite, notati ca gaurile #2/#3 raman active pe `evenimente`.

### `perioade_vacanta`, `participare_vacanta`, `plati`, `sesiune_activitate` (Sectiunile 1/2/7/8)

Verificate din nou fata de dump-ul live proaspat — **niciuna nu are politici fantoma
suplimentare** fata de ce documenta `25-AUDIT.md`/planul original, cu o singura
exceptie minora: `sesiune_activitate` are si o politica `Bypass_Super_Admin` redundanta
(`is_super_admin()` fara club, deja acoperita logic de politica noua) — adaugat un
singur `DROP POLICY IF EXISTS` de curatenie, fara alta modificare de continut.
Sectiunile 1, 2, 8 raman identice cu fisierul original.

---

## Rezumat complet: politici finale propuse per tabela

| Tabela | DROP (toate numele, live + defensiv) | CREATE (final) |
|--------|----------------------------------------|----------------|
| `perioade_vacanta` | `perioade_vacanta_select`, `perioade_vacanta_write` | idem, cu `has_access_to_club(club_id)` |
| `participare_vacanta` | `participare_vacanta_select`, `participare_vacanta_write` | idem, scopat prin `perioade_vacanta.club_id` |
| `tipuri_abonament` | `tipuri_abonament_select/write` (defensiv), `Staff-ul clubului gestioneaza tipurile de abonament proprii`, `Staff_Full_Access`, `UNIFIED_CLUB_ACCESS` | `tipuri_abonament_select` (is_super_admin/has_access_to_club/get_own_sportiv_id), `tipuri_abonament_write` (este_staff_club/is_super_admin) |
| `grupe` | `Staff - Full Access Grupe`, `Admin_Select_Grupe`, `Acces Club Grupe`, `Filtru_Club_Universal`, `Staff-ul clubului gestionează grupele proprii`, `Staff_Full_Access`, `Super Admin - Acces total la grupe`, `SuperAdmin_Total_Access`, `UNIFIED_CLUB_ACCESS` (9 total) | 1 singura: `Staff - Full Access Grupe` (`has_access_to_club(club_id)`) |
| `orar_exceptii` | `SuperAdmin Full Access OrarExceptii`, `Admin Club Full Access OrarExceptii`, `Instructor Access OrarExceptii`, `orar_exceptii_select/insert/update/delete` (7 total) | 1 singura: `Staff - Full Access OrarExceptii` (`is_super_admin() OR este_staff_club(club_id)`). `Sportiv Read OrarExceptii` neatinsa |
| `program_antrenamente` | `Admin_Select_Program`/`Admin Club - Full Access Antrenamente`/`Instructor - Read Access Antrenamente`/`Sportiv - Read Access Antrenamente` (defensiv), `Power roles can manage training sessions`, `UNIFIED_CLUB_ACCESS`, `Acces Club: Admin si Instructor`, `Gestionare antrenamente instructori`, `Staff manage program_antrenamente`, `Vizualizare antrenamente club`, `Bypass_Super_Admin` | `Sportiv - Read Access Antrenamente` (noua, SELECT context-aware). `Staff_Manage_Program` si `SuperAdmin_Total_Access` **pastrate neatinse** |
| `sesiune_activitate` | `club_member_access`, `Bypass_Super_Admin` | `club_member_access` (is_super_admin/has_access_to_club, backfill neschimbat) |
| `plati` | `rbv_plati_insert/update/delete` | idem, cu conjunct `has_access_to_club(COALESCE(club_id, sportivi.club_id))` |
| `evenimente` (PROPUS, extra scop) | `Staff_Full_Access`, `UNIFIED_CLUB_ACCESS` | `Staff - Full Access Evenimente` (is_super_admin/has_access_to_club). `SuperAdmin_Total_Access` si `evenimente_public_select` neatinse |

---

## Riscuri reziduale (dupa aplicarea acestei versiuni corectate)

1. **Alte tabele din aplicatie pot avea acelasi tipar de politici fantoma
   (`UNIFIED_CLUB_ACCESS`/`Staff_Full_Access`/`SuperAdmin_Total_Access`/
   `has_power_role`) pe care aceasta migratie nu le atinge** — au fost verificate doar
   cele 9 tabele din scope-ul explicit al orchestratorului. Recomandare puternica:
   rulati un audit similar (interogare live `pg_policies` filtrata pe
   `qual ILIKE '%UNIFIED_CLUB_ACCESS%' OR qual ILIKE '%has_power_role%' OR qual ILIKE
   '%este_staff_autorizat%'`) pe **toate** tabelele din schema `public`, nu doar cele
   9, pentru ca sablonul care a introdus aceste politici pare sistemic (a atins minim
   5 tabele independente descoperite aici) si poate exista si pe tabele in afara
   modulelor Grupe/Prezenta/Abonamente (ex. sportivi, examene, competitii).
2. **`evenimente_public_select` (`SELECT USING(true)`)** ramane neverificata ca
   intentionata — daca nu exista de fapt o pagina publica de evenimente, e un leak
   real de citire (nu de scriere) care ar trebui inchis intr-o migratie viitoare.
3. **`prezenta_antrenament`** are, conform descoperirii deja loggate in `25-AUDIT.md`
   ("Descoperire in afara scopului"), potential doua seturi de politici coexistente
   (`rbv_prezenta_*` si politici vechi inline din `20260305_update_auth_functions_and_
   rls.sql`) — nu a fost re-verificat live in acest task (nu era in lista celor 9
   tabele), dar avand in vedere cate politici fantoma s-au gasit la tabelele vecine,
   riscul ca si `prezenta_antrenament` sa aiba politici suplimentare nedocumentate a
   crescut semnificativ. Recomandare: re-verificati live inainte de a considera acest
   tabel "sigur".
4. **Functiile `get_my_clubs()`, `este_staff_autorizat()`, `has_power_role()`,
   `get_active_role_context()`** raman definite in DB (nu au fost sterse — ar necesita
   `DROP FUNCTION`, in afara scope-ului unei migratii de politici). Daca alte politici
   nedescoperite inca le mai folosesc, raman un vector de risc pana la un audit
   exhaustiv pe toata schema.
5. **Sectiunea 9 (`evenimente`) e in afara cerintei stricte a orchestratorului** — daca
   se decide sa nu fie aplicata, gaurile #2/#3 raman active pe acest tabel. Semnalat
   explicit ca decizie de-a orchestratorului.

---

## Loc din cod potential afectat de stricarea unei politici prea permisive

Verificare grep (`components/`, `hooks/`) pentru cine citeste direct din cele 4 tabele
regandite:

- `hooks/useGrupe.ts`, `components/Grupe/index.tsx`, `components/Grupe/GrupaCard.tsx`,
  `components/Grupe/GrupaDetailView.tsx` — citesc `grupe` ca ADMIN_CLUB/INSTRUCTOR;
  acopera de `has_access_to_club(club_id)`, fara schimbare de comportament pentru
  fluxurile UI existente (UI nu se bazeaza pe accesul cross-club pe care il elimina
  aceasta migratie).
- `components/Grupe/ProgramAntrenamenteManagement.tsx`,
  `components/Grupe/GeneratorProgramMasiv.tsx`,
  `components/Grupe/GenerareAntrenamenteModal.tsx`,
  `components/Grupe/OrarModificareModal.tsx` — scriu in `program_antrenamente` ca
  ADMIN_CLUB/INSTRUCTOR; acoperit de `Staff_Manage_Program` (neatins).
- `components/SportivDashboard/index.tsx`, `hooks/useCalendarView.ts`,
  `hooks/useMultiCalendarView.ts`, `components/CalendarView.tsx` — citesc
  `program_antrenamente` inclusiv pentru rolul SPORTIV; acoperit de noua politica
  `Sportiv - Read Access Antrenamente`.
- `components/Plati/TipuriAbonament.tsx`, `components/SportivDashboard/
  FamilieWidget.tsx` — citesc/scriu `tipuri_abonament`; acoperit de politica din
  Sectiunea 3 (neschimbata fata de original), inclusiv ramura SPORTIV.
- `components/EvenimentePage.tsx`, `components/Competitii/index.tsx`,
  `hooks/useDataProvider.ts` — citesc `evenimente`; `evenimente_public_select`
  (`USING true`) ramane neatinsa, deci orice citire publica/neautentificata continua
  sa functioneze identic. Scrierea (creare/editare evenimente) e restrictionata la
  staff-ul clubului activ + super admin — nu am gasit niciun loc in cod care sa se
  bazeze pe scriere cross-club sau scriere de catre SPORTIV in `evenimente`.

Nu am gasit niciun loc de cod care sa depinda explicit de comportamentul cross-club
sau de scrierea SPORTIV pe care aceasta migratie il elimina — toate cazurile de
utilizare legitime raman acoperite.
