-- Migration: Implement Protocol "VEDERE CLUBURI"
-- This migration creates the get_active_club_id function and the corresponding views

-- 1. Function to get the active club ID from the user's primary context
CREATE OR REPLACE FUNCTION public.get_active_club_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT club_id 
    FROM public.utilizator_roluri_multicont 
    WHERE user_id = auth.uid() 
    AND is_primary = true 
    LIMIT 1;
$$;

-- 2. Views for automatic filtering by club_id

-- Sportivi
CREATE OR REPLACE VIEW public.vedere_cluburi_sportivi AS
SELECT * FROM public.sportivi
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Grupe
CREATE OR REPLACE VIEW public.vedere_cluburi_grupe AS
SELECT * FROM public.grupe
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Plati
CREATE OR REPLACE VIEW public.vedere_cluburi_plati AS
SELECT * FROM public.plati
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Tranzactii
CREATE OR REPLACE VIEW public.vedere_cluburi_tranzactii AS
SELECT * FROM public.tranzactii
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Evenimente (including federation events)
CREATE OR REPLACE VIEW public.vedere_cluburi_evenimente AS
SELECT * FROM public.evenimente
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Rezultate (linked to evenimente or sportivi)
CREATE OR REPLACE VIEW public.vedere_cluburi_rezultate AS
SELECT r.* FROM public.rezultate r
JOIN public.sportivi s ON r.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Sesiuni Examene
CREATE OR REPLACE VIEW public.vedere_cluburi_sesiuni_examene AS
SELECT * FROM public.sesiuni_examene
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Inscrieri Examene
CREATE OR REPLACE VIEW public.vedere_cluburi_inscrieri_examene AS
SELECT i.* FROM public.inscrieri_examene i
JOIN public.sportivi s ON i.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Familii
CREATE OR REPLACE VIEW public.vedere_cluburi_familii AS
SELECT DISTINCT f.* FROM public.familii f
JOIN public.sportivi s ON s.familie_id = f.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Tipuri Abonament
CREATE OR REPLACE VIEW public.vedere_cluburi_tipuri_abonament AS
SELECT * FROM public.tipuri_abonament
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Locatii
CREATE OR REPLACE VIEW public.vedere_cluburi_locatii AS
SELECT * FROM public.nom_locatii
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Preturi Config
CREATE OR REPLACE VIEW public.vedere_cluburi_preturi_config AS
SELECT * FROM public.preturi_config
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Deconturi Federatie
CREATE OR REPLACE VIEW public.vedere_cluburi_deconturi_federatie AS
SELECT * FROM public.deconturi_federatie
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Program Antrenamente
-- 1. Add tip_antrenament column to the base table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='program_antrenamente' AND column_name='tip_antrenament') THEN
        ALTER TABLE public.program_antrenamente ADD COLUMN tip_antrenament TEXT DEFAULT 'regular' CHECK (tip_antrenament IN ('regular', 'stagiu', 'examen'));
    END IF;
END $$;

-- 2. Create the enhanced view for the new component
CREATE OR REPLACE VIEW public.vedere_cluburi_program_antrenamente AS
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
CREATE OR REPLACE VIEW public.vedere_cluburi_anunturi_prezenta AS
SELECT * FROM public.anunturi_prezenta
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Vizualizare Plati (based on view_plata_sportiv)
CREATE OR REPLACE VIEW public.vedere_cluburi_vizualizare_plati AS
SELECT * FROM public.view_plata_sportiv
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Istoric Plati Detaliat (based on view_istoric_plati_detaliat)
CREATE OR REPLACE VIEW public.vedere_cluburi_istoric_plati_detaliat AS
SELECT * FROM public.view_istoric_plati_detaliat
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Balanta Club (if exists)
-- CREATE OR REPLACE VIEW public.vedere_cluburi_balanta_club AS
-- SELECT * FROM public.balanta_club
-- WHERE club_id = public.get_active_club_id() OR public.is_super_admin();
