---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 02
subsystem: database
tags: [rls, supabase, rpc, security-definer]
requires:
  - phase: 36-01
    provides: DEC-1..DEC-9 audit decisions
provides:
  - rol REPREZENTANT_COMPETITIE in roluri
  - tables acces_competitie_extern, cereri_acces_competitie (RLS on, NO FORCE)
  - helpers este_doar_extern, acces_extern_competitie/_la_competitie/_la_club/_la_sportiv, competitie_deschisa_inscrieri, sportiv_apartine_clubului, categorie_apartine_competitiei
  - RPC get_competitie_publica, trimite_cerere_acces (anon), vize_club_competitie, user_id_dupa_email (service_role only)
affects: [36-04, 36-05, 36-06, 36-07, 36-08]
key-files:
  created:
    - supabase/migrations/20261106a_acces_extern_competitie_fundatie.sql
    - tests/acces_extern_fundatie_faza36.ts
key-decisions:
  - "club_id already nullable: no ALTER (DEC-2)"
  - "Trigger fn_automatizeaza_legatura_utilizator now skips email auto-link for REPREZENTANT_COMPETITIE (DEC-9)"
requirements-completed: [ACX-01, ACX-03, ACX-08, ACX-09]
duration: 40min
completed: 2026-11-05
---

# Phase 36 Plan 02: Fundatie DB acces extern Summary

**Role, grant/request tables, RLS helpers and anon/auth RPCs applied live and proven by a 36-check live test.**

## Deviations
- **Rule 2 (security):** migration also does CREATE OR REPLACE on `fn_automatizeaza_legatura_utilizator` (existing function) so the extern role is not auto-linked to a sportiv by email (DEC-9). Only change: `AND NEW.rol_denumire IS DISTINCT FROM 'REPREZENTANT_COMPETITIE'` on step 1. No policy of existing tables changed.
- Orchestrator ran tasks inline (no Supabase MCP in gsd-executor). First apply_migration confirmation expired; reapplied OK.
- Test needed real constraint values (`tip_proba='thao_quyen_individual'`, categorie `gen`/`varsta_min`). A club with the all-zero UUID exists live, so the test uses a random UUID for "club inexistent".

## Verification (live, catalog)
rol=1; both tables RLS on / force=false; policies: own-select + super-admin ALL (grants), super-admin select/update (cereri), none for anon; helpers secdef+STABLE, anon execute false; get_competitie_publica/trimite_cerere_acces anon true; user_id_dupa_email anon/auth false; partial unique index present; club_id nullable=YES; trigger bypass present.
Test: `npx tsx tests/acces_extern_fundatie_faza36.ts` -> 36/36, residuals 0.

## Self-Check: PASSED
