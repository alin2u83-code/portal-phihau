# 44-01 SUMMARY — verificare read-only live (17.11.2026)

Livrabil: `44-VERIFICARE.md` (secțiuni A–H, I, I2, 5 verdicte, Cluburi reale, STOP). Nimic scris în DB, nimic deployat, nicio migrare creată.

## Ce am interogat LIVE
Catalog (pg_class, pg_constraint, pg_trigger, pg_proc, pg_policies, pg_indexes, pg_depend/pg_rewrite, pg_views, cron.job, pg_event_trigger, pg_stat_user_tables), conținut agregat (numărători, max(created_at)), `list_edge_functions` + `get_edge_function` pentru cele 4 funcții deployate.
## Ce am doar grep-uit
Inventarul de cod din repo (Grep pe *.ts/*.tsx). Per-loc `club_id` la cele 16 INSERT-uri în `plati`: neverificat.

## STOP
Nicio condiție STOP (a–d). Vezi însă constatările de mai jos.

## Verdicte (titluri)
- **D-01:** alocari_plati, incasari_efective, plata = SAFE-TO-ARCHIVE; obligatii_plata = BLOCKED-BY aplicare_reduceri (FK CASCADE) + detalii_decont + vw_fisa_financiara_detaliata; catalog_pret = BLOCKED-BY 4 view-uri + `plata`. Zero referințe în cod și edge functions.
- **D-02:** un singur scriitor DB (`proceseaza_plata_factura`), 3 cititori DB, 2 view-uri; 6 fișiere de cod de schimbat.
- **D-03:** NOT NULL sigur doar după backfill (90 din sportivi + 6 din `familii.club_id`), trigger de completare și corectarea CalendarView:213/243. **Cele 6 plăți "fără club" sunt derivabile din familii.club_id; lista pentru decizia userului e goală.**
- **SC-01:** nicio coloană (tip_plata, tip_plata_id, tip_abonament_id pe plati; suma_totala/suma_incasata pe tranzactii) nu se poate elimina acum: toate au view-uri dependente; tip_plata_id mai e scris din produseService/comenziService.
- **SC-02:** `plati.eveniment_id` nu există live; StagiiCompetitii.tsx:320 e accesibil și cade cu PGRST204 (nerulat în aplicație).

## Alte constatări
- `sms-parse-bank` deployat filtrează/scrie `status` 'pending'/'achitat', respins de `plati_status_check`. Nu atinge nimic din faza 44.
- `on_tranzactie_change` și `update_transaction_status` sunt funcții orfane (fără trigger).
- Achitat fără tranzactie_plata: Falticeni 69, Phi Hau 20, Club Bogdan 2 (total 91).
- Cele 7 cluburi reale nu se pot deduce din date; candidați: C.S. Phi Hau, Kim Long Dao Falticeni; restul de confirmat de user în 44-07.
