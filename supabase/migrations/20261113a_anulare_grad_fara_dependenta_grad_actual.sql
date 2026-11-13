-- Faza 40 (review finding 1): anularea nu mai depinde de sportivi.grad_actual_id.
-- Daca grad_actual_id (max ordine din istoric) diferea de gradul nou, anularea era blocata desi stergerea randului e inofensiva.
-- Ramane doar verificarea "exista un grad mai recent in istoric" (v_alt). Triggerul recalculeaza grad_actual_id la DELETE.
CREATE OR REPLACE FUNCTION public.anuleaza_schimbare_grad_competitie(p_schimbare uuid, p_motiv text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    r       record;
    c       record;
    ist     record;
    v_azi   date := (now() AT TIME ZONE 'Europe/Bucharest')::date;
    v_fer   boolean;
    v_alt   record;
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

    SELECT g.nume AS nume, ig.data_obtinere AS data INTO v_alt
      FROM public.istoric_grade ig JOIN public.grade g ON g.id = ig.grad_id
     WHERE ig.sportiv_id = r.sportiv_id AND ig.id <> ist.id
       AND (ig.data_obtinere > ist.data_obtinere OR (ig.data_obtinere = ist.data_obtinere AND ig.created_at > ist.created_at))
     ORDER BY ig.data_obtinere DESC, ig.created_at DESC LIMIT 1;
    IF v_alt.nume IS NOT NULL THEN
        RAISE EXCEPTION 'Anularea nu mai este posibilă: sportivul are între timp alt grad (%, %).',
            v_alt.nume, to_char(v_alt.data, 'DD.MM.YYYY');
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
