-- Faza 30 Feature 2 (extindere): praguri de memento configurabile per club
-- pentru expirare abonament, in loc de pragul fix de 7 zile mostenit din
-- versiunea initiala. Rescrie ramura de expirare din schedule_training_reminders()
-- pornind de la fix-ul aplicat in 20260918_fix_memento_expirare_abonament.sql
-- (add_sms_to_queue_intern, filtre capitalizate).
--
-- Conventie de semn: pragul p e decalajul in zile fata de data expirarii.
-- Memento-ul se trimite cand data_expirare + p = CURRENT_DATE.
-- p=-7: cu 7 zile inainte; p=0: in ziua expirarii; p=+7: la 7 zile dupa.
--
-- Data de expirare NU mai e "plati.data + 30 zile" (aproximare), ci ultima
-- zi a celei mai recente luni calendaristice acoperite de o factura
-- Abonament/Achitat (plati.luna/plati.an) — modelul real de facturare.

ALTER TABLE public.sms_config
  ADD COLUMN IF NOT EXISTS praguri_expirare_zile INTEGER[] NOT NULL DEFAULT ARRAY[-7,-3,0,3,7];

ALTER TABLE public.sms_config
  ADD COLUMN IF NOT EXISTS memento_expirare_activ BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sms_config_praguri_expirare_valide'
  ) THEN
    ALTER TABLE public.sms_config
      ADD CONSTRAINT sms_config_praguri_expirare_valide
      CHECK (praguri_expirare_zile <@ ARRAY[-7,-3,0,3,7]::integer[]);
  END IF;
END $$;

COMMENT ON COLUMN public.sms_config.praguri_expirare_zile IS
  'Faza 30: decalaje in zile fata de data expirarii. Memento se trimite cand data_expirare + prag = CURRENT_DATE. Negativ = inainte de expirare, 0 = in ziua expirarii, pozitiv = dupa expirare.';

CREATE OR REPLACE FUNCTION public.schedule_training_reminders()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  -- ---- 24h reminders (neschimbat fata de 30-01) ----
  FOR v_rec IN
    SELECT
      pa.club_id,
      pre.sportiv_id,
      pa.id AS antrenament_id,
      pa.ora_start,
      s.nume || ' ' || s.prenume AS sportiv_name
    FROM public.program_antrenamente pa
    JOIN public.prezenta_antrenament pre ON pre.antrenament_id = pa.id
    JOIN public.sportivi s ON s.id = pre.sportiv_id
    WHERE pa.data = CURRENT_DATE + INTERVAL '1 day'
      AND pa.status = 'programat'
      AND NOT EXISTS (
        SELECT 1 FROM public.sms_queue sq
        WHERE sq.sportiv_id = pre.sportiv_id
          AND sq.tip = 'reminder_24h'
          AND (sq.metadata->>'antrenament_id')::UUID = pa.id
          AND sq.status NOT IN ('failed', 'cancelled')
      )
  LOOP
    PERFORM public.add_sms_to_queue_intern(
      v_rec.club_id,
      v_rec.sportiv_id,
      'reminder_24h',
      jsonb_build_object(
        'hour', to_char(v_rec.ora_start, 'HH24:MI'),
        'name', v_rec.sportiv_name,
        'antrenament_id', v_rec.antrenament_id::text
      )
    );
  END LOOP;

  -- ---- Expirare abonament: praguri configurabile + luna calendaristica ----
  FOR v_rec IN
    WITH ultima_acoperire AS (
      SELECT DISTINCT ON (p.sportiv_id)
        p.sportiv_id,
        p.club_id,
        (make_date(
          COALESCE(p.an, EXTRACT(YEAR FROM p.data)::int),
          COALESCE(p.luna, EXTRACT(MONTH FROM p.data)::int),
          1
        ) + INTERVAL '1 month' - INTERVAL '1 day')::date AS data_expirare
      FROM public.plati p
      WHERE p.tip = 'Abonament'
        AND p.status = 'Achitat'
        AND p.sportiv_id IS NOT NULL
      ORDER BY p.sportiv_id,
        COALESCE(p.an, EXTRACT(YEAR FROM p.data)::int) DESC,
        COALESCE(p.luna, EXTRACT(MONTH FROM p.data)::int) DESC,
        p.data DESC
    )
    SELECT
      ua.club_id,
      ua.sportiv_id,
      ua.data_expirare,
      prag,
      s.nume || ' ' || s.prenume AS sportiv_name
    FROM ultima_acoperire ua
    JOIN public.sportivi s ON s.id = ua.sportiv_id
    JOIN public.sms_config c ON c.club_id = ua.club_id
    CROSS JOIN LATERAL unnest(c.praguri_expirare_zile) AS prag
    WHERE s.status = 'Activ'
      AND c.activ = true
      AND c.memento_expirare_activ = true
      AND ua.data_expirare + prag = CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.sms_queue sq
        WHERE sq.sportiv_id = ua.sportiv_id
          AND sq.tip = 'expirare_abonament'
          AND sq.status NOT IN ('failed', 'cancelled')
          AND (sq.metadata->>'prag') = prag::text
          AND (sq.metadata->>'data_expirare') = ua.data_expirare::text
      )
  LOOP
    PERFORM public.add_sms_to_queue_intern(
      v_rec.club_id,
      v_rec.sportiv_id,
      'expirare_abonament',
      jsonb_build_object(
        'name', v_rec.sportiv_name,
        'days', abs(v_rec.prag)::text,
        'prag', v_rec.prag::text,
        'data_expirare', v_rec.data_expirare::text
      )
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_training_reminders() TO service_role;

NOTIFY pgrst, 'reload schema';
