-- Review E3 (H1/H2/M1): garda de autor din audit_trigger_fn trebuie sa fie fail-closed. Header-ul active-role-context-id e controlat de client:
-- lipsa/invalid/alt rand => cere sesiune de autor. Garda se sare doar daca header-ul dovedeste un rol ADMIN_CLUB/INSTRUCTOR al lui auth.uid()
-- pe clubul contului de competitie (managementul acordat, 20261111e).
-- Functia ajutatoare e apelata doar din trigger (SECURITY DEFINER, owner postgres): fara grant pentru authenticated/anon (ACL Faza 37).
CREATE OR REPLACE FUNCTION public.context_activ_este_management_club()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_ctx uuid;
BEGIN
    BEGIN
        v_ctx := (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;
    IF v_ctx IS NULL OR auth.uid() IS NULL THEN RETURN false; END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont r
         WHERE r.id = v_ctx
           AND r.user_id = auth.uid()
           AND r.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')
           AND r.club_id = public.cont_club_curent()
    );
END;
$$;
REVOKE ALL ON FUNCTION public.context_activ_este_management_club() FROM PUBLIC, anon, authenticated;

DO $mig$
DECLARE
  def text := pg_get_functiondef('public.audit_trigger_fn()'::regprocedure);
  vechi text := 'IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL AND public.context_activ_este_reprezentant() THEN';
  nou   text := 'IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL AND NOT public.context_activ_este_management_club() THEN';
BEGIN
  IF position(vechi in def) = 0 THEN RAISE EXCEPTION 'garda asteptata (20261111f) lipseste din audit_trigger_fn'; END IF;
  EXECUTE replace(def, vechi, nou);
END
$mig$;

DROP FUNCTION IF EXISTS public.context_activ_este_reprezentant();   -- inlocuita; elimina si expunerea ACL (H2)

NOTIFY pgrst, 'reload schema';

-- Rollback: in audit_trigger_fn inlocuieste "NOT public.context_activ_este_management_club()" cu "public.este_doar_extern()"; DROP FUNCTION public.context_activ_este_management_club();
