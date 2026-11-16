---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 01
subsystem: database
tags: [supabase, rls, diagnostic, read-only]
requirements-completed: [D-03, D-04]
completed: 2026-11-16
---

# Phase 38 Plan 01: Diagnostic live read-only Summary

Detalii complete: `38-01-LIVE.md`. Nimic modificat pe DB (politici 585, indexuri 359, rolconfig identice inainte/dupa).

## Concluzii
1. Timeoutul de 8 s apare doar sub concurenta (~35 cereri paralele + Realtime pe max_connections=60); nicio interogare > ~0.73 s izolat.
2. L10: o conexiune PostgREST ramane "aborted" (25P02) ~34 s dupa un 57014 si respinge cereri fara legatura. Nu exista GAP-38-L10; remediul = mai putine cereri simultane + zero timeouturi.
3. Fereastra D-03 reduce `vedere_cluburi_program_antrenamente` de la 113/48 ms la 9/18 ms (ADMIN_CLUB/SUPER_ADMIN): confirmata.
4. E4 (count pre-agregat) si E6 (`plata_ids @>`) mai lente -> NU se aplica. Ramas doar `cron.unschedule` (facut in 38-09).
5. Wave 3 RLS (38-10/38-11) nejustificat de planning izolat (<=128 ms); decizie dupa 38-07.
6. Candidat: reducerea subscriptiilor Realtime (cost dominant in DB).

## Sarit
Task 2 (baseline browser "inainte"): decizia utilizatorului 16.11.2026 — baseline-ul disponibil e din alta aplicatie. 38-07 masoara fata de criterii absolute.
