-- =================================================================
-- Politici de Securitate la Nivel de Rând (RLS) pentru Phi Hau Iași
-- =================================================================
-- Acest script activează RLS și definește reguli de acces pentru
-- fiecare tabel din schema 'public'.
--
-- Roluri definite:
--   - Admin/Instructor: Acces complet (CRUD) la majoritatea datelor.
--   - Sportiv (Utilizator autentificat): Acces limitat la propriile date.
-- =================================================================

-- -----------------------------------------------------------------
-- Helper Function: Verifică dacă utilizatorul curent este Admin sau Instructor
-- -----------------------------------------------------------------
-- Folosește JWT claims pentru a obține ID-ul utilizatorului în mod fiabil.
-- Este SECURITY DEFINER pentru a evita probleme de RLS recursiv.
DROP FUNCTION IF EXISTS public.is_admin_or_instructor();
CREATE OR REPLACE FUNCTION public.is_admin_or_instructor()
RETURNS boolean AS $$
DECLARE
    auth_user_id uuid;
    is_admin_user boolean;
BEGIN
    -- Obține ID-ul utilizatorului din JWT claims; este mai robust decât auth.uid() în funcții SECURITY DEFINER.
    auth_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;

    IF auth_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verifică dacă ID-ul utilizatorului este asociat cu un rol de Admin/Instructor.
    SELECT EXISTS (
        SELECT 1
        FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth_user_id
          AND (r.nume = 'Admin' OR r.nume = 'Instructor')
    ) INTO is_admin_user;

    RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- Tabele cu Acces Restricționat (Date Personale și Specifice)
-- =================================================================

-- -----------------------------------------------------------------
-- Tabel: sportivi
-- -----------------------------------------------------------------
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all sportivi" ON public.sportivi;
CREATE POLICY "Admins can manage all sportivi" ON public.sportivi
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Sportivi can see their own profile" ON public.sportivi;
CREATE POLICY "Sportivi can see their own profile" ON public.sportivi
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sportivi can update their own profile" ON public.sportivi;
CREATE POLICY "Sportivi can update their own profile" ON public.sportivi
    FOR UPDATE USING (user_id = auth.uid());

-- -----------------------------------------------------------------
-- Tabel: familii
-- -----------------------------------------------------------------
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all families" ON public.familii;
CREATE POLICY "Admins can manage all families" ON public.familii
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own family" ON public.familii;
CREATE POLICY "Users can see their own family" ON public.familii
    FOR SELECT USING (id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: plati (Datorii)
-- -----------------------------------------------------------------
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.plati;
CREATE POLICY "Admins can manage all payments" ON public.plati
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own and family payments" ON public.plati;
CREATE POLICY "Users can see their own and family payments" ON public.plati
    FOR SELECT USING (
        (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())) OR
        (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
    );

-- -----------------------------------------------------------------
-- Tabel: tranzactii (Încasări)
-- -----------------------------------------------------------------
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.tranzactii;
CREATE POLICY "Admins can manage all transactions" ON public.tranzactii
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own and family transactions" ON public.tranzactii;
CREATE POLICY "Users can see their own and family transactions" ON public.tranzactii
    FOR SELECT USING (
        (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())) OR
        (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
    );
    
-- -----------------------------------------------------------------
-- Tabel: participari (la Examene)
-- -----------------------------------------------------------------
ALTER TABLE public.participari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all exam participations" ON public.participari;
CREATE POLICY "Admins can manage all exam participations" ON public.participari
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own exam participations" ON public.participari;
CREATE POLICY "Users can see their own exam participations" ON public.participari
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: prezenta_antrenament
-- -----------------------------------------------------------------
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all attendance records" ON public.prezenta_antrenament;
CREATE POLICY "Admins can manage all attendance records" ON public.prezenta_antrenament
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own attendance" ON public.prezenta_antrenament;
CREATE POLICY "Users can see their own attendance" ON public.prezenta_antrenament
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: rezultate (la Competiții/Stagii)
-- -----------------------------------------------------------------
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all results" ON public.rezultate;
CREATE POLICY "Admins can manage all results" ON public.rezultate
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own results" ON public.rezultate;
CREATE POLICY "Users can see their own results" ON public.rezultate
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: anunturi_prezenta
-- -----------------------------------------------------------------
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all attendance announcements" ON public.anunturi_prezenta;
CREATE POLICY "Admins can manage all attendance announcements" ON public.anunturi_prezenta
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own announcements" ON public.anunturi_prezenta;
CREATE POLICY "Users can see their own announcements" ON public.anunturi_prezenta
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create and update their own announcements" ON public.anunturi_prezenta;
CREATE POLICY "Users can create and update their own announcements" ON public.anunturi_prezenta
    FOR INSERT, UPDATE WITH CHECK (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));
    
-- -----------------------------------------------------------------
-- Tabel: sportivi_roluri
-- -----------------------------------------------------------------
ALTER TABLE public.sportivi_roluri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.sportivi_roluri;
CREATE POLICY "Admins can manage roles" ON public.sportivi_roluri
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own roles" ON public.sportivi_roluri;
CREATE POLICY "Users can see their own roles" ON public.sportivi_roluri
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: notificari
-- -----------------------------------------------------------------
ALTER TABLE public.notificari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notificari;
CREATE POLICY "Admins can manage notifications" ON public.notificari
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notificari;
CREATE POLICY "Authenticated users can read notifications" ON public.notificari
    FOR SELECT USING (auth.role() = 'authenticated');
    
-- =================================================================
-- Tabele Publice / de Configurare (Read-Only pentru majoritatea)
-- =================================================================

-- O politică standard pentru tabelele pe care toți utilizatorii autentificați
-- le pot citi, dar doar adminii le pot modifica.

-- -----------------------------------------------------------------
-- Tabel: examene
-- -----------------------------------------------------------------
ALTER TABLE public.examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage exams" ON public.examene;
CREATE POLICY "Admins can manage exams" ON public.examene 
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see relevant exams" ON public.examene;
CREATE POLICY "Users can see relevant exams" ON public.examene
    FOR SELECT USING (
        (data >= now()::date) OR
        (id IN (
            SELECT p.examen_id 
            FROM public.participari p
            JOIN public.sportivi s ON p.sportiv_id = s.id
            WHERE s.user_id = auth.uid()
        ))
    );

-- -----------------------------------------------------------------
-- Tabel: grade
-- -----------------------------------------------------------------
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grades" ON public.grade;
CREATE POLICY "Admins can manage grades" ON public.grade FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see grades" ON public.grade;
CREATE POLICY "Authenticated users can see grades" ON public.grade FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grupe
-- -----------------------------------------------------------------
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage groups" ON public.grupe;
CREATE POLICY "Admins can manage groups" ON public.grupe FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see groups" ON public.grupe;
CREATE POLICY "Authenticated users can see groups" ON public.grupe FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: program_antrenamente
-- -----------------------------------------------------------------
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage training schedules" ON public.program_antrenamente;
CREATE POLICY "Admins can manage training schedules" ON public.program_antrenamente FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see training schedules" ON public.program_antrenamente;
CREATE POLICY "Authenticated users can see training schedules" ON public.program_antrenamente FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: evenimente (Stagii, Competiții)
-- -----------------------------------------------------------------
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage events" ON public.evenimente;
CREATE POLICY "Admins can manage events" ON public.evenimente FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see events" ON public.evenimente;
CREATE POLICY "Authenticated users can see events" ON public.evenimente FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: preturi_config
-- -----------------------------------------------------------------
ALTER TABLE public.preturi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage price configs" ON public.preturi_config;
CREATE POLICY "Admins can manage price configs" ON public.preturi_config FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see price configs" ON public.preturi_config;
CREATE POLICY "Authenticated users can see price configs" ON public.preturi_config FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grade_preturi_config
-- -----------------------------------------------------------------
ALTER TABLE public.grade_preturi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grade price configs" ON public.grade_preturi_config;
CREATE POLICY "Admins can manage grade price configs" ON public.grade_preturi_config FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see grade price configs" ON public.grade_preturi_config;
CREATE POLICY "Authenticated users can see grade price configs" ON public.grade_preturi_config FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: tipuri_abonament
-- -----------------------------------------------------------------
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage subscription types" ON public.tipuri_abonament;
CREATE POLICY "Admins can manage subscription types" ON public.tipuri_abonament FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see subscription types" ON public.tipuri_abonament;
CREATE POLICY "Authenticated users can see subscription types" ON public.tipuri_abonament FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: reduceri
-- -----------------------------------------------------------------
ALTER TABLE public.reduceri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.reduceri;
CREATE POLICY "Admins can manage discounts" ON public.reduceri FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see discounts" ON public.reduceri;
CREATE POLICY "Authenticated users can see discounts" ON public.reduceri FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: roluri
-- -----------------------------------------------------------------
ALTER TABLE public.roluri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roluri;
CREATE POLICY "Admins can manage roles" ON public.roluri FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
DROP POLICY IF EXISTS "Authenticated users can see roles" ON public.roluri;
CREATE POLICY "Authenticated users can see roles" ON public.roluri FOR SELECT USING (auth.role() = 'authenticated');