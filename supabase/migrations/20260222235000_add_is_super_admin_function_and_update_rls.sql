-- Function to check if the current user is a SUPER_ADMIN_FEDERATIE
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    _is_super_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM auth.users au
        JOIN public.utilizator_roluri_multicont urm ON au.id = urm.user_id
        JOIN public.roluri r ON urm.rol_id = r.id
        WHERE au.id = auth.uid()
        AND r.nume = 'SUPER_ADMIN_FEDERATIE'
    ) INTO _is_super_admin;

    RETURN _is_super_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for 'plati' table
-- Ensure 'plati' table has RLS enabled: ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can view all plati" ON public.plati;
CREATE POLICY "Super Admins can view all plati"
ON public.plati FOR SELECT
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Instructors and Club Admins can view plati in their club" ON public.plati;
CREATE POLICY "Instructors and Club Admins can view plati in their club"
ON public.plati FOR SELECT
TO authenticated
USING (public.get_active_club_id() = public.get_club_id_from_plata(id));

-- Update RLS policies for 'evenimente' table
-- Ensure 'evenimente' table has RLS enabled: ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can view all evenimente" ON public.evenimente;
CREATE POLICY "Super Admins can view all evenimente"
ON public.evenimente FOR SELECT
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Instructors and Club Admins can view evenimente in their club" ON public.evenimente;
CREATE POLICY "Instructors and Club Admins can view evenimente in their club"
ON public.evenimente FOR SELECT
TO authenticated
USING (public.get_active_club_id() = club_id OR club_id IS NULL);

-- Helper function to get club_id from plati (if not already existing)
-- This is needed for the RLS policy on plati to correctly filter by club_id
CREATE OR REPLACE FUNCTION public.get_club_id_from_plata(plata_row_id UUID)
RETURNS UUID AS $$
DECLARE
    _club_id UUID;
BEGIN
    SELECT s.club_id INTO _club_id
    FROM public.plati p
    LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
    LEFT JOIN public.familii f ON p.familie_id = f.id
    WHERE p.id = plata_row_id;
    RETURN _club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
