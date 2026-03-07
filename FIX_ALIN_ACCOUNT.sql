-- Script special pentru alin2u83@gmail.com
-- Acest script asigură că utilizatorul are ambele roluri (Admin și Sportiv)
-- și că profilul de sportiv este corect legat.

DO $$
DECLARE
    v_user_id uuid;
    v_sportiv_id uuid;
    v_club_id uuid;
    v_rol_sportiv_id uuid;
    v_rol_admin_id uuid;
BEGIN
    -- 1. Găsim user_id-ul pentru alin2u83@gmail.com în auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'alin2u83@gmail.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User alin2u83@gmail.com nu a fost găsit în auth.users. Verifică dacă emailul este corect.';
        RETURN;
    END IF;

    -- 2. Găsim sportiv_id-ul pentru alin2u83@gmail.com în public.sportivi
    SELECT id, club_id INTO v_sportiv_id, v_club_id FROM public.sportivi WHERE email = 'alin2u83@gmail.com' LIMIT 1;
    
    -- 3. Găsim ID-urile rolurilor
    SELECT id INTO v_rol_sportiv_id FROM public.roluri WHERE nume = 'SPORTIV' LIMIT 1;
    SELECT id INTO v_rol_admin_id FROM public.roluri WHERE nume = 'SUPER_ADMIN_FEDERATIE' LIMIT 1;

    -- 4. Asigurăm rolul de SUPER_ADMIN_FEDERATIE
    -- Mai întâi resetăm is_primary pentru toate rolurile acestui utilizator pentru a evita conflictul de unicitate
    UPDATE public.utilizator_roluri_multicont 
    SET is_primary = false 
    WHERE user_id = v_user_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = v_user_id AND rol_id = v_rol_admin_id
    ) THEN
        INSERT INTO public.utilizator_roluri_multicont (user_id, rol_id, rol_denumire, is_primary, nume_utilizator_cache)
        VALUES (v_user_id, v_rol_admin_id, 'SUPER_ADMIN_FEDERATIE', true, 'Alin Admin');
    ELSE
        UPDATE public.utilizator_roluri_multicont 
        SET is_primary = true 
        WHERE user_id = v_user_id AND rol_id = v_rol_admin_id;
    END IF;

    -- 5. Asigurăm rolul de SPORTIV
    IF v_sportiv_id IS NOT NULL THEN
        -- Actualizăm și user_id în tabela sportivi dacă nu e deja setat
        UPDATE public.sportivi SET user_id = v_user_id WHERE id = v_sportiv_id AND (user_id IS NULL OR user_id != v_user_id);

        IF NOT EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont 
            WHERE user_id = v_user_id AND rol_id = v_rol_sportiv_id AND sportiv_id = v_sportiv_id
        ) THEN
            INSERT INTO public.utilizator_roluri_multicont (user_id, rol_id, sportiv_id, club_id, is_primary, rol_denumire, nume_utilizator_cache)
            VALUES (v_user_id, v_rol_sportiv_id, v_sportiv_id, v_club_id, false, 'SPORTIV', 'Alin Sportiv');
        ELSE
            UPDATE public.utilizator_roluri_multicont 
            SET rol_denumire = 'SPORTIV', is_primary = false
            WHERE user_id = v_user_id AND rol_id = v_rol_sportiv_id AND sportiv_id = v_sportiv_id;
        END IF;
        
        RAISE NOTICE 'Succes: Utilizatorul % a fost legat de sportivul % ca rol secundar.', v_user_id, v_sportiv_id;
    ELSE
        RAISE NOTICE 'Atenție: Profilul de sportiv pentru alin2u83@gmail.com nu a fost găsit. Creează-l în tabelul sportivi mai întâi.';
    END IF;

    RAISE NOTICE 'Configurare finalizată pentru alin2u83@gmail.com. Te rugăm să te reautentifici în aplicație.';
END $$;
