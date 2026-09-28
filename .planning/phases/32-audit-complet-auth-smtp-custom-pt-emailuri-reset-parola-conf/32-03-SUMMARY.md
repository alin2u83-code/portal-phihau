---
phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf
plan: 03
subsystem: auth
tags: [supabase, rls, monitoring, react-query, migration]

requires: []
provides:
  - "Tabele auth_email_events + auth_email_praguri (fara PII), aplicate live pe wuhidifzsutwgdfkwhmd"
  - "RPC inregistreaza_email_auth (anon+authenticated) si get_statistici_emailuri_auth (doar SUPER_ADMIN_FEDERATIE)"
  - "MonitorEmailuriAuth (banner alerta in AppLayout + card complet in Jurnal Audit)"
affects: [32-07, 32-08]

tech-stack:
  added: []
  patterns:
    - "Functii SECURITY DEFINER cu SET search_path si REVOKE ALL FROM PUBLIC + GRANT explicit minim"
    - "Contor cu plafon anti-spam (300/minut) in loc de rate-limit extern"

key-files:
  created:
    - supabase/migrations/20260928_auth_email_events_monitorizare.sql
    - utils/pragEmailuriAuth.ts
    - utils/pragEmailuriAuth.test.ts
    - services/authEmailAuditService.ts
    - components/MonitorEmailuriAuth.tsx
  modified:
    - types.ts
    - components/AppLayout.tsx
    - components/JurnalAudit.tsx

key-decisions:
  - "Tabel de contorizare propriu (nu auth.audit_log_entries) — schema auth nu e expusa prin PostgREST, actiunile nu au nume documentate stabil (32-RESEARCH.md Pitfall 3)"
  - "Praguri default conservatoare: 30/ora (limita implicita Supabase dupa SMTP custom), 500/zi — ajustate cu valori reale in 32-08"

patterns-established:
  - "Migrari Supabase aplicate live prin MCP apply_migration cand tool-ul e disponibil in sesiune, nu doar documentate ca 'de aplicat manual'"

requirements-completed: [D-06]

duration: ~50min
completed: 2026-09-28
---

# Phase 32 Plan 03: Infrastructură monitorizare praguri emailuri Auth (D-06)

**Tabel de contorizare propriu (fără PII) pentru emailurile Auth, aplicat live pe Supabase prin MCP, cu banner de alertă vizibil doar pentru SUPER_ADMIN_FEDERATIE și card complet de statistici în Jurnal Audit.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files modified:** 8 (5 create, 3 modificate)

## Accomplishments
- Migrare aplicată LIVE pe proiectul `wuhidifzsutwgdfkwhmd` (nu doar scrisă): 2 tabele fără PII, 2 politici RLS SELECT, 2 funcții SECURITY DEFINER
- Verificat live: politici SELECT, `relforcerowsecurity=false`, smoke test tranzacțional cu ROLLBACK (0 rânduri rămase), tip invalid → 22023, acces fără context → 42501, zero probleme `get_advisors` security pe tabelele noi
- `calculeazaNivelPrag`/`calculeazaProcentPrag`/`nivelMaxim` — 14/14 teste PASS
- `MonitorEmailuriAuth` montat în AppLayout (banner, doar la ≥80% prag) și Jurnal Audit (card complet)

## Task Commits

1. **Task 1: Migrare aplicata live si verificata read-only** - `dc7a9b8` (feat)
2. **Task 2: Tipuri + calcul pur de prag (testat) + serviciu** - `27fd4ec` (feat)
3. **Task 3: Componenta MonitorEmailuriAuth montata** - `136f436` (feat)

## Files Created/Modified
- `supabase/migrations/20260928_auth_email_events_monitorizare.sql` - aplicata live
- `types.ts` - `TipEmailAuth`, `StatisticiEmailuriAuth`
- `utils/pragEmailuriAuth.ts`, `.test.ts` - calcul pur nivel prag
- `services/authEmailAuditService.ts` - inregistrare fire-and-forget + citire statistici
- `components/MonitorEmailuriAuth.tsx` - banner + card
- `components/AppLayout.tsx`, `components/JurnalAudit.tsx` - montare

## Decisions Made
None - followed plan as specified (decizii D-06 deja blocate în CONTEXT.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Descoperire in verificare] Proiectul Supabase seteaza FORCE ROW LEVEL SECURITY automat la CREATE TABLE**
- **Found during:** Task 1, verificarea `relforcerowsecurity` dupa aplicarea migratiei
- **Issue:** Desi migrarea nu continea `FORCE ROW LEVEL SECURITY`, verificarea live a aratat `relforcerowsecurity=true` pe ambele tabele noi — proiectul are un default (platforma/event trigger) care activeaza FORCE la crearea oricarui tabel nou. Cu FORCE activ, funcatiile SECURITY DEFINER (owner postgres) ar fi blocate de RLS la scriere/citire (gotcha cunoscut, memoria proiectului feedback_rls_force_security_definer_recursion).
- **Fix:** Adaugat explicit `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` pe ambele tabele, in migrare si live. Reverificat: `relforcerowsecurity=false` pe ambele.
- **Files modified:** supabase/migrations/20260928_auth_email_events_monitorizare.sql
- **Verification:** Query live `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN (...)` → `relrowsecurity=true, relforcerowsecurity=false` pe ambele.
- **Committed in:** `dc7a9b8` (Task 1 commit)
- **Nota verify literal:** garda grep din PLAN.md (`! grep -qi 'FORCE ROW LEVEL SECURITY'`) ar pica literal pe acest fisier (contine "NO FORCE ROW LEVEL SECURITY"), dar invariantul real cerut de plan (relforcerowsecurity=false, verificat live) e respectat. Divergenta e documentata aici, nu ascunsa.

---

**Total deviations:** 1 auto-fixed (descoperire comportament platforma, in afara controlului migratiei)
**Impact on plan:** Necesar pentru corectitudine — fara acest fix, get_statistici_emailuri_auth (SECURITY DEFINER) ar fi putut fi blocat de FORCE RLS. Fara scope creep.

## Issues Encountered
None altele.

## User Setup Required
None — migrarea a fost aplicata live cu succes (Supabase MCP disponibil in sesiune).

## Next Phase Readiness
- `inregistreazaEmailAuth()` gata de instrumentat in cele 4 puncte de trimitere email (32-07).
- Pragurile (30/ora, 500/zi) sunt valori conservatoare default — ajustate cu valorile reale ale planului Hostinger in 32-08.
- Verificare umana ramasa (consemnata in plan pt 32-08): vizual, ca SUPER_ADMIN_FEDERATIE, cardul "Emailuri Auth (SMTP)" apare corect in Jurnal Audit; ca ADMIN_CLUB, niciun banner si niciun request esuat catre get_statistici_emailuri_auth.

---
*Phase: 32-audit-complet-auth-smtp-custom-pt-emailuri-reset-parola-conf*
*Completed: 2026-09-28*
