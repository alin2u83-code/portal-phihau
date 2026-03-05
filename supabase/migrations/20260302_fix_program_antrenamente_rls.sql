-- 0. Definim sau actualizăm funcția helper has_access_to_club 
-- Aceasta este "motorul" politicilor tale și trebuie să fie SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_access_to_club(target_club_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER -- Permite citirea din tabele protejate
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid() 
        AND club_id = target_club_id
        AND rol_denumire IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
    );
END;
$$;

-- 1. Enable RLS
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Management Antrenamente Club" ON public.program_antrenamente;

-- 3. Create Select Policy (Vizualizare)
CREATE POLICY "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente
    FOR SELECT USING (
        club_id IS NULL 
        OR public.has_access_to_club(club_id)
    );

-- 4. Create Management Policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Staff - Management Antrenamente Club" ON public.program_antrenamente
    FOR ALL USING (
        public.has_access_to_club(club_id)
    ) WITH CHECK (
        public.has_access_to_club(club_id)
    );

-- 5. Ensure prezenta_antrenament also has RLS and policies
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament;
CREATE POLICY "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.program_antrenamente a
            WHERE a.id = prezenta_antrenament.antrenament_id
            AND public.has_access_to_club(a.club_id)
        )
    );

DROP POLICY IF EXISTS "Staff - Management Prezenta Club" ON public.prezenta_antrenament;
CREATE POLICY "Staff - Management Prezenta Club" ON public.prezenta_antrenament
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.program_antrenamente a
            WHERE a.id = prezenta_antrenament.antrenament_id
            AND public.has_access_to_club(a.club_id)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.program_antrenamente a
            WHERE a.id = prezenta_antrenament.antrenament_id
            AND public.has_access_to_club(a.club_id)
        )
    );