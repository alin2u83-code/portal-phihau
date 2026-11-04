-- Faza 36 / 36-08: izolare RLS pentru rolul REPREZENTANT_COMPETITIE ("doar extern").
-- Permisive pe grant (extern functioneaza indiferent de politicile generice),
-- RESTRICTIVE de scope (AND cu orice permisiva, inclusiv fantome), default-deny pe restul tabelelor.
-- Rolurile interne nu sunt "doar extern" -> predicatele restrictive trec (D-16).

-- ============ A. Helper ============
CREATE OR REPLACE FUNCTION public.acces_extern_sportiv_competitie(p_sportiv uuid, p_competitie uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.acces_competitie_extern a
    JOIN public.sportivi s ON s.club_id = a.club_id
    WHERE a.user_id = auth.uid() AND a.activ = true
      AND a.competitie_id = p_competitie AND s.id = p_sportiv
  );
$$;
REVOKE ALL ON FUNCTION public.acces_extern_sportiv_competitie(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acces_extern_sportiv_competitie(uuid, uuid) TO authenticated, service_role;

-- ============ constructor de politici (temporar) ============
CREATE OR REPLACE FUNCTION pg_temp._ext_mk(p_tbl text, p_name text, p_restrictive boolean, p_cmd text, p_using text, p_check text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE s text;
BEGIN
  IF to_regclass('public.' || p_tbl) IS NULL THEN RAISE NOTICE 'sar tabel inexistent: %', p_tbl; RETURN; END IF;
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_name, p_tbl);
  s := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO authenticated',
              p_name, p_tbl, CASE WHEN p_restrictive THEN 'RESTRICTIVE' ELSE 'PERMISSIVE' END, p_cmd);
  IF p_using IS NOT NULL THEN s := s || ' USING (' || p_using || ')'; END IF;
  IF p_check IS NOT NULL THEN s := s || ' WITH CHECK (' || p_check || ')'; END IF;
  EXECUTE s;
END $$;

DO $mig$
DECLARE
  nx  text := 'NOT (select public.este_doar_extern())';
  ex  text := '(select public.este_doar_extern())';
  t   text;
  g_ic text := 'public.acces_extern_competitie(competitie_id, club_id)';
  g_par text := 'exists (select 1 from public.echipe_competitie e where e.id = echipa_id and public.acces_extern_competitie(e.competitie_id, e.club_id))';
  g_sa text := 'public.acces_extern_la_sportiv(sportiv_id)';
  g_csa_w text := 'public.acces_extern_sportiv_competitie(sportiv_id, competitie_id) and public.competitie_deschisa_inscrieri(competitie_id)';
BEGIN
  -- ===== B. PERMISIVE pe grant =====
  PERFORM pg_temp._ext_mk('competitii','ext_p_competitii_sel',false,'SELECT','public.acces_extern_la_competitie(id)',NULL);
  PERFORM pg_temp._ext_mk('probe_competitie','ext_p_probe_sel',false,'SELECT','public.acces_extern_la_competitie(competitie_id)',NULL);
  PERFORM pg_temp._ext_mk('categorii_competitie','ext_p_categorii_sel',false,'SELECT','public.acces_extern_la_competitie(competitie_id)',NULL);

  FOREACH t IN ARRAY ARRAY['inscrieri_competitie','echipe_competitie'] LOOP
    PERFORM pg_temp._ext_mk(t,'ext_p_'||t||'_sel',false,'SELECT',g_ic,NULL);
    PERFORM pg_temp._ext_mk(t,'ext_p_'||t||'_ins',false,'INSERT',NULL,
      g_ic||' and coalesce(taxa_achitata,false) = false and lower(status) in (''inscris'',''inscrisa'',''deschisa'')');
    PERFORM pg_temp._ext_mk(t,'ext_p_'||t||'_upd',false,'UPDATE',g_ic,g_ic);
    PERFORM pg_temp._ext_mk(t,'ext_p_'||t||'_del',false,'DELETE',g_ic||' and coalesce(taxa_achitata,false) = false',NULL);
  END LOOP;

  PERFORM pg_temp._ext_mk('echipa_sportivi','ext_p_echipa_sportivi_sel',false,'SELECT',g_par,NULL);
  PERFORM pg_temp._ext_mk('echipa_sportivi','ext_p_echipa_sportivi_ins',false,'INSERT',NULL,g_par);
  PERFORM pg_temp._ext_mk('echipa_sportivi','ext_p_echipa_sportivi_upd',false,'UPDATE',g_par,g_par);
  PERFORM pg_temp._ext_mk('echipa_sportivi','ext_p_echipa_sportivi_del',false,'DELETE',g_par,NULL);

  PERFORM pg_temp._ext_mk('sportivi','ext_p_sportivi_sel',false,'SELECT','public.acces_extern_la_club(club_id)',NULL);

  PERFORM pg_temp._ext_mk('sportiv_arme','ext_p_sportiv_arme_sel',false,'SELECT',g_sa,NULL);
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_p_sportiv_arme_ins',false,'INSERT',NULL,g_sa);
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_p_sportiv_arme_upd',false,'UPDATE',g_sa,g_sa);
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_p_sportiv_arme_del',false,'DELETE',g_sa,NULL);

  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_p_csa_sel',false,'SELECT',g_sa,NULL);
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_p_csa_ins',false,'INSERT',NULL,g_csa_w);
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_p_csa_upd',false,'UPDATE',g_csa_w,g_csa_w);
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_p_csa_del',false,'DELETE',g_csa_w,NULL);

  PERFORM pg_temp._ext_mk('stagii_cvd_participare','ext_p_stagii_cvd_sel',false,'SELECT',g_sa,NULL);

  -- referinta: citire pentru extern
  FOREACH t IN ARRAY ARRAY['grade','cluburi','tipuri_competitie','inlantuiri','inlantuiri_grade','arme','cerinte_stagii_cvd'] LOOP
    PERFORM pg_temp._ext_mk(t,'ext_p_'||t||'_sel',false,'SELECT',ex,NULL);
  END LOOP;

  -- ===== C. RESTRICTIVE de scope la SELECT =====
  PERFORM pg_temp._ext_mk('competitii','ext_r_competitii_sel',true,'SELECT',nx||' or public.acces_extern_la_competitie(id)',NULL);
  PERFORM pg_temp._ext_mk('probe_competitie','ext_r_probe_sel',true,'SELECT',nx||' or public.acces_extern_la_competitie(competitie_id)',NULL);
  PERFORM pg_temp._ext_mk('categorii_competitie','ext_r_categorii_sel',true,'SELECT',nx||' or public.acces_extern_la_competitie(competitie_id)',NULL);
  PERFORM pg_temp._ext_mk('inscrieri_competitie','ext_r_inscrieri_sel',true,'SELECT',nx||' or '||g_ic,NULL);
  PERFORM pg_temp._ext_mk('echipe_competitie','ext_r_echipe_sel',true,'SELECT',nx||' or '||g_ic,NULL);
  PERFORM pg_temp._ext_mk('echipa_sportivi','ext_r_echipa_sportivi_sel',true,'SELECT',nx||' or '||g_par,NULL);
  PERFORM pg_temp._ext_mk('sportivi','ext_r_sportivi_sel',true,'SELECT',nx||' or public.acces_extern_la_club(club_id)',NULL);
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_r_sportiv_arme_sel',true,'SELECT',nx||' or '||g_sa,NULL);
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_r_csa_sel',true,'SELECT',nx||' or '||g_sa,NULL);
  PERFORM pg_temp._ext_mk('stagii_cvd_participare','ext_r_stagii_cvd_sel',true,'SELECT',nx||' or '||g_sa,NULL);

  -- ===== D. RESTRICTIVE de scriere =====
  -- (1) zero scriere pentru extern
  FOREACH t IN ARRAY ARRAY['competitii','probe_competitie','categorii_competitie','sportivi','stagii_cvd_participare',
      'grade','cluburi','tipuri_competitie','inlantuiri','inlantuiri_grade','arme','cerinte_stagii_cvd',
      'utilizator_roluri_multicont','roluri','acces_competitie_extern'] LOOP
    PERFORM pg_temp._ext_mk(t,'ext_r_'||t||'_ins',true,'INSERT',NULL,nx);
    PERFORM pg_temp._ext_mk(t,'ext_r_'||t||'_upd',true,'UPDATE',nx,nx);
    PERFORM pg_temp._ext_mk(t,'ext_r_'||t||'_del',true,'DELETE',nx,NULL);
  END LOOP;
  -- (2) arme: scriere doar pe grant
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_r_sportiv_arme_ins',true,'INSERT',NULL,nx||' or '||g_sa);
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_r_sportiv_arme_upd',true,'UPDATE',nx||' or '||g_sa,nx||' or '||g_sa);
  PERFORM pg_temp._ext_mk('sportiv_arme','ext_r_sportiv_arme_del',true,'DELETE',nx||' or '||g_sa,NULL);
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_r_csa_ins',true,'INSERT',NULL,nx||' or ('||g_csa_w||')');
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_r_csa_upd',true,'UPDATE',nx||' or ('||g_csa_w||')',nx||' or ('||g_csa_w||')');
  PERFORM pg_temp._ext_mk('competitie_sportiv_arme','ext_r_csa_del',true,'DELETE',nx||' or ('||g_csa_w||')',NULL);
  -- (3) inscrieri/echipe/echipa_sportivi: scris deja de _r_scope_* (36-04)
END
$mig$;

-- (4) trigger de protectie taxa/status pentru extern
CREATE OR REPLACE FUNCTION public.trg_extern_protejeaza_campuri()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.este_doar_extern() THEN
    NEW.taxa_achitata := OLD.taxa_achitata;
    IF NEW.status IS DISTINCT FROM OLD.status AND lower(coalesce(NEW.status,'')) NOT IN ('retras','retrasa') THEN
      RAISE EXCEPTION 'camp protejat: status';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_extern_protejeaza_inscrieri ON public.inscrieri_competitie;
CREATE TRIGGER trg_extern_protejeaza_inscrieri BEFORE UPDATE ON public.inscrieri_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_extern_protejeaza_campuri();
DROP TRIGGER IF EXISTS trg_extern_protejeaza_echipe ON public.echipe_competitie;
CREATE TRIGGER trg_extern_protejeaza_echipe BEFORE UPDATE ON public.echipe_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_extern_protejeaza_campuri();

-- ============ E. default-deny pe restul tabelelor cu RLS ============
DO $deny$
DECLARE r record; n int := 0;
  excl text[] := ARRAY['competitii','probe_competitie','categorii_competitie','inscrieri_competitie','echipe_competitie',
    'echipa_sportivi','sportivi','sportiv_arme','competitie_sportiv_arme','stagii_cvd_participare',
    'grade','cluburi','tipuri_competitie','inlantuiri','inlantuiri_grade','arme','cerinte_stagii_cvd',
    'utilizator_roluri_multicont','roluri','acces_competitie_extern'];
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity AND NOT (c.relname = ANY(excl))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS ext_r_deny_all ON public.%I', r.relname);
    EXECUTE format('CREATE POLICY ext_r_deny_all ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT (select public.este_doar_extern())) WITH CHECK (NOT (select public.este_doar_extern()))', r.relname);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'ext_r_deny_all aplicat pe % tabele', n;
END
$deny$;

-- ============ F. storage.objects ============
DO $st$
BEGIN
  DROP POLICY IF EXISTS ext_r_storage_deny ON storage.objects;
  CREATE POLICY ext_r_storage_deny ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
    USING (NOT (select public.este_doar_extern())) WITH CHECK (NOT (select public.este_doar_extern()));
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects: privilegiu insuficient, politica ext_r_storage_deny NU a fost creata';
END
$st$;

-- ============ G. view-uri definer (precedent 20260325_fix_security_definer_views.sql) ============
ALTER VIEW IF EXISTS public.vedere_prezenta_sportiv      SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vedere_istoric_grade_sportiv SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
