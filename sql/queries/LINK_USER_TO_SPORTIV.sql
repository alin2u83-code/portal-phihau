-- Script pentru a lega contul de login (alin2u83@gmail.com) de un profil de sportiv

DO $$
DECLARE
    v_user_id uuid := 'f69fe240-32cb-45f1-a2a9-47ce27426712'; -- ID-ul tău din auth.users
    v_sportiv_id uuid;
    v_club_id uuid;
BEGIN
    -- 1. Verificăm dacă există deja un sportiv cu acest user_id
    SELECT id, club_id INTO v_sportiv_id, v_club_id 
    FROM public.sportivi 
    WHERE user_id = v_user_id 
    LIMIT 1;

    -- 2. Dacă nu există un sportiv legat de acest user_id, căutăm după email sau nume
    IF v_sportiv_id IS NULL THEN
        SELECT id, club_id INTO v_sportiv_id, v_club_id 
        FROM public.sportivi 
        WHERE email = 'alin2u83@gmail.com'
        LIMIT 1;
        
        -- Dacă am găsit după email, actualizăm user_id-ul
        IF v_sportiv_id IS NOT NULL THEN
            UPDATE public.sportivi 
            SET user_id = v_user_id 
            WHERE id = v_sportiv_id;
        END IF;
    END IF;

    -- 3. Dacă tot nu există, creăm un profil de sportiv de test pentru tine
    IF v_sportiv_id IS NULL THEN
        -- Luăm primul club disponibil din baza de date pentru a-l asocia
        SELECT id INTO v_club_id FROM public.cluburi LIMIT 1;
        
        INSERT INTO public.sportivi (
            user_id, nume, prenume, email, data_nasterii, data_inscrierii, status, club_id, gen
        ) VALUES (
            v_user_id, 'Alin', 'Test', 'alin2u83@gmail.com', '1990-01-01', CURRENT_DATE, 'Activ', v_club_id, 'Masculin'
        ) RETURNING id INTO v_sportiv_id;
    END IF;

    -- 4. Acum că avem sigur un sportiv_id, verificăm dacă există rolul în utilizator_roluri_multicont
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = v_user_id AND rol_denumire = 'SPORTIV' AND sportiv_id = v_sportiv_id
    ) THEN
        -- Inserăm rolul de SPORTIV
        INSERT INTO public.utilizator_roluri_multicont (
            user_id, rol_denumire, club_id, sportiv_id, is_primary, nume_utilizator_cache
        ) VALUES (
            v_user_id, 'SPORTIV', v_club_id, v_sportiv_id, true, 'Alin Test'
        );
    END IF;

    -- 5. (Opțional) Dacă vrei să fii și SUPER_ADMIN_FEDERATIE, decomentează blocul de mai jos
    /*
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = v_user_id AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    ) THEN
        INSERT INTO public.utilizator_roluri_multicont (
            user_id, rol_denumire, is_primary, nume_utilizator_cache
        ) VALUES (
            v_user_id, 'SUPER_ADMIN_FEDERATIE', false, 'Alin Admin'
        );
    END IF;
    */

END $$;
