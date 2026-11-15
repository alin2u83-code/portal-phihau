---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 08
subsystem: database
tags: [supabase, pg_cron, rls, performance, migrations, fingerprint]
requires:
  - phase: 38-01
    provides: masuratori live (E4, E6, L5, L6, matrice amprenta)
provides:
  - tests/amprenta_rls_faza38.sql (dovada non-widening, rollback garantat)
  - supabase/migrations/20261116d_faza38_cron_unschedule.sql (NEAPLICATA)
affects: [38-09, 38-11]
tech-stack:
  added: []
  patterns: ["DO block A / DDL / B cu RAISE EXCEPTION final (rollback garantat)"]
key-files:
  created:
    - tests/amprenta_rls_faza38.sql
    - supabase/migrations/20261116d_faza38_cron_unschedule.sql
  modified: []
key-decisions:
  - "Migrari scrise doar unde 38-01 a masurat castig: a, b, c = neaplicabil; d = scrisa"
requirements-completed: [D-04]
duration: ~15 min
completed: 2026-11-16
---

# Phase 38 Plan 08: Migrari Wave 2 + script amprenta Summary

Script de amprenta RLS (14 relatii, count + md5 per user/context, rollback garantat) si o singura migrare Wave 2 justificata de masuratori: `cron.unschedule` pe jobul care pica la fiecare 10 minute. Nimic aplicat live.

## Decizie per migrare (a-d)

- **a — `20261116a_faza38_vedere_program_preagregat.sql`: NEAPLICABIL (nescrisa).** E4 (count pre-agregat GROUP BY) e mai lent: 207 ms vs 34 ms ca ADMIN_CLUB_482 si 83 ms vs 33,5 ms ca SUPER_ADMIN (38-01-LIVE.md, E4).
- **b — `20261116b_faza38_istoric_plati_gin.sql`: NEAPLICABIL (nescrisa).** E6 (`@>` + un singur LATERAL) e mult mai lent: ~5,9 s vs 0,15 s (ADMIN_CLUB_482) si ~4,6 s vs 0,20 s (SUPER_ADMIN); `tranzactii` are doar 387 randuri, GIN nu justifica rescrierea (38-01-LIVE.md, E6).
- **c — `20261116c_faza38_indexuri.sql`: NEAPLICABIL (nescrisa).** E5 (indexuri candidate) nemasurat in 38-01, deci fara castig dovedit; regula planului: index doar daca E5 a aratat Index Scan.
- **d — `20261116d_faza38_cron_unschedule.sql`: SCRISA (NEAPLICATA).** Jobul 1 `refresh-dashboard-sportivi` esueaza la fiecare 10 min (MV `vedere_sportivi_detaliat_mv` inexistent, 0 dependinte in pg_depend). Re-grep in cod (ts/tsx/sql, fara node_modules/.planning): 0 referinte. Header NEAPLICATA, bloc ROLLBACK (`cron.schedule` cu comanda originala din L6), DO block idempotent (verifica `cron.job`). Zero ALTER ROLE / statement_timeout / ALTER POLICY / CASCADE in cod.

## Script amprenta

`tests/amprenta_rls_faza38.sql`: placeholdere `__USER_ID__`, `__CTX_ID__`, `__ETICHETA__`, corp DDL intre `$ddl$ ... $ddl$` (gol = snapshot). Faze A / DDL / B; `set_config` pentru `request.jwt.claims` + `request.headers`; `set local role authenticated` / `reset role`; garda `EXCEPTION WHEN OTHERS` per relatie (`EROARE <sqlstate>`); termina cu `RAISE EXCEPTION` (fara COMMIT, fara ALTER ROLE). Antetul contine matricea reala (7 randuri, doar id-uri) din 38-01-LIVE.md. `SET LOCAL lock_timeout 3s` / `statement_timeout 25s` doar pentru masurare (D-04: nu e ridicare in productie).

## Commit-uri

- `0c241f6c` test(38-08): script amprenta RLS
- `cc10f776` feat(38-08): migrare 20261116d cron.unschedule (NEAPLICATA)

## Deviations from Plan

1. **[Rule 3 - blocare] `*.sql` e in `.gitignore`** (linia 18), deci si `tests/amprenta_rls_faza38.sql` a cerut `git add -f` (ca migrarile din `supabase/`).
2. **Planul spunea sa nu se faca `git add` pe migrari aici; orchestratorul a cerut commit atomic per task cu `git add -f`.** Am urmat instructiunea orchestratorului: migrarea d e comisa, neaplicata.
3. **Fisierele a/b/c nu au fost create** (decizie bazata pe 38-01, vezi mai sus), conform regulii "scrie doar ce s-a masurat util".

## Verificari facute / nefacute

- Facut: greppuri din planul (placeholdere, `set local role authenticated`, fara `alter role`/`commit`, header NEAPLICATA, ROLLBACK, fara termeni interzisi in cod), re-grep MV in cod.
- NEFACUT: scriptul amprenta si migrarea d NU au fost rulate (fara Supabase MCP, nimic atins pe DB); sintaxa PL/pgSQL neverificata pe o instanta. Rularea de proba se face in 38-09 (de incercat intai cu DDL gol pe un user).
- Cheile de amprenta presupun coloanele `id`, `sportivi_count`, `antrenament_id`, `sportiv_id`, `plata_id`, `total_incasat`, `rest_de_plata`, `tranzactie_id`, `data_plata_string`, `metoda_plata`; daca vreuna nu exista, relatia raporteaza `EROARE 42703` (nu blocheaza restul) si cheia se ajusteaza.
- Matrice incompleta (punct deschis din 38-01): lipsesc SPORTIV cu familie_id, membru comisie examen, ADMIN_CLUB club mic.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: tests/amprenta_rls_faza38.sql, supabase/migrations/20261116d_faza38_cron_unschedule.sql
- FOUND commits: 0c241f6c, cc10f776
