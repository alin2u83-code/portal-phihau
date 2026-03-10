-- Migration: RLS for Federation Sportivi View
-- Ensure the view is accessible only to ADMIN_FEDERATIE or PRESEDINTE

-- Assuming the view exists and is SECURITY INVOKER
-- We apply policies to the underlying tables if necessary, 
-- or if it's a view, we ensure the policies on the underlying tables are restrictive.

-- Example policy for the underlying table 'sportivi' (if it's not already restricted)
-- This is a generic example, as the exact table structure is unknown.
-- The RLS policy should be on the base table.

CREATE OR REPLACE FUNCTION public.is_federation_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont ur
    JOIN public.roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.nume IN ('ADMIN_FEDERATIE', 'PRESEDINTE')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply policy to the base table (assuming 'sportivi' is the base table for the view)
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Federation Admin Access" ON public.sportivi;
CREATE POLICY "Federation Admin Access" ON public.sportivi
FOR SELECT
USING (public.is_federation_admin());
