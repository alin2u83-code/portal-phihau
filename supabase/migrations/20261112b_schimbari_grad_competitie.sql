-- APLICATA LIVE 13.11.2026 (40-02, dupa OK explicit).
-- Faza 40 (40-01): schimbarea gradului din zona de competitie (v1 = doar grad).
-- NEAPLICATA inca (se aplica in 40-02, dupa OK explicit). supabase/ e gitignored -> `git add -f`.
-- Decizii: D-01 (+1 doar), D-02 (echivalare la 13 ani -> 1 Cap Albastru, ordine 15), D-03/D-04/D-05 (undo, motiv dupa deadline),
--          D-07 (timp asteptare + varsta la data competitiei), D-10 (doar contul de club), D-11 (tabel ingust), D-12 (memento federatie),
--          D-13 (taxa NULL = necunoscuta).
-- Scrierile pe istoric_grade merg DOAR prin aceste RPC-uri (contul extern e blocat de ext_r_deny_all). postgres are BYPASSRLS (verificat live).
-- Nu atinge: sesiuni_examene, inscrieri_examene, plata, notificari.

-- A. Tabela de urmarire -------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schimbari_grad_competitie (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sportiv_id       uuid NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    club_id          uuid NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    competitie_id    uuid NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    grad_vechi_id    uuid REFERENCES public.grade(id),
    grad_nou_id      uuid NOT NULL REFERENCES public.grade(id),
    tip              text NOT NULL CHECK (tip IN ('echivalare','promovare')),
    taxa             numeric,                                  -- NULL = taxa necunoscuta (D-13)
    achitat_la       timestamptz,
    achitat_de       uuid,
    istoric_grade_id uuid REFERENCES public.istoric_grade(id) ON DELETE SET NULL,
    actor_nume       text,                                     -- copie de afisare; sursa de adevar = audit_log (D-11)
    anulat_la        timestamptz,
    motiv            text CHECK (motiv IS NULL OR char_length(motiv) BETWEEN 5 AND 500),  -- D-05: doar la anulare
    creat_de         uuid,
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sgc_competitie ON public.schimbari_grad_competitie (competitie_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sgc_club ON public.schimbari_grad_competitie (club_id);
CREATE INDEX IF NOT EXISTS idx_sgc_sportiv ON public.schimbari_grad_competitie (sportiv_id);

COMMENT ON TABLE public.schimbari_grad_competitie IS
  'Memento pentru federatie (promovari de grad facute din competitie, de achitat). NU e contabilitate (D-12); nu atinge sesiuni_examene/inscrieri_examene/plata.';

ALTER TABLE public.schimbari_grad_competitie ENABLE ROW LEVEL SECURITY;
-- Fara FORCE: ensure_rls_on_create poate forta RLS la creare; definerii (owner postgres, BYPASSRLS) merg oricum, dar tinem
-- tabela ca restul tabelelor Faza 39 (feedback_rls_force_security_definer_recursion).
ALTER TABLE public.schimbari_grad_competitie NO FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.schimbari_grad_competitie FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.schimbari_grad_competitie TO authenticated;
GRANT ALL ON public.schimbari_grad_competitie TO service_role;

DROP POLICY IF EXISTS sgc_select_federatie ON public.schimbari_grad_competitie;
CREATE POLICY sgc_select_federatie ON public.schimbari_grad_competitie
    FOR SELECT TO authenticated USING ((select public.is_super_admin()));
DROP POLICY IF EXISTS sgc_select_club ON public.schimbari_grad_competitie;
CREATE POLICY sgc_select_club ON public.schimbari_grad_competitie
    FOR SELECT TO authenticated USING ((select public.has_access_to_club(club_id)));
-- Fara politici INSERT/UPDATE/DELETE: scrie doar RPC-urile definer.

-- B. Previzualizare -----------------------------------------------------------------------------------------------------
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
            v_luni := COALESCE(NULLIF(substring(v_nou.timp_asteptare from '\d+'), '')::int, 0);
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

-- C. Aplicare -----------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schimba_grad_competitie(p_sportiv uuid, p_competitie uuid, p_grad_nou uuid)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    v       jsonb;
    v_club  uuid;
    v_azi   date := (now() AT TIME ZONE 'Europe/Bucharest')::date;
    v_ist   uuid;
    v_id    uuid;
    v_sesiune jsonb;
BEGIN
    -- serializeaza dublu-click-urile; clubul se citeste dupa blocare
    PERFORM 1 FROM public.sportivi WHERE id = p_sportiv FOR UPDATE;
    v := public.previzualizeaza_schimbare_grad(p_sportiv, p_competitie);   -- mosteneste toate verificarile de acces
    IF v->>'blocat' IS NOT NULL THEN RAISE EXCEPTION '%', v->>'blocat'; END IF;
    IF (v->>'grad_nou_id') IS DISTINCT FROM p_grad_nou::text THEN
        RAISE EXCEPTION 'Situația gradului s-a schimbat între timp; redeschide fereastra.';
    END IF;
    v_sesiune := public.sesiune_actor_curenta();
    IF v_sesiune IS NULL THEN
        RAISE EXCEPTION 'Alege cine lucrează înainte de a modifica (sesiune de autor lipsă sau expirată).' USING ERRCODE = '42501';
    END IF;
    SELECT club_id INTO v_club FROM public.sportivi WHERE id = p_sportiv;

    INSERT INTO public.istoric_grade (sportiv_id, grad_id, data_obtinere, club_id, observatii)
    VALUES (p_sportiv, p_grad_nou, v_azi, v_club,
            CASE v->>'tip' WHEN 'echivalare' THEN 'Echivalare din competiție' ELSE 'Promovare din competiție' END)
    RETURNING id INTO v_ist;   -- triggerele recalculeaza sportivi.grad_actual_id si scriu audit_log cu autorul

    INSERT INTO public.schimbari_grad_competitie
        (sportiv_id, club_id, competitie_id, grad_vechi_id, grad_nou_id, tip, taxa, istoric_grade_id, actor_nume, creat_de)
    VALUES (p_sportiv, v_club, p_competitie, NULLIF(v->>'grad_vechi_id', '')::uuid, p_grad_nou, v->>'tip',
            NULLIF(v->>'taxa', '')::numeric, v_ist, v_sesiune->>'actor_nume', auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- D. Anulare (undo) -----------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anuleaza_schimbare_grad_competitie(p_schimbare uuid, p_motiv text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    r       record;
    c       record;
    ist     record;
    v_azi   date := (now() AT TIME ZONE 'Europe/Bucharest')::date;
    v_fer   boolean;
    v_alt   record;
    v_gc    uuid;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
    SELECT * INTO r FROM public.schimbari_grad_competitie WHERE id = p_schimbare;
    IF NOT FOUND THEN RAISE EXCEPTION 'Schimbarea nu există.'; END IF;
    IF public.cont_club_curent() IS DISTINCT FROM r.club_id
       OR NOT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont x
                       WHERE x.user_id = auth.uid() AND x.rol_denumire = 'REPREZENTANT_COMPETITIE')
       OR NOT public.acces_extern_la_competitie(r.competitie_id) THEN
        RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501';
    END IF;

    PERFORM 1 FROM public.sportivi WHERE id = r.sportiv_id FOR UPDATE;
    SELECT * INTO r FROM public.schimbari_grad_competitie WHERE id = p_schimbare;   -- recitire dupa blocare

    IF r.anulat_la IS NOT NULL THEN RAISE EXCEPTION 'Schimbarea a fost deja anulată.'; END IF;
    IF r.istoric_grade_id IS NULL THEN RAISE EXCEPTION 'Înregistrarea din istoric nu mai există; nu se poate anula.'; END IF;
    SELECT * INTO ist FROM public.istoric_grade WHERE id = r.istoric_grade_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Înregistrarea din istoric nu mai există; nu se poate anula.'; END IF;
    IF r.achitat_la IS NOT NULL THEN
        RAISE EXCEPTION 'Schimbarea a fost marcată achitată de federație; corecția se face de federație.';
    END IF;

    SELECT cc.status, cc.data_sfarsit, cc.deadline_inscrieri INTO c FROM public.competitii cc WHERE cc.id = r.competitie_id;
    IF c.status = 'finalizata' OR COALESCE(c.data_sfarsit < v_azi, false) THEN
        RAISE EXCEPTION 'Competiția s-a încheiat; schimbarea nu se mai poate anula.';
    END IF;
    IF public.sesiune_actor_curenta() IS NULL THEN
        RAISE EXCEPTION 'Alege cine lucrează înainte de a modifica (sesiune de autor lipsă sau expirată).' USING ERRCODE = '42501';
    END IF;

    SELECT grad_actual_id INTO v_gc FROM public.sportivi WHERE id = r.sportiv_id;
    SELECT g.nume AS nume, ig.data_obtinere AS data INTO v_alt
      FROM public.istoric_grade ig JOIN public.grade g ON g.id = ig.grad_id
     WHERE ig.sportiv_id = r.sportiv_id AND ig.id <> ist.id
       AND (ig.data_obtinere > ist.data_obtinere OR (ig.data_obtinere = ist.data_obtinere AND ig.created_at > ist.created_at))
     ORDER BY ig.data_obtinere DESC, ig.created_at DESC LIMIT 1;
    IF v_alt.nume IS NOT NULL OR v_gc IS DISTINCT FROM r.grad_nou_id THEN
        RAISE EXCEPTION 'Anularea nu mai este posibilă: sportivul are între timp alt grad (%, %).',
            COALESCE(v_alt.nume, '?'), COALESCE(to_char(v_alt.data, 'DD.MM.YYYY'), '?');
    END IF;

    v_fer := c.status = 'inscrieri_deschise' AND v_azi <= c.deadline_inscrieri;   -- D-04
    IF NOT v_fer AND char_length(btrim(coalesce(p_motiv, ''))) < 5 THEN
        RAISE EXCEPTION 'După termenul de înscriere, anularea cere un motiv (minim 5 caractere).';
    END IF;

    DELETE FROM public.istoric_grade WHERE id = ist.id;
    UPDATE public.schimbari_grad_competitie
       SET anulat_la = now(), motiv = NULLIF(btrim(p_motiv), '')
     WHERE id = r.id;
END;
$$;

-- E. Marcare achitata (doar federatia) ----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marcheaza_schimbare_grad_achitata(p_schimbare uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE n int;
BEGIN
    IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acces refuzat' USING ERRCODE = '42501'; END IF;
    UPDATE public.schimbari_grad_competitie
       SET achitat_la = now(), achitat_de = auth.uid()
     WHERE id = p_schimbare AND tip = 'promovare' AND anulat_la IS NULL AND achitat_la IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
        RAISE EXCEPTION 'Schimbarea nu poate fi marcată achitată (anulată, echivalare sau deja achitată).';
    END IF;
END;
$$;

-- F. Drepturi de executie -----------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.previzualizeaza_schimbare_grad(uuid, uuid), public.schimba_grad_competitie(uuid, uuid, uuid),
    public.anuleaza_schimbare_grad_competitie(uuid, text), public.marcheaza_schimbare_grad_achitata(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.previzualizeaza_schimbare_grad(uuid, uuid), public.schimba_grad_competitie(uuid, uuid, uuid),
    public.anuleaza_schimbare_grad_competitie(uuid, text), public.marcheaza_schimbare_grad_achitata(uuid)
    TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Rollback:
--   DROP FUNCTION public.marcheaza_schimbare_grad_achitata(uuid);
--   DROP FUNCTION public.anuleaza_schimbare_grad_competitie(uuid, text);
--   DROP FUNCTION public.schimba_grad_competitie(uuid, uuid, uuid);
--   DROP FUNCTION public.previzualizeaza_schimbare_grad(uuid, uuid);
--   DROP TABLE public.schimbari_grad_competitie;
