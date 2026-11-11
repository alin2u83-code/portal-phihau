---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 01
subsystem: database
tags: [supabase, rls, postgres, competitii, acces-extern]
requires:
  - phase: 36-acces-extern-competitie
    provides: helperi acces_extern_*, politici ext_p_*/ext_r_*, rol REPREZENTANT_COMPETITIE
provides:
  - tabela conturi_competitie_club (un cont per club, un club per cont, email pe rand)
  - cont_club_curent(), competitie_vizibila_cont_club() (regula D-12 intr-o singura functie)
  - helperi RLS acces_extern_* rescrisi pe cont de club (aceeasi semnatura)
  - proprietari_aplicatie + este_proprietar() (20261111b redus, D-08)
affects: [39-02, 39-03, 39-04]
tech-stack:
  added: []
  patterns: ["rescriere corp helper RLS cu CREATE OR REPLACE (semnatura neschimbata) in loc de rescriere politici"]
key-files:
  created:
    - supabase/migrations/20261111c_cont_competitie_club.sql
    - .planning/phases/39-cont-unic-de-competitie-per-club-zona-competitionala-implici/39-AUDIT-LIVE.md
  modified:
    - supabase/migrations/20261111b_proprietar_acces_management.sql
    - tests/acl_definer_faza37.allowlist.json
key-decisions:
  - "Helperii se rescriu pe conturi_competitie_club; politicile ext_* raman neatinse"
  - "proprietari_aplicatie fara FORCE RLS (altfel este_proprietar() ar intoarce mereu false)"
  - "Fara coloana activ pe conturi_competitie_club: inlocuire persoana = schimbare email (D-15)"
requirements-completed: [D-01, D-02, D-08, D-12, D-14]
duration: 25min
completed: 2026-11-11
---

# Phase 39 Plan 01: Cont unic de competitie per club (fundatie DB) Summary

Migrari scrise (NEAPLICATE): tabela `conturi_competitie_club` si cei 5 helperi RLS din Faza 36 rescrisi pe contul de club, plus `20261111b` redus la proprietar (D-08).

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1. Audit live read-only | f27d55f | 39-AUDIT-LIVE.md (partial, vezi Deviatii) |
| 2. 20261111b redus + 20261111c + allowlist ACL | 4482f12 | 3 fisiere |

## Ce s-a livrat
- `20261111c`: `conturi_competitie_club` (club_id PK, user_id UNIQUE, email lower + CHECK lungime), RLS fara FORCE, doar SELECT pentru authenticated (`ccc_select_propriu`, `ccc_select_proprietar`), scrie doar service role.
- `competitie_vizibila_cont_club(competitie, club)`: nu e draft SI (nu e terminata SAU clubul are inscriere/echipa). Terminata = `finalizata` sau `data_sfarsit` < azi (Europe/Bucharest). Comentariu in fisier o leaga de `clasificaCompetitiiClub` din 39-03.
- 5 helperi `acces_extern_*` rescrisi (CREATE OR REPLACE, aceeasi semnatura); tabela legacy `acces_competitie_extern` nu mai e consultata (0 referinte in codul executabil, doar in comentarii).
- `20261111b`: doar `proprietari_aplicatie` + `este_proprietar()` + GRANT SELECT service_role.
- Allowlist ACL: +`competitie_vizibila_cont_club(uuid,uuid)`, `cont_club_curent()`, `este_proprietar()`.

## Verificare (rulata)
- grep acceptanta: 12 potriviri (>=8); 0 referinte `acces_competitie_extern` in cod; 0 `FORCE ROW LEVEL`; 4 instructiuni politica (doar ccc_*, 2 DROP + 2 CREATE); 0 functii per grant in 20261111b; JSON allowlist valid cu cele 3 semnaturi.
- NERULATE: SQL-ul nu a fost executat/parsat pe un Postgres (nicio aplicare live, conform planului); testul `acl_definer_faza37` ruleaza in 39-04. Nu s-a rulat review separat de cod (migrari neaplicate; recomandat inainte de 39-04).

## Deviations from Plan

**1. [Rule 3 - Blocking] Audit live partial: MCP Supabase indisponibil**
- Task 1 cerea `execute_sql`; uneltele MCP nu erau disponibile executorului. Rulate doar citiri PostgREST read-only (service role): punctele (4), (5), (6), (7). Punctele (1), (2), (3), (8), (9) (catalog: pg_policies/pg_proc/pg_default_acl/pg_trigger) marcate NERULAT in 39-AUDIT-LIVE.md cu interogarile gata de rulat; completeaza din sesiunea principala inainte de 39-04. Pentru (1)-(2) s-a facut audit pe repo (grep): nicio alta functie/politica din migrari nu citeste tabela legacy.
- Commit: f27d55f

**2. [Rule 1 - Bug] proprietari_aplicatie fara FORCE RLS**
- 20261111b (original) avea FORCE RLS fara politici; `este_proprietar()` SECURITY DEFINER ar fi rulat sub RLS si ar fi intors mereu false (gotcha din memorie). Scos FORCE; accesul direct ramane blocat prin REVOKE (anon/authenticated) si lipsa politicilor.
- Commit: 4482f12

**Total:** 2 deviatii. Impact: 39-04 trebuie sa ruleze interogarile NERULAT inainte de aplicare.

## Constatari live utile pentru 39-04
- 0 granturi legacy (active sau nu), 0 cereri, 0 REPREZENTANT_COMPETITIE: aplicarea nu pierde acces nimanui.
- 5 competitii: 3 finalizata, 2 inscrieri_deschise. Baza D-02: 41 ADMIN_CLUB, 2 INSTRUCTOR (de recontrolat dupa aplicare).
- Obiectele noi confirmate inexistente live.

## Riscuri / de stiut
- `competitie_vizibila_cont_club` e apelabila de orice authenticated pentru orice (competitie, club): intoarce doar boolean de participare (nu date personale); acceptat conform planului.
- 20261111e (acordare management pe contul de club) este referit in antet dar inca nescris (plan ulterior).

## Self-Check: PASSED
Fisiere create/modificate exista; commit-urile f27d55f si 4482f12 exista.
