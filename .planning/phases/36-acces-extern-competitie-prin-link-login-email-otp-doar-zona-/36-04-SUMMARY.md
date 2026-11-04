---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 04
subsystem: database
tags: [rls, supabase, security, competitii]
requires:
  - phase: 36-01
    provides: DEC-4/DEC-5 list of broad write policies
  - phase: 36-02
    provides: helpers has_access_to_club, competitie_deschisa_inscrieri, categorie_apartine_competitiei, sportiv_apartine_clubului, acces_extern_competitie
provides:
  - Club-scoped write policies on inscrieri_competitie, echipe_competitie, echipa_sportivi
  - RESTRICTIVE scope + gate policies (survive any leftover permissive policy)
  - competitii/probe_competitie/categorii_competitie write limited to SUPER_ADMIN_FEDERATIE/ADMIN
affects: [36-08, 36-11, 36-12]
key-files:
  created:
    - supabase/migrations/20261106b_rls_competitii_scriere_club_scoped.sql
    - tests/rls_competitii_scriere_faza36.ts
key-decisions:
  - "Status/deadline gate on INSERT only; retire/correct after close stays possible"
  - "No sportiv-belongs-to-club check on UPDATE: 38 legacy inscrieri + 34 team members are cross-club"
  - "competitii/probe/categorii writes federation-only: UI is federation-only and all live rows have club_id NULL"
  - "SELECT policies untouched (D-16)"
requirements-completed: [ACX-10, ACX-11, ACX-04]
duration: 45min
completed: 2026-11-05
---

# Phase 36 Plan 04: RLS scriere club-scoped (D-15) Summary

**Cross-club write hole closed on competition tables; test went 8/27 -> 27/27 against live DB.**

## Defect proof (test BEFORE migration: 8/27 pass, 19 FAIL)
ADMIN_CLUB@A could: insert inscriere with club_id=B, update and delete club B's inscriere (row gone), insert echipa for B, add member to B's team, inscribe on closed / past-deadline competitions, use a category from another competition, and update/delete `competitii`, `categorii_competitie`, insert `probe_competitie`. (A few later checks failed only as knock-on of earlier deletes.)

## After migration: 27/27 PASS, residuals 0 (competitii, plati, vize)
ADMIN@A and INSTRUCTOR@A (D-13) inscribe own club; cross-club write rejected; ADMIN@A still READS club B rows (D-16); SUPER_ADMIN keeps FinanciarView update, closed-competition insert, cross-club team member, competitii update.

## Policies (live)
Per table: permissive `*_w_*` (has_access_to_club / get_active_role), RESTRICTIVE `*_r_scope_*` (has_access_to_club OR acces_extern_competitie), RESTRICTIVE `*_r_gate_ins/upd`. Dropped: inscrieri_{insert,update,delete}_club, echipe_{insert,update,delete}_club, echipa_sportivi_manage, competitii_{insert,update,delete}_admin, probe_manage_admin, categorii_manage_admin. Kept: all SELECT and rbv_ic_* policies.

## Code check of writers
Club paths (InscriereClubWizard Pas3/Pas4, InscriereModal, InscrieriView, retrage.ts) write own club / own sportivi; federation paths (FinanciarView, FuzionariPanel, AdminPanel, CereriInterclubAdmin, competitii delete in index.tsx) run under SUPER_ADMIN/ADMIN. Not verified in browser.

## Deviations / notes
- Plan said UPDATE gate includes sportiv check; dropped (legacy data above).
- Orchestrator inline (needs Supabase MCP). Test uses only sportivi with existing FRQKD visa (trigger no-op).
- Residual risk: INSTRUCTOR can now delete own-club inscrieri (matches old behaviour, now scoped). ADMIN_CLUB cannot edit competition/category from any UI path (UI already federation-only).

## Self-Check: PASSED
