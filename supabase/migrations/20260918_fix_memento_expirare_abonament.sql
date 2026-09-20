-- ============================================================
-- FIX: memento-uri SMS expirare abonament nu ajungeau NICIODATA
-- in coada. Doua defecte reparate impreuna (fara efect unul fara
-- celalalt):
-- (1) filtrele p.tip = 'abonament' / p.status = 'achitat' (litere
--     mici) din schedule_training_reminders() nu se potriveau
--     niciodata cu datele reale ('Abonament' / 'Achitat').
-- (2) add_sms_to_queue() arunca RAISE EXCEPTION cand
--     has_access_to_club() returneaza false; in context pg_cron nu
--     exista sesiune de utilizator (auth.uid() NULL) -> primul apel
--     din bucla arunca exceptie si aborteaza toata functia.
-- Solutie: functie interna fara guard de acces, apelabila doar de
-- service_role, folosita exclusiv din contextul cron.
-- ============================================================

-- ------------------------------------------------------------
-- add_sms_to_queue_intern: identica cu add_sms_to_queue, FARA
-- verificarea has_access_to_club. Destinata EXCLUSIV contextelor
-- fara sesiune de utilizator (pg_cron / Edge Function cu
-- service_role). NU expune acest RPC catre authenticated/anon.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_sms_to_queue_intern(
  p_club_id    UUID,
  p_sportiv_id UUID,
  p_tip        TEXT,
  p_variabile  JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template  public.sms_templates%ROWTYPE;
  v_telefon   TEXT;
  v_mesaj     TEXT;
  v_queue_id  UUID;
BEGIN
  -- Fetch template activ pentru tipul cerut
  SELECT * INTO v_template
  FROM public.sms_templates
  WHERE club_id = p_club_id
    AND tip = p_tip
    AND activ = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Fetch telefon sportiv
  SELECT telefon INTO v_telefon
  FROM public.sportivi
  WHERE id = p_sportiv_id;
  IF v_telefon IS NULL OR length(trim(v_telefon)) < 10 THEN RETURN NULL; END IF;

  -- Render template (inlocuire variabile)
  v_mesaj := v_template.continut;
  v_mesaj := replace(v_mesaj, '{{name}}',   COALESCE(p_variabile->>'name',   ''));
  v_mesaj := replace(v_mesaj, '{{hour}}',   COALESCE(p_variabile->>'hour',   ''));
  v_mesaj := replace(v_mesaj, '{{days}}',   COALESCE(p_variabile->>'days',   ''));
  v_mesaj := replace(v_mesaj, '{{club}}',   COALESCE(p_variabile->>'club',   ''));
  v_mesaj := replace(v_mesaj, '{{amount}}', COALESCE(p_variabile->>'amount', ''));

  INSERT INTO public.sms_queue (
    club_id, sportiv_id, telefon, mesaj, tip, template_id, scheduled_at, metadata
  )
  VALUES (
    p_club_id, p_sportiv_id, v_telefon, v_mesaj, p_tip, v_template.id, now(), p_variabile
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_sms_to_queue_intern(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_sms_to_queue_intern(UUID, UUID, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.add_sms_to_queue_intern(UUID, UUID, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_sms_to_queue_intern(UUID, UUID, TEXT, JSONB) TO service_role;

-- ------------------------------------------------------------
-- add_sms_to_queue: semnatura identica, pastreaza guard-ul de
-- acces pentru apelantii autentificati (frontend + /api/sms),
-- delegheaza corpul catre varianta interna.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_sms_to_queue(
  p_club_id    UUID,
  p_sportiv_id UUID,
  p_tip        TEXT,
  p_variabile  JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_access_to_club(p_club_id) THEN
    RAISE EXCEPTION 'Access denied to club %', p_club_id;
  END IF;

  RETURN public.add_sms_to_queue_intern(p_club_id, p_sportiv_id, p_tip, p_variabile);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_sms_to_queue(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_sms_to_queue(UUID, UUID, TEXT, JSONB) TO service_role;

-- ------------------------------------------------------------
-- schedule_training_reminders: apeluri redirijate catre varianta
-- interna (fara sesiune -> add_sms_to_queue ar arunca mereu),
-- filtre expirare abonament capitalizate ('Abonament'/'Achitat')
-- ca sa se potriveasca cu datele reale, plus garda s.status =
-- 'Activ' (nu trimitem memento sportivilor retrasi/inactivi).
-- Restul logicii (fereastra 6-8 zile, dedup 7 zile) e neschimbat.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_training_reminders()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  -- ---- 24h reminders ----
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

  -- ---- Expirare abonament (7 zile) ----
  FOR v_rec IN
    SELECT DISTINCT ON (p.sportiv_id)
      p.club_id,
      p.sportiv_id,
      p.data + INTERVAL '30 days' AS data_expirare,
      s.nume || ' ' || s.prenume AS sportiv_name
    FROM public.plati p
    JOIN public.sportivi s ON s.id = p.sportiv_id
    WHERE p.tip = 'Abonament'
      AND p.status = 'Achitat'
      AND s.status = 'Activ'
      AND (p.data + INTERVAL '30 days') BETWEEN CURRENT_DATE + INTERVAL '6 days'
                                              AND CURRENT_DATE + INTERVAL '8 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.sms_queue sq
        WHERE sq.sportiv_id = p.sportiv_id
          AND sq.tip = 'expirare_abonament'
          AND sq.status NOT IN ('failed', 'cancelled')
          AND sq.created_at >= CURRENT_DATE - INTERVAL '7 days'
      )
    ORDER BY p.sportiv_id, p.data DESC
  LOOP
    PERFORM public.add_sms_to_queue_intern(
      v_rec.club_id,
      v_rec.sportiv_id,
      'expirare_abonament',
      jsonb_build_object(
        'days', '7',
        'name', v_rec.sportiv_name
      )
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_training_reminders() TO service_role;

NOTIFY pgrst, 'reload schema';
