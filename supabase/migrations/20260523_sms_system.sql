-- ============================================================
-- SISTEM SMS: configurare, template-uri, coadă, rate-limiting,
--             SMS-uri primite (banca), triggere și funcții helper
-- ============================================================

-- ====================
-- 1. sms_config
-- ====================
CREATE TABLE IF NOT EXISTS public.sms_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID REFERENCES public.cluburi(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'android_gateway', -- android_gateway | smslink | twilio | vonage
  gateway_url         TEXT,           -- URL public Android Gateway (ngrok/CF Tunnel)
  api_key             TEXT,           -- token autentificare gateway
  api_secret          TEXT,           -- pentru Twilio/Vonage
  sender_name         TEXT DEFAULT 'Club',
  telefon_sender      TEXT,           -- nr telefon fizic folosit (afișat în UI, info)
  nickname            TEXT,           -- ex: "SIM Orange - recepție"
  status              TEXT DEFAULT 'unconfigured', -- unconfigured | connected | error
  last_check_at       TIMESTAMPTZ,
  last_error          TEXT,
  rate_limit_per_hour INTEGER DEFAULT 20,
  rate_limit_per_day  INTEGER DEFAULT 100,
  activ               BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  configurat_de       UUID REFERENCES auth.users(id),
  gateway_device_id   TEXT,
  UNIQUE(club_id)
);

-- ====================
-- 2. sms_templates
-- ====================
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   UUID REFERENCES public.cluburi(id) ON DELETE CASCADE,
  tip       TEXT NOT NULL, -- reminder_24h | reminder_2h | expirare_abonament | confirmare_plata | custom
  titlu     TEXT NOT NULL,
  continut  TEXT NOT NULL, -- ex: "Salut {{name}}, ai programare mâine la {{hour}}."
  variabile JSONB DEFAULT '[]',
  activ     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, tip)
);

-- ====================
-- 3. sms_queue
-- ====================
CREATE TABLE IF NOT EXISTS public.sms_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID REFERENCES public.cluburi(id),
  sportiv_id   UUID REFERENCES public.sportivi(id),
  telefon      TEXT NOT NULL,
  mesaj        TEXT NOT NULL,
  tip          TEXT NOT NULL,
  template_id  UUID REFERENCES public.sms_templates(id),
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | sending | sent | failed | cancelled
  retry_count  INTEGER DEFAULT 0,
  max_retries  INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at      TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  external_id  TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- 4. sms_rate_log
-- ====================
CREATE TABLE IF NOT EXISTS public.sms_rate_log (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.cluburi(id),
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ====================
-- 5. sms_incoming
-- ====================
CREATE TABLE IF NOT EXISTS public.sms_incoming (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID REFERENCES public.cluburi(id),
  telefon_sursa    TEXT,
  continut         TEXT NOT NULL,
  banca_detectata  TEXT,                     -- ing | bcr | brd | raiffeisen | null
  suma_detectata   NUMERIC(10,2),
  platitor_detectat TEXT,
  referinta        TEXT,
  plata_id         UUID REFERENCES public.plati(id),
  status           TEXT DEFAULT 'unmatched', -- matched | unmatched | ignored | manual_matched | processing
  confidence       NUMERIC(3,2),
  received_at      TIMESTAMPTZ DEFAULT now(),
  processed_at     TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}'
);

-- ============================================================
-- INDECȘI
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sms_queue_process
  ON public.sms_queue(status, scheduled_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_sms_queue_sportiv
  ON public.sms_queue(sportiv_id);

CREATE INDEX IF NOT EXISTS idx_sms_queue_club
  ON public.sms_queue(club_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_rate_log_club_time
  ON public.sms_rate_log(club_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_sms_incoming_club
  ON public.sms_incoming(club_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_incoming_status
  ON public.sms_incoming(status)
  WHERE status = 'unmatched';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- sms_config
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access sms_config" ON public.sms_config;
CREATE POLICY "Staff - Full Access sms_config"
ON public.sms_config FOR ALL
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));

-- sms_templates
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access sms_templates" ON public.sms_templates;
CREATE POLICY "Staff - Full Access sms_templates"
ON public.sms_templates FOR ALL
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));

-- sms_queue
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access sms_queue" ON public.sms_queue;
CREATE POLICY "Staff - Full Access sms_queue"
ON public.sms_queue FOR ALL
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));

-- sms_rate_log
ALTER TABLE public.sms_rate_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access sms_rate_log" ON public.sms_rate_log;
CREATE POLICY "Staff - Full Access sms_rate_log"
ON public.sms_rate_log FOR ALL
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));

-- sms_incoming
ALTER TABLE public.sms_incoming ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access sms_incoming" ON public.sms_incoming;
CREATE POLICY "Staff - Full Access sms_incoming"
ON public.sms_incoming FOR ALL
USING (public.has_access_to_club(club_id))
WITH CHECK (public.has_access_to_club(club_id));

-- ============================================================
-- TRIGGER: updated_at pe sms_queue
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_sms_queue_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sms_queue_updated_at ON public.sms_queue;
CREATE TRIGGER trg_sms_queue_updated_at
  BEFORE UPDATE ON public.sms_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_sms_queue_timestamp();

-- ============================================================
-- FUNCȚIE: add_sms_to_queue()
-- Render template + inserare în coadă pentru un sportiv.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_sms_to_queue(
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

  -- Render template (înlocuire variabile)
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

GRANT EXECUTE ON FUNCTION public.add_sms_to_queue(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_sms_to_queue(UUID, UUID, TEXT, JSONB) TO service_role;

-- ============================================================
-- FUNCȚIE: schedule_training_reminders()
-- Programează SMS reminder 24h pentru antrenamentele de mâine
-- și SMS expirare abonament pentru sportivii cu abonament ce
-- expiră în 6-8 zile (fereastră de 7 zile).
-- ============================================================

CREATE OR REPLACE FUNCTION public.schedule_training_reminders()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec RECORD;
BEGIN
  -- ---- 24h reminders ----
  -- Sportivi înscriși la antrenamentele programate mâine,
  -- pentru care nu există deja un SMS de tip reminder_24h în coadă
  FOR v_rec IN
    SELECT
      pa.club_id,
      pre.sportiv_id,
      pa.id AS antrenament_id,
      pa.ora_start
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
    PERFORM public.add_sms_to_queue(
      v_rec.club_id,
      v_rec.sportiv_id,
      'reminder_24h',
      jsonb_build_object(
        'hour', to_char(v_rec.ora_start, 'HH24:MI'),
        'name', (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = v_rec.sportiv_id),
        'antrenament_id', v_rec.antrenament_id::text
      )
    );
  END LOOP;

  -- ---- Expirare abonament (7 zile) ----
  -- Sportivi al căror cel mai recent abonament achitat expiră
  -- în 6-8 zile față de azi (fereastră de ±1 zi în jurul zilei 7)
  FOR v_rec IN
    SELECT DISTINCT ON (p.sportiv_id)
      p.club_id,
      p.sportiv_id,
      p.data + INTERVAL '30 days' AS data_expirare
    FROM public.plati p
    WHERE p.tip = 'abonament'
      AND p.status = 'achitat'
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
    PERFORM public.add_sms_to_queue(
      v_rec.club_id,
      v_rec.sportiv_id,
      'expirare_abonament',
      jsonb_build_object(
        'days', '7',
        'name', (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = v_rec.sportiv_id)
      )
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_training_reminders() TO service_role;

-- ============================================================
-- TRIGGER: confirmare plată automată via SMS
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_plata_confirmare_sms()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'achitat' AND (OLD IS NULL OR OLD.status != 'achitat') THEN
    PERFORM public.add_sms_to_queue(
      NEW.club_id,
      NEW.sportiv_id,
      'confirmare_plata',
      jsonb_build_object(
        'amount', NEW.suma::text,
        'name', (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = NEW.sportiv_id)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plata_sms ON public.plati;
CREATE TRIGGER trg_plata_sms
  AFTER INSERT OR UPDATE OF status ON public.plati
  FOR EACH ROW EXECUTE FUNCTION public.trg_plata_confirmare_sms();

-- ============================================================
-- INSTRUCȚIUNI pg_cron (rulează manual în Supabase SQL Editor
-- după activarea extensiei pg_cron din Dashboard → Extensions):
--
-- Procesare coadă SMS la fiecare 5 minute:
--   SELECT cron.schedule(
--     'sms-process-queue',
--     '*/5 * * * *',
--     $$SELECT net.http_post(
--         url := current_setting('app.supabase_url') || '/functions/v1/sms-process-queue',
--         headers := jsonb_build_object(
--           'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--           'Content-Type', 'application/json'
--         ),
--         body := '{}'::jsonb
--     )$$
--   );
--
-- Programare remindere zilnice la ora 07:00:
--   SELECT cron.schedule(
--     'sms-schedule-reminders',
--     '0 7 * * *',
--     $$SELECT public.schedule_training_reminders()$$
--   );
-- ============================================================

NOTIFY pgrst, 'reload schema';
