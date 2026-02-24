-- =================================================================
-- CONSOLIDATED RLS POLICIES
-- =================================================================
-- Acest fișier consolidează toate politicile RLS din:
-- rls_policies.sql, 04_role_selection.sql, 20260224075500_fix_get_my_claim.sql, etc.
-- =================================================================

-- 1. Funcții Helper pentru Context JWT (Rol activ și Club)
-- Aceste funcții citesc metadatele sincronizate în JWT pentru performanță maximă.

CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS text AS $$
BEGIN 
  RETURN auth.jwt() -> 'user_metadata' ->> 'rol_activ_context'; 
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS uuid AS $$
BEGIN 
  RETURN (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid; 
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Procedură pentru Resetarea Politicilor (Idempotentă)
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
-- 3. APLICARE POLITICI PE TABELE
-- =================================================================

-- == TABEL: utilizator_roluri_multicont ==
CALL public.reset_all_policies_for_table('utilizator_roluri_multicont');
ALTER TABLE public.utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilizator_roluri_multicont FORCE ROW LEVEL SECURITY;

-- Super Admin: Acces total
CREATE POLICY "Super Admin - Acces total la roluri" ON public.utilizator_roluri_multicont
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Admin/Instructor: Văd rolurile din propriul club
CREATE POLICY "Admin/Instructor - Vizualizare roluri club" ON public.utilizator_roluri_multicont
    FOR SELECT USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND club_id = get_active_club_id()
    );

-- Utilizator: Își vede propriile roluri
CREATE POLICY "Utilizator - Vizualizare roluri proprii" ON public.utilizator_roluri_multicont
    FOR SELECT USING (user_id = auth.uid());

-- Permite utilizatorilor să își actualizeze flag-ul is_primary (necesar pentru schimbarea rolului)
CREATE POLICY "Utilizator - Actualizare rol primar propriu" ON public.utilizator_roluri_multicont
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- == TABEL: sportivi ==
CALL public.reset_all_policies_for_table('sportivi');
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total sportivi" ON public.sportivi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin/Instructor - Management sportivi club" ON public.sportivi
    FOR ALL USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND club_id = get_active_club_id()
    );

CREATE POLICY "Utilizator - Vizualizare profil propriu" ON public.sportivi
    FOR SELECT USING (user_id = auth.uid());


-- == TABEL: plati ==
CALL public.reset_all_policies_for_table('plati');
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total plati" ON public.plati
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin/Instructor - Vizualizare plati club" ON public.plati
    FOR SELECT USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND club_id = get_active_club_id()
    );

CREATE POLICY "Utilizator - Vizualizare plati proprii" ON public.plati
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s 
            WHERE s.user_id = auth.uid() 
            AND (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)
        )
    );


-- == TABEL: evenimente ==
CALL public.reset_all_policies_for_table('evenimente');
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total evenimente" ON public.evenimente
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin/Instructor - Management evenimente club" ON public.evenimente
    FOR ALL USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND club_id = get_active_club_id()
    );


-- == TABEL: grupe ==
CALL public.reset_all_policies_for_table('grupe');
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total grupe" ON public.grupe
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin/Instructor - Management grupe club" ON public.grupe
    FOR ALL USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND club_id = get_active_club_id()
    );


-- == TABEL: cluburi ==
CALL public.reset_all_policies_for_table('cluburi');
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total cluburi" ON public.cluburi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Toti utilizatorii - Vizualizare Federatie" ON public.cluburi
    FOR SELECT USING (tip_club = 'FEDERATIE');

CREATE POLICY "Utilizator - Vizualizare club propriu" ON public.cluburi
    FOR SELECT USING (id = get_active_club_id());


-- == TABEL: sesiuni_examene ==
CALL public.reset_all_policies_for_table('sesiuni_examene');
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total examene" ON public.sesiuni_examene
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin/Instructor - Management examene club sau generale" ON public.sesiuni_examene
    FOR ALL USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND (club_id = get_active_club_id() OR club_id IS NULL)
    );

CREATE POLICY "Sportiv - Vizualizare examene inscrise sau generale" ON public.sesiuni_examene
    FOR SELECT USING (
        club_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.inscrieri_examene ie 
            JOIN public.sportivi s ON ie.sportiv_id = s.id 
            WHERE ie.sesiune_id = sesiuni_examene.id AND s.user_id = auth.uid()
        )
    );


-- == TABEL: prezenta_antrenament ==
CALL public.reset_all_policies_for_table('prezenta_antrenament');
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total prezenta" ON public.prezenta_antrenament
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin/Instructor - Management prezenta club" ON public.prezenta_antrenament
    FOR ALL USING (
        get_active_role() IN ('Admin Club', 'Instructor', 'ADMIN_CLUB', 'INSTRUCTOR') 
        AND club_id = get_active_club_id()
    );
