---
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
plan: 02
subsystem: auth
tags: [react, supabase-auth, form-orchestration, sequential-write, ui-design-system]

# Dependency graph
requires:
  - phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
    plan: 01
    provides: "genereazaParolaTemporara() + api/creare-cont.ts securizat (Authorization Bearer, anti-escaladare, scoping club) + hooks/useRoleAssignment.ts trimite token de sesiune"
provides:
  - "ClubFormModal extins: sectiunea 'Date Prim Administrator' (Nume/Prenume/Email) randata doar in modul creare, cu validare inline"
  - "Orchestrare secventiala in CluburiManagement.tsx: insert club -> createAccountAndAssignRole(ADMIN_CLUB) -> garda is_primary -> CredentialeContModal"
  - "Sub-stare retry D-07: club creat + admin esuat pastreaza clubul, banner inline, retry idempotent fara duplicare club/user/parola"
affects: [user-management, onboarding-club-nou]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestrare secventiala cu compensare fara rollback: insert entitate parinte -> insert entitate copil intr-un hook reutilizabil, pending-state pastrat pentru retry idempotent fara re-generare de secrete"
    - "onSave: Promise<boolean> ca semnal explicit 'inchide modalul' controlat de parinte, in loc de onClose() necondiționat in handleSubmit"

key-files:
  created: []
  modified: [components/CluburiManagement.tsx, components/AppRouter.tsx]

key-decisions:
  - "handleSave returneaza Promise<boolean> (true=inchide modalul) pe toate ramurile, inclusiv early-return-urile CIF/permisiune — modalul ramane deschis cu datele introduse pe orice esec"
  - "Parola generata o singura data la insertul clubului (in pendingAdmin), reutilizata identic la retry — evita mismatch intre parola afisata si parola reala din auth.users daca user-ul fusese deja creat la prima incercare"
  - "Fara rollback pe cluburi la esecul pasului 2 (D-07, decizie explicita din discutia de context) — clubul orfan ramane vizibil si editabil, cu recuperare ghidata catre User Management"
  - "Garda is_primary aplicata explicit dupa succes (UPDATE separat pe utilizator_roluri_multicont) — RPC-ul refactor_create_user_account seteaza is_primary doar pentru rolul SPORTIV"

patterns-established:
  - "Pattern: banner inline de eroare (var(--t-status-danger), color-mix pentru opacitate) + retry dedicat, in loc de toast, pentru esecuri partiale intr-un flux secvential cu 2 scrieri"

requirements-completed: [D-01, D-02, D-03, D-04, D-06, D-07]

# Metrics
duration: 25min
completed: 2026-08-31
---

# Phase 26 Plan 02: Wizard club+admin — orchestrare secvențială și credențiale Summary

**Un singur submit din "Adaugă Club Nou" creează rândul în `cluburi` și contul `ADMIN_CLUB` legat de el (prin `createAccountAndAssignRole`), afișează parola generată o singură dată, și pe eșec parțial păstrează clubul cu retry idempotent (D-07).**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- `ClubFormModal` (`components/CluburiManagement.tsx`) are acum două secțiuni — „Date Club" (neschimbată) și „Date Prim Administrator" (nouă, randată doar la creare, cu iconițe `BuildingOfficeIcon`/`UserPlusIcon` pe `var(--t-primary)`), validare inline (`fieldErrors`) pentru nume/prenume/email admin înainte de orice scriere în DB.
- `handleSave` orchestrează secvențial: insert `cluburi` → generare parolă unică (`genereazaParolaTemporara()`, o singură dată) → `createAccountAndAssignRole(email, parola, {...}, [rolAdminClub])` → gardă `is_primary` pe `utilizator_roluri_multicont` → `CredentialeContModal` cu `numeSportiv` compus `"{prenume} {nume} — Admin {club}"`.
- Sub-starea D-07: dacă pasul 2 eșuează, `handleSave` returnează `false`, modalul rămâne deschis cu banner `var(--t-status-danger)` + buton „Reîncearcă Crearea Contului Admin"; `handleRetryAdmin` reutilizează exact `pendingAdmin` (aceeași parolă, același `clubId`), fără a atinge tabela `cluburi`.
- `components/AppRouter.tsx` transmite `allRoles={allRoles}` către `CluburiManagement`, necesar pentru `useRoleAssignment` și rezolvarea rolului `ADMIN_CLUB`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extinde ClubFormModal cu secțiunea „Date Prim Administrator" și transmite allRoles (D-01, D-03, D-04)** - `3aab695` (feat)
2. **Task 2: Orchestrare secvențială club -> cont ADMIN_CLUB, afișare credențiale și retry fără duplicare (D-02, D-04, D-06, D-07)** - `fa50418` (feat)

**Plan metadata:** commit separat, vezi mai jos (final_commit)

## Files Created/Modified

- `components/CluburiManagement.tsx` - `ClubFormModal` extins (secțiune admin condiționată, validare, sub-stare banner/retry), `CluburiManagement` cu `pendingAdmin`/`adminError`/`retryLoading`/`credentiale`, `creeazaAdminClub`, `handleRetryAdmin`, `handleCloseModal`, `handleSave` returnând `Promise<boolean>`
- `components/AppRouter.tsx` - prop `allRoles={allRoles}` transmis la randarea `Lazy.CluburiManagement`

## Decisions Made

- `handleCloseModal` (nu direct `setIsModalOpen(false)`) e trecut ca `onClose` al `ClubFormModal` — dacă modalul se închide cât timp `adminError` e setat, golește starea de retry și afișează un toast de ghidare spre User Management; la închidere normală (fără eroare) doar închide modalul.
- `handleRetryAdmin` închide modalul automat pe succes (`setIsModalOpen(false)`) — altfel `ClubFormModal` ar reveni la formularul gol (adminError golit) suprapus peste `CredentialeContModal`, contrar UI-SPEC (secvența „Result screen").
- Banner-ul de eroare D-07 folosește `color-mix(in srgb, var(--t-status-danger) X%, transparent)` — pattern deja existent în `components/ui.tsx` (liniile 700-702), nu Tailwind opacity modifiers pe variabile CSS (care nu funcționează cu `bg-[var(...)]/10`).

## Deviations from Plan

None - plan executed exactly as written. Toate cele 3 fișiere/task-uri și toate criteriile de acceptare grep-abile au trecut fără ajustări.

## Issues Encountered

None.

## User Setup Required

None - nicio configurare de serviciu extern necesară. Reutilizează `api/creare-cont.ts` și `hooks/useRoleAssignment.ts` din 26-01, fără dependențe noi (confirmat de threat T-26-SC din plan).

## Human Verification Pending (end-of-phase)

Conform `workflow.human_verify_mode: "end-of-phase"` din `.planning/config.json`, verificarea umană din `<verify><human-check>` a Task 2 (pașii 1-6, inclusiv simularea eșecului parțial D-07 și confirmarea că retry-ul nu duplică clubul) NU a fost executată acum — trebuie consolidată într-un fișier `26-UAT.md` la finalul Fazei 26, împreună cu verificarea rămasă din 26-01 (secțiunea „Human Verification Pending" din `26-01-SUMMARY.md`).

Pași de verificat atunci (din plan, Task 2 human-check):
1. „Adaugă Club" → două secțiuni, copy exact, fără câmp parolă/rol.
2. Submit cu admin gol → erori inline, clubul NU apare în listă.
3. Submit complet → clubul apare ȘI se deschide `CredentialeContModal` cu parolă aleatoare.
4. „Editează" pe club existent → secțiunea admin NU apare.
5. Login cu credențialele afișate → schimbare obligatorie de parolă, context clubul nou.
6. Simulare eșec pasul 2 (block `/api/creare-cont` din DevTools) → clubul rămâne creat, banner + retry, retry NU duplică clubul.

## Next Phase Readiness

- Faza 26 este acum completă din punct de vedere al implementării (26-01 + 26-02); rămâne doar verificarea umană end-of-phase consolidată (`26-UAT.md`), care acoperă atât gărzile server-side din 26-01 cât și fluxul wizard din 26-02.
- `ClubSaveData`, `creeazaAdminClub`, `handleRetryAdmin`, `pendingAdmin` sunt acum simboluri reale în `components/CluburiManagement.tsx` — orice fază viitoare care extinde formularul de club trebuie să respecte contractul `onSave: (clubData) => Promise<boolean>`.
- Nu există blocker rezidual de implementare pentru acest plan.

---
*Phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a*
*Completed: 2026-08-31*

## Self-Check: PASSED
