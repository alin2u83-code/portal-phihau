-- Faza 41 (41-01): RPC atomic pentru operatii pe categoriile unei competitii (anulare / fuziune / impartire / mutare).
-- APLICATA LIVE 14.11.2026 (41-04, dupa OK explicit). supabase/ e in .gitignore, deci git add -f.
-- Decizii: D-01 (doar SUPER_ADMIN_FEDERATIE, garda reala in DB: is_super_admin()), D-03 (mutare automata dupa mapare explicita din preview,
--   refuz daca inscrierile s-au schimbat), D-04 + D-07 (anulare: randurile raman legate de categoria ne-activa = "Fara categorie", fara DROP NOT NULL),
--   D-08 (anulare: raporteaza taxele nedatorate si cele achitate de realocat/returnat; taxele sunt derivate, nu randuri in plati),
--   D-09 (blocat doar cand competitia e finalizata).
-- Functia NU sterge nimic: sursele pastreaza randurile cu status_categorie anulata / fuzionata / impartita.
--
-- Verificat live 14.11.2026 (executor FARA Supabase MCP: doar PostgREST cu service_role = OpenAPI + numaratori; catalogul pg_* nu a putut fi citit):
--   categorii_competitie: coloane obligatorii fara default = competitie_id, varsta_min, gen (tip_participare si doua_quyenuri au default);
--     coloane cu default copiate din categoria sursa: proba_id, arma, tip_participare, sportivi_per_echipa_min/max, rezerve_max, max_echipe_per_club,
--     min_participanti_start, max_membri_echipa, min_membri_start, doua_quyenuri; status_categorie default 'activa'; este_fuzionata default false; categorii_fuzionate_din uuid[].
--   inscrieri_competitie: obligatorii categorie_id, club_id, sportiv_id, status (default 'inscris'), taxa_achitata default false;
--     echipe_competitie: obligatorii categorie_id, club_id, status (default 'inscrisa'), taxa_achitata default false (echipe nu are coloana sportiv_id).
--   categorii: 467 activa, 9 anulata, 2 fuzionata, 5 impartita; 2 cu este_fuzionata = true. competitii: 3 finalizata, 2 inscrieri_deschise.
--   inscrieri 1149 (toate status 'inscris'), echipe 614 (613 'inscrisa', 1 'retrasa'); inscrieri/echipe active pe categorii ne-active = 0 / 0 (nu exista orfani).
--   Legatura taxe (D-08): plati nu are nicio coloana cu competi/inscriere/echipa/categor, iar plati cu tip ILIKE '%competi%' = 0 randuri
--     => modelul derivat din D-08 e confirmat live pe date; nu s-a atins STOP (b) la nivel de coloane/date (functii pg_proc care scriu in plati: neverificat, vezi mai jos).
--   categorii_aplica_operatie lipseste live (nu apare in OpenAPI /rpc). is_super_admin() exista live (apare in /rpc).
--
-- VERIFICAT live 14.11.2026 (41-04, prin Supabase MCP, inainte de apply):
--   (1) postgres rolbypassrls = true (definer poate scrie prin FORCE RLS).
--   (2) competitii / categorii_competitie / inscrieri_competitie / echipe_competitie / plati: RLS + FORCE.
--   (3) politicile pe cele 3 tabele nu afecteaza functia definer (bypass).
--   (4) is_super_admin() citeste header-ul active-role-context-id; audit_trigger_fn este SECURITY DEFINER.
--   (5) Triggere: audit_* (audit_trigger_fn), trg_extern_protejeaza_campuri (no-op fara este_doar_extern), trg_inscrieri_sportiv_in_club (doar UPDATE OF sportiv_id),
--       trg_taxa_anuala_inscrieri_competitie (doar AFTER INSERT, apeleaza activeaza_taxa_anuala), trg_echipe_denumire_implicita (BEFORE INSERT).
--   (6) UNIQUE(categorie_id, sportiv_id) si UNIQUE(competitie_id, sportiv_id, categorie_id) pe inscrieri; niciuna pe echipe.
--   (7) nicio functie care scrie in plati nu este atinsa de aceasta functie.
--   (8) event trigger-ele nu sunt relevante (functia nu creeaza tabele).
--   Dupa apply: prosecdef = true, argumente corecte, grant = postgres/authenticated/service_role (anon fara EXECUTE).

CREATE OR REPLACE FUNCTION public.categorii_aplica_operatie(
  p_operatie       text,
  p_competitie     uuid,
  p_surse          uuid[] DEFAULT '{}'::uuid[],
  p_categorii_noi  jsonb  DEFAULT '[]'::jsonb,
  p_mutari         jsonb  DEFAULT '[]'::jsonb,
  p_asteptat       integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_re      text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_status  text;
  v_n       integer;
  v_x       integer;
  v_y       integer;
  v_cnt_m   integer;
  v_activi  integer;
  v_nec     integer;
  v_s1      public.categorii_competitie%ROWTYPE;
  v_el      jsonb;
  v_ord     bigint;
  v_cheie   text;
  v_cheile  text[] := '{}';
  v_next    integer;
  v_ordine  integer;
  v_new_id  uuid;
  v_new_nr  integer;
  v_map     jsonb := '{}'::jsonb;
  v_noi_ids uuid[] := '{}'::uuid[];
  v_noi_res jsonb := '[]'::jsonb;
  v_ni      integer := 0;
  v_ne      integer := 0;
  v_tn      integer := 0;
  v_ta      integer := 0;
  v_sp      uuid;
  v_nume    text;
BEGIN
  -- A. Garda (D-01): functia ocoleste RLS, deci aceasta verificare este singura poarta.
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501';
  END IF;

  -- B. Parametri.
  IF p_operatie IS NULL OR p_operatie NOT IN ('anulare', 'fuziune', 'impartire', 'mutare') THEN
    RAISE EXCEPTION 'Operație necunoscută.' USING ERRCODE = '22023';
  END IF;
  p_surse := COALESCE(p_surse, '{}'::uuid[]);
  p_categorii_noi := COALESCE(p_categorii_noi, '[]'::jsonb);
  p_mutari := COALESCE(p_mutari, '[]'::jsonb);
  IF jsonb_typeof(p_categorii_noi) <> 'array' OR jsonb_typeof(p_mutari) <> 'array' THEN
    RAISE EXCEPTION 'Parametrii categorii noi și mutări trebuie să fie liste.' USING ERRCODE = '22023';
  END IF;

  -- C. Blocare competitie (serializeaza dublu-click si doi admini; INSERT-urile clubului in inscrieri/echipe asteapta, FK = KEY SHARE).
  SELECT c.status INTO v_status FROM public.competitii c WHERE c.id = p_competitie FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competiția nu există.' USING ERRCODE = '22023';
  END IF;
  IF v_status = 'finalizata' THEN
    RAISE EXCEPTION 'Competiția este finalizată; categoriile nu se mai pot modifica.' USING ERRCODE = '22023';
  END IF;

  -- D. Categorii sursa.
  IF p_operatie = 'mutare' THEN
    IF cardinality(p_surse) <> 0 OR jsonb_array_length(p_categorii_noi) <> 0 THEN
      RAISE EXCEPTION 'Parametri invalizi pentru mutare.' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM unnest(p_surse) s WHERE s IS NULL) THEN
      RAISE EXCEPTION 'Număr de categorii sursă invalid pentru operația %.', p_operatie USING ERRCODE = '22023';
    END IF;
    SELECT count(DISTINCT s) INTO v_n FROM unnest(p_surse) s;
    IF (p_operatie IN ('anulare', 'impartire') AND v_n <> 1) OR (p_operatie = 'fuziune' AND v_n < 2) THEN
      RAISE EXCEPTION 'Număr de categorii sursă invalid pentru operația %.', p_operatie USING ERRCODE = '22023';
    END IF;

    PERFORM 1 FROM public.categorii_competitie WHERE id = ANY(p_surse) ORDER BY id FOR UPDATE;
    SELECT count(*) INTO v_x
      FROM public.categorii_competitie k
     WHERE k.id = ANY(p_surse) AND k.competitie_id = p_competitie AND COALESCE(k.status_categorie, 'activa') = 'activa';
    IF v_x <> v_n THEN
      RAISE EXCEPTION 'Categoriile sursă trebuie să fie active și din această competiție.' USING ERRCODE = '22023';
    END IF;

    IF p_operatie = 'fuziune' THEN
      SELECT count(*) INTO v_x
        FROM (SELECT DISTINCT k.proba_id, k.tip_participare, k.arma FROM public.categorii_competitie k WHERE k.id = ANY(p_surse)) d;
      IF v_x <> 1 THEN
        RAISE EXCEPTION 'Categoriile nu sunt compatibile (aceeași probă, tip de participare și armă).' USING ERRCODE = '22023';
      END IF;
    END IF;

    SELECT * INTO v_s1 FROM public.categorii_competitie k
     WHERE k.id = ANY(p_surse) ORDER BY k.ordine_afisare, k.numar_categorie, k.id LIMIT 1;
  END IF;

  -- E. Categorii noi (fuziune: exact 1; impartire: >= 2; altfel 0).
  v_nec := jsonb_array_length(p_categorii_noi);
  IF (p_operatie = 'fuziune' AND v_nec <> 1) OR (p_operatie = 'impartire' AND v_nec < 2)
     OR (p_operatie IN ('anulare', 'mutare') AND v_nec <> 0) THEN
    RAISE EXCEPTION 'Număr de categorii noi invalid.' USING ERRCODE = '22023';
  END IF;

  FOR v_el, v_ord IN SELECT e.value, e.ordinality FROM jsonb_array_elements(p_categorii_noi) WITH ORDINALITY AS e(value, ordinality) LOOP
    v_cheie := v_el ->> 'cheie';
    BEGIN
      IF v_cheie IS NULL OR btrim(v_cheie) = '' OR v_cheie = ANY(v_cheile)
         OR char_length(btrim(COALESCE(v_el ->> 'denumire', ''))) NOT BETWEEN 1 AND 200
         OR (v_el ->> 'varsta_min') IS NULL OR (v_el ->> 'varsta_min')::integer NOT BETWEEN 0 AND 120
         OR ((v_el ->> 'varsta_max') IS NOT NULL
             AND (v_el ->> 'varsta_max')::integer NOT BETWEEN (v_el ->> 'varsta_min')::integer AND 120)
         OR COALESCE(v_el ->> 'gen', '') NOT IN ('Feminin', 'Masculin', 'Mixt')
         OR ((v_el ->> 'grad_min_ordine') IS NOT NULL AND (v_el ->> 'grad_min_ordine')::integer NOT BETWEEN 1 AND 100)
         OR ((v_el ->> 'grad_max_ordine') IS NOT NULL AND (v_el ->> 'grad_max_ordine')::integer NOT BETWEEN 1 AND 100)
         OR ((v_el ->> 'grad_min_ordine') IS NOT NULL AND (v_el ->> 'grad_max_ordine') IS NOT NULL
             AND (v_el ->> 'grad_min_ordine')::integer > (v_el ->> 'grad_max_ordine')::integer) THEN
        RAISE EXCEPTION 'Definiție invalidă pentru categoria nouă %.', COALESCE(v_cheie, v_ord::text) USING ERRCODE = '22023';
      END IF;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Definiție invalidă pentru categoria nouă %.', COALESCE(v_cheie, v_ord::text) USING ERRCODE = '22023';
    END;
    v_cheile := v_cheile || v_cheie;
  END LOOP;

  -- F. Mutari (participantii se identifica explicit; nimic nu se deduce pe server).
  v_cnt_m := jsonb_array_length(p_mutari);
  IF p_operatie = 'anulare' AND v_cnt_m <> 0 THEN
    RAISE EXCEPTION 'Anularea nu primește mutări; participanții rămân pe categoria anulată.' USING ERRCODE = '22023';
  END IF;

  IF v_cnt_m > 0 THEN
    SELECT count(*) INTO v_x
      FROM (SELECT DISTINCT m.tip, m.id FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)) d;
    SELECT count(*) INTO v_y
      FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
     WHERE m.tip IN ('inscriere', 'echipa') AND m.id IS NOT NULL AND btrim(COALESCE(m.tinta, '')) <> '';
    IF v_x <> v_cnt_m OR v_y <> v_cnt_m THEN
      RAISE EXCEPTION 'Listă de mutări invalidă (tip, id sau țintă lipsă ori dublat).' USING ERRCODE = '22023';
    END IF;

    -- Randurile retrase nu se muta niciodata: raman pe sursa ca istoric.
    WITH r AS (
      SELECT 'inscriere'::text AS tip, i.id, i.categorie_id FROM public.inscrieri_competitie i
       WHERE i.competitie_id = p_competitie AND lower(COALESCE(i.status, '')) <> 'retras'
      UNION ALL
      SELECT 'echipa'::text, e.id, e.categorie_id FROM public.echipe_competitie e
       WHERE e.competitie_id = p_competitie AND lower(COALESCE(e.status, '')) <> 'retrasa'
    )
    SELECT count(*), count(*) FILTER (WHERE r.categorie_id = ANY(p_surse) AND m.tinta = ANY(v_cheile))
      INTO v_x, v_y
      FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
      JOIN r ON r.tip = m.tip AND r.id = m.id;
    IF v_x <> v_cnt_m THEN
      RAISE EXCEPTION 'Un participant din listă nu există, este retras sau aparține altei competiții.' USING ERRCODE = '22023';
    END IF;

    IF p_operatie IN ('fuziune', 'impartire') THEN
      IF v_y <> v_cnt_m THEN
        RAISE EXCEPTION 'Mutare invalidă: participantul nu este în categoria sursă sau ținta nu este o categorie nouă.' USING ERRCODE = '22023';
      END IF;
    ELSE
      -- mutare: tinta = uuid-ul unei categorii active din aceeasi competitie, compatibila cu categoria curenta a randului
      WITH r AS (
        SELECT 'inscriere'::text AS tip, i.id, i.categorie_id FROM public.inscrieri_competitie i
         WHERE i.competitie_id = p_competitie AND lower(COALESCE(i.status, '')) <> 'retras'
        UNION ALL
        SELECT 'echipa'::text, e.id, e.categorie_id FROM public.echipe_competitie e
         WHERE e.competitie_id = p_competitie AND lower(COALESCE(e.status, '')) <> 'retrasa'
      )
      SELECT count(*) INTO v_y
        FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
        JOIN r ON r.tip = m.tip AND r.id = m.id
        JOIN public.categorii_competitie c ON c.id = r.categorie_id
        JOIN public.categorii_competitie t ON t.id = (CASE WHEN m.tinta ~ v_re THEN m.tinta::uuid END)
       WHERE t.competitie_id = p_competitie
         AND COALESCE(t.status_categorie, 'activa') = 'activa'
         AND t.id <> r.categorie_id
         AND c.proba_id IS NOT DISTINCT FROM t.proba_id
         AND c.tip_participare = t.tip_participare
         AND c.arma IS NOT DISTINCT FROM t.arma;
      IF v_y <> v_cnt_m THEN
        RAISE EXCEPTION 'Categoria țintă nu este activă sau nu este compatibilă (aceeași probă, tip de participare și armă).' USING ERRCODE = '22023';
      END IF;
    END IF;
  ELSIF p_operatie IN ('fuziune', 'impartire', 'mutare') THEN
    -- fuziune/impartire fara nicio mutare e valid doar daca sursele nu au participanti activi (verificat la G); mutare fara elemente nu are sens
    IF p_operatie = 'mutare' THEN
      RAISE EXCEPTION 'Nu există participanți de mutat.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- G. Drift (D-03): ce a vazut super adminul in preview trebuie sa fie exact ce exista acum.
  IF p_operatie <> 'mutare' THEN
    SELECT (SELECT count(*) FROM public.inscrieri_competitie i
             WHERE i.categorie_id = ANY(p_surse) AND lower(COALESCE(i.status, '')) <> 'retras')
         + (SELECT count(*) FROM public.echipe_competitie e
             WHERE e.categorie_id = ANY(p_surse) AND lower(COALESCE(e.status, '')) <> 'retrasa')
      INTO v_activi;
    IF p_operatie = 'anulare' THEN
      IF p_asteptat IS DISTINCT FROM v_activi THEN
        RAISE EXCEPTION 'Înscrierile s-au modificat între timp (în previzualizare: %, acum: %); redeschide previzualizarea.',
          COALESCE(p_asteptat::text, 'nespecificat'), v_activi USING ERRCODE = '22023';
      END IF;
    ELSIF v_activi <> v_cnt_m THEN
      RAISE EXCEPTION 'Înscrierile s-au modificat între timp (în previzualizare: %, acum: %); redeschide previzualizarea.',
        v_cnt_m, v_activi USING ERRCODE = '22023';
    END IF;
  END IF;

  -- H. Dubluri (UNIQUE categorie_id, sportiv_id): in lista de mutari si fata de randurile deja existente in categoria tinta.
  IF v_cnt_m > 0 THEN
    WITH mv AS (
      SELECT m.id, m.tinta, i.sportiv_id
        FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
        JOIN public.inscrieri_competitie i ON i.id = m.id
       WHERE m.tip = 'inscriere'
    )
    SELECT d.sportiv_id INTO v_sp
      FROM (
        SELECT g.sportiv_id FROM mv g GROUP BY g.tinta, g.sportiv_id HAVING count(*) > 1
        UNION ALL
        SELECT mv.sportiv_id
          FROM mv
          JOIN public.inscrieri_competitie ex
            ON p_operatie = 'mutare'
           AND ex.categorie_id = (CASE WHEN mv.tinta ~ v_re THEN mv.tinta::uuid END)
           AND ex.sportiv_id = mv.sportiv_id
           AND ex.id NOT IN (SELECT m2.id FROM mv m2)
      ) d
     LIMIT 1;
    IF v_sp IS NOT NULL THEN
      SELECT btrim(COALESCE(s.nume, '') || ' ' || COALESCE(s.prenume, '')) INTO v_nume FROM public.sportivi s WHERE s.id = v_sp;
      RAISE EXCEPTION 'Sportivul % ar apărea de două ori în categoria țintă; rezolvă dublura înainte.', COALESCE(v_nume, v_sp::text)
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- I. Aplicare. Nimic nu se sterge.
  IF v_nec > 0 THEN
    SELECT COALESCE(max(k.numar_categorie), 0) INTO v_next FROM public.categorii_competitie k WHERE k.competitie_id = p_competitie;
    SELECT min(k.ordine_afisare) INTO v_ordine FROM public.categorii_competitie k WHERE k.id = ANY(p_surse);

    FOR v_el, v_ord IN SELECT e.value, e.ordinality FROM jsonb_array_elements(p_categorii_noi) WITH ORDINALITY AS e(value, ordinality) LOOP
      INSERT INTO public.categorii_competitie (
        competitie_id, proba_id, arma, tip_participare,
        sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club,
        min_participanti_start, max_membri_echipa, min_membri_start, doua_quyenuri,
        denumire, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine,
        numar_categorie, ordine_afisare, status_categorie, este_fuzionata, categorii_fuzionate_din
      ) VALUES (
        p_competitie, v_s1.proba_id, v_s1.arma, v_s1.tip_participare,
        v_s1.sportivi_per_echipa_min, v_s1.sportivi_per_echipa_max, v_s1.rezerve_max, v_s1.max_echipe_per_club,
        v_s1.min_participanti_start, v_s1.max_membri_echipa, v_s1.min_membri_start, v_s1.doua_quyenuri,
        btrim(v_el ->> 'denumire'), (v_el ->> 'varsta_min')::integer, (v_el ->> 'varsta_max')::integer, v_el ->> 'gen',
        (v_el ->> 'grad_min_ordine')::integer, (v_el ->> 'grad_max_ordine')::integer,
        v_next + v_ord::integer, v_ordine, 'activa', (p_operatie = 'fuziune'),
        CASE WHEN p_operatie = 'fuziune' THEN p_surse ELSE NULL END
      ) RETURNING id, numar_categorie INTO v_new_id, v_new_nr;

      v_map := v_map || jsonb_build_object(v_el ->> 'cheie', v_new_id);
      v_noi_ids := v_noi_ids || v_new_id;
      v_noi_res := v_noi_res || jsonb_build_array(jsonb_build_object('cheie', v_el ->> 'cheie', 'id', v_new_id, 'numar_categorie', v_new_nr));
    END LOOP;
  END IF;

  IF v_cnt_m > 0 THEN
    IF p_operatie = 'mutare' THEN
      UPDATE public.inscrieri_competitie i SET categorie_id = m.tinta::uuid
        FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
       WHERE m.tip = 'inscriere' AND i.id = m.id;
      GET DIAGNOSTICS v_ni = ROW_COUNT;
      UPDATE public.echipe_competitie e SET categorie_id = m.tinta::uuid
        FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
       WHERE m.tip = 'echipa' AND e.id = m.id;
      GET DIAGNOSTICS v_ne = ROW_COUNT;
    ELSE
      UPDATE public.inscrieri_competitie i SET categorie_id = (v_map ->> m.tinta)::uuid
        FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
       WHERE m.tip = 'inscriere' AND i.id = m.id;
      GET DIAGNOSTICS v_ni = ROW_COUNT;
      UPDATE public.echipe_competitie e SET categorie_id = (v_map ->> m.tinta)::uuid
        FROM jsonb_to_recordset(p_mutari) AS m(tip text, id uuid, tinta text)
       WHERE m.tip = 'echipa' AND e.id = m.id;
      GET DIAGNOSTICS v_ne = ROW_COUNT;
    END IF;
  END IF;

  IF p_operatie = 'anulare' THEN
    UPDATE public.categorii_competitie SET status_categorie = 'anulata' WHERE id = ANY(p_surse);
    -- D-08: taxele sunt derivate (nu exista rand in plati); categoria anulata nu mai e activa, deci taxa nu mai e datorata.
    -- Taxele deja achitate raman marcate achitate si se raporteaza ca "de realocat / de returnat"; flag-ul taxa_achitata nu se schimba aici.
    SELECT (SELECT count(*) FROM public.inscrieri_competitie i
             WHERE i.categorie_id = ANY(p_surse) AND lower(COALESCE(i.status, '')) <> 'retras' AND NOT COALESCE(i.taxa_achitata, false))
         + (SELECT count(*) FROM public.echipe_competitie e
             WHERE e.categorie_id = ANY(p_surse) AND lower(COALESCE(e.status, '')) <> 'retrasa' AND NOT COALESCE(e.taxa_achitata, false)),
           (SELECT count(*) FROM public.inscrieri_competitie i
             WHERE i.categorie_id = ANY(p_surse) AND lower(COALESCE(i.status, '')) <> 'retras' AND COALESCE(i.taxa_achitata, false))
         + (SELECT count(*) FROM public.echipe_competitie e
             WHERE e.categorie_id = ANY(p_surse) AND lower(COALESCE(e.status, '')) <> 'retrasa' AND COALESCE(e.taxa_achitata, false))
      INTO v_tn, v_ta;
  ELSIF p_operatie = 'fuziune' THEN
    UPDATE public.categorii_competitie SET status_categorie = 'fuzionata' WHERE id = ANY(p_surse);
  ELSIF p_operatie = 'impartire' THEN
    UPDATE public.categorii_competitie SET status_categorie = 'impartita', categorii_fuzionate_din = v_noi_ids WHERE id = ANY(p_surse);
  END IF;

  -- J. Rezultat.
  RETURN jsonb_build_object(
    'operatie', p_operatie,
    'categorii_noi', v_noi_res,
    'inscrieri_mutate', v_ni,
    'echipe_mutate', v_ne,
    'taxe_anulate', v_tn,
    'taxe_achitate_anulate', v_ta
  );
END;
$$;

COMMENT ON FUNCTION public.categorii_aplica_operatie(text, uuid, uuid[], jsonb, jsonb, integer) IS
  'Faza 41: aplica atomic anulare, fuziune, impartire sau mutare pe categoriile unei competitii; doar super admin federatie, refuza competitiile finalizate, nu sterge nimic.';

REVOKE ALL ON FUNCTION public.categorii_aplica_operatie(text, uuid, uuid[], jsonb, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.categorii_aplica_operatie(text, uuid, uuid[], jsonb, jsonb, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Rollback: DROP FUNCTION IF EXISTS public.categorii_aplica_operatie(text, uuid, uuid[], jsonb, jsonb, integer);
