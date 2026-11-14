---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 01
subsystem: database
tags: [supabase, plpgsql, security-definer, competitii, categorii]
requires: []
provides:
  - "public.categorii_aplica_operatie(text,uuid,uuid[],jsonb,jsonb,integer) SECURITY DEFINER (migrare scrisa, NEAPLICATA)"
  - "allowlist ACL cu semnatura noua"
affects: [41-02, 41-03, 41-04]
tech-stack:
  added: []
  patterns: ["RPC atomic cu garda is_super_admin(), blocare competitie + surse FOR UPDATE, detectie drift preview->apply, fara DELETE"]
key-files:
  created:
    - supabase/migrations/20261114a_categorii_aplica_operatie.sql
  modified:
    - tests/acl_definer_faza37.allowlist.json
key-decisions:
  - "Taxele de competitie raman derivate (confirmat live: plati nu are coloane/randuri de competitie); anularea raporteaza taxe_anulate / taxe_achitata_anulate fara a schimba taxa_achitata"
  - "Randurile retrase nu se muta niciodata (raman pe sursa ca istoric)"
  - "Regex uuid strict (8-4-4-4-12) in loc de [0-9a-fA-F-]{36}"
requirements-completed: [D-01, D-03, D-04, D-07, D-08, D-09, D-12]
duration: ~25min
completed: 2026-11-14
---

# Phase 41 Plan 01: RPC categorii_aplica_operatie Summary

Un singur RPC plpgsql SECURITY DEFINER aplica atomic anulare / fuziune / impartire / mutare pe categoriile unei competitii, doar pentru super admin federatie, fara niciun DELETE; migrarea este scrisa dar NEAPLICATA.

## Ce s-a livrat
- `supabase/migrations/20261114a_categorii_aplica_operatie.sql` (368 linii): garda `is_super_admin()` (42501), lock `competitii FOR UPDATE` + surse `FOR UPDATE`, refuz pe `finalizata`, validari de parametri/jsonb/uuid, compatibilitate (proba, tip_participare, arma), drift (acoperire completa la fuziune/impartire, `p_asteptat` la anulare), verificare dubluri `(categorie_id, sportiv_id)`, INSERT categorii noi (copiaza inclusiv `max_membri_echipa`, `min_membri_start`), mutari prin `jsonb_to_recordset`, surse marcate `anulata` / `fuzionata` / `impartita`, REVOKE FROM PUBLIC, anon + GRANT authenticated, service_role, NOTIFY, Rollback.
- `tests/acl_definer_faza37.allowlist.json`: semnatura adaugata in ordine alfabetica + nota "41-01".
- Commit: `b3ef74c0` (ambele task-uri intr-un singur commit, fisierul fiind unic).

## Task 1 - Wave 0 verificare live (D-12): PARTIAL, important
Executorul NU a avut acces la Supabase MCP (`execute_sql` indisponibil). Am verificat live doar ce se poate prin PostgREST cu service_role (OpenAPI + numaratori read-only, zero scrieri):
- Coloane/defaults/NOT NULL pe categorii_competitie, inscrieri_competitie, echipe_competitie, competitii (a descoperit `max_membri_echipa` si `min_membri_start`, necunoscute din plan; copiate in functie).
- Date: categorii 467 activa / 9 anulata / 2 fuzionata / 5 impartita; competitii 3 finalizata + 2 inscrieri_deschise; inscrieri 1149, echipe 614; 0 inscrieri/echipe active pe categorii ne-active.
- Taxe (D-08): `plati` nu are nicio coloana competi/inscriere/echipa/categor si 0 randuri cu tip ILIKE '%competi%' -> modelul derivat confirmat pe date.
- Functia lipseste live; `is_super_admin` exista.

NEVERIFICAT live (necesita catalog pg_*; scris explicit in header ca "NEVERIFICAT"): `rolbypassrls` pe postgres (STOP a), flag-uri RLS/FORCE, `pg_policies` + politici fantoma, definitiile live `is_super_admin`/`audit_trigger_fn`, lista live de triggere si constrangeri UNIQUE, functii pg_proc care scriu in plati (STOP b partial), `pg_event_trigger`. Din migrari: nicio problema vizibila (trg_extern_* e no-op pentru super admin, trg_inscrieri_sportiv_in_club e doar pe UPDATE OF sportiv_id, triggerul taxei anuale e doar AFTER INSERT). STOP (a) si (c) nu au putut fi confirmate/infirmate live.

**Actiune necesara inainte de 41-04 (apply live):** rularea celor 8 verificari din header prin Supabase MCP (de orchestrator sau in 41-04) si actualizarea liniei "Verificat live". Cel mai important: `SELECT rolbypassrls FROM pg_roles WHERE rolname='postgres'` si lista UNIQUE pe inscrieri/echipe.

## Deviations from Plan
- **[Rule 3 - Blocking] Supabase MCP indisponibil:** Task 1 facut partial prin PostgREST (vezi mai sus), cu marcaj explicit "NEVERIFICAT" in locul rezultatelor inventate.
- **[Rule 2] max_membri_echipa / min_membri_start copiate** din categoria sursa (descoperite live, plan le trata ca "alte NOT NULL" - sunt cu default, dar altfel s-ar fi pierdut valorile categoriei sursa).
- Ambele task-uri intr-un singur commit (un singur fisier).

## Limitari de verificare
- SQL-ul NU a fost rulat/parsat (fara Postgres local, migrarea nu se aplica in acest plan); verificat doar prin grep-urile planului (SECURITY DEFINER, is_super_admin(), fara DELETE/DROP NOT NULL/TEMP, finalizata, REVOKE) si parse JSON al allowlist-ului: toate OK. Primul test real e in 41-04.
- Revizuirea separata de cod (`/code-review`) nu a fost rulata; recomandata pe `b3ef74c0` inainte de apply.

## Known Stubs
None.

## Threat Flags
None beyond plan threat model (T-41-01..08 acoperite in functie).

## Self-Check: PASSED
- supabase/migrations/20261114a_categorii_aplica_operatie.sql: FOUND
- tests/acl_definer_faza37.allowlist.json contine semnatura: FOUND
- commit b3ef74c0: FOUND
