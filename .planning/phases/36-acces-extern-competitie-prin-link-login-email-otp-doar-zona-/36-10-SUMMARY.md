---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 10
subsystem: competitii
tags: [acces-extern, federatie, react, supabase]
requires: [36-03, 36-06]
provides:
  - "components/Competitii/CereriAccesAdmin.tsx: panou federatie (link, cereri, granturi)"
  - "tab 'acces_extern' in CompetitieDetail (doar isSuperAdmin, doar in portal)"
affects: [components/Competitii/index.tsx]
tech-stack:
  added: []
  patterns: ["fetch Bearer catre /api/*", "RLS is_super_admin ca autoritate pentru select/update"]
key-files:
  created: [components/Competitii/CereriAccesAdmin.tsx]
  modified: [components/Competitii/index.tsx]
key-decisions:
  - "Tipurile CerereAcces/GrantAcces sunt locale in componenta (nu in types.ts) - planul nu include types.ts in files_modified"
  - "Contorul de cereri in asteptare se reincarca la schimbarea activeTab, ca in plan"
requirements-completed: [ACX-01, ACX-03]
duration: ~10 min
completed: 2026-11-05
---

# Phase 36 Plan 10: Panou federatie Acces extern Summary

Panou "Acces extern" pentru super admin in competitie: link copiabil, cereri de acces (aproba/respinge prin /api/aproba-cerere-acces cu Bearer) si granturi (revoca/reactiveaza cu activ=false/true), plus tab cu contor de cereri in asteptare.

## Tasks

| Task | Commit | Files |
|------|--------|-------|
| 1. CereriAccesAdmin | f0a5b97 | components/Competitii/CereriAccesAdmin.tsx |
| 2. Tab acces_extern | 4156b44 | components/Competitii/index.tsx |

## Detalii

- Aprobare in `Modal` de confirmare; respingere in `Modal` cu textarea (max 300, contor). 409 -> "Cererea a fost deja procesata" + reincarcare; sesiune lipsa -> "Sesiune expirata. Reautentifica-te."; `avertisment === 'cont_existent_cu_alte_roluri'` -> nota vizibila.
- Butoane dezactivate cat `busy` (fara dublu-click). Revocarea cere confirmare; reactivarea e directa. Nicio stergere de granturi.
- Toate textele din cereri sunt randate ca text React (0 `dangerouslySetInnerHTML`).
- Tab-ul: `!extern && permissions.isSuperAdmin` (buton si randare); `acces_extern` nu e in `TABURI_EXTERN`, deci `handleSetActiveTab` il ignora in mode extern, iar in extern nu se citeste din sessionStorage.

## Deviations from Plan

None - plan executed as written.

## Verification

- `npx tsc --noEmit`: curat.
- Greps din plan: `/api/aproba-cerere-acces` = 1, `dangerouslySetInnerHTML` = 0, `Authorization` prezent, `acces_extern` x5 in index.tsx (>=4), `permissions.isSuperAdmin` x11 (>=3), `CereriAccesAdmin` importat.
- NU verificat: randare in browser, flux real cerere -> aprobare -> login (planificat in 36-12), code review separat.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- components/Competitii/CereriAccesAdmin.tsx: FOUND
- commits f0a5b97, 4156b44: FOUND
