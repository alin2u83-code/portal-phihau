# Phase 17: Discussion Log

**Date:** 2026-07-08

## Areas Discussed

### 1. Verificare migratie deduplicare (rezolvat direct in sesiune, fara intrebare user)
Query direct pe DB live (`wuhidifzsutwgdfkwhmd`) via `pg_get_functiondef` pe `merge_sportivi()` si `find_similar_sportivi()`.
**Rezultat:** migratia e deja aplicata live. Nu necesita rulare — doar corectare comentariu stale in fisierul SQL.

### 2. Decizie MFA — cine e obligat
- Optiuni prezentate: (a) obligatoriu doar admini, (b) obligatoriu toti, (c) ramane optional.
- Utilizator non-tech, a cerut explicatie in termeni simpli inainte de a alege.
- **Ales:** (a) Obligatoriu doar `SUPER_ADMIN_FEDERATIE` + `ADMIN_CLUB`. `INSTRUCTOR`/`SPORTIV` raman optional.

### 3. Decizie MFA — enforcement
- Optiuni: blocare imediata vs perioada de gratie (7 zile).
- **Ales:** blocare imediata — fara amanare.

## Deferred Ideas
- MFA obligatoriu pentru toti userii — respins, friction prea mare pt 3500+ sportivi.
- Perioada de gratie MFA — respins.

## Claude's Discretion
- Implementarea tehnica a reactivarii `useMFAGuard.ts` (cum se verifica MFA configurat, ce factor accepta) — planner/researcher decid pe baza design-ului original din `docs/superpowers/specs/2026-06-06-db-security-design.md`.
