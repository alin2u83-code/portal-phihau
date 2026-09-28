---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 02
subsystem: auth
tags: [retry, backoff, resilience, fetch]

requires: []
provides:
  - "utils/retryBackoff.ts — politica reincercare D-04 (delay preventiv 500ms + backoff 1s/3s/9s doar pe 429)"
  - "services/apiAutentificat.ts + services/magicLinkService.ts — punct unic de apel autentificat pt genereaza-magic-link"
  - "3 componente migrate: Sportivi/index.tsx, Pas2Raport.tsx, CreateAccountModal.tsx"
affects: [32-05, 32-06]

tech-stack:
  added: []
  patterns:
    - "executaCuReincercare(apel, optiuni) — wrapper generic peste fetch, reincearca doar pe 429, respecta Retry-After"
    - "servicii intorc { data, error, incercari }, niciodata throw (CLAUDE.md)"

key-files:
  created:
    - utils/retryBackoff.ts
    - utils/retryBackoff.test.ts
    - services/apiAutentificat.ts
    - services/magicLinkService.ts
  modified:
    - components/Sportivi/index.tsx
    - components/Sportivi/ImportSportiviPage/Pas2Raport.tsx
    - components/UserProfile/CreateAccountModal.tsx

key-decisions:
  - "Backoff-ul e implementat ca rezilienta generala, nu ca aparare impotriva unui rate limit Supabase confirmat pe Admin API (32-RESEARCH.md Pitfall 1) — 429-ul real vine din limita per IP a endpointului propriu (32-05) sau e propagat de Supabase inainte de orice modificare"
  - "Reincercare EXCLUSIV pe status 429 — erorile de retea (exceptii) se propaga imediat, fara reincercare, pt ca serverul poate fi creat deja contul (idempotenta)"

patterns-established:
  - "utils/retryBackoff.ts ramane fara importuri — testabil pur in Node, fara sleep real in teste (asteapta injectabil)"

requirements-completed: [D-04, D-05]

duration: ~30min
completed: 2026-09-28
---

# Phase 32 Plan 02: Reziliență retry/backoff pentru generarea bulk de magic link-uri

**utils/retryBackoff.ts (backoff exponențial 1s/3s/9s doar pe 429) + services/magicLinkService.ts, migrat în cele 3 puncte care generează magic link-uri (bulk Sportivi, import Pas2Raport, CreateAccountModal), cu UI de progres care arată reîncercările în timp real.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 7 (4 create, 3 modificate)

## Accomplishments
- `executaCuReincercare()` — reîncearcă exclusiv pe 429, respectă `Retry-After` plafonat la 60s, testat 11/11 PASS fără sleep real
- Serviciu unic `genereazaMagicLinkSportiv()` autentificat (Bearer) — reutilizat de 3 componente, elimină duplicarea fetch-ului inline
- Bucla bulk din Sportivi/index.tsx și bucla identică din Pas2Raport.tsx primesc delay preventiv 500ms + retry, cu contor de reîncercări vizibil în UI

## Task Commits

1. **Task 1: utils/retryBackoff.ts — politica de reincercare D-04** - `b67b889` (feat)
2. **Task 2: Servicii obtineHeadereAutentificare + genereazaMagicLinkSportiv** - `d338437` (feat)
3. **Task 3: Migrarea celor 3 apelanti pe serviciu + UI progres** - `e28b414` (feat)

## Files Created/Modified
- `utils/retryBackoff.ts`, `utils/retryBackoff.test.ts` - politica de reincercare, pura, testata
- `services/apiAutentificat.ts` - headere Bearer din sesiune
- `services/magicLinkService.ts` - apel unic autentificat + rezilient
- `components/Sportivi/index.tsx`, `Pas2Raport.tsx` - migrate pe serviciu, UI reincercari
- `components/UserProfile/CreateAccountModal.tsx` - migrat pe serviciu (apel unic)

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written. Executat inline (fara subagent worktree), conform [[feedback_gsd_worktree_infra_esuata_execute_inline]].

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- `genereazaMagicLinkSportiv`/`obtineHeadereAutentificare` gata de folosit ca baza pentru garda server-side din 32-05.
- Endpointul `/api/genereaza-magic-link` inca nu verifica Authorization (asta e 32-05) — codul client trimite deja Bearer, deci schimbarea server-side nu va rupe nimic.

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
