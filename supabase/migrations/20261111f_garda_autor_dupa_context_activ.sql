-- E3-1 (Faza 39): garda de autor din audit_trigger_fn depinde de rolul din contextul activ (header active-role-context-id),
-- nu de este_doar_extern(). Cu management acordat, un request in contextul REPREZENTANT_COMPETITIE cere in continuare sesiune de autor;
-- un request in contextul ADMIN_CLUB/INSTRUCTOR (managementul real) nu.
CREATE OR REPLACE FUNCTION public.context_activ_este_reprezentant()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont r
         WHERE r.user_id = auth.uid()
           AND r.rol_denumire = 'REPREZENTANT_COMPETITIE'
           AND r.id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid
    );
$$;
REVOKE ALL ON FUNCTION public.context_activ_este_reprezentant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.context_activ_este_reprezentant() TO authenticated, service_role;

DO $mig$
DECLARE
  def text := pg_get_functiondef('public.audit_trigger_fn()'::regprocedure);
  vechi text := 'IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL AND public.este_doar_extern() THEN';
  nou   text := 'IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL AND public.context_activ_este_reprezentant() THEN';
BEGIN
  IF position(vechi in def) = 0 THEN RAISE EXCEPTION 'garda asteptata lipseste din audit_trigger_fn'; END IF;
  EXECUTE replace(def, vechi, nou);
END
$mig$;

-- E3-3: marcheaza granturile al caror user_id nu mai e contul curent al clubului (ex. mutaManagement esuat la schimbare email).
DROP FUNCTION IF EXISTS public.management_cont_club_stare();
CREATE FUNCTION public.management_cont_club_stare()
RETURNS TABLE(club_id uuid, rol_denumire text, acordat_la timestamptz, user_vechi boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
    IF NOT public.este_proprietar() THEN RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501'; END IF;
    RETURN QUERY SELECT g.club_id, g.rol_denumire, g.acordat_la,
        NOT EXISTS (SELECT 1 FROM public.conturi_competitie_club c WHERE c.club_id = g.club_id AND c.user_id = g.user_id)
      FROM public.acces_management_cont_club g;
END;
$$;
REVOKE ALL ON FUNCTION public.management_cont_club_stare() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.management_cont_club_stare() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Rollback: inlocuieste in audit_trigger_fn "public.context_activ_este_reprezentant()" cu "public.este_doar_extern()"; DROP FUNCTION public.context_activ_este_reprezentant();
