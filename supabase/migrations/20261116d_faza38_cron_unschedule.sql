-- Faza 38 / Plan 38-08 (migrarea d) — scoate jobul pg_cron care pica la fiecare 10 minute
--
-- NEAPLICATA - se aplica in 38-09 doar dupa OK explicit.
-- Sursa: starea LIVE din 38-01-LIVE.md (L6), nu migrarile din repo.
--
-- MOTIV (masurat live, 38-01, 16.11.2026):
--   * cron.job jobid 1 'refresh-dashboard-sportivi', schedule '*/10 * * * *', activ:
--       REFRESH MATERIALIZED VIEW CONCURRENTLY vedere_sportivi_detaliat_mv
--   * esueaza la fiecare rulare: ERROR relation "vedere_sportivi_detaliat_mv" does not exist
--     (ultimele 8 rulari, 15.11.2026 21:10-22:20 UTC, toate failed).
--   * vedere_sportivi_detaliat_mv nu exista in pg_class; pg_depend: 0 dependinte.
--   * re-grep in cod (38-08, 16.11.2026):
--       grep -rn "vedere_sportivi_detaliat_mv" --include=*.ts --include=*.tsx --include=*.sql .
--         (fara node_modules / .planning)  => 0 rezultate (nicio referinta in aplicatie).
--   Cauza #7 din research: un job care pica la 10 minute consuma o conexiune si umple logurile.
--
-- Nu atinge politici, roluri sau statement_timeout (D-04). Idempotent: nu face nimic daca
-- jobul nu mai exista.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-dashboard-sportivi') THEN
    PERFORM cron.unschedule('refresh-dashboard-sportivi');
  END IF;
END
$$;

-- ROLLBACK (re-programeaza jobul cu comanda originala din L6; atentie: va reesua cat timp
-- vedere_sportivi_detaliat_mv nu exista):
--   SELECT cron.schedule(
--     'refresh-dashboard-sportivi',
--     '*/10 * * * *',
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY vedere_sportivi_detaliat_mv'
--   );
--
-- VERIFICARE dupa aplicare (38-09): SELECT count(*) FROM cron.job;  -- 2 (era 3)
--   iar jobid 2 'sms-schedule-reminders' si jobid 3 'sync-locatii-grupe' raman active.
