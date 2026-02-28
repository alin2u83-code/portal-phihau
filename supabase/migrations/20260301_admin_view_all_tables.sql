-- =================================================================
-- REFACTORIZARE VIZUALIZARE ADMINISTRATORI (ALL TABLES)
-- =================================================================
-- Acest script asigură că administratorii (Super Admin, Admin Club, Instructor)
-- au drepturi de VIZUALIZARE (SELECT) pe toate tabelele relevante,
-- respectând segregarea datelor pe bază de club_id.
-- =================================================================

-- Funcție helper pentru a verifica accesul la un club specific
-- (Utilizată pentru a simplifica politicile)
CREATE OR REPLACE FUNCTION public.has_access_to_club(target_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE' -- Super Admin vede tot
            OR (
                rol_denumire IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR') 
                AND club_id = target_club_id
            )
        )
    );
$$;

-- =================================================================
-- 1. TABELE CU COLOANA 'club_id'
-- =================================================================
-- Lista: sportivi, grupe, program_antrenamente, sesiuni_examene, evenimente, tipuri_abonament

-- A. SPORTIVI
DROP POLICY IF EXISTS "Admin - Vizualizare Sportivi Club" ON public.sportivi;
CREATE POLICY "Admin - Vizualizare Sportivi Club" ON public.sportivi
    FOR SELECT USING (public.has_access_to_club(club_id));

-- B. GRUPE
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Grupe Club" ON public.grupe;
CREATE POLICY "Admin - Vizualizare Grupe Club" ON public.grupe
    FOR SELECT USING (public.has_access_to_club(club_id));

-- C. PROGRAM ANTRENAMENTE
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
CREATE POLICY "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente
    FOR SELECT USING (public.has_access_to_club(club_id));

-- D. SESIUNI EXAMENE
DROP POLICY IF EXISTS "Admin - Vizualizare Sesiuni Club" ON public.sesiuni_examene;
CREATE POLICY "Admin - Vizualizare Sesiuni Club" ON public.sesiuni_examene
    FOR SELECT USING (
        club_id IS NULL -- Sesiunile naționale/fără club sunt vizibile
        OR public.has_access_to_club(club_id)
    );

-- E. EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Evenimente Club" ON public.evenimente;
CREATE POLICY "Admin - Vizualizare Evenimente Club" ON public.evenimente
    FOR SELECT USING (
        club_id IS NULL 
        OR public.has_access_to_club(club_id)
    );

-- F. TIPURI ABONAMENT
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Tipuri Abonament Club" ON public.tipuri_abonament;
CREATE POLICY "Admin - Vizualizare Tipuri Abonament Club" ON public.tipuri_abonament
    FOR SELECT USING (public.has_access_to_club(club_id));

-- =================================================================
-- 2. TABELE LINKATE PRIN 'sportiv_id'
-- =================================================================
-- Lista: inscrieri_examene, istoric_grade, rezultate, prezenta_antrenament, anunturi_prezenta

-- A. INSCRIERI EXAMENE
DROP POLICY IF EXISTS "Admin - Vizualizare Inscrieri Club" ON public.inscrieri_examene;
CREATE POLICY "Admin - Vizualizare Inscrieri Club" ON public.inscrieri_examene
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = inscrieri_examene.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- B. ISTORIC GRADE
DROP POLICY IF EXISTS "Admin - Vizualizare Istoric Grade Club" ON public.istoric_grade;
CREATE POLICY "Admin - Vizualizare Istoric Grade Club" ON public.istoric_grade
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = istoric_grade.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- C. REZULTATE
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Rezultate Club" ON public.rezultate;
CREATE POLICY "Admin - Vizualizare Rezultate Club" ON public.rezultate
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = rezultate.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- D. PREZENTA ANTRENAMENT
DROP POLICY IF EXISTS "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament;
CREATE POLICY "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = prezenta_antrenament.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- E. ANUNTURI PREZENTA
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Anunturi Club" ON public.anunturi_prezenta;
CREATE POLICY "Admin - Vizualizare Anunturi Club" ON public.anunturi_prezenta
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = anunturi_prezenta.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- =================================================================
-- 3. TABELE SPECIALE
-- =================================================================

-- A. FAMILII (Linkate prin sportivii membri)
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Familii Club" ON public.familii;
CREATE POLICY "Admin - Vizualizare Familii Club" ON public.familii
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.familie_id = familii.id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- B. CLUBURI (Vizualizare propriul club)
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin - Vizualizare Club Propriu" ON public.cluburi;
CREATE POLICY "Admin - Vizualizare Club Propriu" ON public.cluburi
    FOR SELECT USING (public.has_access_to_club(id));

-- =================================================================
-- NOTĂ: Tabelele financiare (plati, tranzactii) sunt deja gestionate
-- de scriptul anterior (20260301_fix_financial_rls.sql) care oferă
-- drepturi complete (ALL) pentru Staff Club. Nu le suprascriem aici
-- pentru a nu pierde drepturile de scriere (INSERT/UPDATE/DELETE).
-- =================================================================
