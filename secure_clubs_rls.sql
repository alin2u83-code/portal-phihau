-- 1. Enable RLS on all tables with club_id
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'club_id' AND table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
    END LOOP;
END $$;

-- 2. Create check_club_access function
CREATE OR REPLACE FUNCTION public.check_club_access(target_club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_super_admin boolean;
    has_access boolean;
BEGIN
    -- Check if user is SUPER_ADMIN_FEDERATIE
    SELECT EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont ur
        JOIN public.roluri r ON ur.rol_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.nume = 'SUPER_ADMIN_FEDERATIE'
    ) INTO is_super_admin;

    IF is_super_admin THEN
        RETURN true;
    END IF;

    -- Check if user has access to the specific club
    SELECT EXISTS (
        SELECT 1
        FROM public.utilizator_roluri_multicont ur
        WHERE ur.user_id = auth.uid()
        AND ur.club_id = target_club_id
    ) INTO has_access;

    RETURN has_access;
END;
$$;

-- 3. Apply Policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'club_id' AND table_schema = 'public') LOOP
        
        -- Drop existing policies to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Club Access Policy" ON public.%I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Club Insert Policy" ON public.%I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Club Update Policy" ON public.%I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Club Delete Policy" ON public.%I;', r.table_name);

        -- SELECT Policy
        EXECUTE format('CREATE POLICY "Club Access Policy" ON public.%I FOR SELECT USING (public.check_club_access(club_id));', r.table_name);

        -- INSERT Policy
        EXECUTE format('CREATE POLICY "Club Insert Policy" ON public.%I FOR INSERT WITH CHECK (public.check_club_access(club_id));', r.table_name);

        -- UPDATE Policy (Prevent moving to unauthorized club)
        EXECUTE format('CREATE POLICY "Club Update Policy" ON public.%I FOR UPDATE USING (public.check_club_access(club_id)) WITH CHECK (public.check_club_access(club_id));', r.table_name);

        -- DELETE Policy
        EXECUTE format('CREATE POLICY "Club Delete Policy" ON public.%I FOR DELETE USING (public.check_club_access(club_id));', r.table_name);

    END LOOP;
END $$;
