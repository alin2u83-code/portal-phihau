-- Enable RLS on tables
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- TABELA: SPORTIVI
-- =================================================================

-- 1. ADMIN_CLUB: Acces total (ALL) dacă club_id se potrivește
DROP POLICY IF EXISTS "Admin Club Full Access Sportivi" ON public.sportivi;
CREATE POLICY "Admin Club Full Access Sportivi" ON public.sportivi
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.sportivi.club_id
    )
);

-- 2. INSTRUCTOR: Acces de citire (SELECT) la toți sportivii din clubul său
DROP POLICY IF EXISTS "Instructor Read Access Sportivi" ON public.sportivi;
CREATE POLICY "Instructor Read Access Sportivi" ON public.sportivi
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
        AND urm.club_id = public.sportivi.club_id
    )
);

-- 3. SPORTIV: Acces doar la propriile date (UID match)
DROP POLICY IF EXISTS "Sportiv Own Profile Access" ON public.sportivi;
CREATE POLICY "Sportiv Own Profile Access" ON public.sportivi
FOR ALL
USING (
    user_id = auth.uid()
);

-- =================================================================
-- TABELA: PLATI
-- =================================================================

-- 1. ADMIN_CLUB: Acces total (ALL) dacă club_id se potrivește
DROP POLICY IF EXISTS "Admin Club Full Access Plati" ON public.plati;
CREATE POLICY "Admin Club Full Access Plati" ON public.plati
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.plati.club_id
    )
);

-- 2. SPORTIV: Acces doar la propriile date (prin sportiv_id legat de user_id)
DROP POLICY IF EXISTS "Sportiv Own Payments Access" ON public.plati;
CREATE POLICY "Sportiv Own Payments Access" ON public.plati
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = public.plati.sportiv_id
        AND s.user_id = auth.uid()
    )
);

-- =================================================================
-- TABELA: PROGRAM_ANTRENAMENTE
-- =================================================================

-- 1. ADMIN_CLUB: Acces total (ALL) dacă club_id se potrivește
DROP POLICY IF EXISTS "Admin Club Full Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Admin Club Full Access Antrenamente" ON public.program_antrenamente
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

-- 2. INSTRUCTOR: Acces de citire (SELECT) la antrenamentele din clubul său
DROP POLICY IF EXISTS "Instructor Read Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Instructor Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

-- 3. SPORTIV: Acces de citire (SELECT) la antrenamentele din clubul său
DROP POLICY IF EXISTS "Sportiv Read Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Sportiv Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'SPORTIV'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);