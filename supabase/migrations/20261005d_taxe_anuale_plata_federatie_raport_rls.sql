-- Faza 33 (33-03): plata club -> federatie (bifare sportivi), raport pe cluburi, RLS rescris pe tabelele taxei.
-- Politicile vechi (live) erau cross-club: orice ADMIN_CLUB/INSTRUCTOR vedea toate vizele, orice ADMIN_CLUB
-- modifica decontul oricarui club. Se elimina TOATE politicile existente si se recreeaza scoped.
-- Cluburile scriu doar prin RPC-uri SECURITY DEFINER; scrierea directa = SUPER_ADMIN.

-- ===== 1. inregistreaza_plata_federatie =====
CREATE OR REPLACE FUNCTION public.inregistreaza_plata_federatie(
  p_club_id uuid, p_tip text, p_an integer, p_sportiv_ids uuid[], p_metoda_plata text,
  p_data_plata date DEFAULT CURRENT_DATE, p_dovada_url text DEFAULT NULL, p_observatii text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE
  v_ids uuid[]; v_bad text; v_total numeric; v_n integer; v_dec uuid; v_prefix text; v_data date;
BEGIN
  IF p_tip IS NULL OR p_tip NOT IN ('FRQKD','FRAM') THEN
    RAISE EXCEPTION 'Tip de taxă invalid' USING ERRCODE = '22023';
  END IF;
  IF p_an IS NULL OR p_an < 2020 OR p_an > 2100 THEN
    RAISE EXCEPTION 'An invalid' USING ERRCODE = '22023';
  END IF;
  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'Clubul este obligatoriu' USING ERRCODE = '22023';
  END IF;
  IF p_metoda_plata IS NULL OR p_metoda_plata NOT IN ('Cash','Transfer Bancar','Revolut') THEN
    RAISE EXCEPTION 'Metodă de plată invalidă' USING ERRCODE = '22023';
  END IF;
  IF p_sportiv_ids IS NULL OR cardinality(p_sportiv_ids) = 0 THEN
    RAISE EXCEPTION 'Selectează cel puțin un sportiv' USING ERRCODE = '22023';
  END IF;
  IF cardinality(p_sportiv_ids) > 2000 THEN
    RAISE EXCEPTION 'Prea mulți sportivi într-o singură plată (maxim 2000)' USING ERRCODE = '22023';
  END IF;
  v_data := COALESCE(p_data_plata, CURRENT_DATE);
  IF v_data > CURRENT_DATE + 1 THEN
    RAISE EXCEPTION 'Data plății nu poate fi în viitor' USING ERRCODE = '22023';
  END IF;
  v_prefix := 'public/' || p_club_id::text || '/';
  IF p_dovada_url IS NOT NULL AND left(p_dovada_url, length(v_prefix)) <> v_prefix THEN
    RAISE EXCEPTION 'Dovada de transfer nu aparține acestui club' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_observatii, '')) > 1000 THEN
    RAISE EXCEPTION 'Observațiile sunt prea lungi (maxim 1000 de caractere)' USING ERRCODE = '22023';
  END IF;
  IF NOT public.poate_gestiona_taxe_club(p_club_id) THEN
    RAISE EXCEPTION 'Acces refuzat: nu poți înregistra plăți către federație pentru acest club' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_sportiv_ids) x WHERE x IS NOT NULL;
  IF v_ids IS NULL THEN
    RAISE EXCEPTION 'Selectează cel puțin un sportiv' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.vize_sportivi WHERE sportiv_id = ANY(v_ids) AND an = p_an AND tip = p_tip FOR UPDATE;

  SELECT string_agg(CASE WHEN s.club_id = p_club_id THEN btrim(s.nume || ' ' || s.prenume) ELSE x::text END, ', ')
    INTO v_bad
    FROM unnest(v_ids) x
    LEFT JOIN public.sportivi s ON s.id = x
    LEFT JOIN public.vize_sportivi v ON v.sportiv_id = x AND v.an = p_an AND v.tip = p_tip
    LEFT JOIN public.plati p ON p.id = v.plata_id
   WHERE v.id IS NULL OR v.club_id IS DISTINCT FROM p_club_id OR v.scutit OR v.plata_id IS NULL
      OR p.id IS NULL OR p.status = 'Anulat'
      OR EXISTS (SELECT 1 FROM public.decont_sportivi ds WHERE ds.sportiv_id = x AND ds.an = p_an AND ds.tip = p_tip);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Următorii sportivi nu pot fi incluși în plata către federație (taxă nefacturată, scutită, din alt club sau deja virată): %', v_bad
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(sum(p.suma), 0), count(*)::int INTO v_total, v_n
    FROM public.vize_sportivi v JOIN public.plati p ON p.id = v.plata_id
   WHERE v.sportiv_id = ANY(v_ids) AND v.an = p_an AND v.tip = p_tip;

  INSERT INTO public.deconturi_federatie
    (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata, metoda_plata,
     confirmata_federatie, data_decont, data_generare, dovada_transfer_url, creat_de, observatii)
  VALUES (p_club_id, p_an, p_tip, v_total, v_n, 'Platit', p_metoda_plata,
          true, v_data, now(), p_dovada_url, auth.uid(), p_observatii)
  RETURNING id INTO v_dec;

  INSERT INTO public.decont_sportivi (decont_id, sportiv_id, an, tip, plata_id, suma)
  SELECT v_dec, v.sportiv_id, p_an, p_tip, v.plata_id, p.suma
    FROM public.vize_sportivi v JOIN public.plati p ON p.id = v.plata_id
   WHERE v.sportiv_id = ANY(v_ids) AND v.an = p_an AND v.tip = p_tip;

  RETURN jsonb_build_object('decont_id', v_dec, 'suma_totala', v_total, 'nr_participanti', v_n);
END;
$fn$;

-- ===== 2. raport_taxe_anuale_cluburi =====
CREATE OR REPLACE FUNCTION public.raport_taxe_anuale_cluburi(p_tip text, p_an integer)
RETURNS TABLE(club_id uuid, club_nume text, nr_sportivi integer, nr_scutiti integer, nr_in_asteptare integer,
              nr_facturati integer, suma_facturata numeric, suma_achitata_club numeric, suma_restanta_club numeric,
              nr_virati integer, suma_virata numeric, suma_de_virat numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
#variable_conflict use_column
BEGIN
  IF p_tip IS NULL OR p_tip NOT IN ('FRQKD','FRAM') THEN
    RAISE EXCEPTION 'Tip de taxă invalid' USING ERRCODE = '22023';
  END IF;
  IF p_an IS NULL OR p_an < 2020 OR p_an > 2100 THEN
    RAISE EXCEPTION 'An invalid' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH v AS (
    SELECT vz.club_id AS cid, vz.scutit AS scut, vz.plata_id AS pl, p.id AS pid, p.status AS st, p.suma AS sm
      FROM public.vize_sportivi vz LEFT JOIN public.plati p ON p.id = vz.plata_id
     WHERE vz.tip = p_tip AND vz.an = p_an
  ), a AS (
    SELECT v.cid,
           count(*)::int AS nr_s,
           (count(*) FILTER (WHERE v.scut))::int AS nr_sc,
           (count(*) FILTER (WHERE v.pl IS NULL AND NOT v.scut))::int AS nr_ast,
           (count(*) FILTER (WHERE NOT v.scut AND v.pid IS NOT NULL AND v.st <> 'Anulat'))::int AS nr_f,
           COALESCE(sum(v.sm) FILTER (WHERE NOT v.scut AND v.pid IS NOT NULL AND v.st <> 'Anulat'), 0) AS s_f,
           COALESCE(sum(v.sm) FILTER (WHERE NOT v.scut AND v.st = 'Achitat'), 0) AS s_a
      FROM v GROUP BY v.cid
  ), d AS (
    SELECT df.club_id AS cid, count(*)::int AS nr_v, COALESCE(sum(ds.suma), 0) AS s_v
      FROM public.decont_sportivi ds JOIN public.deconturi_federatie df ON df.id = ds.decont_id
     WHERE ds.tip = p_tip AND ds.an = p_an AND df.status_plata = 'Platit'
     GROUP BY df.club_id
  )
  SELECT c.id, c.nume::text,
         COALESCE(a.nr_s, 0), COALESCE(a.nr_sc, 0), COALESCE(a.nr_ast, 0), COALESCE(a.nr_f, 0),
         COALESCE(a.s_f, 0)::numeric, COALESCE(a.s_a, 0)::numeric, (COALESCE(a.s_f, 0) - COALESCE(a.s_a, 0))::numeric,
         COALESCE(d.nr_v, 0), COALESCE(d.s_v, 0)::numeric, (COALESCE(a.s_f, 0) - COALESCE(d.s_v, 0))::numeric
    FROM public.cluburi c
    LEFT JOIN a ON a.cid = c.id
    LEFT JOIN d ON d.cid = c.id
   WHERE public.poate_gestiona_taxe_club(c.id)
   ORDER BY c.nume;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.inregistreaza_plata_federatie(uuid, text, integer, uuid[], text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inregistreaza_plata_federatie(uuid, text, integer, uuid[], text, date, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.raport_taxe_anuale_cluburi(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.raport_taxe_anuale_cluburi(text, integer) TO authenticated;

-- ===== 3. RLS: elimina TOATE politicile existente (si cele fantoma) si recreeaza scoped =====
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
            WHERE schemaname = 'public' AND tablename IN ('vize_sportivi','decont_sportivi','deconturi_federatie') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY vize_sportivi_select_scoped ON public.vize_sportivi FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.has_access_to_club(club_id)
    OR EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = vize_sportivi.sportiv_id AND public.has_access_to_club(s.club_id))
    OR EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont urm
                WHERE urm.user_id = auth.uid() AND urm.sportiv_id = vize_sportivi.sportiv_id)
  );
CREATE POLICY vize_sportivi_insert_super_admin ON public.vize_sportivi FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY vize_sportivi_update_super_admin ON public.vize_sportivi FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY vize_sportivi_delete_super_admin ON public.vize_sportivi FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE POLICY deconturi_federatie_select_scoped ON public.deconturi_federatie FOR SELECT TO authenticated
  USING (public.poate_gestiona_taxe_club(club_id));
CREATE POLICY deconturi_federatie_insert_super_admin ON public.deconturi_federatie FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY deconturi_federatie_update_super_admin ON public.deconturi_federatie FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY deconturi_federatie_delete_super_admin ON public.deconturi_federatie FOR DELETE TO authenticated USING (public.is_super_admin());

CREATE POLICY decont_sportivi_select_scoped ON public.decont_sportivi FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deconturi_federatie d WHERE d.id = decont_sportivi.decont_id AND public.poate_gestiona_taxe_club(d.club_id)));
CREATE POLICY decont_sportivi_insert_super_admin ON public.decont_sportivi FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY decont_sportivi_update_super_admin ON public.decont_sportivi FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY decont_sportivi_delete_super_admin ON public.decont_sportivi FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS taxa_anuala_config_insert ON public.taxa_anuala_config;
DROP POLICY IF EXISTS taxa_anuala_config_update ON public.taxa_anuala_config;
CREATE POLICY taxa_anuala_config_insert ON public.taxa_anuala_config FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY taxa_anuala_config_update ON public.taxa_anuala_config FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
