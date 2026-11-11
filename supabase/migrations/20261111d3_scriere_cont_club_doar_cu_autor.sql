-- Faza 39 review E2-3 + E2-2 (decizie utilizator 11.11.2026: "doar cei cu cont", autor obligatoriu).
-- E2-3: contul de club NU poate scrie pe tabelele auditate fara sesiune de actor valida -> orice scriere a lui are autor in jurnal.
--       (scrierile pe tabele neauditate nu sunt acoperite de aceasta garda.)
-- E2-2: sesiune_actor_curenta() reimprospata activitatea (cel mult o data/minut): sesiunea ramane vie cat timp pagina e deschisa (poll 5 min).
DO $mig$
DECLARE
  def text := pg_get_functiondef('public.audit_trigger_fn()'::regprocedure);
  marker text := E'        IF NOT v_gasit THEN\n            v_actor_uid := NULL;';
  garda  text := E'        IF NOT v_gasit AND public.cont_club_curent() IS NOT NULL THEN\n            RAISE EXCEPTION ''Alege cine lucreaza inainte de a modifica (sesiune de autor lipsa sau expirata)'' USING ERRCODE = ''42501'';\n        END IF;\n';
BEGIN
  IF position(marker in def) = 0 THEN RAISE EXCEPTION 'marker negasit in audit_trigger_fn'; END IF;
  IF position('Alege cine lucreaza' in def) > 0 THEN RETURN; END IF;
  EXECUTE replace(def, marker, garda || marker);
END
$mig$;

CREATE OR REPLACE FUNCTION public.sesiune_actor_curenta()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r public.sesiuni_actor_competitie%ROWTYPE;
BEGIN
    SELECT * INTO r FROM public.sesiuni_actor_competitie s
     WHERE s.user_id = auth.uid() AND s.ultima_activitate > now() - interval '4 hours';
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF r.ultima_activitate < now() - interval '1 minute' THEN
        UPDATE public.sesiuni_actor_competitie SET ultima_activitate = now() WHERE user_id = r.user_id;
    END IF;
    RETURN jsonb_build_object('club_id', r.club_id, 'competitie_id', r.competitie_id, 'actor_user_id', r.actor_user_id,
        'actor_nume', r.actor_nume, 'actor_din_lista', r.actor_din_lista, 'deschisa_la', r.deschisa_la);
END;
$$;
REVOKE ALL ON FUNCTION public.sesiune_actor_curenta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sesiune_actor_curenta() TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
-- Rollback: restaureaza audit_trigger_fn din 20261111d (fara blocul "Alege cine lucreaza") si sesiune_actor_curenta ca functie SQL STABLE din 20261111d.
