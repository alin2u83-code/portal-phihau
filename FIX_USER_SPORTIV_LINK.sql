-- Script to link a user to a sportiv profile
-- Replace 'USER_ID' with the actual user UUID from auth.users
-- Replace 'SPORTIV_ID' with the actual sportiv UUID from public.sportivi

-- 1. Check if the user exists in auth.users
-- 2. Check if the sportiv exists in public.sportivi
-- 3. Create the link in public.utilizator_roluri_multicont

DO $$
DECLARE
    v_user_id UUID := auth.uid(); -- If running as the user, or replace with '...'::uuid
    v_sportiv_id UUID := '337c41e3-67d2-4aef-953e-b5fe190b0748'; -- Example sportiv ID from logs
    v_rol_id UUID;
    v_club_id UUID;
BEGIN
    -- Get the SPORTIV role ID
    SELECT id INTO v_rol_id FROM public.roluri WHERE nume = 'SPORTIV' LIMIT 1;
    
    -- Get the club ID from the sportiv profile
    SELECT club_id INTO v_club_id FROM public.sportivi WHERE id = v_sportiv_id;

    IF v_rol_id IS NULL THEN
        RAISE EXCEPTION 'Role SPORTIV not found';
    END IF;

    IF v_club_id IS NULL THEN
        RAISE EXCEPTION 'Sportiv not found or has no club';
    END IF;

    -- Upsert the link
    INSERT INTO public.utilizator_roluri_multicont (user_id, rol_id, sportiv_id, club_id, is_primary, rol_denumire)
    VALUES (v_user_id, v_rol_id, v_sportiv_id, v_club_id, true, 'SPORTIV')
    ON CONFLICT (user_id, rol_id, sportiv_id, club_id) 
    DO UPDATE SET is_primary = true, rol_denumire = 'SPORTIV';

    RAISE NOTICE 'Linked user % to sportiv % in club %', v_user_id, v_sportiv_id, v_club_id;
END $$;
