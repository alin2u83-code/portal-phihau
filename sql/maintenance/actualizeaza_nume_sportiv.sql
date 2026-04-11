CREATE OR REPLACE FUNCTION public.actualizeaza_nume_sportiv(
    p_sportiv_id uuid,
    p_nume_nou text,
    p_prenume_nou text
) RETURNS json AS $$
DECLARE
    v_rol_user text;
    v_club_id_sportiv uuid;
    v_club_id_user uuid;
BEGIN
    -- 1. Identificăm rolul și clubul celui care face modificarea
    SELECT r.nume, ur.club_id INTO v_rol_user, v_club_id_user
    FROM public.utilizator_roluri_multicont ur
    JOIN public.roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = auth.uid() LIMIT 1;

    SELECT club_id INTO v_club_id_sportiv FROM public.sportivi WHERE id = p_sportiv_id;

    -- 2. Logica de permisiuni
    IF v_rol_user IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN_GENERAL') OR 
       (v_rol_user = 'ADMIN_CLUB' AND v_club_id_user = v_club_id_sportiv) THEN
        
        -- Adminul poate modifica direct
        UPDATE public.sportivi 
        SET nume = UPPER(p_nume_nou), 
            prenume = UPPER(p_prenume_nou),
            propunere_modificare = NULL,
            status_aprobare = 'confirmat'
        WHERE id = p_sportiv_id;
        
        RETURN json_build_object('success', true, 'message', 'Modificare aplicată direct');

    ELSIF v_rol_user = 'INSTRUCTOR' AND v_club_id_user = v_club_id_sportiv THEN
        
        -- Instructorul trimite spre aprobare
        UPDATE public.sportivi 
        SET propunere_modificare = jsonb_build_object('nume', UPPER(p_nume_nou), 'prenume', UPPER(p_prenume_nou)),
            status_aprobare = 'asteptare'
        WHERE id = p_sportiv_id;
        
        RETURN json_build_object('success', true, 'message', 'Modificarea a fost trimisă spre aprobare Adminului de Club');

    ELSE
        RAISE EXCEPTION 'Nu aveți permisiunea de a modifica acest sportiv.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
