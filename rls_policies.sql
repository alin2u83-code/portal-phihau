-- =================================================================
-- Politici de Securitate la Nivel de Rând (RLS) - V7.1
-- Structură refactorizată pentru claritate, acces complet Super Admin și corectarea politicilor permisive
-- =================================================================
-- Model de politici:
-- 1. O politică permisivă pentru SUPER_ADMIN_FEDERATIE (acces total).
-- 2. Politici restrictive pentru celelalte roluri (Admin Club, Instructor, Sportiv).
-- =================================================================

-- 1. FUNCȚII HELPER (Păstrate și verificate)
-- =================================================================

-- Verifică dacă utilizatorul curent este Super Admin (Federație) sau Admin (rol echivalent).
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

-- Verifică dacă utilizatorul curent are rol de staff la nivel de club (Admin Club sau Instructor).
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

-- Returnează ID-ul clubului utilizatorului curent.
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Returnează ID-ul de sportiv al utilizatorului curent.
CREATE OR REPLACE FUNCTION public.get_my_sportiv_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. PROCEDURĂ DE RESETARE A POLITICILOR
-- =================================================================
CREATE OR REPLACE PROCEDURE public.reset_policies_for_table(table_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_record.policyname, table_name);
    END LOOP;
END;
$$;


-- 3. APLICARE POLITICI PE FIECARE TABEL
-- =================================================================

-- == TABELUL: sportivi ==
CALL public.reset_policies_for_table('sportivi');
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.sportivi
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club staff can manage their athletes" ON public.sportivi
    FOR ALL USING (public.is_club_staff() AND club_id = public.get_my_club_id())
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());
CREATE POLICY "Athletes can view and manage their own profile" ON public.sportivi
    FOR ALL USING (id = public.get_my_sportiv_id())
    WITH CHECK (id = public.get_my_sportiv_id());

-- == TABELUL: cluburi ==
CALL public.reset_policies_for_table('cluburi');
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluburi FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.cluburi
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club staff can update their own club" ON public.cluburi
    FOR UPDATE USING (public.is_club_staff() AND id = public.get_my_club_id());
CREATE POLICY "Authenticated users can view clubs" ON public.cluburi
    FOR SELECT USING (auth.role() = 'authenticated');

-- == TABELUL: grupe ==
CALL public.reset_policies_for_table('grupe');
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupe FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.grupe
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club staff can manage their groups" ON public.grupe
    FOR ALL USING (public.is_club_staff() AND club_id = public.get_my_club_id())
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());
CREATE POLICY "Authenticated users can view relevant groups" ON public.grupe
    FOR SELECT USING (club_id = public.get_my_club_id() OR (club_id IS NULL AND (public.is_club_staff() OR public.is_super_admin())));


-- == TABELE FINANCIARE: plati & tranzactii ==
CALL public.reset_policies_for_table('plati');
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati FORCE ROW LEVEL SECURITY;
CALL public.reset_policies_for_table('tranzactii');
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tranzactii FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access to plati" ON public.plati FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Super Admins have full access to tranzactii" ON public.tranzactii FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Club staff can manage club finances" ON public.plati FOR ALL 
    USING (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id) AND s.club_id = public.get_my_club_id()))
    WITH CHECK (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id) AND s.club_id = public.get_my_club_id()));
CREATE POLICY "Club staff can manage club transactions" ON public.tranzactii FOR ALL
    USING (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE (s.id = tranzactii.sportiv_id OR s.familie_id = tranzactii.familie_id) AND s.club_id = public.get_my_club_id()))
    WITH CHECK (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE (s.id = tranzactii.sportiv_id OR s.familie_id = tranzactii.familie_id) AND s.club_id = public.get_my_club_id()));

CREATE POLICY "Users can view their own financial records" ON public.plati FOR SELECT
    USING (sportiv_id = public.get_my_sportiv_id() OR familie_id = (SELECT s.familie_id FROM sportivi s WHERE s.id = public.get_my_sportiv_id()));
CREATE POLICY "Users can view their own transactions" ON public.tranzactii FOR SELECT
    USING (sportiv_id = public.get_my_sportiv_id() OR familie_id = (SELECT s.familie_id FROM sportivi s WHERE s.id = public.get_my_sportiv_id()));
    
-- == TABELE EVENIMENTE: sesiuni_examene, evenimente ==
CALL public.reset_policies_for_table('sesiuni_examene');
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiuni_examene FORCE ROW LEVEL SECURITY;
CALL public.reset_policies_for_table('evenimente');
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenimente FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access to sesiuni_examene" ON public.sesiuni_examene FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Super Admins have full access to evenimente" ON public.evenimente FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Club staff can manage their events" ON public.sesiuni_examene FOR ALL
    USING (public.is_club_staff() AND club_id = public.get_my_club_id())
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());
CREATE POLICY "Club staff can manage their competitions" ON public.evenimente FOR ALL
    USING (public.is_club_staff() AND club_id = public.get_my_club_id())
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());
    
CREATE POLICY "Users can view own club and federation events" ON public.sesiuni_examene FOR SELECT
    USING (auth.role() = 'authenticated' AND (club_id IS NULL OR club_id = public.get_my_club_id()));
CREATE POLICY "Users can view own club and federation competitions" ON public.evenimente FOR SELECT
    USING (auth.role() = 'authenticated' AND (club_id IS NULL OR club_id = public.get_my_club_id()));

-- == TABELE INSCRIERI: inscrieri_examene, rezultate ==
CALL public.reset_policies_for_table('inscrieri_examene');
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscrieri_examene FORCE ROW LEVEL SECURITY;
CALL public.reset_policies_for_table('rezultate');
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rezultate FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access to inscrieri_examene" ON public.inscrieri_examene FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Super Admins have full access to rezultate" ON public.rezultate FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Club staff can manage registrations for their athletes" ON public.inscrieri_examene FOR ALL
    USING (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = inscrieri_examene.sportiv_id AND s.club_id = public.get_my_club_id()))
    WITH CHECK (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = inscrieri_examene.sportiv_id AND s.club_id = public.get_my_club_id()));
CREATE POLICY "Club staff can manage results for their athletes" ON public.rezultate FOR ALL
    USING (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = rezultate.sportiv_id AND s.club_id = public.get_my_club_id()))
    WITH CHECK (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = rezultate.sportiv_id AND s.club_id = public.get_my_club_id()));

CREATE POLICY "Athletes can manage their own registrations" ON public.inscrieri_examene FOR ALL
    USING (sportiv_id = public.get_my_sportiv_id())
    WITH CHECK (sportiv_id = public.get_my_sportiv_id());
CREATE POLICY "Athletes can manage their own results" ON public.rezultate FOR ALL
    USING (sportiv_id = public.get_my_sportiv_id())
    WITH CHECK (sportiv_id = public.get_my_sportiv_id());

-- == NOMENCLATOARE (majoritatea publice pentru citire, management doar de Super Admin) ==
CREATE OR REPLACE PROCEDURE public.apply_nomenclator_policies(table_name TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    CALL public.reset_policies_for_table(table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', table_name);
    
    EXECUTE format('CREATE POLICY "Super Admins have full access" ON public.%1$I FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());', table_name);
    EXECUTE format('CREATE POLICY "Authenticated users can view" ON public.%1$I FOR SELECT USING (auth.role() = ''authenticated'');', table_name);
END;
$$;

CALL public.apply_nomenclator_policies('roluri');
CALL public.apply_nomenclator_policies('grade');
CALL public.apply_nomenclator_policies('nom_locatii');
CALL public.apply_nomenclator_policies('tipuri_plati');
CALL public.apply_nomenclator_policies('preturi_config');
CALL public.apply_nomenclator_policies('reduceri');
CALL public.apply_nomenclator_policies('grade_preturi_config');
CALL public.apply_nomenclator_policies('taxe_anuale_config');

-- == TABELUL: tipuri_abonament (caz special, și Admin Club poate adăuga) ==
CALL public.reset_policies_for_table('tipuri_abonament');
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipuri_abonament FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.tipuri_abonament FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club staff can manage their own subscription types" ON public.tipuri_abonament FOR ALL
    USING (public.is_club_staff() AND club_id = public.get_my_club_id())
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());
CREATE POLICY "Authenticated users can view relevant subscription types" ON public.tipuri_abonament
    FOR SELECT USING (club_id = public.get_my_club_id() OR (club_id IS NULL AND (public.is_club_staff() OR public.is_super_admin())));


-- == ALTE TABELE ==

-- TABELUL: deconturi_federatie
CALL public.reset_policies_for_table('deconturi_federatie');
ALTER TABLE public.deconturi_federatie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deconturi_federatie FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.deconturi_federatie FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club Admins can see their own deconturi" ON public.deconturi_federatie FOR ALL
    USING (public.is_club_staff() AND club_id = public.get_my_club_id())
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());

-- TABELUL: familii
CALL public.reset_policies_for_table('familii');
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familii FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.familii FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club staff can manage their families" ON public.familii FOR ALL
    USING (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.familie_id = familii.id AND s.club_id = public.get_my_club_id()))
    WITH CHECK (public.is_club_staff());
CREATE POLICY "Users can view their own family" ON public.familii FOR SELECT
    USING (id = (SELECT s.familie_id FROM sportivi s WHERE s.id = public.get_my_sportiv_id()));

-- TABELUL: program_antrenamente & prezenta_antrenament
CALL public.reset_policies_for_table('program_antrenamente');
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_antrenamente FORCE ROW LEVEL SECURITY;
CALL public.reset_policies_for_table('prezenta_antrenament');
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prezenta_antrenament FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.program_antrenamente FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Super Admins have full access" ON public.prezenta_antrenament FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Club staff can manage schedules and attendance" ON public.program_antrenamente
    FOR ALL
    USING (
        public.is_club_staff() AND (
            program_antrenamente.grupa_id IS NULL OR -- Allow access to "vacation" trainings
            EXISTS (
                SELECT 1 FROM public.grupe g
                WHERE g.id = program_antrenamente.grupa_id AND g.club_id = public.get_my_club_id()
            )
        )
    )
    WITH CHECK (
        public.is_club_staff() AND (
            program_antrenamente.grupa_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.grupe g
                WHERE g.id = program_antrenamente.grupa_id AND g.club_id = public.get_my_club_id()
            )
        )
    );

CREATE POLICY "Club staff can manage attendance records" ON public.prezenta_antrenament
    FOR ALL
    USING (
        public.is_club_staff() AND EXISTS (
            SELECT 1 FROM public.sportivi s WHERE s.id = prezenta_antrenament.sportiv_id AND s.club_id = public.get_my_club_id()
        )
    )
    WITH CHECK (
        public.is_club_staff() AND
        -- The user must be able to see the athlete (i.e., athlete is in their club)
        EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = prezenta_antrenament.sportiv_id AND s.club_id = public.get_my_club_id()) AND
        -- The user must be able to see the training
        EXISTS (
            SELECT 1
            FROM public.program_antrenamente pa
            LEFT JOIN public.grupe g ON pa.grupa_id = g.id
            WHERE pa.id = prezenta_antrenament.antrenament_id
            AND (pa.grupa_id IS NULL OR g.club_id = public.get_my_club_id())
        )
    );
    
CREATE POLICY "Authenticated users can view schedules" ON public.program_antrenamente FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Athletes can view their own attendance" ON public.prezenta_antrenament FOR SELECT USING (sportiv_id = public.get_my_sportiv_id());

-- TABELUL: anunturi_prezenta
CALL public.reset_policies_for_table('anunturi_prezenta');
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anunturi_prezenta FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.anunturi_prezenta FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club staff can view announcements for their club" ON public.anunturi_prezenta FOR SELECT
    USING (public.is_club_staff() AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = anunturi_prezenta.sportiv_id AND s.club_id = public.get_my_club_id()));
CREATE POLICY "Athletes can manage their own announcements" ON public.anunturi_prezenta FOR ALL
    USING (sportiv_id = public.get_my_sportiv_id())
    WITH CHECK (sportiv_id = public.get_my_sportiv_id());

-- TABELUL: prezenta
CALL public.reset_policies_for_table('prezenta');
ALTER TABLE public.prezenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prezenta FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.prezenta FOR ALL 
    USING (public.is_super_admin()) 
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Club staff can manage attendance for their club" ON public.prezenta FOR ALL 
    USING (public.is_club_staff() AND club_id = public.get_my_club_id()) 
    WITH CHECK (public.is_club_staff() AND club_id = public.get_my_club_id());

CREATE POLICY "Athletes can view their own attendance" ON public.prezenta FOR SELECT 
    USING (sportiv_id = public.get_my_sportiv_id());

-- TABELUL: notificari
CALL public.reset_policies_for_table('notificari');
ALTER TABLE public.notificari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificari FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage all notifications" ON public.notificari FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users can manage their own notifications" ON public.notificari FOR ALL
    USING (recipient_user_id = auth.uid())
    WITH CHECK (sender_sportiv_id = public.get_my_sportiv_id()); -- Un utilizator poate doar crea notificări în numele său
CREATE POLICY "Staff can create notifications" ON public.notificari FOR INSERT
    WITH CHECK (public.is_club_staff() AND sender_sportiv_id = public.get_my_sportiv_id());

-- TABELUL: sportivi_roluri
CALL public.reset_policies_for_table('sportivi_roluri');
ALTER TABLE public.sportivi_roluri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi_roluri FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins have full access" ON public.sportivi_roluri FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Club Admins can assign roles within their club" ON public.sportivi_roluri FOR ALL
    USING (
        (SELECT r.nume FROM roluri r WHERE r.id = sportivi_roluri.rol_id) <> 'SUPER_ADMIN_FEDERATIE'
        AND (SELECT r.nume FROM roluri r WHERE r.id = sportivi_roluri.rol_id) <> 'Admin'
        AND public.is_club_staff() 
        AND EXISTS (SELECT 1 FROM sportivi s WHERE s.id = sportivi_roluri.sportiv_id AND s.club_id = public.get_my_club_id())
    );
CREATE POLICY "Authenticated users can see their own roles" ON public.sportivi_roluri FOR SELECT USING(sportiv_id = public.get_my_sportiv_id());