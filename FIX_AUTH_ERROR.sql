-- FIX_AUTH_ERROR.sql

-- 1. Ștergem trigger-ul automat de pe auth.users care cauzează eroarea "Database error saving new user".
-- Acest trigger intră în conflict cu logica noastră explicită de creare a conturilor (refactor_create_user_account).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Ne asigurăm că funcția RPC pentru crearea conturilor este definită corect și actualizată.
CREATE OR REPLACE FUNCTION public.refactor_create_user_account(
    p_nume TEXT,
    p_prenume TEXT,
    p_email TEXT,
    p_username TEXT,
    p_club_id UUID,
    p_roles TEXT[], -- ex: ['SPORTIV', 'INSTRUCTOR']
    p_user_id UUID DEFAULT NULL, -- ID-ul din auth.users (dacă există deja)
    p_additional_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sportiv_id UUID;
    v_role_name TEXT;
    v_existing_id UUID;
BEGIN
    -- 1. Verificăm dacă există deja un sportiv cu acest email
    SELECT id INTO v_existing_id FROM public.sportivi WHERE email = p_email;

    IF v_existing_id IS NOT NULL THEN
        -- Actualizăm sportivul existent
        UPDATE public.sportivi
        SET 
            nume = COALESCE(p_nume, nume),
            prenume = COALESCE(p_prenume, prenume),
            username = COALESCE(p_username, username),
            user_id = COALESCE(p_user_id, user_id),
            club_id = COALESCE(p_club_id, club_id)
        WHERE id = v_existing_id;
        
        v_sportiv_id := v_existing_id;
    ELSE
        -- Creăm un sportiv nou
        INSERT INTO public.sportivi (
            nume,
            prenume,
            email,
            username,
            club_id,
            user_id,
            data_nasterii,
            status,
            data_inscrierii,
            cnp,
            gen,
            telefon,
            adresa,
            grad_actual_id,
            grupa_id
        ) VALUES (
            p_nume,
            p_prenume,
            p_email,
            p_username,
            p_club_id,
            p_user_id,
            COALESCE((p_additional_data->>'data_nasterii')::DATE, '1900-01-01'::DATE),
            'Activ',
            CURRENT_DATE,
            p_additional_data->>'cnp',
            COALESCE(p_additional_data->>'gen', 'Masculin'),
            p_additional_data->>'telefon',
            p_additional_data->>'adresa',
            (p_additional_data->>'grad_actual_id')::UUID,
            (p_additional_data->>'grupa_id')::UUID
        )
        RETURNING id INTO v_sportiv_id;
    END IF;

    -- 2. Gestionăm rolurile
    -- Ștergem rolurile vechi pentru acest sportiv pentru a asigura consistența
    DELETE FROM public.utilizator_roluri_multicont WHERE sportiv_id = v_sportiv_id;

    -- Inserăm noile roluri
    FOREACH v_role_name IN ARRAY p_roles
    LOOP
        INSERT INTO public.utilizator_roluri_multicont (
            user_id,
            sportiv_id,
            club_id,
            rol_denumire,
            is_primary
        ) VALUES (
            p_user_id,
            v_sportiv_id,
            p_club_id,
            v_role_name,
            (v_role_name = 'SPORTIV')
        );
    END LOOP;

    RETURN v_sportiv_id;
END;
$$;

-- 3. Trigger pentru sincronizarea automată a metadatelor (pentru multi-rol)
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizăm raw_user_meta_data în auth.users dacă există un user_id
  IF NEW.user_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('has_multiple_roles', true)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_change_sync_metadata ON public.utilizator_roluri_multicont;
CREATE TRIGGER on_role_change_sync_metadata
AFTER INSERT OR UPDATE ON public.utilizator_roluri_multicont
FOR EACH ROW EXECUTE FUNCTION public.sync_user_metadata();
