-- Quick 261111-pza: comutator "Acces management" per persoana externa, acordabil DOAR de proprietarul aplicatiei.
-- NEAPLICATA LIVE la scrierea fisierului. supabase/ e gitignored -> `git add -f`.
--
-- Model: o persoana "doar competitie" are doar rolul REPREZENTANT_COMPETITIE (este_doar_extern()).
-- "Acces management" = i se adauga un rol ADMIN_CLUB/INSTRUCTOR pe clubul din grantul acces_competitie_extern.
-- Doar proprietarul (proprietari_aplicatie) poate acorda/retrage prin RPC-urile de mai jos. Decizie (a) ingusta:
-- politicile existente pe utilizator_roluri_multicont NU se schimba; ceilalti super admini pastreaza accesul de acum.
--
-- Fapte verificate live (11.11.2026):
--  * utilizator_roluri_multicont are FORCE ROW LEVEL SECURITY: functiile SECURITY DEFINER NU ocolesc RLS, rulam sub politicile
--    apelantului. Scrierea trece pentru ca proprietarul are si SUPER_ADMIN_FEDERATIE (SuperAdmin_Gestioneaza_Toate_Rolurile).
--    Daca proprietarul ar pierde rolul de super admin, RPC-urile ar esua (inchis, nu deschis).
--  * Triggere pe INSERT: tr_completeaza_rol_id (rol_id), fn_automatizeaza_legatura_utilizator (leaga sportiv dupa email pt rolurile
--    non-REPREZENTANT, nu atinge is_primary daca e false), sync_user_metadata (has_multiple_roles), audit_roluri.
--  * Constrangeri unice: (user_id, rol_denumire, sportiv_id), (user_id, rol_denumire, club_id) -> idempotenta o facem explicit.

-- 1. Proprietari ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proprietari_aplicatie (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    creat_la timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proprietari_aplicatie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proprietari_aplicatie FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.proprietari_aplicatie FROM PUBLIC, anon, authenticated;

INSERT INTO public.proprietari_aplicatie (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'alin2u83@gmail.com'
ON CONFLICT DO NOTHING;

-- 2. Evidenta rolurilor acordate prin acest mecanism ------------------------------------------------------------------------
-- Retragerea sterge DOAR ce a acordat mecanismul (nu rolurile pe care omul le avea inainte, ex. cont existent cu ADMIN_CLUB).
CREATE TABLE IF NOT EXISTS public.acces_management_acordat (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id uuid NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    rol_denumire text NOT NULL CHECK (rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')),
    acordat_de uuid,
    acordat_la timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, club_id)
);
ALTER TABLE public.acces_management_acordat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acces_management_acordat FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.acces_management_acordat FROM PUBLIC, anon, authenticated;

-- 3. este_proprietar() -------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.este_proprietar()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
    SELECT EXISTS (SELECT 1 FROM public.proprietari_aplicatie WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.este_proprietar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.este_proprietar() TO authenticated;

-- 4. acorda_acces_management ------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acorda_acces_management(p_user_id uuid, p_rol text, p_club_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    v_nume text;
BEGIN
    IF NOT public.este_proprietar() THEN
        RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501';
    END IF;
    IF p_rol IS NULL OR p_rol NOT IN ('ADMIN_CLUB', 'INSTRUCTOR') THEN
        RAISE EXCEPTION 'Rol invalid.' USING ERRCODE = '22023';
    END IF;

    -- doar pentru persoane externe cu grant activ la clubul respectiv
    IF NOT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont
                   WHERE user_id = p_user_id AND rol_denumire = 'REPREZENTANT_COMPETITIE') THEN
        RAISE EXCEPTION 'Persoana nu este reprezentant de competitie.' USING ERRCODE = '22023';
    END IF;
    SELECT nume INTO v_nume FROM public.acces_competitie_extern
     WHERE user_id = p_user_id AND club_id = p_club_id AND activ LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Persoana nu are acces activ la acest club.' USING ERRCODE = '22023';
    END IF;

    -- nu suprascriem un rol pe care omul il avea deja (nu il putem retrage ulterior)
    IF EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont
               WHERE user_id = p_user_id AND club_id = p_club_id AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')) THEN
        RAISE EXCEPTION 'Persoana are deja un rol de management la acest club.' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id, sportiv_id, is_primary, nume_utilizator_cache)
    VALUES (p_user_id, p_rol, p_club_id, NULL, false, v_nume);

    INSERT INTO public.acces_management_acordat (user_id, club_id, rol_denumire, acordat_de)
    VALUES (p_user_id, p_club_id, p_rol, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.acorda_acces_management(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acorda_acces_management(uuid, text, uuid) TO authenticated;

-- 5. revoca_acces_management ------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoca_acces_management(p_user_id uuid, p_club_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
    v_rol text;
BEGIN
    IF NOT public.este_proprietar() THEN
        RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501';
    END IF;

    SELECT rol_denumire INTO v_rol FROM public.acces_management_acordat
     WHERE user_id = p_user_id AND club_id = p_club_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nu exista acces de management acordat prin acest mecanism.' USING ERRCODE = 'P0002';
    END IF;

    -- sterge doar rolul acordat de mecanism; REPREZENTANT_COMPETITIE si grantul raman neatinse
    DELETE FROM public.utilizator_roluri_multicont
     WHERE user_id = p_user_id AND club_id = p_club_id AND rol_denumire = v_rol;
    DELETE FROM public.acces_management_acordat WHERE user_id = p_user_id AND club_id = p_club_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoca_acces_management(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoca_acces_management(uuid, uuid) TO authenticated;

-- 6. Starea curenta pentru UI (doar proprietar) -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acces_management_stare()
RETURNS TABLE (user_id uuid, club_id uuid, rol_denumire text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
    IF NOT public.este_proprietar() THEN
        RAISE EXCEPTION 'Acces interzis.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY SELECT a.user_id, a.club_id, a.rol_denumire FROM public.acces_management_acordat a;
END;
$$;
REVOKE ALL ON FUNCTION public.acces_management_stare() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acces_management_stare() TO authenticated;

-- Rollback:
--   DROP FUNCTION public.acces_management_stare(); DROP FUNCTION public.revoca_acces_management(uuid, uuid);
--   DROP FUNCTION public.acorda_acces_management(uuid, text, uuid); DROP FUNCTION public.este_proprietar();
--   DROP TABLE public.acces_management_acordat; DROP TABLE public.proprietari_aplicatie;
