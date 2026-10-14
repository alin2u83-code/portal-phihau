---
status: complete
---
# Quick 261014-jve: Grupe - sala nespecificata + schimbare locatie cu istoric

**Cauza bug:** UI citea doar `grupe.sala` (text legacy, gol la 15/18 grupe); locatia reala e `grupe.locatie_id -> nom_locatii` (setata la 4 din cele 15 goale). Orarul nu are sala proprie, deci fallback = locatia grupei.

**Facut**
- Migrare `20261014c_grupa_locatie_istoric.sql` (aplicata live): `grupa_locatie_istoric`, `grupa_locatie_cereri`, `locatie_grupa_la_data()`, RPC `schimba_locatie_grupa` (admin), `cere_schimbare_locatie_grupa` (instructor), `decide_cerere_locatie_grupa` (admin), cron zilnic `sync_locatii_grupe`, view `vedere_cluburi_program_antrenamente` ia sala la data antrenamentului (security_invoker pastrat).
- `components/Grupe/locatieGrupa.ts`, `LocatieGrupaPanel.tsx` (Schimba locatia / Seteaza sala / cerere pending + Aproba/Respinge) in `GrupaDetailView`; `GrupaCard` si `Prezenta/GrupeList` afiseaza locatia.

**Verificat:** tsc OK; test SQL cu rollback (azi=veche, +10 zile=noua, trecut=veche). NU testat vizual in browser (Playwright MCP indisponibil).
