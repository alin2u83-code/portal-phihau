-- =====================================================
-- RECREARE TOATE VEDERE_CLUBURI_* VIEWS
-- Cu SECURITY DEFINER pentru a ocoli problema de grants
-- Rulează o singură dată în Supabase SQL Editor
-- =====================================================

-- Sportivi
CREATE OR REPLACE VIEW public.vedere_cluburi_sportivi
WITH (security_invoker = false)
AS
SELECT * FROM public.sportivi
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Grupe
CREATE OR REPLACE VIEW public.vedere_cluburi_grupe
WITH (security_invoker = false)
AS
SELECT * FROM public.grupe
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Plati
CREATE OR REPLACE VIEW public.vedere_cluburi_plati
WITH (security_invoker = false)
AS
SELECT * FROM public.plati
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Tranzactii
CREATE OR REPLACE VIEW public.vedere_cluburi_tranzactii
WITH (security_invoker = false)
AS
SELECT * FROM public.tranzactii
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Evenimente
CREATE OR REPLACE VIEW public.vedere_cluburi_evenimente
WITH (security_invoker = false)
AS
SELECT * FROM public.evenimente
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Rezultate
CREATE OR REPLACE VIEW public.vedere_cluburi_rezultate
WITH (security_invoker = false)
AS
SELECT r.* FROM public.rezultate r
JOIN public.sportivi s ON r.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Sesiuni Examene
CREATE OR REPLACE VIEW public.vedere_cluburi_sesiuni_examene
WITH (security_invoker = false)
AS
SELECT
    s.*,
    (SELECT count(*) FROM public.inscrieri_examene i WHERE i.sesiune_id = s.id) as nr_inscrisi
FROM public.sesiuni_examene s
WHERE s.club_id = public.get_active_club_id() OR s.club_id IS NULL OR public.is_super_admin();

-- Inscrieri Examene
CREATE OR REPLACE VIEW public.vedere_cluburi_inscrieri_examene
WITH (security_invoker = false)
AS
SELECT i.* FROM public.inscrieri_examene i
JOIN public.sportivi s ON i.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Familii
CREATE OR REPLACE VIEW public.vedere_cluburi_familii
WITH (security_invoker = false)
AS
SELECT DISTINCT f.* FROM public.familii f
JOIN public.sportivi s ON s.familie_id = f.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Tipuri Abonament
CREATE OR REPLACE VIEW public.vedere_cluburi_tipuri_abonament
WITH (security_invoker = false)
AS
SELECT * FROM public.tipuri_abonament
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Locatii
CREATE OR REPLACE VIEW public.vedere_cluburi_locatii
WITH (security_invoker = false)
AS
SELECT * FROM public.nom_locatii
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Preturi Config
CREATE OR REPLACE VIEW public.vedere_cluburi_preturi_config
WITH (security_invoker = false)
AS
SELECT * FROM public.preturi_config
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Deconturi Federatie
CREATE OR REPLACE VIEW public.vedere_cluburi_deconturi_federatie
WITH (security_invoker = false)
AS
SELECT * FROM public.deconturi_federatie
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Program Antrenamente
CREATE OR REPLACE VIEW public.vedere_cluburi_program_antrenamente
WITH (security_invoker = false)
AS
SELECT
    pa.*,
    g.denumire as nume_grupa,
    g.sala as sala,
    (SELECT count(*) FROM public.sportivi s WHERE s.grupa_id = g.id) as sportivi_count,
    EXTRACT(EPOCH FROM (pa.ora_sfarsit::time - pa.ora_start::time))/60 as durata_minute,
    CASE EXTRACT(DOW FROM pa.data)
        WHEN 0 THEN 'Duminică'
        WHEN 1 THEN 'Luni'
        WHEN 2 THEN 'Marți'
        WHEN 3 THEN 'Miercuri'
        WHEN 4 THEN 'Joi'
        WHEN 5 THEN 'Vineri'
        WHEN 6 THEN 'Sâmbătă'
    END as ziua_saptamanii
FROM public.program_antrenamente pa
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
WHERE pa.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Anunturi Prezenta
CREATE OR REPLACE VIEW public.vedere_cluburi_anunturi_prezenta
WITH (security_invoker = false)
AS
SELECT * FROM public.anunturi_prezenta
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Vizualizare Plati
CREATE OR REPLACE VIEW public.vedere_cluburi_vizualizare_plati
WITH (security_invoker = false)
AS
SELECT * FROM public.view_plata_sportiv
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- =====================================================
-- GRANTS
-- =====================================================
GRANT SELECT ON public.vedere_cluburi_sportivi              TO authenticated;
GRANT SELECT ON public.vedere_cluburi_grupe                 TO authenticated;
GRANT SELECT ON public.vedere_cluburi_plati                 TO authenticated;
GRANT SELECT ON public.vedere_cluburi_tranzactii            TO authenticated;
GRANT SELECT ON public.vedere_cluburi_evenimente            TO authenticated;
GRANT SELECT ON public.vedere_cluburi_rezultate             TO authenticated;
GRANT SELECT ON public.vedere_cluburi_sesiuni_examene       TO authenticated;
GRANT SELECT ON public.vedere_cluburi_inscrieri_examene     TO authenticated;
GRANT SELECT ON public.vedere_cluburi_familii               TO authenticated;
GRANT SELECT ON public.vedere_cluburi_tipuri_abonament      TO authenticated;
GRANT SELECT ON public.vedere_cluburi_locatii               TO authenticated;
GRANT SELECT ON public.vedere_cluburi_preturi_config        TO authenticated;
GRANT SELECT ON public.vedere_cluburi_deconturi_federatie   TO authenticated;
GRANT SELECT ON public.vedere_cluburi_program_antrenamente  TO authenticated;
GRANT SELECT ON public.vedere_cluburi_anunturi_prezenta     TO authenticated;
GRANT SELECT ON public.vedere_cluburi_vizualizare_plati     TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'vedere_cluburi views recreated with security_invoker=false and grants applied.';
END $$;
