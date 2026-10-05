---
phase: 33
plan: 03
status: complete
executed: 2026-10-05
executed_by: orchestrator inline (necesita MCP Supabase)
---

# 33-03 — Plata club->federatie, raport pe cluburi, RLS rescris

## Pas 0 (politici live inainte)
Cross-club confirmat: `select_vize_sportivi` ({public}) lasa orice ADMIN_CLUB/INSTRUCTOR sa vada TOATE vizele; `deconturi_federatie_select/update` lasau orice ADMIN_CLUB sa citeasca/modifice deconturile oricarui club; `decont_sportivi` folosea `LIMIT 1` pe clubul userului; `taxa_anuala_config_insert/update` verificau rolul pe orice rand de context. Bucket `chitante_deconturi` NU exista pe live (nicio politica storage).

## Livrat (live + repo)
- Migratie `taxe_anuale_plata_federatie_raport_rls` (`20261005d_…sql`): `inregistreaza_plata_federatie`, `raport_taxe_anuale_cluburi`, DROP al tuturor politicilor vechi + 12 politici noi (select scoped; insert/update/delete doar `is_super_admin()`), politici `taxa_anuala_config_insert/update` cu `is_super_admin()`.
- Corectie `taxe_anuale_raport_cast_nume_text`: testul a prins `cluburi.nume` varchar(255) vs `text` in raport; fisierul `20261005d` contine versiunea corectata (`c.nume::text`).
- Migratie `taxe_anuale_storage_chitante_deconturi` (`20261005f_…sql`): bucket privat (5 MB, pdf/jpeg/png/webp) + politici select/insert pe `public/{club_id}/…` cu `poate_gestiona_taxe_club`.
- Suita `sql/migrations/test_taxe_anuale_faza33_plata_federatie.sql`: P1–P8 OK (plata cu bifare, dublare refuzata, scutit/in asteptare/alt club refuzat fara dezvaluire de nume, validari, INSTRUCTOR/alt club 42501, plati multiple, raport pe roluri, RLS sub `SET LOCAL ROLE authenticated`).

## Verificari post-aplicare
- Exact 12 politici pe cele 3 tabele; `taxa_anuala_config` insert/update cu `is_super_admin()`, fara DELETE.
- anon fara EXECUTE pe cele 2 RPC, authenticated cu EXECUTE.
- Baseline FRQKD 2025 intact: e71edebc… 2720 / 17 / Platit / Cash / confirmat.
- Zero urme de test (deconturi/plati 2099, cluburi/sportivi de test, preturi 2098/2099 = 0).
- View-urile `rbv_deconturi_federatie`, `vedere_cluburi_deconturi_federatie` sunt `security_invoker=true` (respecta RLS-ul nou).

## Atentie pentru pasii urmatori
UI-ul vechi (FederationInvoices/TaxeAnuale) scrie direct in tabele: pentru ADMIN_CLUB va esua pana la 33-07/33-09. NU se face deploy intre acum si finalul fazei.
