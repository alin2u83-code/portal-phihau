-- =====================================================
-- 1. Adaugă coloana is_read în tabelul notificari
-- =====================================================
ALTER TABLE public.notificari
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- RLS: utilizatorii pot actualiza propriile notificari (is_read)
DROP POLICY IF EXISTS "Users update own notificari" ON public.notificari;
CREATE POLICY "Users update own notificari"
    ON public.notificari FOR UPDATE TO authenticated
    USING (recipient_user_id = auth.uid())
    WITH CHECK (recipient_user_id = auth.uid());

-- =====================================================
-- 2. View nou: toate antrenamentele grupei + prezenta sportivului
--    Absenta = antrenament fara inregistrare prezenta
--    Folosit de IstoricPrezentaSportiv si SportivInfoModal
-- =====================================================
DROP VIEW IF EXISTS public.vw_istoricprezenta_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vw_istoricprezenta_sportiv AS
SELECT
    pa.id AS antrenament_id,
    pa.data,
    pa.ora_start,
    pa.club_id,
    pa.grupa_id,
    s.id AS sportiv_id,
    pr.status_id,
    COALESCE(sp.denumire, 'Absent') AS status,
    COALESCE(sp.este_prezent, false) AS este_prezent,
    g.denumire AS nume_grupa
FROM public.sportivi s
JOIN public.program_antrenamente pa ON pa.grupa_id = s.grupa_id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
LEFT JOIN public.prezenta_antrenament pr
    ON pr.antrenament_id = pa.id AND pr.sportiv_id = s.id
LEFT JOIN public.statuse_prezenta sp ON pr.status_id = sp.id
WHERE pa.data <= CURRENT_DATE
  AND s.status = 'Activ'
  AND (
    s.user_id = auth.uid()
    OR pa.club_id = public.get_active_club_id()
    OR public.is_super_admin()
  );

GRANT SELECT ON public.vw_istoricprezenta_sportiv TO authenticated;
REVOKE ALL ON public.vw_istoricprezenta_sportiv FROM anon;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Migration applied: is_read added to notificari, vw_istoricprezenta_sportiv created.';
END $$;
