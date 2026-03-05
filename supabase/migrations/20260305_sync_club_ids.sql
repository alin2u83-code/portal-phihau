-- Migration to sync club_id in utilizator_roluri_multicont with sportivi table
-- This fixes cases where admins/instructors were incorrectly linked to the wrong club (e.g. Phi Hau)
-- but their sportiv profile correctly points to their actual club.

DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Sincronizare club_id în utilizator_roluri_multicont...';

    -- 1. Update club_id based on sportiv_id link
    UPDATE public.utilizator_roluri_multicont urm
    SET club_id = s.club_id
    FROM public.sportivi s
    WHERE urm.sportiv_id = s.id 
    AND urm.club_id != s.club_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'S-au actualizat % înregistrări în utilizator_roluri_multicont bazat pe sportiv_id.', v_count;

    -- 2. Update club_id based on user_id link (for cases where sportiv_id might be null but user_id is linked to a sportiv)
    UPDATE public.utilizator_roluri_multicont urm
    SET club_id = s.club_id
    FROM public.sportivi s
    WHERE urm.user_id = s.user_id 
    AND urm.sportiv_id IS NULL
    AND urm.club_id != s.club_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'S-au actualizat % înregistrări în utilizator_roluri_multicont bazat pe user_id.', v_count;

END $$;
