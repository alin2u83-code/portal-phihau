-- =============================================================================
-- Migration: add_decont_sportivi.sql
-- Subiect: Tabel junction decont_sportivi — leagă deconturi de sportivii acoperiți
-- Pattern RLS: utilizator_roluri_multicont (identic cu REFACTOR_VIZE_FEDERALE.sql)
-- Rulare manuală în Supabase SQL Editor
-- =============================================================================

-- Tabel junction: leagă un decont de federație de sportivii acoperiți
CREATE TABLE IF NOT EXISTS public.decont_sportivi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decont_id UUID NOT NULL REFERENCES public.deconturi_federatie(id) ON DELETE CASCADE,
    sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE RESTRICT,
    an INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(decont_id, sportiv_id)
);

ALTER TABLE public.decont_sportivi ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_decont_sportivi_decont ON public.decont_sportivi(decont_id);
CREATE INDEX IF NOT EXISTS idx_decont_sportivi_sportiv_an ON public.decont_sportivi(sportiv_id, an);

-- -------------------------------------------------------------------------
-- RLS Policies — același pattern ca REFACTOR_VIZE_FEDERALE.sql
-- Funcții folosite: utilizator_roluri_multicont.rol_nume și club_id
-- -------------------------------------------------------------------------

-- Policy 1: SUPER_ADMIN_FEDERATIE — acces total
DROP POLICY IF EXISTS "Federatie - Full Access Decont Sportivi" ON public.decont_sportivi;
CREATE POLICY "Federatie - Full Access Decont Sportivi"
    ON public.decont_sportivi
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
              AND rol_nume = 'SUPER_ADMIN_FEDERATIE'
        )
    );

-- Policy 2: ADMIN_CLUB — vede și gestionează sportivii propriului club
DROP POLICY IF EXISTS "Club - Manage Decont Sportivi" ON public.decont_sportivi;
CREATE POLICY "Club - Manage Decont Sportivi"
    ON public.decont_sportivi
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.sportivi s
            WHERE s.id = decont_sportivi.sportiv_id
              AND s.club_id = (
                  SELECT club_id
                  FROM public.utilizator_roluri_multicont
                  WHERE user_id = auth.uid()
                  LIMIT 1
              )
        )
    );
