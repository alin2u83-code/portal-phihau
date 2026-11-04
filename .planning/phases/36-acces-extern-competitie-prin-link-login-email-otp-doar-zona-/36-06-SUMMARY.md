---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 06
subsystem: api
tags: [vercel, supabase, service-role, approval]
requires:
  - phase: 36-02
    provides: rol REPREZENTANT_COMPETITIE, tabele acces_competitie_extern / cereri_acces_competitie, RPC user_id_dupa_email
provides:
  - POST /api/aproba-cerere-acces ({cerere_id, actiune, motiv?} + Bearer, doar SUPER_ADMIN_FEDERATIE)
  - proceseazaCerereAcces / valideazaCerereAprobare / esteFederatie (reutilizabile in testul live 36-12)
affects: [36-10, 36-12]
key-files:
  created:
    - api/_aprobaCerereAcces.ts
    - api/_aprobaCerereAcces.test.ts
    - api/aproba-cerere-acces.ts
key-decisions:
  - "Rand de rol: club_id NULL, sportiv_id NULL, is_primary doar daca nu are alte roluri (DEC-1/2/9)"
  - "Rollback: deleteUser doar pentru userul creat in cererea curenta; altfel se sterg doar randurile inserate acum (grant nou / rol nou)"
  - "Marcarea cererii filtrata pe status='in_asteptare' (protectie la procesare concurenta)"
requirements-completed: [ACX-03]
duration: 15min
completed: 2026-11-05
---

# Phase 36 Plan 06: Endpoint aprobare cereri acces extern Summary

**Endpoint Vercel `aproba-cerere-acces` cu garda Bearer + SUPER_ADMIN_FEDERATIE si logica DB (creare cont fara parola, rol extern, grant, rollback) in modul separat `_aprobaCerereAcces`.**

## Tasks
1. Modul `_aprobaCerereAcces` + teste pure (validare, `esteFederatie`) - commit "feat(36-06): modul _aprobaCerereAcces"
2. Handler `aproba-cerere-acces` (405/429/500 mediu/401/403/400/delegare) - commit "feat(36-06): handler Vercel aproba-cerere-acces"

## Verification
- `node --import tsx api/_aprobaCerereAcces.test.ts`: 13 PASS, ALL PASSED.
- `tsc --noEmit` (comanda din plan, pe cele 3 fisiere): fara erori.
- Nicio referinta la trimitere de email in cele doua fisiere; `esteFederatie` apelat inainte de orice acces la date.
- NU verificat: `proceseazaCerereAcces` pe DB live (e in 36-12); nu s-a apelat nicio unealta care muta date live.

## Deviations from Plan
None - plan executed as written. (Detaliu: grantul existent se actualizeaza prin select+update/insert in loc de upsert, ca rollback-ul sa stie daca randul e nou si sa nu stearga un grant preexistent.)

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
