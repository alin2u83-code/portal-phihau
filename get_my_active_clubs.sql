CREATE OR REPLACE FUNCTION public.get_my_active_clubs()
RETURNS TABLE (club_id uuid) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ur.club_id
    FROM public.utilizator_roluri_multicont ur
    WHERE ur.user_id = auth.uid()
    AND ur.club_id IS NOT NULL;
END;
$$;
