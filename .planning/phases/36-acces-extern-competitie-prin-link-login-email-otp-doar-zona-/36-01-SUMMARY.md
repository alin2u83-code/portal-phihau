---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 01
subsystem: database
tags: [rls, supabase, audit, postgres]
requires: []
provides:
  - 36-AUDIT-LIVE.md with live pg_policies/flags/triggers/helpers/RPC audit and DEC-1..DEC-9
affects: [36-02, 36-04, 36-05, 36-06, 36-08, 36-11]
key-files:
  created: [.planning/phases/36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-/36-AUDIT-LIVE.md]
  modified: []
key-decisions:
  - "club_id nullable on utilizator_roluri_multicont: no DROP NOT NULL needed"
  - "REPREZENTANT_COMPETITIE absent from roluri: insert in 36-02"
  - "Trigger fn_automatizeaza_legatura_utilizator auto-links sportiv_id by email: bypass for extern role"
  - "Scoping extern via RESTRICTIVE policies, broad SELECTs remain for internal roles (D-16)"
  - "A4 confirmed: unknown email -> 422 otp_disabled (distinct from 429 rate limit)"
requirements-completed: [ACX-09, ACX-10, ACX-11]
duration: 25min
completed: 2026-11-05
---

# Phase 36 Plan 01: Audit live Wave 0 Summary

**Live read-only audit of RLS/triggers/helpers/RPC for competition tables; confirmed cross-club write holes and produced DEC-1..DEC-9 for downstream plans.**

## Accomplishments
- 36-AUDIT-LIVE.md sections 1-9 from raw `execute_sql` output (project wuhidifzsutwgdfkwhmd), no DDL/DML.
- Found 13 ROL-ANY write policies (inscrieri/echipe/echipa_sportivi + competitii/probe/categorii) = DROP list for 36-04.
- A4 probe: HTTP 422 `otp_disabled` for nonexistent email.

## Deviations / notes
- **SCHIMBARE FATA DE RESEARCH:** DEC-5 (competitii write cannot be federation-only, organizer clubs need it), DEC-9 (email auto-link trigger), DEC-7 (RESTRICTIVE policies needed).
- Executed inline by orchestrator: gsd-executor has no Supabase MCP tools (precedent 15-01/16-01).
- Probe done with curl to /auth/v1/otp (node_modules supabase-js path not resolvable from temp dir).
- RPC "no guard" list is heuristic; critical: adauga_sportiv_complet, export_sportivi_selectati.
- Fantom-policy file-vs-live diff not exhaustive; only the competition tables compared.

## Self-Check: PASSED
