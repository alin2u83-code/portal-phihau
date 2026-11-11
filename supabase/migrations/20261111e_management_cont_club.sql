-- Faza 39 (39-13): acordarea managementului pe contul de club (D-05, D-08, D-16, D-18). STATUS: vezi 39-AUDIT-LIVE (aplicare cu OK utilizator).
-- Doar proprietarul (este_proprietar()) acorda/retrage. Acordarea adauga contului un rol ADMIN_CLUB/INSTRUCTOR pe clubul lui; retragerea sterge doar acel rand (rol_row_id).
-- Inlocuieste partea per grant (acces_competitie_extern) din 20261111b.

CREATE TABLE IF NOT EXISTS public.acces_management_cont_club (
    club_id      uuid PRIMARY KEY REFERENCES public.cluburi(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rol_denumire text NOT NULL CHECK (rol_denumire IN ('ADMIN_CLUB','INSTRUCTOR')),
    rol_row_id   uuid NOT NULL,
    acordat_de   uuid,
    acordat_la   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.acces_management_cont_club ENABLE ROW LEVEL SECURITY;   -- fara FORCE, fara politici (acces doar prin RPC / service role)
REVOKE ALL ON public.acces_management_cont_club FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.acces_management_cont_club TO service_role;

CREATE OR REPLACE FUNCTION public.acorda_management_cont_club(p_club uuid, p_rol text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    v_user uuid; v_nume text; v_rol_row uuid;
BEGIN
    IF NOT public.este_proprietar() THEN RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501'; END IF;
    IF p_rol IS NULL OR p_rol NOT IN ('ADMIN_CLUB','INSTRUCTOR') THEN
        RAISE EXCEPTION 'Rol invalid.' USING ERRCODE = '22023';
    END IF;
    SELECT c.user_id INTO v_user FROM public.conturi_competitie_club c WHERE c.club_id = p_club;
    IF v_user IS NULL THEN RAISE EXCEPTION 'Clubul nu are cont de competitie.' USING ERRCODE = '22023'; END IF;
    IF EXISTS (SELECT 1 FROM public.acces_management_cont_club g WHERE g.club_id = p_club)
       OR EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont u
                  WHERE u.user_id = v_user AND u.club_id = p_club AND u.rol_denumire IN ('ADMIN_CLUB','INSTRUCTOR')) THEN
        RAISE EXCEPTION 'Managementul este deja acordat.' USING ERRCODE = '23505';
    END IF;
    SELECT cl.nume INTO v_nume FROM public.cluburi cl WHERE cl.id = p_club;
    INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id, sportiv_id, is_primary, nume_utilizator_cache)
    VALUES (v_user, p_rol, p_club, NULL, false, 'Cont competitie ' || COALESCE(v_nume, ''))
    RETURNING id INTO v_rol_row;
    INSERT INTO public.acces_management_cont_club (club_id, user_id, rol_denumire, rol_row_id, acordat_de)
    VALUES (p_club, v_user, p_rol, v_rol_row, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.revoca_management_cont_club(p_club uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_rol_row uuid;
BEGIN
    IF NOT public.este_proprietar() THEN RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501'; END IF;
    SELECT g.rol_row_id INTO v_rol_row FROM public.acces_management_cont_club g WHERE g.club_id = p_club;
    IF v_rol_row IS NULL THEN RAISE EXCEPTION 'Nu exista management acordat.' USING ERRCODE = 'P0002'; END IF;
    DELETE FROM public.utilizator_roluri_multicont WHERE id = v_rol_row;      -- doar randul acordat de mecanism (D-16)
    DELETE FROM public.acces_management_cont_club WHERE club_id = p_club;
END;
$$;

CREATE OR REPLACE FUNCTION public.management_cont_club_stare()
RETURNS TABLE(club_id uuid, rol_denumire text, acordat_la timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
    IF NOT public.este_proprietar() THEN RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501'; END IF;
    RETURN QUERY SELECT g.club_id, g.rol_denumire, g.acordat_la FROM public.acces_management_cont_club g;
END;
$$;

REVOKE ALL ON FUNCTION public.acorda_management_cont_club(uuid, text), public.revoca_management_cont_club(uuid),
    public.management_cont_club_stare() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acorda_management_cont_club(uuid, text), public.revoca_management_cont_club(uuid),
    public.management_cont_club_stare() TO authenticated, service_role;

-- Garda de autor (20261111d3) se aplica doar contului ramas "doar extern": cu management acordat, contul lucreaza ca ADMIN_CLUB/INSTRUCTOR
-- si garda nu mai blocheaza scrierile managementului real (fara aceasta, orice scriere pe sportivi/plati ar cere sesiune de autor).
DO $mig$
DECLARE
  def text := pg_get_functiondef('public.audit_trigger_fn()'::regprocedure);
  vechi text := 'IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL THEN';
  nou   text := 'IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL AND public.este_doar_extern() THEN';
BEGIN
  IF position(vechi in def) > 0 THEN EXECUTE replace(def, vechi, nou); END IF;
END
$mig$;

NOTIFY pgrst, 'reload schema';

-- Rollback:
--   DROP FUNCTION public.acorda_management_cont_club(uuid, text), public.revoca_management_cont_club(uuid), public.management_cont_club_stare();
--   (retrage intai grant-urile active ca sa nu ramana roluri orfane) DELETE FROM utilizator_roluri_multicont WHERE id IN (SELECT rol_row_id FROM acces_management_cont_club);
--   DROP TABLE public.acces_management_cont_club;
--   audit_trigger_fn: scoate "AND public.este_doar_extern()" din garda de autor.
