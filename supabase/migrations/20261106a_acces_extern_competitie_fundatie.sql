-- Faza 36 (36-02): fundatia accesului extern la competitie.
-- Aditiva: rol nou, 2 tabele, helperi RLS, RPC. Nu modifica nicio politica existenta.
-- Singura modificare a unui obiect existent: bypass in triggerul de auto-legare
-- sportiv_id dupa email pentru rolul extern (DEC-9 din 36-AUDIT-LIVE.md).

-- 1. ROL (DEC-3). utilizator_roluri_multicont.club_id este deja NULLABLE (DEC-2), nu se relaxeaza nimic.
INSERT INTO public.roluri (nume)
SELECT 'REPREZENTANT_COMPETITIE'
WHERE NOT EXISTS (SELECT 1 FROM public.roluri WHERE nume = 'REPREZENTANT_COMPETITIE');

-- 1b. DEC-9: un reprezentant extern NU trebuie legat automat de un sportiv dupa email.
CREATE OR REPLACE FUNCTION public.fn_automatizeaza_legatura_utilizator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    -- 1. Legatura automata cu Sportivul dupa Email (nu pentru rolul extern)
    IF NEW.sportiv_id IS NULL AND NEW.rol_denumire IS DISTINCT FROM 'REPREZENTANT_COMPETITIE' THEN
        SELECT s.id INTO NEW.sportiv_id
        FROM public.sportivi s
        JOIN auth.users u ON LOWER(s.email) = LOWER(u.email)
        WHERE u.id = NEW.user_id
        LIMIT 1;
    END IF;

    -- 2. Constrangerea "Un singur Primary"
    IF NEW.is_primary = true THEN
        UPDATE public.utilizator_roluri_multicont
        SET is_primary = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;

    -- 3. Fallback: daca e singurul rol si e null, il facem Primary
    IF NEW.is_primary IS NULL THEN
        NEW.is_primary := NOT EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = NEW.user_id AND is_primary = true
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- 2. CERERI DE ACCES (anon le depune doar prin RPC)
CREATE TABLE IF NOT EXISTS public.cereri_acces_competitie (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competitie_id uuid NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254 AND email = lower(email)),
    nume text NOT NULL CHECK (char_length(nume) BETWEEN 2 AND 120),
    club_id uuid NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    mesaj text CHECK (mesaj IS NULL OR char_length(mesaj) <= 500),
    status text NOT NULL DEFAULT 'in_asteptare' CHECK (status IN ('in_asteptare','aprobata','respinsa')),
    motiv_respingere text CHECK (motiv_respingere IS NULL OR char_length(motiv_respingere) <= 300),
    created_at timestamptz NOT NULL DEFAULT now(),
    procesat_la timestamptz,
    procesat_de uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS cereri_acces_competitie_unic_in_asteptare
    ON public.cereri_acces_competitie (email, competitie_id) WHERE status = 'in_asteptare';

ALTER TABLE public.cereri_acces_competitie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cereri_acces_competitie NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cereri_acces_select_super_admin ON public.cereri_acces_competitie;
CREATE POLICY cereri_acces_select_super_admin ON public.cereri_acces_competitie
    FOR SELECT TO authenticated USING (public.is_super_admin());
DROP POLICY IF EXISTS cereri_acces_update_super_admin ON public.cereri_acces_competitie;
CREATE POLICY cereri_acces_update_super_admin ON public.cereri_acces_competitie
    FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

REVOKE ALL ON public.cereri_acces_competitie FROM anon, PUBLIC;
GRANT SELECT, UPDATE ON public.cereri_acces_competitie TO authenticated;

-- 3. GRANTURI per competitie + club (scrie doar service role)
CREATE TABLE IF NOT EXISTS public.acces_competitie_extern (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    competitie_id uuid NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    club_id uuid NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    email text NOT NULL,
    nume text,
    cerere_id uuid REFERENCES public.cereri_acces_competitie(id) ON DELETE SET NULL,
    activ boolean NOT NULL DEFAULT true,
    creat_de uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    creat_la timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, competitie_id, club_id)
);

CREATE INDEX IF NOT EXISTS acces_competitie_extern_user_competitie
    ON public.acces_competitie_extern (user_id, competitie_id);

ALTER TABLE public.acces_competitie_extern ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acces_competitie_extern NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS acces_extern_select_own ON public.acces_competitie_extern;
CREATE POLICY acces_extern_select_own ON public.acces_competitie_extern
    FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS acces_extern_all_super_admin ON public.acces_competitie_extern;
CREATE POLICY acces_extern_all_super_admin ON public.acces_competitie_extern
    FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

REVOKE ALL ON public.acces_competitie_extern FROM anon, PUBLIC;
GRANT SELECT, UPDATE ON public.acces_competitie_extern TO authenticated;

-- 4. HELPERI (definer, STABLE, nu depind de headerul de context)
CREATE OR REPLACE FUNCTION public.este_doar_extern()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont
                   WHERE user_id = auth.uid() AND rol_denumire = 'REPREZENTANT_COMPETITIE')
       AND NOT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont
                   WHERE user_id = auth.uid() AND rol_denumire <> 'REPREZENTANT_COMPETITIE');
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_competitie(p_competitie uuid, p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern
                   WHERE user_id = auth.uid() AND activ AND competitie_id = p_competitie AND club_id = p_club);
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_la_competitie(p_competitie uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern
                   WHERE user_id = auth.uid() AND activ AND competitie_id = p_competitie);
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_la_club(p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern
                   WHERE user_id = auth.uid() AND activ AND club_id = p_club);
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_la_sportiv(p_sportiv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.sportivi s
                   JOIN public.acces_competitie_extern a ON a.club_id = s.club_id
                   WHERE s.id = p_sportiv AND a.user_id = auth.uid() AND a.activ);
$$;

CREATE OR REPLACE FUNCTION public.competitie_deschisa_inscrieri(p_competitie uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.competitii c
                   WHERE c.id = p_competitie AND c.status = 'inscrieri_deschise'
                     AND (c.deadline_inscrieri IS NULL
                          OR c.deadline_inscrieri >= (now() AT TIME ZONE 'Europe/Bucharest')::date));
$$;

CREATE OR REPLACE FUNCTION public.sportiv_apartine_clubului(p_sportiv uuid, p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.sportivi WHERE id = p_sportiv AND club_id = p_club);
$$;

CREATE OR REPLACE FUNCTION public.categorie_apartine_competitiei(p_categorie uuid, p_competitie uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.categorii_competitie WHERE id = p_categorie AND competitie_id = p_competitie);
$$;

-- 5. RPC
CREATE OR REPLACE FUNCTION public.get_competitie_publica(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT jsonb_build_object(
        'denumire', c.denumire, 'tip', c.tip, 'locatie', c.locatie,
        'data_inceput', c.data_inceput, 'data_sfarsit', c.data_sfarsit,
        'deadline_inscrieri', c.deadline_inscrieri, 'status', c.status,
        'probe', COALESCE((SELECT jsonb_agg(p.denumire ORDER BY p.ordine_afisare, p.denumire)
                           FROM public.probe_competitie p WHERE p.competitie_id = c.id), '[]'::jsonb))
    FROM public.competitii c WHERE c.id = p_id AND c.status <> 'draft';
$$;

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
    IF (SELECT count(*) FROM public.cereri_acces_competitie
        WHERE competitie_id = p_competitie AND status = 'in_asteptare') >= 200 THEN
        RAISE EXCEPTION 'prea_multe_cereri';
    END IF;

    BEGIN
        INSERT INTO public.cereri_acces_competitie (competitie_id, email, nume, club_id, mesaj)
        VALUES (p_competitie, v_email, v_nume, p_club, v_mesaj);
    EXCEPTION WHEN unique_violation THEN
        RETURN 'deja_trimisa';
    END;
    RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.vize_club_competitie(p_competitie uuid, p_club uuid)
RETURNS TABLE (sportiv_id uuid, an integer, tip text, achitata boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT v.sportiv_id, v.an, v.tip,
           (COALESCE(v.scutit, false) OR COALESCE(p.status = 'Achitat', false)) AS achitata
    FROM public.vize_sportivi v
    JOIN public.sportivi s ON s.id = v.sportiv_id
    LEFT JOIN public.plati p ON p.id = v.plata_id
    WHERE s.club_id = p_club
      AND (public.acces_extern_competitie(p_competitie, p_club) OR public.has_access_to_club(p_club));
$$;

CREATE OR REPLACE FUNCTION public.user_id_dupa_email(p_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_catalog AS $$
    SELECT id FROM auth.users WHERE lower(email) = lower(btrim(p_email)) LIMIT 1;
$$;

-- 6. DREPTURI DE EXECUTIE
REVOKE EXECUTE ON FUNCTION public.este_doar_extern(), public.acces_extern_competitie(uuid, uuid),
    public.acces_extern_la_competitie(uuid), public.acces_extern_la_club(uuid),
    public.acces_extern_la_sportiv(uuid), public.competitie_deschisa_inscrieri(uuid),
    public.sportiv_apartine_clubului(uuid, uuid), public.categorie_apartine_competitiei(uuid, uuid),
    public.vize_club_competitie(uuid, uuid), public.user_id_dupa_email(text)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.este_doar_extern(), public.acces_extern_competitie(uuid, uuid),
    public.acces_extern_la_competitie(uuid), public.acces_extern_la_club(uuid),
    public.acces_extern_la_sportiv(uuid), public.competitie_deschisa_inscrieri(uuid),
    public.sportiv_apartine_clubului(uuid, uuid), public.categorie_apartine_competitiei(uuid, uuid),
    public.vize_club_competitie(uuid, uuid)
    TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_id_dupa_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.user_id_dupa_email(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_competitie_publica(uuid),
    public.trimite_cerere_acces(uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_competitie_publica(uuid),
    public.trimite_cerere_acces(uuid, text, text, uuid, text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
