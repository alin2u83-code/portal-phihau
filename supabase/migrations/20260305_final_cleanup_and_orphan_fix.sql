-- 1. Eliminare definitivă a oricăror politici sau grant-uri pe public.users
-- (Dacă tabelul nu există, aceste comenzi vor fi ignorate sau vor returna erori pe care le putem ignora)
DO $$ 
BEGIN
    -- Ștergere politici (dacă tabelul există)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DROP POLICY IF EXISTS "Users_Self_Access" ON public.users;
        -- Grant-uri (nu pot fi șterse direct, dar putem revoca)
        REVOKE ALL ON TABLE public.users FROM authenticated;
        REVOKE ALL ON TABLE public.users FROM anon;
    END IF;
END $$;

-- 2. Script de Curățare a Trigger-elor (Trigger Cleanup)
-- Eliminăm trigger-ele care ar putea căuta public.profiles sau public.users
DROP TRIGGER IF EXISTS tr_sync_user_profile ON auth.users;
DROP TRIGGER IF EXISTS tr_create_profile ON auth.users;

-- 3. Verificarea și repararea Sportivilor Orfani (fără rol)
-- Activăm inserarea automată a rolului de 'SPORTIV' pentru sportivii care nu au rol
INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, sportiv_id, club_id)
SELECT 
    s.user_id, 
    'SPORTIV', 
    s.id, 
    s.club_id
FROM public.sportivi s
WHERE s.user_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont ur 
    WHERE ur.user_id = s.user_id
);

-- 4. Notificare pentru sportivii orfani (fără user_id)
-- Aceștia trebuie asociați manual de Alexandra
SELECT 'Sportiv orfan (fără user_id): ' || nume || ' ' || prenume AS mesaj
FROM public.sportivi 
WHERE user_id IS NULL;
