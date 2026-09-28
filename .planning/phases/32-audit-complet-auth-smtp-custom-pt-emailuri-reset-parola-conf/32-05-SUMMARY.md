---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 05
subsystem: auth
tags: [security, authorization, vercel-api, account-takeover]

requires:
  - phase: 32-01
    provides: "valideazaParola() + MESAJ_CERINTE_PAROLA din utils/parola.ts"
provides:
  - "api/_permisiuniCont.ts: verificaPermisiuneModificareCont()"
  - "api/_autentificareApelant.ts: autentificaApelant() + incarcaTintaCont()"
  - "3 endpoint-uri Vercel securizate: reset-parola-sportiv, account, genereaza-magic-link"
affects: [32-06, 32-08]

tech-stack:
  added: []
  patterns:
    - "Bearer + auth.getUser + garda de autorizare (pattern Faza 26) reutilizat pt orice endpoint service_role care modifica un cont existent"

key-files:
  created:
    - api/_autentificareApelant.ts
    - scripts/smoke-endpointuri-auth.ts
  modified:
    - api/_permisiuniCont.ts
    - api/_permisiuniCont.test.ts
    - api/reset-parola-sportiv.ts
    - api/account.ts
    - api/creare-cont.ts
    - api/genereaza-magic-link.ts

key-decisions:
  - "GAP DE SECURITATE CRITIC descoperit in afara scope-ului initial din CONTEXT.md: 3 endpoint-uri (reset-parola-sportiv, account, genereaza-magic-link) rulau cu SUPABASE_SERVICE_ROLE_KEY fara nicio verificare a apelantului — preluare de cont posibila pt oricine stia un user_id/sportiv_id. Inclus in executie cu aprobare explicita a utilizatorului."
  - "Greutatea tintei in verificaPermisiuneModificareCont e calculata GLOBAL (nu per club) — o resetare de parola afecteaza contul in toate cluburile"
  - "Contul SUPER_ADMIN_FEDERATIE nu poate fi modificat din aplicatie de nimeni (nici de alt SUPER_ADMIN_FEDERATIE)"
  - "429 pe genereaza-magic-link emis STRICT inainte de orice modificare - contractul pe care se bazeaza retry-ul client din 32-02"

patterns-established:
  - "scripts/*.ts pt smoke tests fara DB — mock-uri req/res minimale, importuri dinamice cu env fake setat inainte"

requirements-completed: [D-07, D-04]

duration: ~55min
completed: 2026-09-28
---

# Phase 32 Plan 05: Închide 3 endpoint-uri de preluare a contului, neautentificate

**3 endpoint-uri Vercel (reset-parola-sportiv, account, genereaza-magic-link) rulau cu service_role key fără nicio verificare a apelantului — oricine putea seta parola oricui sau schimba emailul de login. Fixate cu Bearer + gardă de autorizare pe greutatea rolului (pattern Faza 26), plus D-07 server-side și contractul 429 pentru D-04.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files modified:** 8 (2 create, 6 modificate)

## Accomplishments
- **Descoperire critică (nesemnalată de research, în afara scope-ului CONTEXT.md):** 3 endpoint-uri service_role neautentificate, capabile de preluare de cont (inclusiv SUPER_ADMIN_FEDERATIE) — închise
- `verificaPermisiuneModificareCont()` — 12 teste noi de escaladare orizontală/verticală, 26/26 PASS total (14 existente neatinse)
- Smoke test fără DB pe cele 3 endpoint-uri: 405/401/429, 11/11 PASS, fără să atingă rețeaua
- D-07 server-side: `reset-parola-sportiv` și `creare-cont` folosesc aceeași sursă unică `valideazaParola`
- D-04 server-side: contract 429 strict (nimic modificat) pe `genereaza-magic-link`, baza reală a retry-ului din 32-02

## Task Commits

1. **Task 1: Garda pura verificaPermisiuneModificareCont (cu teste)** - `42fde01` (feat)
2. **Task 2: Autentificare + autorizare pe reset-parola-sportiv si account** - `a3d2070` (fix)
3. **Task 3: genereaza-magic-link + contract 429 + smoke test** - `16e0f06` (fix)

## Files Created/Modified
- `api/_permisiuniCont.ts` - `verificaPermisiuneModificareCont()` nouă
- `api/_autentificareApelant.ts` - `autentificaApelant()`, `incarcaTintaCont()`
- `api/reset-parola-sportiv.ts` - Bearer + garda + valideazaParola + rate limit 10/min
- `api/account.ts` - Bearer + garda pe email/username + rate limit 30/min
- `api/creare-cont.ts` - valideazaParola (sursa unica) + fix `=== false`
- `api/genereaza-magic-link.ts` - Bearer + garda + contract 429 + rate limit 120/min
- `scripts/smoke-endpointuri-auth.ts` - smoke test fara DB

## Decisions Made
Vezi key-decisions din frontmatter — descoperirea gap-ului de securitate a fost validată de utilizator înainte de execuție (AskUserQuestion, răspuns "Include-l, execută tot").

## Deviations from Plan
None fata de plan (planul insusi documenteaza descoperirea ca parte a scope-ului sau). Executat inline (fara subagent worktree), conform [[feedback_gsd_worktree_infra_esuata_execute_inline]].

## Issues Encountered
`scripts/` e in .gitignore — `scripts/smoke-endpointuri-auth.ts` a necesitat `git add -f` (acelasi gotcha ca migratiile supabase/, memoria [[feedback_supabase_gitignore_migrations_force_add]] — extins acum si la scripts/).

## User Setup Required
None. Toate modificarile sunt cod, fara pasi manuali.

## Next Phase Readiness
- Apelantii client trimit deja Bearer pentru magic link (32-02); reset parola si /api/account sunt actualizate client-side in 32-06 (planuri livrate in acelasi deploy).
- Fara acest fix in 32-06, formularele client de reset parola/schimbare email ar primi 401 (headerul Authorization lipseste azi din apelurile client).

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
