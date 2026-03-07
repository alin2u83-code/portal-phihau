-- 1. Robust function to link User to Sportiv Profile
CREATE OR REPLACE FUNCTION public.link_user_to_sportiv_profile(p_email TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_sportiv_id UUID;
    v_club_id UUID;
    v_rol_sportiv_id UUID;
    v_existing_link_id UUID;
BEGIN
    -- Find User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found in auth.users');
    END IF;

    -- Find Sportiv ID
    SELECT id, club_id INTO v_sportiv_id, v_club_id FROM public.sportivi WHERE email = p_email LIMIT 1;
    IF v_sportiv_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sportiv profile not found');
    END IF;

    -- Get Role ID
    SELECT id INTO v_rol_sportiv_id FROM public.roluri WHERE nume = 'SPORTIV' LIMIT 1;
    IF v_rol_sportiv_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role SPORTIV not found');
    END IF;

    -- Link User ID to Sportiv Profile
    UPDATE public.sportivi 
    SET user_id = v_user_id 
    WHERE id = v_sportiv_id AND (user_id IS NULL OR user_id != v_user_id);

    -- Create or Update Link in utilizator_roluri_multicont
    SELECT id INTO v_existing_link_id 
    FROM public.utilizator_roluri_multicont 
    WHERE user_id = v_user_id AND rol_id = v_rol_sportiv_id AND sportiv_id = v_sportiv_id;

    IF v_existing_link_id IS NOT NULL THEN
        -- Update existing link
        UPDATE public.utilizator_roluri_multicont
        SET club_id = v_club_id,
            rol_denumire = 'SPORTIV',
            nume_utilizator_cache = (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = v_sportiv_id)
        WHERE id = v_existing_link_id;
    ELSE
        -- Insert new link
        -- Ensure is_primary is handled correctly (false if other roles exist)
        INSERT INTO public.utilizator_roluri_multicont (
            user_id, rol_id, sportiv_id, club_id, is_primary, rol_denumire, nume_utilizator_cache
        ) VALUES (
            v_user_id, 
            v_rol_sportiv_id, 
            v_sportiv_id, 
            v_club_id, 
            NOT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont WHERE user_id = v_user_id AND is_primary = true), 
            'SPORTIV', 
            (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = v_sportiv_id)
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Link created successfully', 'user_id', v_user_id, 'sportiv_id', v_sportiv_id);
END;
$$;

-- 2. Improve actualizeaza_nume_sportiv with better validation
CREATE OR REPLACE FUNCTION public.actualizeaza_nume_sportiv(
    p_sportiv_id uuid,
    p_nume_nou text,
    p_prenume_nou text
) RETURNS json AS $$
DECLARE
    v_rol_user text;
    v_club_id_sportiv uuid;
    v_club_id_user uuid;
    v_has_permission boolean := false;
BEGIN
    -- Get sportiv's club
    SELECT club_id INTO v_club_id_sportiv FROM public.sportivi WHERE id = p_sportiv_id;
    IF v_club_id_sportiv IS NULL THEN
        RAISE EXCEPTION 'Sportiv not found';
    END IF;

    -- Check permissions using has_access_to_club or direct role check
    -- We check if the user has ANY role that allows this
    SELECT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont ur
        WHERE ur.user_id = auth.uid()
        AND (
            ur.rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN') OR
            (ur.rol_denumire = 'ADMIN_CLUB' AND ur.club_id = v_club_id_sportiv)
        )
    ) INTO v_has_permission;

    IF v_has_permission THEN
        -- Admin can update directly
        UPDATE public.sportivi 
        SET nume = UPPER(p_nume_nou), 
            prenume = UPPER(p_prenume_nou),
            propunere_modificare = NULL,
            status_aprobare = 'confirmat'
        WHERE id = p_sportiv_id;
        
        RETURN json_build_object('success', true, 'message', 'Modificare aplicată direct');
    END IF;

    -- Check for Instructor permission
    SELECT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont ur
        WHERE ur.user_id = auth.uid()
        AND ur.rol_denumire = 'INSTRUCTOR' AND ur.club_id = v_club_id_sportiv
    ) INTO v_has_permission;

    IF v_has_permission THEN
        -- Instructor submits for approval
        UPDATE public.sportivi 
        SET propunere_modificare = jsonb_build_object('nume', UPPER(p_nume_nou), 'prenume', UPPER(p_prenume_nou)),
            status_aprobare = 'asteptare'
        WHERE id = p_sportiv_id;
        
        RETURN json_build_object('success', true, 'message', 'Modificarea a fost trimisă spre aprobare Adminului de Club');
    END IF;

    RAISE EXCEPTION 'Nu aveți permisiunea de a modifica acest sportiv.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS Policy for Sportivi
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sportiv Own Profile Access" ON public.sportivi;

CREATE POLICY "Sportiv Own Profile Access" ON public.sportivi
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Ensure other policies exist (Staff access)
DROP POLICY IF EXISTS "Staff - Full Access Sportivi" ON public.sportivi;
CREATE POLICY "Staff - Full Access Sportivi" ON public.sportivi
FOR ALL TO authenticated
USING (
    public.has_access_to_club(club_id)
);
