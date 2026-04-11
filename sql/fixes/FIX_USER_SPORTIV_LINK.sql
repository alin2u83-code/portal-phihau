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

-- Example usage:
-- SELECT public.link_user_to_sportiv_profile('email@example.com');
