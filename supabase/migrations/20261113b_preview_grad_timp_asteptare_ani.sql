-- Faza 40 (review finding 2): timp_asteptare in ani (ex. '1 an') = x12 luni, ca utils/eligibility.ts parseDurationToMonths.
CREATE OR REPLACE FUNCTION public.previzualizeaza_schimbare_grad(p_sportiv uuid, p_competitie uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    v_club      uuid;
    v_sp        record;
    v_comp      record;
    v_azi       date := (now() AT TIME ZONE 'Europe/Bucharest')::date;
    v_varsta    int;
    v_ord_cur   int := 0;
    v_grad_cur  uuid;
    v_nou       record;
    v_tip       text;
    v_taxa      numeric;
    v_blocat    text;
    v_ultima    date;
    v_luni      int;
    v_elig      date;
    v_rest      interval;
    v_luni_rest int;
    v_dup       date;
    v_altele    jsonb;
    v_anulabil  jsonb;
    v_terminata boolean;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
    v_club := public.cont_club_curent();
    IF v_club IS NULL THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont r
                    WHERE r.user_id = auth.uid() AND r.rol_denumire = 'REPREZENTANT_COMPETITIE') THEN
        RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501';
    END IF;
    SELECT s.id, s.club_id, s.data_nasterii, s.grad_actual_id INTO v_sp FROM public.sportivi s WHERE s.id = p_sportiv;
    IF NOT FOUND OR v_sp.club_id IS DISTINCT FROM v_club THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
    IF NOT public.acces_extern_sportiv_competitie(p_sportiv, p_competitie) THEN
        RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501';
    END IF;
    SELECT c.id, c.status, c.data_inceput, c.data_sfarsit, c.deadline_inscrieri INTO v_comp FROM public.competitii c WHERE c.id = p_competitie;

    v_terminata := v_comp.status = 'finalizata' OR COALESCE(v_comp.data_sfarsit < v_azi, false);
    IF v_terminata THEN v_blocat := 'Competiția s-a încheiat; gradul nu se mai poate schimba de aici.'; END IF;

    IF v_sp.data_nasterii IS NULL THEN
        v_blocat := COALESCE(v_blocat, 'Sportivul nu are data nașterii; vârsta nu poate fi verificată.');
        v_varsta := NULL;
    ELSE
        v_varsta := date_part('year', age(v_comp.data_inceput, v_sp.data_nasterii))::int;   -- varsta la data competitiei
    END IF;

    v_grad_cur := v_sp.grad_actual_id;
    IF v_grad_cur IS NOT NULL THEN
        SELECT g.ordine INTO v_ord_cur FROM public.grade g WHERE g.id = v_grad_cur;
        v_ord_cur := COALESCE(v_ord_cur, 0);
    END IF;

    -- D-02: echivalare 1 Cap Rosu .. C.V. 4 Cap Alb (ordine 6..14, verificat live 12.11.2026) -> 1 Cap Albastru (ordine 15), la 13 ani
    IF v_varsta IS NOT NULL AND v_varsta >= 13 AND v_ord_cur BETWEEN 6 AND 14 THEN
        v_tip := 'echivalare';
        SELECT g.id, g.nume, g.ordine, g.varsta_minima, g.timp_asteptare INTO v_nou FROM public.grade g WHERE g.ordine = 15;
        v_taxa := 0;
    ELSE
        -- D-01: promovare = urmatorul grad (+1), niciodata ales de apelant
        v_tip := 'promovare';
        SELECT g.id, g.nume, g.ordine, g.varsta_minima, g.timp_asteptare INTO v_nou
          FROM public.grade g WHERE g.ordine > v_ord_cur ORDER BY g.ordine ASC LIMIT 1;
        IF v_nou.id IS NULL THEN
            v_blocat := COALESCE(v_blocat, 'Gradul maxim a fost atins.');
            v_tip := NULL;
        ELSE
            IF v_varsta IS NOT NULL AND COALESCE(v_nou.varsta_minima, 0) > v_varsta THEN
                v_blocat := COALESCE(v_blocat, 'Vârsta minimă pentru ' || v_nou.nume || ' este ' || v_nou.varsta_minima || ' ani (la data competiției).');
            END IF;
            -- D-07: timp de asteptare de la ultima modificare de grad
            SELECT max(ig.data_obtinere) INTO v_ultima FROM public.istoric_grade ig WHERE ig.sportiv_id = p_sportiv;
            v_luni := COALESCE(NULLIF(substring(v_nou.timp_asteptare from '\d+'), '')::int, 0)
                      * CASE WHEN lower(coalesce(v_nou.timp_asteptare, '')) ~ '\d+\s*an' THEN 12 ELSE 1 END;
            IF v_ultima IS NOT NULL THEN
                v_elig := (v_ultima + make_interval(months => v_luni))::date;
                IF v_azi < v_elig THEN
                    v_rest := age(v_elig, v_azi);
                    v_luni_rest := date_part('year', v_rest)::int * 12 + date_part('month', v_rest)::int
                                   + CASE WHEN date_part('day', v_rest) > 0 THEN 1 ELSE 0 END;
                    v_blocat := COALESCE(v_blocat, 'Ultimul grad: ' || to_char(v_ultima, 'DD.MM.YYYY') || ', mai trebuie ' || v_luni_rest
                                         || ' luni (eligibil din ' || to_char(v_elig, 'DD.MM.YYYY') || ').');
                END IF;
            END IF;
            SELECT p.suma INTO v_taxa FROM public.grade_preturi_config p
             WHERE p.grad_id = v_nou.id AND p.is_activ
             ORDER BY p.data_activare DESC NULLS LAST, p.created_at DESC LIMIT 1;   -- NULL cand lipseste (D-13)
        END IF;
    END IF;

    IF v_ultima IS NULL THEN
        SELECT max(ig.data_obtinere) INTO v_ultima FROM public.istoric_grade ig WHERE ig.sportiv_id = p_sportiv;
    END IF;

    IF v_nou.id IS NOT NULL THEN
        SELECT ig.data_obtinere INTO v_dup FROM public.istoric_grade ig
         WHERE ig.sportiv_id = p_sportiv AND ig.grad_id = v_nou.id ORDER BY ig.data_obtinere DESC LIMIT 1;
        IF v_dup IS NOT NULL THEN
            v_blocat := COALESCE(v_blocat, 'Gradul ' || v_nou.nume || ' există deja în istoric (' || to_char(v_dup, 'DD.MM.YYYY') || ').');
        END IF;
    END IF;

    -- D-06: alte competitii (neterminate) in care sportivul e inscris
    SELECT COALESCE(jsonb_agg(DISTINCT c2.denumire), '[]'::jsonb) INTO v_altele
      FROM public.competitii c2
     WHERE c2.id <> p_competitie
       AND NOT (c2.status = 'finalizata' OR COALESCE(c2.data_sfarsit < v_azi, false))
       AND (EXISTS (SELECT 1 FROM public.inscrieri_competitie i
                     WHERE i.competitie_id = c2.id AND i.sportiv_id = p_sportiv AND lower(coalesce(i.status, '')) <> 'retras')
            OR EXISTS (SELECT 1 FROM public.echipa_sportivi es
                         JOIN public.echipe_competitie ec ON ec.id = es.echipa_id
                        WHERE ec.competitie_id = c2.id AND es.sportiv_id = p_sportiv AND lower(coalesce(ec.status, '')) <> 'retrasa'));

    SELECT jsonb_build_object('id', sg.id, 'grad_vechi_id', sg.grad_vechi_id, 'grad_nou_id', sg.grad_nou_id, 'tip', sg.tip,
                              'achitat', sg.achitat_la IS NOT NULL,
                              'in_fereastra', (v_comp.status = 'inscrieri_deschise' AND v_azi <= v_comp.deadline_inscrieri))
      INTO v_anulabil
      FROM public.schimbari_grad_competitie sg
     WHERE sg.sportiv_id = p_sportiv AND sg.competitie_id = p_competitie AND sg.anulat_la IS NULL AND sg.istoric_grade_id IS NOT NULL
     ORDER BY sg.created_at DESC LIMIT 1;

    RETURN jsonb_build_object(
        'tip', v_tip,
        'grad_vechi_id', v_grad_cur,
        'grad_nou_id', v_nou.id,
        'taxa', v_taxa,
        'blocat', v_blocat,
        'ultima_data', v_ultima,
        'alte_competitii', v_altele,
        'schimbare_anulabila', v_anulabil);
END;
$$;
