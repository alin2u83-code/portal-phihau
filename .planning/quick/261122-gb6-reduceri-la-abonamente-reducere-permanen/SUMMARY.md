---
status: complete
commit: 3cd39a0e
date: 2026-11-22
---
# 261122-gb6 — Reduceri permanente per sportiv

Livrat (commit local 3cd39a0e, NEPUSH): tabel `reduceri_sportiv`, `reduceri.club_id NOT NULL`, RLS `has_access_to_club`, RPC atomic `seteaza_reducere_sportiv`, aplicare reducere la generare in masa / factura manuala / jurnal incasari / factura la inscriere, UI atribuire (profil sportiv + Plati > Configurare > Reduceri), editare reducere. Migrari 20261122a/b/c LIVE (git add -f).
Date: Sonia=ANDRICIUC (30 RON, reduce factura familiei), Casian=LUNGU CILIAC (100%).

Verificat: tsc, test unitar, browser (catalog CRUD, atribuire/scoatere, profil, GestiuneFacturi Sonia 300-30=270), RLS simulat ADMIN_CLUB/SUPER_ADMIN/SPORTIV.
Neverificat: salvare din modal profil (cere consimtamant parinte), factura automata la inscriere, generare in masa live, mobil, instructor, alt club; review nerulat pe diff final.

Ramase: Casian listă 0 in GestiuneFacturi (tip Individual 200 din sezon arhivat; formularul da 0 pt sezoane arhivate); rotunjire 2 zecimale la generare; 5 tabele backup_*_20261122 de sters; 10 FRAM neachitate pre-sept (2000 lei); Casian FRQKD 170 lei neachitat; 17 vize_sportivi plata_id NULL; `este_staff_autorizat()` returneaza false pt ADMIN_CLUB (verifica alte politici care o folosesc); dev server 5173 inca pornit.
