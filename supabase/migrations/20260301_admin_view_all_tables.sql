-- =================================================================
-- 1. CURĂȚARE DEPENDENȚE REZIDUALE (Fix eroare 42501)
-- =================================================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Ștergem ORICE politică de pe tabelele cheie care ar putea conține referințe vechi
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('program_antrenamente', 'prezenta_antrenament', 'sportivi', 'utilizator_roluri_multicont')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- =================================================================
-- 2. RECREARE FUNCȚIE HELPER (Security Definer este CRUCIAL)
-- =================================================================
-- Folosim SECURITY DEFINER pentru ca funcția să poată citi tabelele de sistem 
-- chiar și atunci când utilizatorul are drepturi limitate RLS.
CREATE OR REPLACE FUNCTION public.has_access_to_club(target_club_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    is_allowed BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE'
            OR (
                rol_denumire IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR') 
                AND club_id = target_club_id
            )
        )
    ) INTO is_allowed;
    
    RETURN COALESCE(is_allowed, FALSE);
END;
$$;

-- =================================================================
-- 3. REFACTORIZARE POLITICI (TABELE CU club_id)
-- =================================================================

-- SPORTIVI
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Sportivi" ON public.sportivi
    FOR SELECT TO authenticated USING (public.has_access_to_club(club_id));

-- PROGRAM ANTRENAMENTE
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Program" ON public.program_antrenamente
    FOR SELECT TO authenticated USING (public.has_access_to_club(club_id));

-- GRUPE
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Grupe" ON public.grupe
    FOR SELECT TO authenticated USING (public.has_access_to_club(club_id));

-- =================================================================
-- 4. REFACTORIZARE POLITICI (TABELE LINKATE PRIN sportiv_id)
-- =================================================================

-- PREZENTA ANTRENAMENT (Aici apărea eroarea de obicei)
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Prezenta" ON public.prezenta_antrenament
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = prezenta_antrenament.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- ANUNTURI PREZENTA
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Anunturi" ON public.anunturi_prezenta
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = anunturi_prezenta.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- =================================================================
-- 5. ACCES PENTRU PROPRIUL PROFIL (Sportivi)
-- =================================================================
-- Permitem sportivilor să își vadă propriile date, indiferent de club
CREATE POLICY "Sportiv_Select_Own_Data" ON public.sportivi
    FOR SELECT TO authenticated USING (
        id IN (
            SELECT sportiv_id FROM public.utilizator_roluri_multicont 
            WHERE user_id = auth.uid()
        )
    );