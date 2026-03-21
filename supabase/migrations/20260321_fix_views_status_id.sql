-- =====================================================
-- MIGRATION: Actualizare view-uri pentru a folosi status_id
-- in loc de coloana text status din prezenta_antrenament.
-- Coloana text status este PASTRATA (nu stearsa).
-- Toate view-urile expun sp.denumire AS status pentru
-- compatibilitate cu codul existent.
-- =====================================================

-- vedere_prezenta_sportiv
DROP VIEW IF EXISTS public.vedere_prezenta_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vedere_prezenta_sportiv AS
SELECT
    pa.id AS antrenament_id,
    pa.id,
    pr.sportiv_id,
    pa.data,
    pa.ora_start,
    pa.club_id,
    pa.grupa_id,
    pr.status_id,
    sp.denumire AS status,
    sp.este_prezent,
    g.denumire AS nume_grupa
FROM public.prezenta_antrenament pr
JOIN public.program_antrenamente pa ON pr.antrenament_id = pa.id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
LEFT JOIN public.statuse_prezenta sp ON pr.status_id = sp.id
WHERE pa.club_id = public.get_active_club_id()
   OR EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = pr.sportiv_id AND s.user_id = auth.uid())
   OR public.is_super_admin();

-- vedere_prezenta_detaliata
DROP VIEW IF EXISTS public.vedere_prezenta_detaliata CASCADE;
CREATE OR REPLACE VIEW public.vedere_prezenta_detaliata AS
SELECT
    pa.id AS antrenament_id,
    pa.id,
    pr.sportiv_id,
    pa.data,
    pa.ora_start,
    pa.club_id,
    pa.grupa_id,
    pr.status_id,
    sp.denumire AS status,
    sp.este_prezent,
    g.denumire AS nume_grupa
FROM public.prezenta_antrenament pr
JOIN public.program_antrenamente pa ON pr.antrenament_id = pa.id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
LEFT JOIN public.statuse_prezenta sp ON pr.status_id = sp.id
WHERE pa.club_id = public.get_active_club_id()
   OR EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = pr.sportiv_id AND s.user_id = auth.uid())
   OR public.is_super_admin();

-- vedere_prezenta_club
DROP VIEW IF EXISTS public.vedere_prezenta_club CASCADE;
CREATE OR REPLACE VIEW public.vedere_prezenta_club AS
SELECT
    pa.id AS antrenament_id,
    pr.sportiv_id,
    pa.data,
    pa.ora_start,
    pa.ora_sfarsit,
    pa.club_id,
    pa.grupa_id,
    pr.status_id,
    sp.denumire AS status,
    sp.este_prezent,
    g.denumire AS nume_grupa,
    s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume
FROM public.prezenta_antrenament pr
JOIN public.program_antrenamente pa ON pr.antrenament_id = pa.id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
LEFT JOIN public.statuse_prezenta sp ON pr.status_id = sp.id
LEFT JOIN public.sportivi s ON pr.sportiv_id = s.id
WHERE pa.club_id = public.get_active_club_id()
   OR public.is_super_admin();

-- sumar_prezenta_astazi
DROP VIEW IF EXISTS public.sumar_prezenta_astazi CASCADE;
CREATE OR REPLACE VIEW public.sumar_prezenta_astazi AS
SELECT
    pa.id AS antrenament_id,
    pa.data,
    pa.ora_start,
    pa.ora_sfarsit,
    pa.club_id,
    pa.grupa_id,
    g.denumire AS nume_grupa,
    COUNT(pr.sportiv_id) AS total_sportivi,
    COUNT(pr.sportiv_id) FILTER (WHERE sp.este_prezent = true)  AS total_prezenti,
    COUNT(pr.sportiv_id) FILTER (WHERE sp.este_prezent = false) AS total_absenti
FROM public.program_antrenamente pa
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
LEFT JOIN public.prezenta_antrenament pr ON pr.antrenament_id = pa.id
LEFT JOIN public.statuse_prezenta sp ON pr.status_id = sp.id
WHERE pa.data = CURRENT_DATE
  AND (pa.club_id = public.get_active_club_id() OR public.is_super_admin())
GROUP BY pa.id, pa.data, pa.ora_start, pa.ora_sfarsit, pa.club_id, pa.grupa_id, g.denumire;

-- =====================================================
-- GRANTS
-- =====================================================
GRANT SELECT ON public.vedere_prezenta_sportiv   TO authenticated;
GRANT SELECT ON public.vedere_prezenta_detaliata TO authenticated;
GRANT SELECT ON public.vedere_prezenta_club      TO authenticated;
GRANT SELECT ON public.sumar_prezenta_astazi     TO authenticated;

REVOKE ALL ON public.vedere_prezenta_sportiv   FROM anon;
REVOKE ALL ON public.vedere_prezenta_detaliata FROM anon;
REVOKE ALL ON public.vedere_prezenta_club      FROM anon;
REVOKE ALL ON public.sumar_prezenta_astazi     FROM anon;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260321_fix_views_status_id applied: views updated to use status_id FK.';
END $$;
