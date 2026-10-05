---
phase: 33
plan: 02
status: complete
executed: 2026-10-05
executed_by: orchestrator inline (necesita MCP Supabase)
---

# 33-02 — RPC generare taxe anuale + scutiri

- Migratie aplicata live `taxe_anuale_generare_scutiri`; fisier `supabase/migrations/20261005c_taxe_anuale_generare_scutiri.sql`.
- RPC `genereaza_taxe_anuale(club, tip, an, sportiv_ids?)` si `seteaza_scutire_taxa(sportiv, tip, an, scutit, motiv?)`: SECURITY DEFINER, search_path setat, EXECUTE doar authenticated (anon = false), club verificat in DB prin `poate_gestiona_taxe_club`.
- Suita `sql/migrations/test_taxe_anuale_faza33_generare_scutiri.sql` (context de rol simulat): G1-G6 si S1-S8 OK (ADMIN_CLUB genereaza/scuteste; INSTRUCTOR, alt club si fara context = 42501; scutire refuzata cu incasari sau dupa virare; motiv obligatoriu).
- Fara urme dupa rulare: plati an 2099 = 0, config 2099 = 0, cluburi/sportivi de test = 0; plati FRQKD+FRAM = 54 (neschimbat).
- Nota: FOUND nu e folosit dupa instructiuni intermediare (verificare pe `v.id IS NOT NULL`).
