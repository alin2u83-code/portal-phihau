-- Faza 39 (39-08): autorul modificarilor (D+A) — sesiune de actor pe server, audit extins pe tabelele wizardului, jurnal pe roluri.
-- STATUS: NEAPLICATA (se aplica in 39-11, dupa OK explicit). supabase/ e gitignored -> `git add -f`.
-- Depinde de 20261111c (cont_club_curent) si 20261106a (este_doar_extern, acces_extern_la_competitie), 20261111b (este_proprietar).
--
-- PRECONDITIE (39-11, inainte de aplicare): audit_trigger_fn de mai jos e scrisa pornind de la fisierul sql/migrations/audit_triggers_sensibile.sql;
-- textul LIVE nu a putut fi citit de executor (fara MCP). Ruleaza `SELECT pg_get_functiondef('public.audit_trigger_fn'::regproc)` si compara:
-- daca live are logica in plus (alt mod de completare a club_id, EXCEPTION etc.), incorporeaz-o AICI inainte de aplicare si pastreaza textul live in Rollback.
--
-- D-06: actorul vine DOAR din sesiuni_actor_competitie (pe auth.uid()), niciodata din payload. "din lista" NU inseamna verificat: toata alegerea e declarativa.
-- D-07: o singura sesiune per cont (user_id PK); o deschidere noua o suprascrie.
-- D-19: expirare dupa 4 ore de inactivitate (alegere Claude, "inactivitate lunga"); activitatea glisanta se reimprospateaza din trigger (cel mult o data pe minut).
-- NOTA FORCE: event trigger-ul live ensure_rls_on_create pune FORCE ROW LEVEL SECURITY pe tabelele noi (vezi 39-AUDIT-LIVE). Proprietarul functiilor (postgres)
-- are BYPASSRLS, deci definer-ul citeste/scrie sesiuni_actor_competitie si audit_log; tabela noua nu are politici (acces doar prin RPC).

-- 1. Sesiunea de actor -------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sesiuni_actor_competitie (
    user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,        -- D-07: o sesiune per cont
    club_id          uuid NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    competitie_id    uuid REFERENCES public.competitii(id) ON DELETE SET NULL,
    actor_user_id    uuid,                                                                -- NULL = "altcineva: nume liber"
    actor_nume       text NOT NULL CHECK (char_length(actor_nume) BETWEEN 2 AND 120),
    actor_din_lista  boolean NOT NULL,
    deschisa_la      timestamptz NOT NULL DEFAULT now(),
    ultima_activitate timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sesiuni_actor_competitie IS
    'Actorul declarat de contul de club (D-06). "actor_din_lista" = ales din lista instructorilor clubului, NU verificat; corectitudine interna, nu proba.';

ALTER TABLE public.sesiuni_actor_competitie ENABLE ROW LEVEL SECURITY;   -- fara FORCE in migrare; fara politici
REVOKE ALL ON public.sesiuni_actor_competitie FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.sesiuni_actor_competitie TO service_role;

-- 2. Coloane noi in audit_log ------------------------------------------------------------------------------------------------
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_nume      text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_user_id   uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_din_lista boolean;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS competitie_id   uuid;
CREATE INDEX IF NOT EXISTS idx_audit_log_competitie ON public.audit_log (competitie_id, created_at DESC);

-- 3. Contul de club vede staff-ul propriului club (lista "Cine lucreaza?") --------------------------------------------------
-- Cu FORCE RLS, un RPC definer ar vedea doar ce vede apelantul; politica deschide strict INSTRUCTOR/ADMIN_CLUB ai clubului contului.
DROP POLICY IF EXISTS urm_cont_club_vede_staff ON public.utilizator_roluri_multicont;
CREATE POLICY urm_cont_club_vede_staff ON public.utilizator_roluri_multicont
    FOR SELECT TO authenticated
    USING (rol_denumire IN ('INSTRUCTOR','ADMIN_CLUB') AND club_id IS NOT NULL AND club_id = (select public.cont_club_curent()));

-- 4. Lista instructorilor clubului contului ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.instructori_club_cont()
RETURNS TABLE(user_id uuid, nume text, rol text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_catalog AS $$
    SELECT x.user_id, x.nume, x.rol FROM (
        SELECT DISTINCT ON (u.user_id) u.user_id,
               COALESCE(NULLIF(btrim(u.nume_utilizator_cache), ''), 'Fără nume') AS nume,
               u.rol_denumire AS rol
        FROM public.utilizator_roluri_multicont u
        WHERE u.club_id = (select public.cont_club_curent()) AND u.rol_denumire IN ('INSTRUCTOR','ADMIN_CLUB')
        ORDER BY u.user_id, u.rol_denumire          -- ADMIN_CLUB inaintea INSTRUCTOR daca are ambele
    ) x ORDER BY x.nume;
$$;

-- 5. Deschiderea sesiunii de actor ------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deschide_sesiune_actor(p_competitie uuid, p_actor_user_id uuid, p_actor_nume text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
    v_club  uuid := public.cont_club_curent();
    v_nume  text;
    v_lista boolean;
    v_rez   public.sesiuni_actor_competitie%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL OR v_club IS NULL THEN
        RAISE EXCEPTION 'Doar contul de competitie al clubului' USING ERRCODE = '42501';
    END IF;
    IF p_competitie IS NOT NULL AND NOT public.acces_extern_la_competitie(p_competitie) THEN
        RAISE EXCEPTION 'Competitie inaccesibila' USING ERRCODE = '42501';
    END IF;

    IF p_actor_user_id IS NOT NULL THEN
        SELECT COALESCE(NULLIF(btrim(u.nume_utilizator_cache), ''), 'Fără nume') INTO v_nume
        FROM public.utilizator_roluri_multicont u
        WHERE u.user_id = p_actor_user_id AND u.club_id = v_club AND u.rol_denumire IN ('INSTRUCTOR','ADMIN_CLUB')
        ORDER BY u.rol_denumire LIMIT 1;
        IF v_nume IS NULL THEN
            RAISE EXCEPTION 'Persoana nu face parte din club' USING ERRCODE = '22023';
        END IF;
        v_nume := left(v_nume, 120);
        v_lista := true;
    ELSE
        v_nume := btrim(p_actor_nume);
        IF v_nume IS NULL OR char_length(v_nume) NOT BETWEEN 2 AND 120 THEN
            RAISE EXCEPTION 'Numele trebuie sa aiba 2-120 de caractere' USING ERRCODE = '22023';
        END IF;
        v_lista := false;
    END IF;

    INSERT INTO public.sesiuni_actor_competitie AS s
        (user_id, club_id, competitie_id, actor_user_id, actor_nume, actor_din_lista, deschisa_la, ultima_activitate)
    VALUES (auth.uid(), v_club, p_competitie, p_actor_user_id, v_nume, v_lista, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET            -- D-07: suprascrie sesiunea existenta
        club_id = EXCLUDED.club_id, competitie_id = EXCLUDED.competitie_id, actor_user_id = EXCLUDED.actor_user_id,
        actor_nume = EXCLUDED.actor_nume, actor_din_lista = EXCLUDED.actor_din_lista,
        deschisa_la = now(), ultima_activitate = now()
    RETURNING * INTO v_rez;

    RETURN jsonb_build_object('club_id', v_rez.club_id, 'competitie_id', v_rez.competitie_id,
        'actor_user_id', v_rez.actor_user_id, 'actor_nume', v_rez.actor_nume,
        'actor_din_lista', v_rez.actor_din_lista, 'deschisa_la', v_rez.deschisa_la);
END;
$$;

-- 6. Sesiunea curenta (NULL daca lipseste sau a expirat dupa 4 ore de inactivitate) ----------------------------------------
CREATE OR REPLACE FUNCTION public.sesiune_actor_curenta()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT jsonb_build_object('club_id', s.club_id, 'competitie_id', s.competitie_id, 'actor_user_id', s.actor_user_id,
        'actor_nume', s.actor_nume, 'actor_din_lista', s.actor_din_lista, 'deschisa_la', s.deschisa_la)
    FROM public.sesiuni_actor_competitie s
    WHERE s.user_id = auth.uid() AND s.ultima_activitate > now() - interval '4 hours';
$$;

-- 7. Inchiderea sesiunii ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inchide_sesiune_actor()
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    DELETE FROM public.sesiuni_actor_competitie WHERE user_id = auth.uid();
$$;

-- 8. audit_trigger_fn extins -----------------------------------------------------------------------------------------------
-- Pastreaza formatul existent (role_context_id, date_vechi/date_noi = randul complet) pentru sportivi/plati/facturi/utilizator_roluri_multicont/
-- inscrieri_examene/grupe. Nou: rand_id tolerant (tabele fara coloana id), club_id/competitie_id din rand sau din sesiune, actor din sesiune,
-- diferenta-doar la UPDATE pe istoric_grade/echipa_sportivi (date minori).
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    role_ctx_id   UUID;
    v_re          text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    v_vechi       jsonb;
    v_noi         jsonb;
    v_rand        jsonb;
    v_txt         text;
    v_id          uuid;
    v_club        uuid;
    v_comp        uuid;
    v_gasit       boolean := false;
    v_s_club      uuid;
    v_s_comp      uuid;
    v_actor_uid   uuid;
    v_actor_nume  text;
    v_actor_lista boolean;
BEGIN
    -- Extrage role context din header-ul injectat de supabaseClient
    BEGIN
        role_ctx_id := (
            current_setting('request.headers', true)::json->>'active-role-context-id'
        )::uuid;
    EXCEPTION WHEN OTHERS THEN
        role_ctx_id := NULL;
    END;

    v_vechi := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
    v_noi   := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
    v_rand  := COALESCE(v_noi, v_vechi);

    -- a. rand_id tolerant: NULL daca tabela nu are id (competitie_sportiv_arme, sportiv_arme au PK compus)
    v_txt := v_rand->>'id';
    IF v_txt ~ v_re THEN v_id := v_txt::uuid; END IF;

    -- d. Sesiunea de actor (D-06: doar din sesiune, pe auth.uid(); D-19: 4 ore de inactivitate, glisant)
    IF auth.uid() IS NOT NULL THEN
        BEGIN
            SELECT s.club_id, s.competitie_id, s.actor_user_id, s.actor_nume, s.actor_din_lista
              INTO v_s_club, v_s_comp, v_actor_uid, v_actor_nume, v_actor_lista
              FROM public.sesiuni_actor_competitie s
             WHERE s.user_id = auth.uid() AND s.ultima_activitate > now() - interval '4 hours';
            v_gasit := FOUND;
            IF v_gasit THEN
                -- cel mult o actualizare pe minut, ca sa nu rescriem randul la fiecare rand auditat
                UPDATE public.sesiuni_actor_competitie
                   SET ultima_activitate = now()
                 WHERE user_id = auth.uid() AND ultima_activitate < now() - interval '1 minute';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_gasit := false;   -- auditul nu trebuie sa pice scrierea din cauza sesiunii
        END;
        IF NOT v_gasit THEN
            v_actor_uid := NULL; v_actor_nume := NULL; v_actor_lista := NULL; v_s_club := NULL; v_s_comp := NULL;
        END IF;
    END IF;

    -- b./c. club_id si competitie_id: din rand, altfel din sesiune (cast sigur)
    v_txt := COALESCE(v_rand->>'club_id', v_rand->>'club_solicitant_id');
    IF v_txt ~ v_re THEN v_club := v_txt::uuid; ELSE v_club := v_s_club; END IF;
    v_txt := v_rand->>'competitie_id';
    IF v_txt ~ v_re THEN v_comp := v_txt::uuid; ELSE v_comp := v_s_comp; END IF;

    -- e. Date minori: la UPDATE pe istoric_grade/echipa_sportivi se logheaza doar diferenta
    IF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('istoric_grade', 'echipa_sportivi') THEN
        SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO STRICT v_vechi
          FROM jsonb_each(to_jsonb(OLD)) e WHERE to_jsonb(NEW)->e.key IS DISTINCT FROM e.value;
        SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb) INTO STRICT v_noi
          FROM jsonb_each(to_jsonb(NEW)) e WHERE to_jsonb(OLD)->e.key IS DISTINCT FROM e.value;
    END IF;

    INSERT INTO public.audit_log (
        user_id, role_context_id, tabel, operatie, rand_id, date_vechi, date_noi,
        club_id, competitie_id, actor_nume, actor_user_id, actor_din_lista
    ) VALUES (
        auth.uid(), role_ctx_id, TG_TABLE_NAME, TG_OP, v_id, v_vechi, v_noi,
        v_club, v_comp, v_actor_nume, v_actor_uid, v_actor_lista
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. Triggere pe tabelele wizardului (D-20) ---------------------------------------------------------------------------------
-- inscrieri_competitie are deja audit_inscrieri_competitie live (39-AUDIT-LIVE etapa 1, punctul 9) -> nu se recreeaza;
-- foloseste aceeasi functie, deci actorul apare automat.
DROP TRIGGER IF EXISTS audit_echipe_competitie ON public.echipe_competitie;
CREATE TRIGGER audit_echipe_competitie
    AFTER INSERT OR UPDATE OR DELETE ON public.echipe_competitie
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_echipa_sportivi ON public.echipa_sportivi;
CREATE TRIGGER audit_echipa_sportivi
    AFTER INSERT OR UPDATE OR DELETE ON public.echipa_sportivi
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_solicitari_echipe_incomplete ON public.solicitari_echipe_incomplete;
CREATE TRIGGER audit_solicitari_echipe_incomplete
    AFTER INSERT OR UPDATE OR DELETE ON public.solicitari_echipe_incomplete
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_cereri_coechipier ON public.cereri_coechipier;
CREATE TRIGGER audit_cereri_coechipier
    AFTER INSERT OR UPDATE OR DELETE ON public.cereri_coechipier
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_istoric_grade ON public.istoric_grade;
CREATE TRIGGER audit_istoric_grade
    AFTER INSERT OR UPDATE OR DELETE ON public.istoric_grade
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_competitie_sportiv_arme ON public.competitie_sportiv_arme;
CREATE TRIGGER audit_competitie_sportiv_arme
    AFTER INSERT OR UPDATE OR DELETE ON public.competitie_sportiv_arme
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_sportiv_arme ON public.sportiv_arme;
CREATE TRIGGER audit_sportiv_arme
    AFTER INSERT OR UPDATE OR DELETE ON public.sportiv_arme
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- 10. audit_log pentru contul extern: INSERT doar cu user_id propriu, rest interzis ----------------------------------------
-- (trigger-ul definer scrie ca owner cu BYPASSRLS; restrictiva permite totusi insert-ul direct al clientului propriu si pastreaza default-deny pe rest)
DROP POLICY IF EXISTS ext_r_deny_all ON public.audit_log;
DROP POLICY IF EXISTS ext_r_audit_log_sel ON public.audit_log;
CREATE POLICY ext_r_audit_log_sel ON public.audit_log AS RESTRICTIVE FOR SELECT TO authenticated
    USING (NOT (select public.este_doar_extern()));
DROP POLICY IF EXISTS ext_r_audit_log_ins ON public.audit_log;
CREATE POLICY ext_r_audit_log_ins ON public.audit_log AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (NOT (select public.este_doar_extern()) OR user_id = (select auth.uid()));
DROP POLICY IF EXISTS ext_r_audit_log_upd ON public.audit_log;
CREATE POLICY ext_r_audit_log_upd ON public.audit_log AS RESTRICTIVE FOR UPDATE TO authenticated
    USING (NOT (select public.este_doar_extern())) WITH CHECK (NOT (select public.este_doar_extern()));
DROP POLICY IF EXISTS ext_r_audit_log_del ON public.audit_log;
CREATE POLICY ext_r_audit_log_del ON public.audit_log AS RESTRICTIVE FOR DELETE TO authenticated
    USING (NOT (select public.este_doar_extern()));

-- 11. Jurnalul (D-20): proprietar, ADMIN_CLUB al clubului, instructorul doar randurile in care e actorul ----------------------
-- audit_log_select_super_admin (preexistenta) ramane neatinsa. Contul de club nu citeste audit_log (restrictiva de mai sus).
DROP POLICY IF EXISTS audit_log_select_jurnal_club ON public.audit_log;
CREATE POLICY audit_log_select_jurnal_club ON public.audit_log
    FOR SELECT TO authenticated
    USING (
        actor_nume IS NOT NULL
        AND (
            (select public.este_proprietar())
            OR (club_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.utilizator_roluri_multicont u
                    WHERE u.user_id = (select auth.uid()) AND u.rol_denumire = 'ADMIN_CLUB' AND u.club_id = audit_log.club_id))
            OR actor_user_id = (select auth.uid())
        )
    );

-- 12. Drepturi de executie --------------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.deschide_sesiune_actor(uuid, uuid, text), public.sesiune_actor_curenta(),
    public.inchide_sesiune_actor(), public.instructori_club_cont() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deschide_sesiune_actor(uuid, uuid, text), public.sesiune_actor_curenta(),
    public.inchide_sesiune_actor(), public.instructori_club_cont() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Rollback:
--   DROP POLICY IF EXISTS audit_log_select_jurnal_club ON public.audit_log;
--   DROP POLICY IF EXISTS ext_r_audit_log_sel ON public.audit_log;  (idem _ins, _upd, _del)
--   CREATE POLICY ext_r_deny_all ON public.audit_log AS RESTRICTIVE FOR ALL TO authenticated
--       USING (NOT (select public.este_doar_extern())) WITH CHECK (NOT (select public.este_doar_extern()));
--   DROP TRIGGER IF EXISTS audit_echipe_competitie ON public.echipe_competitie;           (idem pentru cele 7 triggere noi)
--   -- audit_trigger_fn: restaureaza textul LIVE salvat inainte de aplicare (fallback = fisierul sql/migrations/audit_triggers_sensibile.sql):
--   CREATE OR REPLACE FUNCTION public.audit_trigger_fn() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
--   DECLARE role_ctx_id UUID;
--   BEGIN
--       BEGIN role_ctx_id := (current_setting('request.headers', true)::json->>'active-role-context-id')::uuid;
--       EXCEPTION WHEN OTHERS THEN role_ctx_id := NULL; END;
--       INSERT INTO public.audit_log (user_id, role_context_id, tabel, operatie, rand_id, date_vechi, date_noi)
--       VALUES (auth.uid(), role_ctx_id, TG_TABLE_NAME, TG_OP,
--           COALESCE(CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN (NEW.id)::uuid ELSE NULL END, CASE WHEN TG_OP = 'DELETE' THEN (OLD.id)::uuid ELSE NULL END),
--           CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
--           CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END);
--       RETURN COALESCE(NEW, OLD);
--   END; $f$;
--   DROP FUNCTION public.deschide_sesiune_actor(uuid, uuid, text); DROP FUNCTION public.sesiune_actor_curenta();
--   DROP FUNCTION public.inchide_sesiune_actor(); DROP FUNCTION public.instructori_club_cont();
--   DROP POLICY IF EXISTS urm_cont_club_vede_staff ON public.utilizator_roluri_multicont;
--   DROP TABLE public.sesiuni_actor_competitie;
--   (coloanele noi din audit_log si indexul idx_audit_log_competitie pot ramane; DROP COLUMN doar daca e nevoie)
