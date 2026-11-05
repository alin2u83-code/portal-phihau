-- Faza 36 follow-up (quick 261105-gax). Decizii utilizator 5.11.2026.
--  A. Parintele SPORTIV vede prezentele fratilor (regresie dupa vedere_prezenta_sportiv -> security_invoker).
--  B. T-36-14: dupa inchiderea inscrierilor (status != inscrieri_deschise SAU termen depasit) doar federatia
--     poate modifica/sterge inscrieri, echipe, membri de echipa. Randurile vechi inter-club raman neatinse:
--     gate-ul "sportiv din club" e un trigger care actioneaza doar cand sportiv_id se schimba.
--  C. trimite_cerere_acces: plafon per club + global sub advisory lock; "deja trimisa" nu mai e distinguibila.
--  D. RPC de curatare a cererilor in asteptare, doar federatie.

-- ═══ A. Familie vede prezentele fratilor ═══════════════════════════════════
DROP POLICY IF EXISTS prezenta_familie_sel ON public.prezenta_antrenament;
CREATE POLICY prezenta_familie_sel ON public.prezenta_antrenament
    FOR SELECT TO authenticated
    USING (sportiv_id IN (
        SELECT s.id FROM public.sportivi s
        WHERE s.familie_id IS NOT NULL
          AND s.familie_id = public.get_familie_id_sportiv_curent()));

-- ═══ B. Gate de inchidere la UPDATE / DELETE ═══════════════════════════════
-- inscrieri_competitie
DROP POLICY IF EXISTS ic_r_gate_upd ON public.inscrieri_competitie;
CREATE POLICY ic_r_gate_upd ON public.inscrieri_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_super_admin()) OR public.competitie_deschisa_inscrieri(competitie_id))
    WITH CHECK ((SELECT public.is_super_admin())
        OR (public.competitie_deschisa_inscrieri(competitie_id)
            AND public.categorie_apartine_competitiei(categorie_id, competitie_id)));

DROP POLICY IF EXISTS ic_r_gate_del ON public.inscrieri_competitie;
CREATE POLICY ic_r_gate_del ON public.inscrieri_competitie AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING ((SELECT public.is_super_admin()) OR public.competitie_deschisa_inscrieri(competitie_id));

-- echipe_competitie
DROP POLICY IF EXISTS ec_r_gate_upd ON public.echipe_competitie;
CREATE POLICY ec_r_gate_upd ON public.echipe_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_super_admin()) OR public.competitie_deschisa_inscrieri(competitie_id))
    WITH CHECK ((SELECT public.is_super_admin())
        OR (public.competitie_deschisa_inscrieri(competitie_id)
            AND public.categorie_apartine_competitiei(categorie_id, competitie_id)));

DROP POLICY IF EXISTS ec_r_gate_del ON public.echipe_competitie;
CREATE POLICY ec_r_gate_del ON public.echipe_competitie AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING ((SELECT public.is_super_admin()) OR public.competitie_deschisa_inscrieri(competitie_id));

-- echipa_sportivi (prin echipa parinte)
DROP POLICY IF EXISTS es_r_gate_upd ON public.echipa_sportivi;
CREATE POLICY es_r_gate_upd ON public.echipa_sportivi AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_super_admin())
        OR EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
                   AND public.competitie_deschisa_inscrieri(e.competitie_id)))
    WITH CHECK ((SELECT public.is_super_admin())
        OR EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
                   AND public.competitie_deschisa_inscrieri(e.competitie_id)));

DROP POLICY IF EXISTS es_r_gate_del ON public.echipa_sportivi;
CREATE POLICY es_r_gate_del ON public.echipa_sportivi AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING ((SELECT public.is_super_admin())
        OR EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
                   AND public.competitie_deschisa_inscrieri(e.competitie_id)));

-- Un UPDATE nu poate repune inscrierea pe un sportiv din alt club. Trigger (nu WITH CHECK) ca sa vedem OLD:
-- randurile legacy inter-club raman editabile cat timp sportiv_id nu se schimba.
-- auth.uid() NULL = service_role / SQL administrativ -> nu blocam.
CREATE OR REPLACE FUNCTION public.trg_inscriere_sportiv_in_club()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
    IF NEW.sportiv_id IS DISTINCT FROM OLD.sportiv_id
       AND auth.uid() IS NOT NULL
       AND NOT public.is_super_admin()
       AND NOT public.sportiv_apartine_clubului(NEW.sportiv_id, NEW.club_id) THEN
        RAISE EXCEPTION 'sportiv din alt club' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_inscrieri_sportiv_in_club ON public.inscrieri_competitie;
CREATE TRIGGER trg_inscrieri_sportiv_in_club BEFORE UPDATE OF sportiv_id ON public.inscrieri_competitie
    FOR EACH ROW EXECUTE FUNCTION public.trg_inscriere_sportiv_in_club();

CREATE OR REPLACE FUNCTION public.trg_echipa_sportiv_in_club()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
DECLARE v_club uuid;
BEGIN
    IF NEW.sportiv_id IS DISTINCT FROM OLD.sportiv_id
       AND auth.uid() IS NOT NULL
       AND NOT public.is_super_admin() THEN
        SELECT e.club_id INTO v_club FROM public.echipe_competitie e WHERE e.id = NEW.echipa_id;
        IF NOT public.sportiv_apartine_clubului(NEW.sportiv_id, v_club) THEN
            RAISE EXCEPTION 'sportiv din alt club' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_echipa_sportivi_in_club ON public.echipa_sportivi;
CREATE TRIGGER trg_echipa_sportivi_in_club BEFORE UPDATE OF sportiv_id ON public.echipa_sportivi
    FOR EACH ROW EXECUTE FUNCTION public.trg_echipa_sportiv_in_club();

-- ═══ C. trimite_cerere_acces: plafon per club + global, fara 'deja_trimisa' ═══
CREATE OR REPLACE FUNCTION public.trimite_cerere_acces(
    p_competitie uuid, p_email text, p_nume text, p_club uuid, p_mesaj text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    v_email text := lower(btrim(coalesce(p_email, '')));
    v_nume  text := btrim(coalesce(p_nume, ''));
    v_mesaj text := NULLIF(btrim(coalesce(p_mesaj, '')), '');
BEGIN
    IF char_length(v_email) NOT BETWEEN 5 AND 254
       OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       OR char_length(v_nume) NOT BETWEEN 2 AND 120
       OR (v_mesaj IS NOT NULL AND char_length(v_mesaj) > 500) THEN
        RAISE EXCEPTION 'date_invalide';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.competitii WHERE id = p_competitie AND status <> 'draft') THEN
        RAISE EXCEPTION 'competitie_indisponibila';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cluburi WHERE id = p_club) THEN
        RAISE EXCEPTION 'club_invalid';
    END IF;

    -- count + insert atomice per competitie (altfel cereri paralele depasesc plafonul)
    PERFORM pg_advisory_xact_lock(hashtextextended(p_competitie::text, 36));

    -- plafoanele se verifica INAINTE de duplicat: raspunsul nu trebuie sa dezvaluie daca emailul are deja o cerere
    IF (SELECT count(*) FROM public.cereri_acces_competitie
        WHERE competitie_id = p_competitie AND club_id = p_club AND status = 'in_asteptare') >= 10
       OR (SELECT count(*) FROM public.cereri_acces_competitie
           WHERE competitie_id = p_competitie AND status = 'in_asteptare') >= 200 THEN
        RAISE EXCEPTION 'prea_multe_cereri';
    END IF;

    BEGIN
        INSERT INTO public.cereri_acces_competitie (competitie_id, email, nume, club_id, mesaj)
        VALUES (p_competitie, v_email, v_nume, p_club, v_mesaj);
    EXCEPTION WHEN unique_violation THEN
        NULL; -- cerere deja existenta: acelasi raspuns ca la o cerere noua
    END;
    RETURN 'ok';
END;
$$;

-- ═══ D. Curatare cereri in asteptare (doar federatie) ══════════════════════
CREATE OR REPLACE FUNCTION public.sterge_cereri_in_asteptare(p_competitie uuid)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE n integer;
BEGIN
    IF NOT (SELECT public.is_super_admin()) THEN
        RAISE EXCEPTION 'neautorizat' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.cereri_acces_competitie
    WHERE competitie_id = p_competitie AND status = 'in_asteptare';
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sterge_cereri_in_asteptare(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sterge_cereri_in_asteptare(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.trimite_cerere_acces(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trimite_cerere_acces(uuid, text, text, uuid, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
