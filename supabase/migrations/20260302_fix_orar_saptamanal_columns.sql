-- =================================================================
-- FIX MISSING ZIUA COLUMN IN ORAR_SAPTAMANAL
-- =================================================================
-- This column is used to store the day of the week for training templates.
-- =================================================================

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS ziua TEXT;

-- If it was named differently, we could try to rename it, 
-- but since we don't know, we just ensure it exists.
-- We also ensure other required columns exist.

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS ora_start TIME,
ADD COLUMN IF NOT EXISTS ora_sfarsit TIME,
ADD COLUMN IF NOT EXISTS grupa_id UUID REFERENCES public.grupe(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;

-- Ensure RLS is enabled and policies exist for this table
ALTER TABLE public.orar_saptamanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin - Vizualizare Orar Club" ON public.orar_saptamanal;
CREATE POLICY "Admin - Vizualizare Orar Club" ON public.orar_saptamanal
    FOR SELECT USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Admin - Modificare Orar Club" ON public.orar_saptamanal;
CREATE POLICY "Admin - Modificare Orar Club" ON public.orar_saptamanal
    FOR ALL USING (public.has_access_to_club(club_id));
