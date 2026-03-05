-- Pasul 1: Ștergem funcția veche
DROP FUNCTION IF EXISTS public.get_user_auth_context();

-- Pasul 2: Creăm funcția cu noua logică (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_auth_context()
RETURNS TABLE(
    id uuid, 
    email text, 
    is_admin boolean, 
    roluri text[], 
    club_id uuid, 
    sportiv_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont 
            WHERE user_id = au.id AND UPPER(rol_denumire) IN ('ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
        ) as is_admin,
        ARRAY(
            SELECT UPPER(rol_denumire) FROM public.utilizator_roluri_multicont WHERE user_id = au.id
        ) as roluri,
        (SELECT urm.club_id FROM public.utilizator_roluri_multicont urm WHERE urm.user_id = au.id AND urm.is_primary = true LIMIT 1),
        (SELECT urm.sportiv_id FROM public.utilizator_roluri_multicont urm WHERE urm.user_id = au.id AND urm.is_primary = true LIMIT 1)
    FROM auth.users au
    WHERE au.id = auth.uid();
END;
$$;

-- Pasul 3: Functia get_user_login_data_v2
CREATE OR REPLACE FUNCTION public.get_user_login_data_v2()
RETURNS TABLE(user_id uuid, email varchar, sportiv_id uuid, nume text, prenume text, club_id uuid, rol_activ_context text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::varchar,
        s.id as sportiv_id,
        s.nume::text,
        s.prenume::text,
        s.club_id,
        urm.rol_denumire::text as rol_activ_context,
        urm.is_primary
    FROM auth.users au
    JOIN public.sportivi s ON au.id = s.user_id
    JOIN public.utilizator_roluri_multicont urm ON au.id = urm.user_id
    WHERE au.id = auth.uid()
    ORDER BY urm.is_primary DESC
    LIMIT 1;
END;
$$;

-- Pasul 4: Recreare politici RLS pentru program_antrenamente si prezenta_antrenament
-- Stergem politicile vechi
DROP POLICY IF EXISTS "Admin Club Full Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Instructor Read Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Sportiv Read Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Management Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Full Access Antrenamente" ON public.program_antrenamente;

DROP POLICY IF EXISTS "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Staff - Management Prezenta Club" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Staff - Full Access Prezenta" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Sportiv - View Own Prezenta" ON public.prezenta_antrenament;

-- Recream politicile pentru program_antrenamente
CREATE POLICY "Admin Club - Full Access Antrenamente" ON public.program_antrenamente
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'ADMIN_CLUB'
        AND club_id = public.program_antrenamente.club_id
    )
);

CREATE POLICY "Instructor - Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'INSTRUCTOR'
        AND club_id = public.program_antrenamente.club_id
    )
);

CREATE POLICY "Sportiv - Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SPORTIV'
        AND club_id = public.program_antrenamente.club_id
    )
);

-- Recream politicile pentru prezenta_antrenament
CREATE POLICY "Admin Club - Full Access Prezenta" ON public.prezenta_antrenament
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.program_antrenamente a
        JOIN public.utilizator_roluri_multicont urm ON urm.club_id = a.club_id
        WHERE a.id = prezenta_antrenament.antrenament_id
        AND urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
    )
);

CREATE POLICY "Instructor - Management Prezenta" ON public.prezenta_antrenament
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.program_antrenamente a
        JOIN public.utilizator_roluri_multicont urm ON urm.club_id = a.club_id
        WHERE a.id = prezenta_antrenament.antrenament_id
        AND urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
    )
);

CREATE POLICY "Sportiv - View Own Prezenta" ON public.prezenta_antrenament
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.sportiv_id = prezenta_antrenament.sportiv_id
    )
);
