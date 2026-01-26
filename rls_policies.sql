-- =================================================================
-- Politici de Securitate la Nivel de Rând (RLS) - V6.0
-- Acces granular pentru Admin Club & Instructori
-- =================================================================

-- 1. HELPERS EXISTENȚI (Păstrați)
-- =================================================================
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

CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_sportiv_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. HELPER NOU: Verifică dacă utilizatorul este Admin Club sau Instructor
-- =================================================================
CREATE OR REPLACE FUNCTION public.is_club_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid() 
        AND (r.nume = 'Admin Club' OR r.nume = 'Instructor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. POLITICI PENTRU TABELELE PRINCIPALE
-- =================================================================

-- POLITICA PENTRU TABELUL: sportivi (CRUCIALĂ)
-- -----------------------------------------------------------------
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "General access policy for sportivi" ON public.sportivi;
CREATE POLICY "General access policy for sportivi"
ON public.sportivi FOR ALL
USING (
    public.is_super_admin() -- Super adminii văd tot.
    OR (public.is_club_staff() AND club_id = public.get_my_club_id()) -- Staff-ul clubului vede sportivii din clubul propriu.
    OR (id = public.get_my_sportiv_id()) -- Fiecare sportiv își vede propriul profil.
)
WITH CHECK (
    public.is_super_admin()
    OR (public.is_club_staff() AND club_id = public.get_my_club_id())
    OR (id = public.get_my_sportiv_id())
);

-- POLITICA PENTRU TABELUL: grupe
-- -----------------------------------------------------------------
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view for grupe" ON public.grupe;
CREATE POLICY "Public view for grupe" ON public.grupe
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Club staff and admins can manage grupe" ON public.grupe;
CREATE POLICY "Club staff and admins can manage grupe" ON public.grupe
    FOR ALL USING (
        public.is_super_admin()
        OR (public.is_club_staff() AND club_id = public.get_my_club_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR (public.is_club_staff() AND club_id = public.get_my_club_id())
    );

-- POLITICA PENTRU TABELELE FINANCIARE: plati & tranzactii
-- -----------------------------------------------------------------
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financial management policy" ON public.plati;
CREATE POLICY "Financial management policy" ON public.plati FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id) AND s.club_id = public.get_my_club_id()))
    OR (sportiv_id = public.get_my_sportiv_id())
    OR (familie_id IN (SELECT s.familie_id FROM sportivi s WHERE s.id = public.get_my_sportiv_id() AND s.familie_id IS NOT NULL))
);


DROP POLICY IF EXISTS "Financial management policy" ON public.tranzactii;
CREATE POLICY "Financial management policy" ON public.tranzactii FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE (s.id = tranzactii.sportiv_id OR s.familie_id = tranzactii.familie_id) AND s.club_id = public.get_my_club_id()))
    OR (sportiv_id = public.get_my_sportiv_id())
    OR (familie_id IN (SELECT s.familie_id FROM sportivi s WHERE s.id = public.get_my_sportiv_id() AND s.familie_id IS NOT NULL))
);

-- POLITICI PENTRU TABELELE DE EVENIMENTE: sesiuni_examene, inscrieri_examene, evenimente, rezultate
-- -----------------------------------------------------------------
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;

-- Sesiuni Examene: Toată lumea vede evenimentele de federație și cele de la clubul propriu
DROP POLICY IF EXISTS "Exam sessions access policy" ON public.sesiuni_examene;
CREATE POLICY "Exam sessions access policy" ON public.sesiuni_examene FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND club_id = public.get_my_club_id())
    OR (auth.role() = 'authenticated' AND (club_id IS NULL OR club_id = public.get_my_club_id())) -- pentru SELECT
);

-- Înscrieri Examene: Acces bazat pe clubul sportivului
DROP POLICY IF EXISTS "Exam registrations access policy" ON public.inscrieri_examene;
CREATE POLICY "Exam registrations access policy" ON public.inscrieri_examene FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = inscrieri_examene.sportiv_id AND s.club_id = public.get_my_club_id()))
    OR (sportiv_id = public.get_my_sportiv_id())
);

-- Evenimente (Stagii/Competiții): Similar cu Sesiuni Examene
DROP POLICY IF EXISTS "Events access policy" ON public.evenimente;
CREATE POLICY "Events access policy" ON public.evenimente FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND club_id = public.get_my_club_id())
    OR (auth.role() = 'authenticated' AND (club_id IS NULL OR club_id = public.get_my_club_id())) -- pentru SELECT
);

-- Rezultate (Stagii/Competiții): Similar cu Înscrieri Examene
DROP POLICY IF EXISTS "Results access policy" ON public.rezultate;
CREATE POLICY "Results access policy" ON public.rezultate FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = rezultate.sportiv_id AND s.club_id = public.get_my_club_id()))
    OR (sportiv_id = public.get_my_sportiv_id())
);

-- 4. POLITICI PENTRU NOMENCLATOARE (Publice pentru citire)
-- =================================================================
CREATE OR REPLACE PROCEDURE public.apply_public_nomenclator_policies(table_name TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Public view for %1$I" ON public.%1$I;', table_name);
    EXECUTE format('CREATE POLICY "Public view for %1$I" ON public.%1$I FOR SELECT USING (auth.role() = ''authenticated'');', table_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Super Admin management for %1$I" ON public.%1$I;', table_name);
    EXECUTE format('CREATE POLICY "Super Admin management for %1$I" ON public.%1$I FOR ALL USING (public.is_super_admin());', table_name);
END;
$$;

CALL public.apply_public_nomenclator_policies('roluri');
CALL public.apply_public_nomenclator_policies('grade');
CALL public.apply_public_nomenclator_policies('nom_locatii');
CALL public.apply_public_nomenclator_policies('tipuri_plati');
CALL public.apply_public_nomenclator_policies('preturi_config');
CALL public.apply_public_nomenclator_policies('reduceri');
CALL public.apply_public_nomenclator_policies('tipuri_abonament');

-- Politica pentru Cluburi - toți pot vedea, doar Super Admin modifică
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view for cluburi" ON public.cluburi;
CREATE POLICY "Public view for cluburi" ON public.cluburi FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Super Admin management for cluburi" ON public.cluburi;
CREATE POLICY "Super Admin management for cluburi" ON public.cluburi FOR ALL USING (public.is_super_admin());


-- 5. POLITICI TABELE AUXILIARE (Păstrate și verificate)
-- =================================================================
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance access policy" ON public.prezenta_antrenament;
CREATE POLICY "Attendance access policy" ON public.prezenta_antrenament FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = prezenta_antrenament.sportiv_id AND s.club_id = public.get_my_club_id()))
    OR (sportiv_id = public.get_my_sportiv_id())
);

ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance announcements access policy" ON public.anunturi_prezenta;
CREATE POLICY "Attendance announcements access policy" ON public.anunturi_prezenta FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = anunturi_prezenta.sportiv_id AND s.club_id = public.get_my_club_id()))
    OR (sportiv_id = public.get_my_sportiv_id())
);

ALTER TABLE public.in_app_notificari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications access policy" ON public.in_app_notificari;
CREATE POLICY "Notifications access policy" ON public.in_app_notificari FOR ALL
USING (
    recipient_user_id = auth.uid()
);

-- Politica pentru program_antrenamente
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Program antrenamente access policy" ON public.program_antrenamente;
CREATE POLICY "Program antrenamente access policy" ON public.program_antrenamente FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND (EXISTS(SELECT 1 from grupe g where g.id = program_antrenamente.grupa_id AND g.club_id = public.get_my_club_id()) OR program_antrenamente.grupa_id IS NULL))
    OR (auth.role() = 'authenticated') -- Permite SELECT pentru toți, pentru calendar
);

-- Politica pentru familii
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Familii access policy" ON public.familii;
CREATE POLICY "Familii access policy" ON public.familii FOR ALL
USING (
    public.is_super_admin()
    OR (public.is_club_staff() AND EXISTS(SELECT 1 FROM sportivi s WHERE s.familie_id = familii.id AND s.club_id = public.get_my_club_id()))
    OR (id IN (SELECT s.familie_id FROM sportivi s WHERE s.id = public.get_my_sportiv_id() AND s.familie_id IS NOT NULL))
);
