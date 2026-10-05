-- Faza 33 (33-02): RPC generare taxe anuale (individual / selectie / in masa) + scutiri.
-- Clubul tinta se verifica in DB cu poate_gestiona_taxe_club(); nu se are incredere in input.

CREATE OR REPLACE FUNCTION public.genereaza_taxe_anuale(
  p_club_id uuid, p_tip text, p_an integer, p_sportiv_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE
  v_ids uuid[]; v_id uuid; v_club uuid; v_rez text; v_plata uuid;
  n_fact int := 0; n_ast int := 0; n_ex int := 0; n_ref int := 0; v_det jsonb := '[]'::jsonb;
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
  IF p_sportiv_ids IS NOT NULL AND cardinality(p_sportiv_ids) > 2000 THEN
    RAISE EXCEPTION 'Prea mulți sportivi într-o singură cerere (maxim 2000)' USING ERRCODE = '22023';
  END IF;
  IF NOT public.poate_gestiona_taxe_club(p_club_id) THEN
    RAISE EXCEPTION 'Acces refuzat: doar administratorul clubului poate genera taxele anuale' USING ERRCODE = '42501';
  END IF;

  IF p_sportiv_ids IS NULL THEN
    SELECT COALESCE(array_agg(id ORDER BY id), '{}') INTO v_ids
      FROM public.sportivi WHERE club_id = p_club_id AND status = 'Activ';
  ELSE
    SELECT COALESCE(array_agg(DISTINCT x), '{}') INTO v_ids FROM unnest(p_sportiv_ids) x;
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT club_id INTO v_club FROM public.sportivi WHERE id = v_id;
    IF NOT FOUND OR v_club IS DISTINCT FROM p_club_id THEN
      n_ref := n_ref + 1;
      v_det := v_det || jsonb_build_object('sportiv_id', v_id, 'rezultat', 'refuzat', 'plata_id', NULL);
      CONTINUE;
    END IF;
    v_rez := public.activeaza_taxa_sportiv(v_id, p_tip, p_an);
    SELECT plata_id INTO v_plata FROM public.vize_sportivi WHERE sportiv_id = v_id AND an = p_an AND tip = p_tip;
    IF v_rez = 'facturat' THEN n_fact := n_fact + 1;
    ELSIF v_rez = 'in_asteptare' THEN n_ast := n_ast + 1;
    ELSIF v_rez = 'exista' THEN n_ex := n_ex + 1;
    ELSE n_ref := n_ref + 1; v_rez := 'refuzat';
    END IF;
    v_det := v_det || jsonb_build_object('sportiv_id', v_id, 'rezultat', v_rez, 'plata_id', v_plata);
  END LOOP;

  RETURN jsonb_build_object('facturat', n_fact, 'in_asteptare', n_ast, 'exista', n_ex, 'refuzat', n_ref, 'detalii', v_det);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.seteaza_scutire_taxa(
  p_sportiv_id uuid, p_tip text, p_an integer, p_scutit boolean, p_motiv text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE
  v record; v_club uuid; v_pl record; v_anulata uuid; v_plata uuid;
BEGIN
  IF p_tip IS NULL OR p_tip NOT IN ('FRQKD','FRAM') THEN
    RAISE EXCEPTION 'Tip de taxă invalid' USING ERRCODE = '22023';
  END IF;
  IF p_an IS NULL OR p_an < 2020 OR p_an > 2100 THEN
    RAISE EXCEPTION 'An invalid' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_scutit, false) AND btrim(coalesce(p_motiv, '')) = '' THEN
    RAISE EXCEPTION 'Motivul scutirii este obligatoriu' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_motiv, '')) > 500 THEN
    RAISE EXCEPTION 'Motivul scutirii este prea lung (maxim 500 de caractere)' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v FROM public.vize_sportivi WHERE sportiv_id = p_sportiv_id AND an = p_an AND tip = p_tip FOR UPDATE;
  IF FOUND THEN
    v_club := v.club_id;
  ELSE
    SELECT club_id INTO v_club FROM public.sportivi WHERE id = p_sportiv_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sportiv inexistent' USING ERRCODE = 'P0002'; END IF;
  END IF;
  IF v_club IS NULL OR NOT public.poate_gestiona_taxe_club(v_club) THEN
    RAISE EXCEPTION 'Acces refuzat: taxa aparține altui club' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(p_scutit, false) THEN
    IF EXISTS (SELECT 1 FROM public.decont_sportivi WHERE sportiv_id = p_sportiv_id AND an = p_an AND tip = p_tip) THEN
      RAISE EXCEPTION 'Taxa a fost deja virată federației — scutirea nu mai este posibilă' USING ERRCODE = 'P0001';
    END IF;
    IF v.id IS NOT NULL AND v.plata_id IS NOT NULL THEN
      SELECT id, status INTO v_pl FROM public.plati WHERE id = v.plata_id;
      IF v_pl.id IS NOT NULL THEN
        IF v_pl.status IN ('Achitat', 'Achitat Parțial')
           OR EXISTS (SELECT 1 FROM public.tranzactii t WHERE v_pl.id = ANY(t.plata_ids))
           OR EXISTS (SELECT 1 FROM public.tranzactie_plata tp WHERE tp.plata_id = v_pl.id) THEN
          RAISE EXCEPTION 'Factura taxei are încasări — anulează întâi încasarea' USING ERRCODE = 'P0001';
        END IF;
        IF v_pl.status <> 'Anulat' THEN
          UPDATE public.plati SET status = 'Anulat' WHERE id = v_pl.id;
          v_anulata := v_pl.id;
        END IF;
      END IF;
    END IF;
    IF v.id IS NULL THEN
      INSERT INTO public.vize_sportivi (sportiv_id, an, tip, club_id, status_viza, data_platii, scutit, motiv_scutire, scutit_de, scutit_la)
      VALUES (p_sportiv_id, p_an, p_tip, v_club, 'Activ', CURRENT_DATE, true, btrim(p_motiv), auth.uid(), now());
    ELSE
      UPDATE public.vize_sportivi
         SET scutit = true, motiv_scutire = btrim(p_motiv), scutit_de = auth.uid(), scutit_la = now()
       WHERE id = v.id;
    END IF;
    RETURN jsonb_build_object('stare', 'scutit', 'plata_id', NULL, 'plata_anulata_id', v_anulata);
  END IF;

  -- anulare scutire
  IF v.id IS NULL OR NOT v.scutit THEN
    RETURN jsonb_build_object('stare', CASE WHEN v.id IS NULL THEN 'negenerata' WHEN v.plata_id IS NULL THEN 'in_asteptare' ELSE 'facturat' END,
                              'plata_id', v.plata_id, 'plata_anulata_id', NULL);
  END IF;
  UPDATE public.vize_sportivi
     SET scutit = false, motiv_scutire = NULL, scutit_de = NULL, scutit_la = NULL, plata_id = NULL
   WHERE id = v.id;
  v_plata := public.factureaza_viza_taxa(v.id);
  RETURN jsonb_build_object('stare', CASE WHEN v_plata IS NULL THEN 'in_asteptare' ELSE 'facturat' END,
                            'plata_id', v_plata, 'plata_anulata_id', NULL);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.genereaza_taxe_anuale(uuid, text, integer, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.genereaza_taxe_anuale(uuid, text, integer, uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.seteaza_scutire_taxa(uuid, text, integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seteaza_scutire_taxa(uuid, text, integer, boolean, text) TO authenticated;
