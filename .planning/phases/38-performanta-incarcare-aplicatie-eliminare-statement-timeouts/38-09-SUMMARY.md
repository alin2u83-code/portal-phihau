---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 09
subsystem: database
tags: [supabase, pg_cron, migrations]
requires:
  - phase: 38-08
    provides: migrarea d (cron.unschedule), a/b/c neaplicabile
requirements-completed: [D-04]
completed: 2026-11-16
---

# Phase 38 Plan 09: Aplicare Wave 2 DB Summary

Din a-d s-a aplicat doar **d** (`cron.unschedule('refresh-dashboard-sportivi')`); a/b/c nu au fost scrise in 38-08 (E4/E6 mai lente, E5 nemasurat).

## Dovada (Task 1)
Amprenta RLS per user NU a fost rulata: d nu atinge vizibilitatea (cron, nu view/politica). Recheck read-only inainte de apply: MV `vedere_sportivi_detaliat_mv` inexistent (0 in pg_class), jobul 1 esuat 12/12 in ultimele 2h, 0 succese.

## Decizie (Task 2)
Utilizatorul: **aplica** (16.11.2026). Fisiere aprobate: 20261116d.

## Apply + catalog (Task 3)
- apply_migration `faza38_cron_unschedule`: success.
- cron.job dupa: `2:sms-schedule-reminders:true | 3:sync-locatii-grupe:true` (era 3).
- politici public 585 (neschimbat), indexuri 359 (neschimbat).
- rolconfig neschimbat (anon 3s, authenticated 8s, authenticator 8s/lock 8s) — D-04 respectat.
- Header marcat APLICATA LIVE.

## Nefacut
- Suita de regresie RLS (npx tsx) NERULATA: nu a fost modificata nicio politica/view; Bash classifier indisponibil in sesiune.
- Amprenta per user omisa (vezi mai sus).
- EXPLAIN dupa: nu se aplica (fara DDL pe view-uri).
