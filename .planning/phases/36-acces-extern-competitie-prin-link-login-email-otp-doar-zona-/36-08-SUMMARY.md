---
phase: 36
plan: 08
status: complete
requirements: [ACX-09, ACX-05, ACX-06, ACX-08, ACX-11]
---
# 36-08 SUMMARY — RLS izolare rol extern

Migratie `20261106c_rls_acces_extern_competitie.sql` aplicata live (proiect wuhidifzsutwgdfkwhmd).

## Livrat
- Helper `acces_extern_sportiv_competitie`.
- Politici PERMISSIVE `ext_p_*` pe grant (competitii, probe, categorii, inscrieri, echipe, echipa_sportivi, sportivi, arme, csa, stagii_cvd; citire referinta).
- Politici RESTRICTIVE `ext_r_*`: scope SELECT, zero-scriere pe tabele critice (incl. utilizator_roluri_multicont, roluri, acces_competitie_extern), scriere arme doar pe grant.
- Trigger `trg_extern_protejeaza_campuri` pe inscrieri/echipe (taxa_achitata imuabila, status doar spre retras/retrasa).
- `ext_r_deny_all` pe 120 tabele; excluse 20 (cele cu politici dedicate). Nicio tabela fara RLS.
- `ext_r_storage_deny` creata pe storage.objects.
- View-uri `vedere_prezenta_sportiv`, `vedere_istoric_grade_sportiv` -> security_invoker=true (precedent 20260325).

## Verificat
- Catalog: toate `ext_*` pe {authenticated}; `ext_r_*` RESTRICTIVE; `ext_p_*` PERMISSIVE; fara SELECT nou pe tabelele de roluri/grant; 2 triggere prezente.
- Regresii: rls_izolare_cross_club_faza25 OK, rls_competitii_scriere_faza36 27/27, acces_extern_fundatie_faza36 36/36.

## Neverificat / risc
- Izolarea efectiva cu cont extern real: 36-11.
- View-uri trecute pe security_invoker: consumatori interni (istoric grade / prezenta sportiv) netestati in browser.
- Deny-all poate bloca tabele necesare shell-ului extern (descoperit in 36-12).
- RPC-uri fara garda (adauga_sportiv_complet, export_sportivi_selectati, decrypt_cnp, get_all_app_data) NEatinse: risc rezidual.
- `cluburi` expune toate coloanele pentru extern (risc scazut).
