-- =================================================================
-- Script Complet pentru Revizuirea Securității RLS
-- v8.1 - Bazat pe Contextul de Rol din JWT
-- =================================================================
-- Acest script execută 2 pași critici:
-- 1. Curăță politicile vechi și funcțiile helper problematice.
-- 2. Implementează un set nou de politici RLS, securizate,
--    folosind `SECURITY DEFINER` pentru a rupe recursivitatea și
--    funcții bazate pe JWT pentru performanță.
-- =================================================================

-- =================================================================
-- PASUL 1: Curățarea politicilor și funcțiilor vechi
-- =================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Elimină politicile vechi, hardcodate
        EXECUTE 'DROP POLICY IF EXISTS "Emergency_Alin_Access" ON public.' || quote_ident(r.tablename) || ';';
        EXECUTE 'DROP POLICY IF EXISTS "MASTER_ACCESS_ALIN" ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END;
$$;

-- Elimină funcțiile helper vechi care cauzau recursivitate
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_club_staff();
DROP FUNCTION IF EXISTS public.get_my_club_id();
DROP FUNCTION IF EXISTS public.get_my_sportiv_id();

-- Procedură helper pentru resetarea politicilor (asigură o instalare curată)
CREATE OR REPLACE PROCEDURE public.reset_all_policies_for_table(p_table_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_record.policyname, p_table_name);
    END LOOP;
END;
$$;

-- =================================================================
-- PASUL 2: Funcții Helper și Politici RLS Noi, bazate pe JWT
-- =================================================================

-- Funcții helper care citesc din JWT (performant și sigur)
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS text AS $$
BEGIN RETURN auth.jwt() -> 'user_metadata' ->> 'rol_activ_context'; END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS uuid AS $$
BEGIN RETURN (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid; END;
$$ LANGUAGE plpgsql STABLE;

-- Funcție `SECURITY DEFINER` solicitată, pentru verificare ADMIN
-- Aceasta ocolește RLS pentru a verifica rolurile, rupând recursivitatea.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND (rol_denumire = 'Admin' OR rol_denumire = 'SUPER_ADMIN_FEDERATIE')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- == Aplicare Politici pe tabelul `utilizator_roluri_multicont` (sursa recursivității) ==
CALL public.reset_all_policies_for_table('utilizator_roluri_multicont');
ALTER TABLE public.utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilizator_roluri_multicont FORCE ROW LEVEL SECURITY;

-- Politica 1: Adminii pot gestiona roluri (folosind funcția SECURITY DEFINER).
CREATE POLICY "Admini gestionează toate rolurile" ON public.utilizator_roluri_multicont
    FOR ALL USING (public.check_is_admin());

-- Politica 2: Utilizatorii își pot vedea propriile roluri.
CREATE POLICY "Utilizatorii își văd propriile roluri" ON public.utilizator_roluri_multicont
    FOR SELECT USING (user_id = auth.uid());


-- == Aplicare Politici pe tabelul `sportivi` ==
CALL public.reset_all_policies_for_table('sportivi');
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la sportivi" ON public.sportivi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Staff-ul clubului vede sportivii din propriul club" ON public.sportivi
    FOR SELECT USING (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND club_id = get_active_club_id()
    );

CREATE POLICY "Utilizatorii își gestionează propriul profil" ON public.sportivi
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- == Aplicare Politici pe tabelul `plati` (ca exemplu general) ==
CALL public.reset_all_policies_for_table('plati');
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la plăți" ON public.plati
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Staff-ul clubului gestionează plățile clubului" ON public.plati
    FOR ALL USING ((get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
            AND s.club_id = get_active_club_id()
        )
    );

CREATE POLICY "Utilizatorii își văd propriile plăți" ON public.plati
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.user_id = auth.uid()
        AND (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
    ));


-- == Aplicare Politici pe restul tabelelor (principiu similar) ==
-- ... se pot adăuga aici politici similare pentru `grupe`, `sesiuni_examene`, etc.,
-- folosind `get_active_role()` și `get_active_club_id()` pentru a evita recursivitatea.