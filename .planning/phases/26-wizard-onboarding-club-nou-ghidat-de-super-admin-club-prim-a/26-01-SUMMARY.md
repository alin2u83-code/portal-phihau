---
phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a
plan: 01
subsystem: auth
tags: [crypto, web-crypto-api, vercel-api, rls-adjacent-guard, supabase-auth, rate-limit]

# Dependency graph
requires:
  - phase: 25-audit-izolare-cross-club-prezenta-grupe-abonamente
    provides: RLS izolare cross-club reparată pe grupe/prezență/abonamente — precondiție pentru a nu construi peste o suprafață de securitate încă spartă
provides:
  - "genereazaParolaTemporara() — parolă temporară criptografic aleatoare (crypto.getRandomValues, 97 biți entropie)"
  - "api/creare-cont.ts securizat: autentificare Bearer, anti-escaladare rol, scoping club, rate limit, trebuie_schimbata_parola"
  - "hooks/useRoleAssignment.ts trimite Authorization: Bearer <access_token>, elimină club hardcodat"
affects: [26-02-wizard-ui, orice-fluxuri-viitoare-care-cheama-api-creare-cont]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generator secret criptografic: crypto.getRandomValues + rejection sampling + Fisher-Yates shuffle (fără Math.random, fără Array.sort cu comparator aleator)"
    - "Gardă server-side pe endpoint Vercel cu service role key: Authorization Bearer -> auth.getUser(token) -> citire roluri din utilizator_roluri_multicont -> comparare greutăți -> scoping club"
    - "ROLE_WEIGHTS oglindit identic client (hooks/useRoleAssignment.ts) și server (api/creare-cont.ts) pentru anti-escaladare de privilegii"

key-files:
  created: [utils/parola.ts, utils/parola.test.ts]
  modified: [api/creare-cont.ts, hooks/useRoleAssignment.ts]

key-decisions:
  - "Generator parolă: alfabet 69 caractere fără ambigue (I/l/O/o/0/1), 16 caractere implicit ≈ 97 biți entropie — suficient pentru D-05 fără librărie externă"
  - "Gardă rol minim pentru creare cont: greutate >= 2 (INSTRUCTOR+) — crearea de conturi e acțiune de staff, nu doar SUPER_ADMIN"
  - "trebuie_schimbata_parola setat prin UPDATE separat după RPC, nu prin modificarea RPC-ului refactor_create_user_account (RPC rămâne neschimbat, pattern identic cu api/reset-parola-sportiv.ts)"
  - "Eșec la update trebuie_schimbata_parola loghează warning dar nu eșuează request-ul (consistent cu pattern-ul existent din reset-parola-sportiv.ts)"

patterns-established:
  - "Pattern: Generator secret criptografic (utils/parola.ts) — reutilizabil oriunde mai e nevoie de un secret temporar generat server/client-side fără Math.random"
  - "Pattern: Gardă de autentificare + anti-escaladare pe endpoint Vercel cu service role key — de replicat pe orice alt endpoint API care rulează cu SUPABASE_SERVICE_ROLE_KEY și nu are încă verificare a apelantului"

requirements-completed: [D-05, D-07]

# Metrics
duration: 15min
completed: 2026-08-31
---

# Phase 26 Plan 01: Fundație sigură creare cont — parolă criptografică + gărzi api/creare-cont Summary

**Generator de parolă temporară criptografic aleatoare (crypto.getRandomValues, 97 biți entropie) și închiderea găurii de escaladare de privilegii din `api/creare-cont.ts` (endpoint anterior neautentificat, rulând cu service role key).**

## Performance

- **Duration:** 15 min (01:32 → 01:47 UTC+3, estimat din primul commit la ultimul)
- **Started:** 2026-08-31T01:32:00+03:00 (aprox.)
- **Completed:** 2026-08-31T01:46:54+03:00
- **Tasks:** 3/3
- **Files modified:** 4 (2 create, 2 modificate)

## Accomplishments

- `utils/parola.ts` generează parole de 16+ caractere folosind `crypto.getRandomValues` cu rejection sampling (elimină modulo bias) și Fisher-Yates shuffle — zero `Math.random`, testat cu 200 de generări distincte, fiecare conținând toate cele 4 clase de caractere și fără caractere ambigue.
- `api/creare-cont.ts` are acum 5 gărzi server-side în ordine: rate limit (429), autentificare Bearer + `auth.getUser` (401), verificare rol minim apelant (403), anti-escaladare de rol cerut vs. greutatea apelantului (403/400), scoping pe club pentru apelanți non-federație (403) — plus setarea `trebuie_schimbata_parola = true` după RPC.
- `hooks/useRoleAssignment.ts` trimite `Authorization: Bearer <access_token>` la fiecare apel către `/api/creare-cont` și elimină fallback-ul hardcodat `PHI_HAU_IASI_CLUB_ID`, întorcând eroare fail-fast dacă `club_id` sau sesiunea lipsesc.

## Task Commits

Each task was committed atomically:

1. **Task 1: Generator parolă temporară criptografic aleatoare (D-05)** - `bbb7790` (feat)
2. **Task 2: Gărzi autentificare/anti-escaladare/scoping club pe api/creare-cont.ts + trebuie_schimbata_parola** - `6a2c670` (fix)
3. **Task 3: Trimite token de sesiune din useRoleAssignment, elimină club hardcodat** - `38bb5a7` (fix)

**Plan metadata:** commit separat, vezi mai jos (final_commit)

## Files Created/Modified

- `utils/parola.ts` - `genereazaParolaTemporara()` + `LUNGIME_MINIMA_PAROLA`, sursă de entropie `crypto.getRandomValues`
- `utils/parola.test.ts` - test colocat, pattern `utils/luniLipsa.test.ts`, 7 asserțiuni de comportament, 0 FAIL
- `api/creare-cont.ts` - 5 gărzi server-side + `ROLE_WEIGHTS` local + update `trebuie_schimbata_parola`
- `hooks/useRoleAssignment.ts` - header `Authorization: Bearer`, validare `club_id` fail-fast, import `PHI_HAU_IASI_CLUB_ID` eliminat

## Decisions Made

- Alfabet parolă cu 69 caractere (fără I/l/O/o/0/1) — echilibru între entropie suficientă (97 biți la 16 caractere) și lizibilitate umană dacă parola trebuie citită/copiată manual de SUPER_ADMIN.
- Gărzile din `api/creare-cont.ts` respectă strict ordinea din plan (rate limit → auth → rol minim → anti-escaladare → scoping club) astfel încât cererile respinse timpuriu nu ajung deloc la `auth.admin.createUser`.
- `ROLE_WEIGHTS` duplicat intenționat (client + server) pentru izolare — server-side e sursa de adevăr, client-side rămâne pentru UX (ascunde opțiuni indisponibile înainte de submit).

## Deviations from Plan

**1. [Rule 1 - Bug] Comentariul din `utils/parola.ts` conținea literal `Math.random()`, declanșând fals pozitiv la criteriul de acceptare `grep -c "Math.random" utils/parola.ts` (aștepta 0)**
- **Found during:** Task 1, verificare acceptance criteria
- **Issue:** Comentariul explicativ menționa textual `Math.random()` ca să explice ce NU se folosește; grep-ul de acceptanță nu distinge cod de comentariu
- **Fix:** Reformulat comentariul să descrie generatorul pseudo-aleator implicit fără a folosi substringul exact „Math.random"
- **Files modified:** `utils/parola.ts`
- **Verification:** `grep -c "Math.random" utils/parola.ts` → 0; `node --import tsx utils/parola.test.ts` rulează în continuare cu 0 FAIL
- **Committed in:** `bbb7790` (parte din commit-ul Task 1, editat înainte de commit)

---

**Total deviations:** 1 auto-fixed (1 bug minor de formulare comentariu, fără impact funcțional)
**Impact on plan:** Zero scope creep — corecție cosmetică necesară doar pentru ca verificarea automată grep-abilă să treacă exact cum specifică planul.

## Issues Encountered

None.

## User Setup Required

None - nicio configurare de serviciu extern necesară. Toate modificările folosesc `crypto` (Web Crypto, built-in) și module deja prezente (`@supabase/supabase-js`, `@vercel/node`) — zero `npm install` nou (confirmat de threat T-26-SC din plan).

## Human Verification Pending (end-of-phase)

Conform `workflow.human_verify_mode: "end-of-phase"` din `.planning/config.json`, verificarea umană a Task 3 (`<verify><human-check>`) NU a fost executată acum — va fi consolidată de verificatorul de fază într-un fișier `26-UAT.md` la finalul Fazei 26. Pași de verificat atunci:

1. User Management -> „Adaugă Membru Staff" -> completează + Salvează -> așteptat: cont creat, `CredentialeContModal` apare, fără 401.
2. User Management -> sportiv fără cont -> „Creează Cont" -> Email + Parolă -> Generează și Asociază -> așteptat: cont creat.
3. Delogare + login cu contul nou creat la pasul 1 -> așteptat: `MandatoryPasswordChange` apare imediat (dovadă că `trebuie_schimbata_parola = true` se scrie acum).
4. DevTools -> Network -> request `/api/creare-cont` -> confirmă header `Authorization: Bearer ...` și că răspunsul NU conține parola.

## Next Phase Readiness

- Fundația sigură e gata: Planul 26-02 poate reutiliza `api/creare-cont.ts` (prin `hooks/useRoleAssignment.ts`) pentru a crea primul `ADMIN_CLUB` al unui club nou, fără riscul T-26-01/T-26-02 (escaladare de privilegii / bypass izolare club).
- `genereazaParolaTemporara()` e disponibilă pentru wizard-ul din 26-02 să genereze parola afișată o singură dată SUPER_ADMIN-ului (D-06).
- Simbolurile noi planificate pentru 26-02 (`ClubFormModalProps.adminError`, `creeazaAdminClub`, `handleRetryAdmin`, `pendingAdmin`, etc.) nu există încă — nu sunt drift, sunt scope-ul planului următor.
- Blocker rezidual: verificarea umană end-of-phase (secțiunea de mai sus) trebuie efectuată înainte de a considera Faza 26 complet livrată — nu blochează planul 26-02, dar trebuie făcută înainte de merge/deploy final.

---
*Phase: 26-wizard-onboarding-club-nou-ghidat-de-super-admin-club-prim-a*
*Completed: 2026-08-31*

## Self-Check: PASSED

All created/modified files found on disk; all 3 task commits (`bbb7790`, `6a2c670`, `38bb5a7`) found in git log.
