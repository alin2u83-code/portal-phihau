---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 10
subsystem: competitii-ui-gdpr
tags: [audit_log, jurnal, gdpr, rls, competitii]
requires: [39-07, 39-08]
provides:
  - "Tab 'Jurnal cont club' in CompetitieDetail (JurnalActori)"
  - "Randuri GDPR + sectiune roluri pentru contul de competitie per club"
affects: [components/Competitii/index.tsx]
key-files:
  created: [components/Competitii/JurnalActori.tsx]
  modified: [components/Competitii/index.tsx, docs/gdpr/REGISTRU-EVIDENTA-PRELUCRARI.md, docs/roluri-permisiuni.md]
decisions:
  - "Fara filtrare pe rol in client: RLS audit_log_select_jurnal_club decide (D-20)"
  - "Nu se selecteaza date_vechi/date_noi (T-39-51)"
metrics:
  tasks: 2
  files: 4
  completed: 2026-11-11
---

# Phase 39 Plan 10: Jurnal cont club + documentare GDPR Summary

Tab-ul "Jurnal cont club" arata modificarile din contul de club cu autorul declarat (marcat "nume liber" cand nu e din lista), filtrate exclusiv de RLS; registrul GDPR si docs-ul de roluri descriu autorul ca declarativ, neverificat.

## Tasks

1. JurnalActori.tsx + tab in CompetitieDetail - commit 1973ffe. Interogare `audit_log` (id, created_at, tabel, operatie, rand_id, club_id, actor_nume, actor_din_lista), `.eq('competitie_id')`, `.in('tabel', TABELE_JURNAL)`, `.not('actor_nume','is',null)`, limit 300. Nota "Nu este verificat ... nu este proba", stari incarcare/eroare cu Reincearca/EmptyState. Tab vizibil pentru `!extern && (isAdmin || isClubAdmin || isInstructor)`; nu e in TABURI_EXTERN. Modificarile din e807164 (istoricExtern / poateInscrie) pastrate neatinse.
2. Docs - commit 24b9c70. Rand nou in registrul GDPR (autor declarat), rand "Jurnal de audit" actualizat cu destinatarii noi, punct nou la Masuri tehnice; sectiune "Cont de competiție per club (Faza 39)" in roluri-permisiuni.md, Faza 36 marcata ca inlocuita pentru acces.

## Deviations from Plan

None - plan executat ca scris. Notă: sectiunea de docs foloseste numele de helperi `acces_extern_la_club/la_competitie/la_sportiv` existente in migrarile 20261111*.

## Verificat / neverificat

- Verificat: `npx tsc --noEmit` fara nicio eroare; greps din criteriile de acceptare (jurnal_cont_club x5 in index.tsx, "declarativ", "sesiuni_actor_competitie", titlul sectiunii).
- Neverificat: randarea in browser; comportamentul RLS live (coloanele actor_*, politica audit_log_select_jurnal_club vin din 39-08 si se testeaza in 39-11); valorile `operatie` presupuse INSERT/UPDATE/DELETE (conform JurnalAudit.tsx). Review separat de cod nerulat.

## Known Stubs

None.

## Self-Check: PASSED
