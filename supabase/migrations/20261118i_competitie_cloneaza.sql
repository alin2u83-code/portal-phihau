-- Faza 45 (45-01): RPC competitie_cloneaza
-- NEAPLICATA, se aplica in 45-03 dupa OK explicit; supabase/ e in .gitignore, deci git add -f.
-- Decizii: D-01 (competitia noua e mereu draft, club_id NULL, legacy_eveniment_id NULL), D-03 (probele se copiaza separat; categoriile doar impreuna cu probele),
--   D-04 (un singur apel atomic, o tranzactie, fara clona partiala), D-05 (doar SUPER_ADMIN_FEDERATIE, garda reala in DB: is_super_admin()),
--   D-06 + D-07 (categoriile = lista EXACTA de id-uri calculata client-side; copiate ca activa, anulatele nu se transforma in ceva ascuns),
--   D-09 (numar_categorie si ordine_afisare renumerotate 1..N, proba_id remapat pe probele noi), D-10 (taxe si FRAM copiate ca atare cand bifa e activa),
--   D-16 (observatii = sursa clonata: denumire, id, data).
-- Ipoteze: A1 tipul tinta e parametru (tehnica/giao_dau/cvd); A2 bifa setari debifata => locatie/organizator NULL, taxe implicite CompetitieForm, fram false;
--   A3 categorii nenule fara probe = refuz 22023; A4 search_path = pg_catalog, public (ordinea din hardening-ul SEC-41-03, 20261115a);
--   A5 statusul nou e 'draft' (eticheta UI "Schita"; 'schita' ar incalca CHECK-ul); A6 reconstructia structurii initiale e doar in TypeScript (45-02), RPC doar valideaza apartenenta;
--   A7 unicitate denumire case-insensitive, sub advisory lock; A8 observatii noi = doar nota de clonare.
-- Functia NU sterge si NU modifica nimic existent: doar INSERT in competitii, probe_competitie, categorii_competitie.
--
-- Verificat live 18.11.2026:
-- (executor FARA Supabase MCP in aceasta sesiune: doar PostgREST cu service_role = OpenAPI + numaratori de date; catalogul pg_* NU a putut fi citit.
--  Acelasi tipar ca in 20261114a. Punctele marcate NEVERIFICAT se verifica la 45-03, INAINTE de apply, prin Supabase MCP.)
--   competitii: coloane obligatorii = id, denumire, tip, data_inceput, data_sfarsit, status (default 'draft'), deadline_inscrieri, fram_obligatoriu (default false);
--     facultative: locatie, organizator, club_id, taxa_individual (default 0), taxa_echipa (default 0), observatii, legacy_eveniment_id, config_taxe jsonb, created_at/updated_at (default now()).
--   probe_competitie: obligatorii competitie_id, tip_proba, denumire; ordine_afisare default 0. Nicio alta coloana.
--   categorii_competitie: obligatorii competitie_id, varsta_min, gen, tip_participare (default 'individual'), doua_quyenuri (default false);
--     coloane: proba_id, numar_categorie, denumire, varsta_max, grad_min_ordine, grad_max_ordine, arma, sportivi_per_echipa_min/max, rezerve_max, max_echipe_per_club,
--     min_participanti_start, ordine_afisare, max_membri_echipa, min_membri_start, este_fuzionata, categorii_fuzionate_din uuid[], status_categorie. Fara timestamps.
--     => nicio coloana NOT NULL fara default nu e acoperita de lista din plan; nicio coloana noua fata de cercetare.
--   competitie_cloneaza lipseste live (PGRST202 la apel; nu apare in OpenAPI /rpc). is_super_admin() exista live (folosita de 20261114a / 20261115b).
--   Forma datelor (numaratori, fara date personale): 5 competitii = tehnica/finalizata 2, tehnica/inscrieri_deschise 1, cvd/finalizata 1, cvd/inscrieri_deschise 1;
--     1 denumire duplicata (lower/btrim) deja in competitii => nu exista UNIQUE live pe denumire, verificarea din functie e doar pentru clonele noi.
--     2 competitii "Juniori 1, Seniori, Veterani": una cu 74 categorii (toate activa, 0 fuzionate), 4 probe; alta cu 84 categorii (68 activa, 2 fuzionata, 9 anulata, 5 impartita),
--     2 cu este_fuzionata = true, 2 cu id in categorii_fuzionate_din (autoreferinta legacy, Pitfall 1 => functia seteaza explicit NULL), 4 probe;
--     0 categorii cu proba_id dintr-o alta competitie.
--   Regasit in migrari (netestat live): trg_competitii_fram_imutabil BEFORE INSERT (20261115b: fram_obligatoriu = true cere is_super_admin(), trece, garda e prima),
--     audit_categorii_competitie AFTER INSERT (un rand audit_log per categorie, asteptat).
--   NEVERIFICAT live (de reverificat la 45-03): rolbypassrls al lui postgres (in 20261114a verificat true), FORCE RLS pe cele 3 tabele (20261114a: da),
--     lista pg_policies (fantoma), pg_trigger (alt BEFORE INSERT in afara de trg_competitii_fram_imutabil), CHECK pe competitii.tip / status / competitii_deadline_inainte_de_start,
--     UNIQUE pe categorii_competitie (competitie_id, numar_categorie) (asteptat: niciuna), corpul is_super_admin() si search_path-ul lui, event trigger-e (functia nu creeaza tabele).
--     Conditiile STOP (a)-(c) din plan NU au putut fi evaluate din catalog; (d) evaluata mai sus: neatinsa.

CREATE OR REPLACE FUNCTION public.competitie_cloneaza(
  p_sursa        uuid,
  p_denumire     text,
  p_tip          text,
  p_data_inceput date,
  p_data_sfarsit date,
  p_deadline     date,
  p_setari       boolean DEFAULT true,
  p_probe        boolean DEFAULT true,
  p_categorii    uuid[]  DEFAULT '{}'::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_den  text;
  v_src  public.competitii%ROWTYPE;
  v_new  uuid;
  v_map  jsonb := '{}'::jsonb;
  v_np   integer := 0;
  v_nc   integer := 0;
  v_cnt  integer;
  v_pr   record;
  v_pid  uuid;
BEGIN
  -- A. Garda (D-04, D-05): prima instructiune.
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501';
  END IF;

  -- B. Parametri.
  v_den := btrim(COALESCE(p_denumire, ''));
  IF char_length(v_den) < 1 OR char_length(v_den) > 200 THEN
    RAISE EXCEPTION 'Denumire invalidă.' USING ERRCODE = '22023';
  END IF;
  IF p_tip IS NULL OR p_tip NOT IN ('tehnica', 'giao_dau', 'cvd') THEN
    RAISE EXCEPTION 'Tip de competiție invalid.' USING ERRCODE = '22023';
  END IF;
  IF p_data_inceput IS NULL OR p_data_sfarsit IS NULL OR p_deadline IS NULL
     OR p_data_sfarsit < p_data_inceput OR p_deadline > p_data_inceput THEN
    RAISE EXCEPTION 'Date invalide: sfârșitul nu poate fi înainte de început, iar termenul de înscriere nu poate fi după început.'
      USING ERRCODE = '22023';
  END IF;
  IF p_setari IS NULL OR p_probe IS NULL THEN
    RAISE EXCEPTION 'Parametri invalizi.' USING ERRCODE = '22023';
  END IF;
  p_categorii := COALESCE(p_categorii, '{}'::uuid[]);
  IF cardinality(p_categorii) > 0 AND NOT p_probe THEN
    RAISE EXCEPTION 'Categoriile se copiază doar împreună cu probele.' USING ERRCODE = '22023';
  END IF;

  -- C. Serializare (dublu click / doi super admini) + sursa + unicitate denumire.
  PERFORM pg_advisory_xact_lock(hashtext('competitie_cloneaza'));
  SELECT * INTO v_src FROM public.competitii WHERE id = p_sursa FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competiția sursă nu există.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.competitii c WHERE lower(btrim(c.denumire)) = lower(v_den)) THEN
    RAISE EXCEPTION 'Există deja o competiție cu această denumire.' USING ERRCODE = '23505';
  END IF;

  -- D. Id-urile de categorii apartin sursei (respinge si duplicatele) si probele lor tot.
  IF cardinality(p_categorii) > 0 THEN
    SELECT count(*) INTO v_cnt
      FROM public.categorii_competitie k
     WHERE k.id = ANY(p_categorii) AND k.competitie_id = p_sursa;
    IF v_cnt <> cardinality(p_categorii) THEN
      RAISE EXCEPTION 'Lista de categorii nu aparține competiției sursă.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.categorii_competitie k
       WHERE k.id = ANY(p_categorii) AND k.proba_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.probe_competitie p
                          WHERE p.id = k.proba_id AND p.competitie_id = p_sursa)
    ) THEN
      RAISE EXCEPTION 'O categorie selectată are o probă din altă competiție.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- E. Competitia noua (D-01, D-10, D-16). trg_competitii_fram_imutabil trece: apelantul e super admin.
  INSERT INTO public.competitii (
    denumire, tip, data_inceput, data_sfarsit, deadline_inscrieri, status, club_id, legacy_eveniment_id,
    observatii, locatie, organizator, config_taxe, taxa_individual, taxa_echipa, fram_obligatoriu
  ) VALUES (
    v_den, p_tip, p_data_inceput, p_data_sfarsit, p_deadline, 'draft', NULL, NULL,
    'Clonată din ' || v_src.denumire || ' (' || v_src.id || ') la ' || to_char(now() AT TIME ZONE 'Europe/Bucharest', 'DD.MM.YYYY'),
    CASE WHEN p_setari THEN v_src.locatie END,
    CASE WHEN p_setari THEN v_src.organizator END,
    CASE WHEN p_setari THEN v_src.config_taxe
         ELSE '{"individual_tehnica":80,"individual_cvd":80,"echipa_seniori":120,"echipa_juniori":150,"cvd_echipa":80,"currency":"RON"}'::jsonb END,
    CASE WHEN p_setari THEN v_src.taxa_individual ELSE 80 END,
    CASE WHEN p_setari THEN v_src.taxa_echipa ELSE 120 END,
    CASE WHEN p_setari THEN v_src.fram_obligatoriu ELSE false END
  ) RETURNING id INTO v_new;

  -- F. Probe (D-03): harta id vechi -> id nou (nu exista UNIQUE pe tip_proba).
  IF p_probe THEN
    FOR v_pr IN
      SELECT p.id, p.tip_proba, p.denumire, p.ordine_afisare
        FROM public.probe_competitie p
       WHERE p.competitie_id = p_sursa
       ORDER BY p.ordine_afisare, p.id
    LOOP
      INSERT INTO public.probe_competitie (competitie_id, tip_proba, denumire, ordine_afisare)
      VALUES (v_new, v_pr.tip_proba, v_pr.denumire, v_pr.ordine_afisare)
      RETURNING id INTO v_pid;
      v_map := v_map || jsonb_build_object(v_pr.id::text, v_pid);
      v_np := v_np + 1;
    END LOOP;
  END IF;

  -- G. Categorii (D-06, D-07, D-09): renumerotate 1..N; statusul/fuziunea nu se copiaza (ar indica id-uri din alta competitie).
  IF cardinality(p_categorii) > 0 THEN
    INSERT INTO public.categorii_competitie (
      competitie_id, proba_id, numar_categorie, ordine_afisare, denumire, varsta_min, varsta_max, gen,
      grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max,
      rezerve_max, max_echipe_per_club, min_participanti_start, max_membri_echipa, min_membri_start, doua_quyenuri,
      status_categorie, este_fuzionata, categorii_fuzionate_din
    )
    SELECT v_new, (v_map ->> k.proba_id::text)::uuid, k.rn, k.rn, k.denumire, k.varsta_min, k.varsta_max, k.gen,
           k.grad_min_ordine, k.grad_max_ordine, k.arma, k.tip_participare, k.sportivi_per_echipa_min, k.sportivi_per_echipa_max,
           k.rezerve_max, k.max_echipe_per_club, k.min_participanti_start, k.max_membri_echipa, k.min_membri_start, k.doua_quyenuri,
           'activa', false, NULL::uuid[]
      FROM (
        SELECT c.*, row_number() OVER (ORDER BY c.ordine_afisare, c.numar_categorie, c.id)::integer AS rn
          FROM public.categorii_competitie c
         WHERE c.id = ANY(p_categorii) AND c.competitie_id = p_sursa
      ) k;
    GET DIAGNOSTICS v_nc = ROW_COUNT;
  END IF;

  -- H.
  RETURN jsonb_build_object('id', v_new, 'probe', v_np, 'categorii', v_nc);
END;
$$;

COMMENT ON FUNCTION public.competitie_cloneaza(uuid, text, text, date, date, date, boolean, boolean, uuid[]) IS
  'Faza 45: clonează atomic o competiție (setări, probe, categorii explicit listate) într-una nouă în draft; doar super admin federație, nu modifică nimic existent.';

REVOKE ALL ON FUNCTION public.competitie_cloneaza(uuid, text, text, date, date, date, boolean, boolean, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.competitie_cloneaza(uuid, text, text, date, date, date, boolean, boolean, uuid[]) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Rollback: DROP FUNCTION IF EXISTS public.competitie_cloneaza(uuid, text, text, date, date, date, boolean, boolean, uuid[]);
--   (competitiile deja clonate raman: sunt randuri draft obisnuite.)
