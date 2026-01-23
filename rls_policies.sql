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
DROP FUNCTION IF EXISTS public.is_admin_or_instructor();
CREATE OR REPLACE FUNCTION public.is_admin_or_instructor()
RETURNS boolean AS $$
BEGIN
    -- This function must be SECURITY DEFINER to break recursive RLS checks.
    -- It runs with the permissions of the function owner. By setting the owner
    -- to 'postgres' (a superuser), this function bypasses RLS, allowing it to
    -- query sportivi/roles tables without re-triggering policies that call it.
    RETURN EXISTS (
        SELECT 1
        FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid()
          AND (r.nume = 'Admin' OR r.nume = 'Instructor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Set the owner to 'postgres' to bypass RLS within the function.
-- This is CRITICAL to prevent recursive policy checks in Supabase environments
-- where the default migration role does not bypass RLS.
ALTER FUNCTION public.is_admin_or_instructor() OWNER TO postgres;

-- -----------------------------------------------------------------
-- Helper Functions for Hierarchical Role Management
-- -----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid()
          AND r.nume = 'Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.is_admin() OWNER TO postgres;

DROP FUNCTION IF EXISTS public.get_role_level(text);
CREATE OR REPLACE FUNCTION public.get_role_level(role_name text)
RETURNS int AS $$
BEGIN
    RETURN CASE role_name
        WHEN 'Admin' THEN 3
        WHEN 'Instructor' THEN 2
        WHEN 'Sportiv' THEN 1
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP FUNCTION IF EXISTS public.get_current_user_max_role_level();
CREATE OR REPLACE FUNCTION public.get_current_user_max_role_level()
RETURNS int AS $$
DECLARE
    max_level int;
BEGIN
    SELECT MAX(public.get_role_level(r.nume))
    INTO max_level
    FROM public.sportivi s
    JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
    JOIN public.roluri r ON sr.rol_id = r.id
    WHERE s.user_id = auth.uid();
    
    RETURN COALESCE(max_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.get_current_user_max_role_level() OWNER TO postgres;


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
-- Tabel: inscrieri_examene
-- -----------------------------------------------------------------
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all exam participations" ON public.inscrieri_examene;
CREATE POLICY "Admins can manage all exam participations" ON public.inscrieri_examene
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own exam participations" ON public.inscrieri_examene;
CREATE POLICY "Users can see their own exam participations" ON public.inscrieri_examene
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: istoric_grade
-- -----------------------------------------------------------------
ALTER TABLE public.istoric_grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grade history" ON public.istoric_grade;
CREATE POLICY "Admins can manage grade history" ON public.istoric_grade
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own grade history" ON public.istoric_grade;
CREATE POLICY "Users can see their own grade history" ON public.istoric_grade
    FOR SELECT USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------
-- Tabel: note_examene
-- -----------------------------------------------------------------
ALTER TABLE public.note_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage exam notes" ON public.note_examene;
CREATE POLICY "Admins can manage exam notes" ON public.note_examene
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see notes for their own exams" ON public.note_examene;
CREATE POLICY "Users can see notes for their own exams" ON public.note_examene
    FOR SELECT USING (
        inscriere_id IN (
            SELECT id FROM public.inscrieri_examene WHERE sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
        )
    );
    
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

-- Politica 1: Adminii și instructorii au acces total (CRUD) la toate anunțurile.
-- Această politică le permite să vadă, adauge, modifice și șteargă orice anunț.
DROP POLICY IF EXISTS "Admins can manage all attendance announcements" ON public.anunturi_prezenta;
CREATE POLICY "Admins can manage all attendance announcements" ON public.anunturi_prezenta
    FOR ALL
    USING (public.is_admin_or_instructor())
    WITH CHECK (public.is_admin_or_instructor());

-- Politica 2: Sportivii (utilizatorii non-admin) își pot gestiona propriile anunțuri.
-- Le permite să vadă, creeze, modifice și șteargă DOAR propriile anunțuri.
-- Clauza `NOT public.is_admin_or_instructor()` previne aplicarea ambiguă a regulilor pentru utilizatorii cu roluri multiple.
DROP POLICY IF EXISTS "Users can see their own announcements" ON public.anunturi_prezenta;
DROP POLICY IF EXISTS "Users can create and update their own announcements" ON public.anunturi_prezenta;
DROP POLICY IF EXISTS "Users can manage their own announcements" ON public.anunturi_prezenta;
CREATE POLICY "Users can manage their own announcements" ON public.anunturi_prezenta
    FOR ALL
    USING (
        (NOT public.is_admin_or_instructor()) AND
        (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    )
    WITH CHECK (
        (NOT public.is_admin_or_instructor()) AND
        (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    );
    
-- -----------------------------------------------------------------
-- Tabel: sportivi_roluri
-- -----------------------------------------------------------------
ALTER TABLE public.sportivi_roluri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and Instructors can manage roles assignments" ON public.sportivi_roluri;
CREATE POLICY "Admins and Instructors can manage roles assignments"
    ON public.sportivi_roluri
    FOR ALL
    USING (public.is_admin_or_instructor())
    WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Users can see their own roles assignments" ON public.sportivi_roluri;
CREATE POLICY "Users can see their own roles assignments" 
    ON public.sportivi_roluri
    FOR SELECT 
    USING (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()));


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
-- Tabele Publice / de Configurare (Read-Only pentru Sportivi)
-- =================================================================

-- -----------------------------------------------------------------
-- Tabel: sesiuni_examene
-- -----------------------------------------------------------------
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage exams" ON public.sesiuni_examene;
CREATE POLICY "Admins can manage exams" ON public.sesiuni_examene
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see relevant exams" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "Authenticated users can see exams" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "Users can see future and participated exams" ON public.sesiuni_examene;
CREATE POLICY "Users can see future and participated exams" ON public.sesiuni_examene
    FOR SELECT USING (
        -- Users can see any exam scheduled for the future
        (data >= now()::date)
        OR
        -- Users can see any exam they have participated in
        (id IN (
            SELECT sesiune_id FROM public.inscrieri_examene WHERE sportiv_id IN (
                SELECT id FROM public.sportivi WHERE user_id = auth.uid()
            )
        ))
    );

-- -----------------------------------------------------------------
-- Tabel: grade
-- -----------------------------------------------------------------
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grades" ON public.grade;
CREATE POLICY "Admins can manage grades" ON public.grade
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see grades" ON public.grade;
CREATE POLICY "Authenticated users can see grades" ON public.grade
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grupe
-- -----------------------------------------------------------------
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage groups" ON public.grupe;
CREATE POLICY "Admins can manage groups" ON public.grupe
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see groups" ON public.grupe;
CREATE POLICY "Authenticated users can see groups" ON public.grupe
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: program_antrenamente
-- -----------------------------------------------------------------
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage training schedules" ON public.program_antrenamente;
CREATE POLICY "Admins can manage training schedules" ON public.program_antrenamente
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see training schedules" ON public.program_antrenamente;
CREATE POLICY "Authenticated users can see training schedules" ON public.program_antrenamente
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: evenimente (Stagii, Competiții)
-- -----------------------------------------------------------------
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage events" ON public.evenimente;
CREATE POLICY "Admins can manage events" ON public.evenimente
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see events" ON public.evenimente;
CREATE POLICY "Authenticated users can see events" ON public.evenimente
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: preturi_config
-- -----------------------------------------------------------------
ALTER TABLE public.preturi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage price configs" ON public.preturi_config;
CREATE POLICY "Admins can manage price configs" ON public.preturi_config
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see price configs" ON public.preturi_config;
CREATE POLICY "Authenticated users can see price configs" ON public.preturi_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grade_preturi_config
-- -----------------------------------------------------------------
ALTER TABLE public.grade_preturi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grade price configs" ON public.grade_preturi_config;
CREATE POLICY "Admins can manage grade price configs" ON public.grade_preturi_config
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see grade price configs" ON public.grade_preturi_config;
CREATE POLICY "Authenticated users can see grade price configs" ON public.grade_preturi_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: tipuri_abonament
-- -----------------------------------------------------------------
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage subscription types" ON public.tipuri_abonament;
CREATE POLICY "Admins can manage subscription types" ON public.tipuri_abonament
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see subscription types" ON public.tipuri_abonament;
CREATE POLICY "Authenticated users can see subscription types" ON public.tipuri_abonament
    FOR SELECT USING (auth.role() = 'authenticated');
    
-- -----------------------------------------------------------------
-- Tabel: tipuri_plati
-- -----------------------------------------------------------------
ALTER TABLE public.tipuri_plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage payment types" ON public.tipuri_plati;
CREATE POLICY "Admins can manage payment types" ON public.tipuri_plati
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see payment types" ON public.tipuri_plati;
CREATE POLICY "Authenticated users can see payment types" ON public.tipuri_plati
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: reduceri
-- -----------------------------------------------------------------
ALTER TABLE public.reduceri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.reduceri;
CREATE POLICY "Admins can manage discounts" ON public.reduceri
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see discounts" ON public.reduceri;
CREATE POLICY "Authenticated users can see discounts" ON public.reduceri
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: roluri
-- -----------------------------------------------------------------
ALTER TABLE public.roluri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage roles definitions" ON public.roluri;
CREATE POLICY "Admins can manage roles definitions" ON public.roluri
    FOR ALL 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can see roles definitions" ON public.roluri;
CREATE POLICY "Authenticated users can see roles definitions" ON public.roluri
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: nom_locatii
-- -----------------------------------------------------------------
ALTER TABLE public.nom_locatii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.nom_locatii;
CREATE POLICY "Admins can manage locations" ON public.nom_locatii
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can read locations" ON public.nom_locatii;
CREATE POLICY "Authenticated users can read locations" ON public.nom_locatii
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: familii
-- -----------------------------------------------------------------
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage families" ON public.familii;
CREATE POLICY "Admins can manage families" ON public.familii
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can see families" ON public.familii;
CREATE POLICY "Authenticated users can see families" ON public.familii
    FOR SELECT USING (auth.role() = 'authenticated');
    
-- -----------------------------------------------------------------
-- Tabel: taxe_anuale_config
-- -----------------------------------------------------------------
ALTER TABLE public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage annual fees config" ON public.taxe_anuale_config;
CREATE POLICY "Admins can manage annual fees config" ON public.taxe_anuale_config
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "Authenticated users can read annual fees config" ON public.taxe_anuale_config;
CREATE POLICY "Authenticated users can read annual fees config" ON public.taxe_anuale_config
    FOR SELECT USING (auth.role() = 'authenticated');


-- =================================================================
-- Schema Cleanup & Corrections
-- =================================================================

-- Corectare constrângere 'plati_tip_check' pentru a include 'Taxa Anuala' și alte tipuri.
ALTER TABLE public.plati DROP CONSTRAINT IF EXISTS plati_tip_check;
ALTER TABLE public.plati ADD CONSTRAINT plati_tip_check CHECK (
    tip IN (
        'Abonament', 
        'Taxa Examen', 
        'Taxa Stagiu', 
        'Taxa Competitie', 
        'Echipament',
        'Taxa Anuala'
        -- Adăugați aici alte tipuri custom permise dacă este necesar
    )
);