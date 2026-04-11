-- Script pentru curățarea trigger-elor invalide și verificarea consistenței datelor

-- 1. Curățare Trigger-e pe schema auth care referă tabele inexistente
DO $$
DECLARE
    r RECORD;
    v_func_src TEXT;
    v_table_name TEXT;
    v_table_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Verificare trigger-e pe auth.users...';
    
    FOR r IN (
        SELECT 
            t.trigger_name, 
            t.event_object_table, 
            p.proname as func_name,
            p.prosrc as func_src
        FROM information_schema.triggers t
        JOIN pg_proc p ON t.action_statement LIKE '%' || p.proname || '%'
        WHERE t.trigger_schema = 'auth' AND t.event_object_table = 'users'
    ) LOOP
        v_func_src := r.func_src;
        
        -- Verificăm referințe comune către tabele care s-ar putea să nu existe
        -- Exemplu: public.profiles, public.users (dacă au fost redenumite sau șterse)
        
        FOREACH v_table_name IN ARRAY ARRAY['profiles', 'users', 'user_profiles'] LOOP
            IF v_func_src LIKE '%public.' || v_table_name || '%' THEN
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = v_table_name
                ) INTO v_table_exists;
                
                IF NOT v_table_exists THEN
                    RAISE NOTICE 'Trigger-ul % apelează funcția % care referă tabelul inexistent public.%. Se șterge trigger-ul.', r.trigger_name, r.func_name, v_table_name;
                    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Verificare completă.';
END $$;

-- 2. Verificare sportivi cu user_id setat dar fără roluri în utilizator_roluri_multicont
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verificare sportivi orfani de roluri...';
    
    FOR r IN (
        SELECT s.id, s.nume, s.prenume, s.user_id, s.club_id
        FROM public.sportivi s
        LEFT JOIN public.utilizator_roluri_multicont urm ON s.user_id = urm.user_id
        WHERE s.user_id IS NOT NULL AND urm.id IS NULL
    ) LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'Sportiv ID: %, Nume: % %, User ID: % nu are roluri asociate.', r.id, r.nume, r.prenume, r.user_id;
        
        -- Opțional: Putem insera automat un rol de SPORTIV dacă dorim să reparăm
        -- INSERT INTO public.utilizator_roluri_multicont (user_id, sportiv_id, club_id, rol_denumire, is_primary)
        -- VALUES (r.user_id, r.id, r.club_id, 'SPORTIV', true);
    END LOOP;
    
    IF v_count = 0 THEN
        RAISE NOTICE 'Nu s-au găsit sportivi fără roluri.';
    ELSE
        RAISE NOTICE 'S-au găsit % sportivi fără roluri. Verificați logurile de mai sus.', v_count;
    END IF;
END $$;
