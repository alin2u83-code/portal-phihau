-- Faza 39 (39-01): cont unic de competitie per club (D-01, D-12, D-14).
-- NEAPLICATA LIVE la scrierea fisierului (aplicarea e in 39-04, dupa OK explicit). supabase/ e gitignored -> `git add -f`.
-- Depinde de 20261111b (este_proprietar) si de 20261106a/c (helperii acces_extern_*, politicile ext_p_*/ext_r_*).
--
-- Aditiva: o tabela noua, 2 functii noi, 5 helperi RLS rescrisi cu CREATE OR REPLACE (ACEEASI semnatura, deci politicile
-- ext_p_*/ext_r_*/ic_r_scope_*/ec_r_scope_* raman neatinse si trec automat pe modelul de club).
-- Tabela legacy acces_competitie_extern ramane in DB neatinsa, dar nu mai e consultata de helperi.
-- (Audit repo: nicio alta functie sau politica din migrari nu citeste acces_competitie_extern in afara de helperi; confirmarea
--  pe pg_policies/pg_proc LIVE e in 39-AUDIT-LIVE.md / 39-04.)
-- NU modifica: politici existente, utilizator_roluri_multicont, has_access_to_club (D-02).
--
-- Tabela noua NU are FORCE ROW LEVEL SECURITY: helperii SECURITY DEFINER (owner = proprietarul tabelei) trebuie sa o citeasca
-- (feedback_rls_force_security_definer_recursion).
-- REPREZENTANT_COMPETITIE are club_id NULL pe randul de rol (DEC-2, Faza 36); clubul vine DOAR din conturi_competitie_club.

-- 1. Tabela conturilor de competitie ---------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conturi_competitie_club (
    club_id      uuid PRIMARY KEY REFERENCES public.cluburi(id) ON DELETE CASCADE,         -- D-01: un cont per club
    user_id      uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,          -- un club per cont
    email        text NOT NULL CHECK (email = lower(email) AND char_length(email) BETWEEN 5 AND 254),  -- D-14
    creat_de     uuid,
    creat_la     timestamptz NOT NULL DEFAULT now(),
    modificat_la timestamptz
);
-- Fara coloana "activ": inlocuirea persoanei = schimbarea emailului (D-15), nu dezactivare.

ALTER TABLE public.conturi_competitie_club ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.conturi_competitie_club FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.conturi_competitie_club TO authenticated;
GRANT ALL ON public.conturi_competitie_club TO service_role;

-- Fara politici de scriere: scrie doar service role (endpoint 39-02).
DROP POLICY IF EXISTS ccc_select_propriu ON public.conturi_competitie_club;
CREATE POLICY ccc_select_propriu ON public.conturi_competitie_club
    FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS ccc_select_proprietar ON public.conturi_competitie_club;
CREATE POLICY ccc_select_proprietar ON public.conturi_competitie_club
    FOR SELECT TO authenticated USING ((select public.este_proprietar()));

-- 2. cont_club_curent() ----------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cont_club_curent()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT club_id FROM public.conturi_competitie_club WHERE user_id = auth.uid();
$$;

-- 3. competitie_vizibila_cont_club(competitie, club) -- D-12 + D-03 ---------------------------------------------------------
-- Regula IDENTICA cu functia client clasificaCompetitiiClub din 39-03 (a se tine sincronizate):
--   vizibila = nu e draft SI (nu e terminata SAU clubul are cel putin o inscriere / echipa la ea).
--   terminata = status 'finalizata' SAU data_sfarsit < azi (Europe/Bucharest).
CREATE OR REPLACE FUNCTION public.competitie_vizibila_cont_club(p_competitie uuid, p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.competitii c
        WHERE c.id = p_competitie
          AND c.status <> 'draft'
          AND (
              NOT (c.status = 'finalizata'
                   OR COALESCE(c.data_sfarsit < (now() AT TIME ZONE 'Europe/Bucharest')::date, false))
              OR EXISTS (SELECT 1 FROM public.inscrieri_competitie i
                         WHERE i.competitie_id = c.id AND i.club_id = p_club)
              OR EXISTS (SELECT 1 FROM public.echipe_competitie e
                         WHERE e.competitie_id = c.id AND e.club_id = p_club)
          )
    );
$$;

-- 4. Helperii RLS rescrisi pe contul de club (aceeasi semnatura) -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acces_extern_competitie(p_competitie uuid, p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.conturi_competitie_club c
                   WHERE c.user_id = auth.uid() AND c.club_id = p_club)
       AND public.competitie_vizibila_cont_club(p_competitie, p_club);
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_la_competitie(p_competitie uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.conturi_competitie_club c
                   WHERE c.user_id = auth.uid()
                     AND public.competitie_vizibila_cont_club(p_competitie, c.club_id));
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_la_club(p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.conturi_competitie_club c
                   WHERE c.user_id = auth.uid() AND c.club_id = p_club);
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_la_sportiv(p_sportiv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM public.sportivi s
                   JOIN public.conturi_competitie_club c ON c.club_id = s.club_id
                   WHERE s.id = p_sportiv AND c.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.acces_extern_sportiv_competitie(p_sportiv uuid, p_competitie uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
    SELECT public.acces_extern_la_sportiv(p_sportiv) AND public.acces_extern_la_competitie(p_competitie);
$$;

-- 5. Drepturi de executie ---------------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.cont_club_curent(), public.competitie_vizibila_cont_club(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cont_club_curent(), public.competitie_vizibila_cont_club(uuid, uuid)
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.acces_extern_competitie(uuid, uuid), public.acces_extern_la_competitie(uuid),
    public.acces_extern_la_club(uuid), public.acces_extern_la_sportiv(uuid),
    public.acces_extern_sportiv_competitie(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acces_extern_competitie(uuid, uuid), public.acces_extern_la_competitie(uuid),
    public.acces_extern_la_club(uuid), public.acces_extern_la_sportiv(uuid),
    public.acces_extern_sportiv_competitie(uuid, uuid) TO authenticated, service_role;

-- 6.
NOTIFY pgrst, 'reload schema';

-- Rollback (restaureaza corpurile din 20261106a / 20261106c, apoi sterge obiectele noi):
--   CREATE OR REPLACE FUNCTION public.acces_extern_competitie(p_competitie uuid, p_club uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $f$
--       SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern WHERE user_id = auth.uid() AND activ AND competitie_id = p_competitie AND club_id = p_club); $f$;
--   CREATE OR REPLACE FUNCTION public.acces_extern_la_competitie(p_competitie uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $f$
--       SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern WHERE user_id = auth.uid() AND activ AND competitie_id = p_competitie); $f$;
--   CREATE OR REPLACE FUNCTION public.acces_extern_la_club(p_club uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $f$
--       SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern WHERE user_id = auth.uid() AND activ AND club_id = p_club); $f$;
--   CREATE OR REPLACE FUNCTION public.acces_extern_la_sportiv(p_sportiv uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $f$
--       SELECT EXISTS (SELECT 1 FROM public.sportivi s JOIN public.acces_competitie_extern a ON a.club_id = s.club_id
--                      WHERE s.id = p_sportiv AND a.user_id = auth.uid() AND a.activ); $f$;
--   CREATE OR REPLACE FUNCTION public.acces_extern_sportiv_competitie(p_sportiv uuid, p_competitie uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $f$
--       SELECT EXISTS (SELECT 1 FROM public.acces_competitie_extern a JOIN public.sportivi s ON s.club_id = a.club_id
--                      WHERE a.user_id = auth.uid() AND a.activ = true AND a.competitie_id = p_competitie AND s.id = p_sportiv); $f$;
--   DROP FUNCTION public.competitie_vizibila_cont_club(uuid, uuid);
--   DROP FUNCTION public.cont_club_curent();
--   DROP TABLE public.conturi_competitie_club;
