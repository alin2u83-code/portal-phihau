-- =================================================================
-- Script Complet pentru Revizuirea Securității RLS
-- v9.1 - Eliminare `check_is_staff` și politici bazate pe JWT
-- =================================================================
-- Acest script ajustează politica de securitate pe tabela de roluri
-- pentru a se baza pe contextul din JWT, eliminând funcțiile `SECURITY DEFINER`.
-- =================================================================

-- Elimină funcția helper veche
DROP FUNCTION IF EXISTS public.check_is_staff();
-- Elimină funcțiile vechi care nu mai sunt necesare
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_club_staff();
DROP FUNCTION IF EXISTS public.get_my_club_id();
DROP FUNCTION IF EXISTS public.get_my_sportiv_id();
DROP FUNCTION IF EXISTS public.check_is_admin(); -- Eliminare preventivă

-- Procedură helper pentru resetarea politicilor
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

-- Funcții helper care citesc din JWT (performant și sigur)
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS text AS $$
BEGIN RETURN auth.jwt() -> 'user_metadata' ->> 'rol_activ_context'; END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS uuid AS $$
BEGIN RETURN (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid; END;
$$ LANGUAGE plpgsql STABLE;

-- == Aplicare Politici pe tabelul `utilizator_roluri_multicont` ==
CALL public.reset_all_policies_for_table('utilizator_roluri_multicont');
ALTER TABLE public.utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilizator_roluri_multicont FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii au acces total.
CREATE POLICY "Super Admin - Acces total la roluri" ON public.utilizator_roluri_multicont
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Adminii de Club pot gestiona rolurile din clubul lor.
CREATE POLICY "Admin Club - Management roluri din propriul club" ON public.utilizator_roluri_multicont
    FOR ALL USING (get_active_role() = 'Admin Club' AND club_id = get_active_club_id())
    WITH CHECK (get_active_role() = 'Admin Club' AND club_id = get_active_club_id());

-- Politica 3: Utilizatorii își pot vedea propriile roluri.
CREATE POLICY "Utilizatorii își văd propriile roluri" ON public.utilizator_roluri_multicont
    FOR SELECT USING (user_id = auth.uid());