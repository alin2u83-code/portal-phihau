-- =================================================================
-- MASTER SCRIPT: Consolidated Row Level Security (RLS) Policies
-- Versiune: 3.0
-- =================================================================

-- =================================================================
-- 1. MODUL ADMINISTRATIV: Proceduri Helper și Utilitare
-- =================================================================

-- Resetare politici pentru un tabel (Idempotent)
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

-- Funcții Helper pentru citirea contextului din JWT (Rol activ și Club)
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'rol_activ_context', '')::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'club_id', '')::uuid;
$$ LANGUAGE sql STABLE;

-- Functie pentru a verifica daca un utilizator este super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    _is_super_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM auth.users au
        JOIN public.utilizator_roluri_multicont urm ON au.id = urm.user_id
        JOIN public.roluri r ON urm.rol_id = r.id
        WHERE au.id = auth.uid()
        AND r.nume = 'SUPER_ADMIN_FEDERATIE'
    ) INTO _is_super_admin;

    RETURN _is_super_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie pentru a verifica daca un utilizator este admin de club
CREATE OR REPLACE FUNCTION is_admin_check(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.utilizator_roluri_multicont ur
    JOIN public.roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = p_user_id
      AND (r.nume = 'ADMIN_CLUB' OR r.nume = 'SUPER_ADMIN_FEDERATIE')
  );
END;
$$;


-- =================================================================
-- 2. SECURITATE (RLS): Politici Granulare pe Module
-- =================================================================

-- Aplicare politici pe tabela `sportivi`
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

CREATE POLICY "Allow club admin to view own club members" ON public.sportivi
FOR SELECT
USING (
  (is_admin_check(auth.uid()) AND club_id IN (
    SELECT club_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid()
  ))
);

-- Aplicare politici pe tabela `plati`
CALL public.reset_all_policies_for_table('plati');
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la plăți" ON public.plati
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Staff-ul clubului gestionează plățile clubului" ON public.plati
    FOR ALL USING ((get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)
            AND s.club_id = get_active_club_id()
        )
    );

CREATE POLICY "Utilizatorii își văd propriile plăți" ON public.plati
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.user_id = auth.uid()
        AND (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)
    ));

-- Aplicare politici pe tabela `cluburi`
CALL public.reset_all_policies_for_table('cluburi');
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluburi FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la cluburi" ON public.cluburi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Utilizatorii își văd propriul club" ON public.cluburi
    FOR SELECT USING (id = get_active_club_id());

CREATE POLICY "Toți utilizatorii văd Federația" ON public.cluburi
    FOR SELECT USING (id = '00000000-0000-0000-0000-000000000000'); -- FEDERATIE_ID

-- Aplicare politici pe tabela `alocare_plata`
ALTER TABLE public.alocare_plata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alocare_plata FORCE ROW LEVEL SECURITY;

CREATE POLICY "Utilizatorii își pot gestiona propriile alocări de plată"
ON public.alocare_plata
FOR ALL
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Aplicare politici pe tabela `sesiuni_examene`
CALL public.reset_all_policies_for_table('sesiuni_examene');
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiuni_examene FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la sesiuni examene" ON public.sesiuni_examene
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Admin Club/Instructor - Management sesiuni examene propriu club" ON public.sesiuni_examene
    FOR ALL USING (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND club_id = get_active_club_id()
    )
    WITH CHECK (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND club_id = get_active_club_id()
    );

-- Aplicare politici pe tabela `prezenta_antrenament`
CALL public.reset_all_policies_for_table('prezenta_antrenament');
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prezenta_antrenament FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la prezenta antrenament" ON public.prezenta_antrenament
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

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
