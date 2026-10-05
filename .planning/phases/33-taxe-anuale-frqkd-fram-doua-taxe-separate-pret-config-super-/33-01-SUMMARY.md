---
phase: 33
plan: 01
status: complete
executed: 2026-10-05
executed_by: orchestrator inline (subagentii nu au acces MCP Supabase)
---

# 33-01 — Fundatie DB taxe anuale FRQKD + FRAM

## Rezultat
- Audit live read-only: `33-SCHEMA-AUDIT.md` (V1–V12 toate GO; Q4 storage/politici lasat pentru 33-03).
- Migratie atomica aplicata live: `taxe_anuale_frqkd_fram_schema_activare`; fisier `supabase/migrations/20261005b_taxe_anuale_frqkd_fram_schema_activare.sql`.
- Suita de test `sql/migrations/test_taxe_anuale_faza33_activare.sql`: T1–T8 OK (rollback intentionat, fara urme).

## Descoperire neprevazuta
37 facturi `plati` tip FRAM 'FRAM Anul 2026' (create manual 2026-01-20, C.S. Phi Hau; 3x0 lei Achitat, 17x200 Achitat, 17x200 Neachitat) fara viza. Backfill: 37 vize FRAM 2026 legate prin plata_id (filtru V6). Facturile in sine neatinse. Pretul FRAM 2026 NU e in `taxa_anuala_config` (doar FRQKD 2026 = 170) — super admin trebuie sa-l seteze; pana atunci noii sportivi au FRAM "in asteptare".

## Verificari post-aplicare
- Constrangeri noi (4) prezente, `uq_viza_sportiv_an` eliminata; indexuri noi prezente, cele vechi eliminate.
- Baseline FRQKD 2025 identic: decont e71edebc…, 2720 lei, 17 participanti, Platit/Cash/confirmat; 17 legaturi decont_sportivi cu plata_id si suma (total 2720.00).
- 0 deconturi 'In asteptare'; DELETE din migratie a sters 0 randuri.
- Toate cele 7 functii SECURITY DEFINER cu search_path setat (inclusiv `trg_taxa_config_factureaza_asteptare`); EXECUTE revocat de la authenticated pe 4 functii interne, acordat pe `poate_gestiona_taxe_club`; 5 triggere.
- `perioada_taxa`: 2026, 2025, 2026 (cazurile din plan).
- Numaratori inainte/dupa: plati FRQKD+FRAM 54/54, vize 17 → 54 (+37 FRAM), deconturi 1/1, decont_sportivi 17/17.

## Backup-uri (de sters dupa confirmarea utilizatorului, la finalul fazei)
`public.backup_taxe33_vize_sportivi` (17), `backup_taxe33_decont_sportivi` (17), `backup_taxe33_deconturi_federatie` (1), RLS activ.
Tabel vechi din sesiunea anterioara: `backup_frqkd_neachitat_20261005` (61).

## Neacoperit in acest plan
- Calea de test T9/T10 (utilizator authenticated SUPER_ADMIN / ADMIN_CLUB) cerute de revizuirea planului: nu a putut fi rulata fara sesiune autentificata; se acopera in 33-10 (teste live PostgREST cu cont temporar).
- UI-ul vechi care face upsert pe `taxa_anuala_config` cu onConflict `an_fiscal` va esua pana la 33-09 (inlocuit). Nu se face deploy intre 33-03 si 33-09.
