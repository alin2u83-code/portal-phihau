-- Script pentru configurarea RLS pe tabelele plati și tranzactii

-- 0. Creăm funcția de acces dacă nu există
CREATE OR REPLACE FUNCTION public.has_access_to_club(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN') -- Admini globali
            OR (club_id = p_club_id AND rol_denumire = 'ADMIN_CLUB') -- Admin local
            OR (club_id = p_club_id AND rol_denumire = 'INSTRUCTOR') -- Instructor local
        )
    );
END;
$$;

DO $$
BEGIN
    -- 1. Activăm RLS pe tabele (în caz că nu este deja activat)
    ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;

    -- 2. Ștergem politicile vechi pentru a evita duplicatele
    DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;
    DROP POLICY IF EXISTS "Sportiv - View Own Plati" ON public.plati;
    DROP POLICY IF EXISTS "Staff - Full Access Tranzactii" ON public.tranzactii;
    DROP POLICY IF EXISTS "Sportiv - View Own Tranzactii" ON public.tranzactii;

    -- 3. Politici pentru PLATI
    
    -- Adminii (Super Admin, Admin Club, Instructor) au acces complet (CRUD) pe baza clubului
    CREATE POLICY "Staff - Full Access Plati" ON public.plati
    FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

    -- Sportivii pot vedea (SELECT) doar plățile lor sau ale familiei lor
    CREATE POLICY "Sportiv - View Own Plati" ON public.plati
    FOR SELECT TO authenticated USING (
        sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
        OR familie_id IN (
            SELECT s.familie_id 
            FROM public.sportivi s
            JOIN public.utilizator_roluri_multicont urm ON urm.sportiv_id = s.id
            WHERE urm.user_id = auth.uid() AND s.familie_id IS NOT NULL
        )
    );

    -- 4. Politici pentru TRANZACTII
    
    -- Adminii (Super Admin, Admin Club, Instructor) au acces complet (CRUD) pe baza clubului
    CREATE POLICY "Staff - Full Access Tranzactii" ON public.tranzactii
    FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

    -- Sportivii pot vedea (SELECT) doar tranzacțiile lor sau ale familiei lor
    CREATE POLICY "Sportiv - View Own Tranzactii" ON public.tranzactii
    FOR SELECT TO authenticated USING (
        sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
        OR familie_id IN (
            SELECT s.familie_id 
            FROM public.sportivi s
            JOIN public.utilizator_roluri_multicont urm ON urm.sportiv_id = s.id
            WHERE urm.user_id = auth.uid() AND s.familie_id IS NOT NULL
        )
    );

END $$;
