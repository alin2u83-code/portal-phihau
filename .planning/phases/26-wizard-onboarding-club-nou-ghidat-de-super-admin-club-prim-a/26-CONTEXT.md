# Phase 26: Wizard onboarding club nou ghidat de SUPER_ADMIN - Context

**Gathered:** 2026-08-31
**Status:** Ready for planning

<domain>
## Phase Boundary

SUPER_ADMIN_FEDERATIE creeaza un club nou impreuna cu primul admin al clubului (cont + rol ADMIN_CLUB) intr-un singur flux, in loc de 2 actiuni separate azi (Gestiune Cluburi -> Adauga Club, apoi User Management -> Creeaza Cont -> Asigneaza rol). Depinde de Faza 25 (izolare cross-club reparata, empty-states puse — clubul nou porneste gol si functioneaza corect din prima).

</domain>

<decisions>
## Implementation Decisions

### Punct de intrare — extinde formularul existent, nu wizard separat
- **D-01:** Se extinde `ClubFormModal` din `components/CluburiManagement.tsx` — NU se creeaza un ecran/modal wizard multi-pas separat. La "Adauga Club Nou" formularul contine si campurile primului admin. La editare club existent, campurile admin NU apar (doar creare).

### Submit unic — club + admin intr-o singura actiune
- **D-02:** Un singur buton "Salveaza" declanseaza secvential: (1) insert in `cluburi`, (2) creare cont admin + asignare rol `ADMIN_CLUB` prin reutilizarea `api/creare-cont.ts` (`roles: ['ADMIN_CLUB']`, `userData.club_id` = id-ul clubului nou creat la pasul 1).
- **D-03:** Campurile admin (nume, prenume, email) sunt **obligatorii** cand se creeaza club nou — nu exista varianta "salveaza doar club fara admin". Validare pe submit blocheaza daca lipsesc.
- **D-04:** Rol fix `ADMIN_CLUB` — nu exista camp de ales rolul in acest formular (diferit de User Management unde rolul e configurabil).

### Livrare acces cont — parola temporara, nu magic link
- **D-05:** Parola initiala e **generata automat** (nu introdusa manual de SUPER_ADMIN) si transmisa la `api/creare-cont.ts`. `trebuie_schimbata_parola` ramane `true` (pattern existent) — adminul o schimba la primul login.
- **D-06:** Dupa succes, parola generata e **afisata pe ecran** SUPER_ADMIN-ului (ecran/modal de rezultat cu email + parola, cu optiune de copiere) — SUPER_ADMIN o comunica manual noului admin. NU se trimite magic link (pattern din `api/genereaza-magic-link.ts` respins explicit pentru acest flux).

### Esec pe pasul admin — fara rollback pe club
- **D-07:** Daca insert club reuseste dar creare cont admin esueaza (eroare RPC/auth), **clubul ramane creat** — NU se sterge automat. UI permite retry doar pe pasul de creare admin (clubul deja existent e detectat, nu se creeaza duplicat). Nu exista tranzactie/compensating-delete cross-tabel.

### Claude's Discretion
- Mecanismul exact de retry pe pasul admin (buton dedicat in ecranul de eroare, sau reluare submit care detecta club existent dupa CIF/nume si sare peste insert) — decizie de planner.
- Format ecran de rezultat cu parola (Modal nou vs extindere Modal existent) — decizie de planner, respecta design system `ui.tsx`.
- Generarea parolei (lungime, charset) — poate refolosi orice utilitar existent de generare parola daca exista in cod, altfel planner alege un standard rezonabil.
- Username generat automat din email (pattern deja vazut in `api/genereaza-magic-link.ts` — sanitize + split pe `@`) — de confirmat de researcher daca acelasi pattern se aplica sau `api/creare-cont.ts` deriva username altfel.

</decisions>

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pattern club existent (de extins)
- `components/CluburiManagement.tsx` — `ClubFormModal` (linii 12-61) si `handleSave` (linii 79-146): CRUD club actual, verificare CIF duplicat, guard `permissions.isSuperAdmin`

### Pattern creare cont + rol (de reutilizat)
- `api/creare-cont.ts` — endpoint server-side (service role key) care creeaza user in `auth.users` (`admin.createUser`) apoi apeleaza RPC `refactor_create_user_account(p_nume, p_prenume, p_email, p_username, p_club_id, p_roles, p_user_id, p_additional_data)`; gestioneaza deja cazul "email deja inregistrat"
- `hooks/useRoleAssignment.ts` — hook frontend folosit azi de `UserManagement.tsx` pentru creare cont + asignare rol; punct de plecare pentru cum se apeleaza `creare-cont.ts` din UI
- `api/genereaza-magic-link.ts` — pattern alternativ (respins pt acest flux) dar util ca referinta pt generare username sanitizat si `trebuie_schimbata_parola`

### Decizii mostenite din Faza 25
- `.planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-CONTEXT.md` — D-05 empty-states club nou (deja implementat), plus deferred: fara copiere template de la club sursa, fara signup public (SUPER_ADMIN-only ramane valabil si aici)

### Context arhitectural
- `CLAUDE.md` §Anti-Pattern: Hardcoded Club IDs — relevant: adminul nou trebuie legat de club_id-ul clubului nou creat, nu de un club hardcodat
- `docs/roluri-permisiuni.md` — definitii roluri, relevant pt scoping `ADMIN_CLUB`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/CluburiManagement.tsx` → `ClubFormModal` — formular de extins cu campuri admin
- `api/creare-cont.ts` — endpoint gata de reutilizat fara modificari majore (accepta deja `club_id` si `roles`)
- `hooks/useRoleAssignment.ts` — posibil reutilizabil direct sau ca model pentru noul apel din `ClubFormModal`

### Established Patterns
- `trebuie_schimbata_parola = true` la creare cont admin — forteaza schimbare parola la primul login (`services/authService.ts`, `api/genereaza-magic-link.ts`)
- Service-role key folosit doar server-side in `api/*.ts` (Vercel functions) — niciodata expus in frontend
- `clearCache('cache_clubs')` dupa insert club — invalidare cache local existent, de pastrat

### Integration Points
- `components/CluburiManagement.tsx` — singurul loc unde se modifica UI-ul de creare club
- `api/creare-cont.ts` — apelat via `fetch` din frontend (vezi cum `useRoleAssignment.ts` il apeleaza azi din `UserManagement.tsx`)

</code_context>

<specifics>
## Specific Ideas

Niciuna suplimentara fata de deciziile de mai sus.

</specifics>

<deferred>
## Deferred Ideas

- Wizard multi-pas separat (ecran dedicat cu Pas 1/Pas 2/Pas 3) — respins, se extinde formularul existent (D-01).
- Livrare acces prin magic link — respins, parola temporara afisata SUPER_ADMIN (D-05/D-06).
- Rollback complet (stergere club daca esueaza crearea adminului) — respins, club ramane + retry pe pasul admin (D-07).
- Copiere template (tipuri abonament / grupe) de la club sursa — deja respins in Faza 25, ramane valabil.
- Signup public fara SUPER_ADMIN — deja respins in Faza 25, ramane valabil.

</deferred>

---

*Phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a*
*Context gathered: 2026-08-31*
