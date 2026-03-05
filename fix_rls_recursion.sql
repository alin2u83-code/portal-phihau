-- Fix potential infinite recursion on utilizator_roluri_multicont
-- The generic loop applied "Club Access Policy" to utilizator_roluri_multicont because it has a club_id.
-- This policy calls check_club_access, which queries utilizator_roluri_multicont.
-- Even with SECURITY DEFINER, this can be problematic or confusing, and it's better to have a specific policy for this table.

-- 1. Drop the generic policies on utilizator_roluri_multicont
DROP POLICY IF EXISTS "Club Access Policy" ON public.utilizator_roluri_multicont;
DROP POLICY IF EXISTS "Club Insert Policy" ON public.utilizator_roluri_multicont;
DROP POLICY IF EXISTS "Club Update Policy" ON public.utilizator_roluri_multicont;
DROP POLICY IF EXISTS "Club Delete Policy" ON public.utilizator_roluri_multicont;

-- 2. Create a specific, non-recursive policy for utilizator_roluri_multicont
-- Users should be able to see their own role assignments.
CREATE POLICY "User Roles Access Policy" ON public.utilizator_roluri_multicont
FOR SELECT USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
        -- Super admins can see all
        SELECT 1 FROM public.roluri r 
        WHERE r.nume = 'SUPER_ADMIN_FEDERATIE' 
        AND r.id IN (
            SELECT rol_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid()
        )
    )
);

-- 3. Ensure check_club_access is definitely SECURITY DEFINER (it was, but let's be sure)
CREATE OR REPLACE FUNCTION public.check_club_access(target_club_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
