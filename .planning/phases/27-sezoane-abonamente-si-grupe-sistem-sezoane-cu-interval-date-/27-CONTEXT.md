# Phase 27: Sezoane Abonamente si Grupe - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Sistem de "sezoane" (perioadă an competițional, ex. 2026-2027) per club, definite de ADMIN_CLUB cu interval de date liber (data start + data final aleasă manual). Grupele existente (`grupe`) capătă o proprietate per-grupă: **permanentă** sau **per-sezon**, la alegerea instructorului/adminului la creare/editare grupă. Tipurile de abonament (`tipuri_abonament`) devin legate de sezon — fiecare sezon are propriile taxe. La creare sezon nou: grupele per-sezon din sezonul vechi se arhivează automat, adminul le poate clona manual în sezonul nou; grupele permanente rămân neschimbate. Sportivii asignați la grupe permanente rămân automat asignați; la grupele per-sezon clonate, re-asignarea sportivilor se face manual.

</domain>

<decisions>
## Implementation Decisions

### Sezon — model de date
- **D-01:** Sezon = interval de date liber (`data_start`, `data_final`), NU format fix an școlar. Adminul alege ambele date manual la creare.
- **D-02:** Sezoanele sunt per club (nu globale la nivel de federație). ADMIN_CLUB creează/gestionează sezoanele propriului club.
- **D-03:** Doar un singur sezon poate fi "activ" per club la un moment dat (implicit — nu s-a cerut suprapunere de sezoane active).

### Grupe — permanent vs per-sezon
- **D-04:** Fiecare grupă are un flag/tip: **permanentă** sau **per-sezon**, ales de instructor/admin la creare (editabil ulterior). Nu există un mod global unic — flexibilitate maximă per grupă, per club.
- **D-05:** Grupă permanentă: NU se leagă de un sezon anume, rămâne activă indiferent de schimbarea sezonului, sportivii rămân automat asignați.
- **D-06:** Grupă per-sezon: legată de sezonul curent. La creare sezon nou, grupa per-sezon veche se **arhivează automat** (nu se șterge — rămâne vizibilă în istoric/rapoarte/prezență).
- **D-07:** Clonarea grupei per-sezon în sezonul nou este o acțiune **manuală** a adminului (ex. buton "Dublează în sezon nou") — nu automată.
- **D-08:** La grupa clonată (per-sezon, sezon nou), re-asignarea sportivilor e **manuală** — nu se copiază automat lista de sportivi din grupa veche.

### Taxe / abonamente pe sezon
- **D-09:** `tipuri_abonament` se leagă de sezon — fiecare sezon își are propriile tipuri de abonament (permite creșteri de preț anuale). Tipurile din sezoanele vechi rămân ca istoric (pentru facturile deja emise).

### Claude's Discretion
- Denumire exactă a câmpurilor noi în DB (`sezon_id`, `tip_grupa` enum permanent/per_sezon, etc.) — decizie tehnică la planificare.
- UI exact pentru "sezon activ" (selector în header Grupe? tab dedicat?) — decizie la UI-phase/planning.
- Ce se întâmplă cu facturile/plățile deja emise pe un `tip_abonament` dintr-un sezon arhivat — rămân neschimbate (istoric), fără migrare.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema DB existentă
- `docs/baza-de-date.md` — schema completă, incl. `grupe` (linia ~19, `program` JSONB), `sportivi_grupe_secundare` (linia ~26), `tipuri_abonament` (linia ~50)

### Module existente relevante
- `docs/module.md` — stare modul Grupe, Plati
- `docs/roluri-permisiuni.md` — permisiuni ADMIN_CLUB (creare sezoane) vs INSTRUCTOR (creare/editare grupe)

No external specs/ADRs specifice acestei feature — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/Grupe/index.tsx`, `GrupaFormModal.tsx` — punct de extindere pentru flag permanent/per-sezon
- `components/Plati/*` — punct de extindere pentru legare `tipuri_abonament` ↔ sezon
- Tabel `grupe` (are deja `club_id`) — adaugă coloană `sezon_id` (nullable pt. grupe permanente) + `tip_grupa`
- Tabel `tipuri_abonament` — adaugă coloană `sezon_id`

### Established Patterns
- Toate entitățile sunt per club (`club_id` + RLS) — sezoanele urmează același pattern
- `sportivi_grupe_secundare` pattern M:N pentru asignări — reutilizabil pentru re-asignare la clonare

### Integration Points
- Modul Grupe (`components/Grupe/`) — grupă nouă/editare capătă selector permanent/per-sezon + selector sezon
- Modul Plăți (`components/Plati/`) — tipuri de abonament filtrate/asociate cu sezonul activ
- Nou: ecran/tab gestionare Sezoane (ADMIN_CLUB) — CRUD sezoane, acțiune "Arhivează + clonează grupe per-sezon"

</code_context>

<specifics>
## Specific Ideas

Utilizatorul a insistat pe **adaptabilitate maximă per club**: nu un model rigid unic (toate grupele per-sezon SAU toate permanente), ci alegere per-grupă lăsată la latitudinea instructorului/clubului.

</specifics>

<deferred>
## Deferred Ideas

None — discuția a rămas în limitele scope-ului fazei.

</deferred>

---

*Phase: 27-Sezoane Abonamente si Grupe*
*Context gathered: 2026-09-02*
