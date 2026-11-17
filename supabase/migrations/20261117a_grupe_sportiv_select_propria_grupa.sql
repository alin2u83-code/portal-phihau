-- SPORTIV nu putea citi nicio grupa (doar staff avea politica) -> dashboard "Grupa necunoscuta".
-- Helper SECURITY DEFINER evita recursia RLS prin sportivi.
CREATE OR REPLACE FUNCTION public.get_my_grupa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT grupa_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_grupa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_grupa_id() TO authenticated;

DROP POLICY IF EXISTS "Sportiv - citeste propria grupa" ON public.grupe;
CREATE POLICY "Sportiv - citeste propria grupa" ON public.grupe
  FOR SELECT TO authenticated
  USING (id = public.get_my_grupa_id());
