-- Faza 36: lista publica (id, nume) a cluburilor pentru formularul "Solicita acces" (anon nu citeste cluburi).
CREATE OR REPLACE FUNCTION public.lista_cluburi_publice()
RETURNS TABLE (id uuid, nume text) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT c.id, c.nume FROM public.cluburi c ORDER BY c.nume;
$$;
REVOKE EXECUTE ON FUNCTION public.lista_cluburi_publice() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lista_cluburi_publice() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
