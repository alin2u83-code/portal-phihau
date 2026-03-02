-- Migration to ensure RLS is enabled and policies are correct for program_antrenamente
-- based on the table structure provided by the user.

-- 1. Enable RLS
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Management Antrenamente Club" ON public.program_antrenamente;

-- 3. Create Select Policy (Vizualizare)
-- Permite vizualizarea antrenamentelor pentru clubul utilizatorului
CREATE POLICY "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente
    FOR SELECT USING (
        club_id IS NULL -- Antrenamentele globale (dacă există) sunt vizibile
        OR public.has_access_to_club(club_id)
    );

-- 4. Create Management Policy (INSERT, UPDATE, DELETE)
-- Permite managementul antrenamentelor pentru Admin/Instructor din același club
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
