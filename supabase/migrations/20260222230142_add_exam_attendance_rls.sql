-- =================================================================
-- Script pentru Politici RLS pe `sesiuni_examene` și `prezenta_antrenament`
-- =================================================================
-- Obiective:
-- 1. Asigură permisiuni granulare bazate pe contextul din JWT (`rol_activ_context`, `club_id`).
-- 2. Instructorii au permisiuni SELECT, INSERT, UPDATE doar pentru clubul lor.
-- 3. Super Adminii au acces total.
-- =================================================================

-- Asigură existența funcțiilor helper
-- Acestea ar trebui să existe deja din migrațiile anterioare, dar le includem pentru siguranță.
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS text AS $$
BEGIN RETURN auth.jwt() -> 'user_metadata' ->> 'rol_activ_context'; END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS uuid AS $$
BEGIN RETURN (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid; END;
$$ LANGUAGE plpgsql STABLE;

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
-- Politici pentru `sesiuni_examene`
-- =================================================================
CALL public.reset_all_policies_for_table('sesiuni_examene');
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiuni_examene FORCE ROW LEVEL SECURITY;

-- Super Admin - Acces total
CREATE POLICY "Super Admin - Acces total la sesiuni examene" ON public.sesiuni_examene
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Admin Club/Instructor - SELECT, INSERT, UPDATE pentru clubul lor
CREATE POLICY "Admin Club/Instructor - Management sesiuni examene propriu club" ON public.sesiuni_examene
    FOR ALL USING (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND club_id = get_active_club_id()
    )
    WITH CHECK (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND club_id = get_active_club_id()
    );

-- =================================================================
-- Politici pentru `prezenta_antrenament`
-- =================================================================
CALL public.reset_all_policies_for_table('prezenta_antrenament');
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prezenta_antrenament FORCE ROW LEVEL SECURITY;

-- Super Admin - Acces total
CREATE POLICY "Super Admin - Acces total la prezenta antrenament" ON public.prezenta_antrenament
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Admin Club/Instructor - SELECT, INSERT, UPDATE pentru clubul lor
CREATE POLICY "Admin Club/Instructor - Management prezenta antrenament propriu club" ON public.prezenta_antrenament
    FOR ALL USING (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND EXISTS (
            SELECT 1 FROM public.antrenamente a
            JOIN public.grupe g ON a.grupa_id = g.id
            WHERE a.id = prezenta_antrenament.antrenament_id AND g.club_id = get_active_club_id()
        )
    )
    WITH CHECK (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND EXISTS (
            SELECT 1 FROM public.antrenamente a
            JOIN public.grupe g ON a.grupa_id = g.id
            WHERE a.id = prezenta_antrenament.antrenament_id AND g.club_id = get_active_club_id()
        )
    );
