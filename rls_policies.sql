
-- =================================================================
-- Politici de Securitate la Nivel de Rând (RLS) - V5.0
-- Izolare Multi-Club și Protecție Date Personale
-- =================================================================

-- 1. Helper pentru Super Admin (Federație)
-- Folosim SECURITY DEFINER pentru a permite accesul la tabelele de sistem necesare verificării
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid() 
        AND (r.nume = 'SUPER_ADMIN_FEDERATIE' OR r.nume = 'Admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper pentru determinarea Club ID-ului utilizatorului curent
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper pentru determinarea Sportiv ID-ului utilizatorului curent (PK-ul din tabelul sportivi)
CREATE OR REPLACE FUNCTION public.get_my_sportiv_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------
-- POLITICI TABEL: cluburi
-- -----------------------------------------------------------------
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;

-- Super Admin: Putere deplină asupra tuturor cluburilor
DROP POLICY IF EXISTS "Super Admin Cluburi Full" ON public.cluburi;
CREATE POLICY "Super Admin Cluburi Full" ON public.cluburi
    FOR ALL USING (public.is_super_admin());

-- Membrii Clubului (Admini, Instructori, Sportivi): Văd doar clubul propriu
DROP POLICY IF EXISTS "Users View Own Club" ON public.cluburi;
CREATE POLICY "Users View Own Club" ON public.cluburi
    FOR SELECT USING (id = public.get_my_club_id());

-- -----------------------------------------------------------------
-- POLITICI TABEL: prezenta_antrenament
-- -----------------------------------------------------------------
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;

-- Super Admin: Vede și editează orice prezență din sistem
DROP POLICY IF EXISTS "Super Admin Prezenta Full" ON public.prezenta_antrenament;
CREATE POLICY "Super Admin Prezenta Full" ON public.prezenta_antrenament
    FOR ALL USING (public.is_super_admin());

-- Club Admin / Instructor: Gestionează prezența sportivilor din propriul club
DROP POLICY IF EXISTS "Club Staff Manage Group Attendance" ON public.prezenta_antrenament;
CREATE POLICY "Club Staff Manage Group Attendance" ON public.prezenta_antrenament
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s 
            WHERE s.id = public.prezenta_antrenament.sportiv_id 
            AND s.club_id = public.get_my_club_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sportivi s 
            WHERE s.id = public.prezenta_antrenament.sportiv_id 
            AND s.club_id = public.get_my_club_id()
        )
    );

-- Sportiv: Vede doar istoricul propriei prezențe
DROP POLICY IF EXISTS "Sportiv View Personal Attendance" ON public.prezenta_antrenament;
CREATE POLICY "Sportiv View Personal Attendance" ON public.prezenta_antrenament
    FOR SELECT USING (sportiv_id = public.get_my_sportiv_id());

-- -----------------------------------------------------------------
-- POLITICI TABEL: anunturi_prezenta (Anunțuri făcute de sportivi)
-- -----------------------------------------------------------------
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;

-- Sportiv: Poate crea/vedea propriile anunțuri
DROP POLICY IF EXISTS "Sportiv Personal Announcements" ON public.anunturi_prezenta;
CREATE POLICY "Sportiv Personal Announcements" ON public.anunturi_prezenta
    FOR ALL USING (sportiv_id = public.get_my_sportiv_id());

-- Instructor/Admin Club: Văd toate anunțurile de la clubul lor
DROP POLICY IF EXISTS "Club Staff View Group Announcements" ON public.anunturi_prezenta;
CREATE POLICY "Club Staff View Group Announcements" ON public.anunturi_prezenta
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s 
            WHERE s.id = public.anunturi_prezenta.sportiv_id 
            AND s.club_id = public.get_my_club_id()
        )
    );
