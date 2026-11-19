---
phase: 45-clonare-competitie-super-admin-asistent-cu-bife-pentru-setar
plan: 01
subsystem: database
tags: [supabase, rpc, security-definer, competitii, clonare]
requires: []
provides:
  - "public.competitie_cloneaza(uuid,text,text,date,date,date,boolean,boolean,uuid[]) (migrare scrisa, NEAPLICATA)"
affects: [45-02, 45-03]
key-files:
  created:
    - supabase/migrations/20261118i_competitie_cloneaza.sql
  modified:
    - tests/acl_definer_faza37.allowlist.json
key-decisions:
  - "search_path = pg_catalog, public (ordinea din hardening SEC-41-03), nu ordinea veche din 20261114a"
  - "status nou 'draft' (nu 'schita': CHECK-ul il refuza)"
  - "RPC doar valideaza apartenenta id-urilor de categorii; algoritmul structurii initiale ramane doar in TypeScript (45-02)"
requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-07, D-09, D-10, D-16]
duration: 20min
completed: 2026-11-19
---

# Phase 45 Plan 01: RPC competitie_cloneaza Summary

RPC atomic SECURITY DEFINER care cloneaza o competitie (setari, probe, categorii listate explicit) intr-una noua in `draft`, doar pentru super admin; migrarea este scrisa, NEAPLICATA live.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1. Verificare live Wave 0 + antet migrare | 0580b64e | antet cu decizii, ipoteze si bloc "Verificat live" |
| 2. Functia + ACL allowlist | 3b7ab1ad | functie, COMMENT, REVOKE/GRANT, NOTIFY, Rollback; allowlist actualizat |

## Verificat live (Task 1) - PARTIAL

Executorul nu a avut Supabase MCP (doar PostgREST cu service_role: OpenAPI + numaratori, SELECT-uri; nicio scriere). Catalogul `pg_*` nu a putut fi citit, acelasi tipar ca in 20261114a.

Confirmat live:
- Coloanele si default-urile celor 3 tabele se potrivesc exact cu lista din plan; nicio coloana NOT NULL fara default neacoperita (conditia STOP d: neatinsa).
- `competitie_cloneaza` lipseste (PGRST202).
- 5 competitii (tehnica/finalizata 2, tehnica/inscrieri_deschise 1, cvd/finalizata 1, cvd/inscrieri_deschise 1); 1 denumire duplicata deja existenta (nu exista UNIQUE live pe denumire).
- Competitia "Juniori 1, Seniori, Veterani": o varianta cu 74 categorii (toate activa) si una cu 84 (68 activa, 2 fuzionata, 9 anulata, 5 impartita, 2 cu autoreferinta in categorii_fuzionate_din); 4 probe in fiecare; 0 categorii cu proba din alta competitie.

NEVERIFICAT (de facut prin MCP la 45-03, inainte de apply): rolbypassrls postgres, FORCE RLS, pg_policies (fantoma), pg_trigger (alt BEFORE INSERT in afara trg_competitii_fram_imutabil), CHECK-urile pe competitii (tip, status, deadline), UNIQUE pe categorii (competitie_id, numar_categorie), corpul is_super_admin(), event trigger-e. Conditiile STOP (a)-(c) nu au putut fi evaluate; riscul e mic (20261114a a verificat bypassrls=true si FORCE pe aceleasi tabele), dar ramane de confirmat.

## Deviations from Plan

**1. [Rule 3 - Blocking] Supabase MCP indisponibil** - verificarea live din Task 1 facuta doar prin PostgREST (vezi mai sus); lipsurile sunt marcate NEVERIFICAT in antetul migrarii. Migrarea nu e aplicata, deci nimic ireversibil.

**2. [Rule 1 - Bug preventiv]** `NULL::uuid[]` explicit pentru `categorii_fuzionate_din` in INSERT...SELECT, ca sa evite o inferenta de tip nesigura. Sintaxa SQL nu a putut fi rulata (fara DB in aceasta sesiune): se valideaza la apply in 45-03.

## Known Stubs
None.

## Threat Flags
None (suprafata acoperita de T-45-01..06).

## Verificari rulate
Greps statice conform planului (SECURITY DEFINER, search_path, is_super_admin, advisory lock, 'draft', REVOKE, ERRCODE-uri, zero DELETE/UPDATE/TEMP, Rollback, NEAPLICATA) si JSON allowlist valid cu semnatura in pozitie sortata. NU rulat: SQL-ul pe o baza, `tests/acl_definer_faza37.ts`, code-review separat.

## Self-Check: PASSED
- supabase/migrations/20261118i_competitie_cloneaza.sql exista (commit 0580b64e, 3b7ab1ad)
- tests/acl_definer_faza37.allowlist.json modificat (3b7ab1ad)
