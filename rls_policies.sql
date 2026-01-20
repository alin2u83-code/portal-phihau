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
    -- Această funcție rulează cu permisiunile invocatorului (SECURITY INVOKER este implicit).
    -- Politica RLS "Sportivi can see their own profile" (`USING (user_id = auth.uid())`)
    -- permite sub-interogării să vadă rândul utilizatorului curent în tabelul 'sportivi'.
    -- Acest lucru este suficient pentru a verifica rolul utilizatorului fără a cauza o buclă recursivă
    -- care ar apărea dacă funcția ar avea nevoie să vadă toate rândurile din tabel.
    RETURN EXISTS (
        SELECT 1
        FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid()
          AND (r.nume = 'Admin' OR r.nume = 'Instructor')
    );
END;
$$ LANGUAGE plpgsql;


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
DROP POLICY IF EXISTS "Admins can manage families" ON public.familii;
DROP POLICY IF EXISTS "Authenticated users can see families" ON public.familii;
CREATE POLICY "Admins can manage families" ON public.familii
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see families" ON public.familii
    FOR SELECT USING (auth.role() = 'authenticated');

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

-- -----------------------------------------------------------------
-- Tabel: examene
-- -----------------------------------------------------------------
ALTER TABLE public.examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage exams" ON public.examene;
DROP POLICY IF EXISTS "Authenticated users can see exams" ON public.examene;
CREATE POLICY "Admins can manage exams" ON public.examene
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see exams" ON public.examene
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grade
-- -----------------------------------------------------------------
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grades" ON public.grade;
DROP POLICY IF EXISTS "Authenticated users can see grades" ON public.grade;
CREATE POLICY "Admins can manage grades" ON public.grade
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see grades" ON public.grade
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grupe
-- -----------------------------------------------------------------
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage groups" ON public.grupe;
DROP POLICY IF EXISTS "Authenticated users can see groups" ON public.grupe;
CREATE POLICY "Admins can manage groups" ON public.grupe
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see groups" ON public.grupe
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: program_antrenamente
-- -----------------------------------------------------------------
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage training schedules" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Authenticated users can see training schedules" ON public.program_antrenamente;
CREATE POLICY "Admins can manage training schedules" ON public.program_antrenamente
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see training schedules" ON public.program_antrenamente
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: evenimente (Stagii, Competiții)
-- -----------------------------------------------------------------
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage events" ON public.evenimente;
DROP POLICY IF EXISTS "Authenticated users can see events" ON public.evenimente;
CREATE POLICY "Admins can manage events" ON public.evenimente
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see events" ON public.evenimente
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: preturi_config
-- -----------------------------------------------------------------
ALTER TABLE public.preturi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage price configs" ON public.preturi_config;
DROP POLICY IF EXISTS "Authenticated users can see price configs" ON public.preturi_config;
CREATE POLICY "Admins can manage price configs" ON public.preturi_config
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see price configs" ON public.preturi_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: grade_preturi_config
-- -----------------------------------------------------------------
ALTER TABLE public.grade_preturi_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage grade price configs" ON public.grade_preturi_config;
DROP POLICY IF EXISTS "Authenticated users can see grade price configs" ON public.grade_preturi_config;
CREATE POLICY "Admins can manage grade price configs" ON public.grade_preturi_config
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see grade price configs" ON public.grade_preturi_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: tipuri_abonament
-- -----------------------------------------------------------------
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage subscription types" ON public.tipuri_abonament;
DROP POLICY IF EXISTS "Authenticated users can see subscription types" ON public.tipuri_abonament;
CREATE POLICY "Admins can manage subscription types" ON public.tipuri_abonament
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see subscription types" ON public.tipuri_abonament
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: reduceri
-- -----------------------------------------------------------------
ALTER TABLE public.reduceri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.reduceri;
DROP POLICY IF EXISTS "Authenticated users can see discounts" ON public.reduceri;
CREATE POLICY "Admins can manage discounts" ON public.reduceri
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see discounts" ON public.reduceri
    FOR SELECT USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------
-- Tabel: roluri
-- -----------------------------------------------------------------
ALTER TABLE public.roluri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roluri;
DROP POLICY IF EXISTS "Authenticated users can see roles" ON public.roluri;
CREATE POLICY "Admins can manage roles" ON public.roluri
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can see roles" ON public.roluri
    FOR SELECT USING (auth.role() = 'authenticated');


-- -----------------------------------------------------------------
-- Tabel: taxe_anuale_config
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxe_anuale_config (
  id uuid not null default gen_random_uuid (),
  nume text not null,
  suma numeric(10, 2) not null,
  data_inceput date not null,
  data_sfarsit date not null,
  is_activ boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint taxe_anuale_config_pkey primary key (id)
);
ALTER TABLE public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage annual fees" ON public.taxe_anuale_config;
DROP POLICY IF EXISTS "Authenticated users can see annual fees" ON public.taxe_anuale_config;
DROP POLICY IF EXISTS "Authenticated users can read annual fees config" ON public.taxe_anuale_config;
DROP POLICY IF EXISTS "Admins can manage annual fees config" ON public.taxe_anuale_config;

CREATE POLICY "Admins can manage annual fees config" ON public.taxe_anuale_config
    FOR ALL USING (public.is_admin_or_instructor()) WITH CHECK (public.is_admin_or_instructor());
CREATE POLICY "Authenticated users can read annual fees config" ON public.taxe_anuale_config
    FOR SELECT USING (auth.role() = 'authenticated');


-- =================================================================
-- Schema Cleanup (Eliminare Coloane Neutilizate)
-- =================================================================

-- Eliminarea coloanelor neutilizate din tabelul 'sportivi'
ALTER TABLE public.sportivi DROP COLUMN IF EXISTS club_provenienta;
ALTER TABLE public.sportivi DROP COLUMN IF EXISTS telefon;
ALTER TABLE public.sportivi DROP COLUMN IF EXISTS adresa;

-- Eliminarea coloanelor pentru note din 'participari'
ALTER TABLE public.participari DROP COLUMN IF EXISTS nota_tehnica;
ALTER TABLE public.participari DROP COLUMN IF EXISTS nota_thao_quyen;

-- =================================================================
-- Schema Corrections
-- =================================================================

-- Add 'Taxa Anuala' to the allowed types in the 'plati' table to fix check constraint violation.
ALTER TABLE public.plati DROP CONSTRAINT IF EXISTS plati_tip_check;
ALTER TABLE public.plati ADD CONSTRAINT plati_tip_check CHECK (
    tip = ANY (ARRAY[
        'Abonament'::text, 
        'Taxa Examen'::text, 
        'Taxa Stagiu'::text, 
        'Taxa Competitie'::text, 
        'Echipament'::text,
        'Taxa Anuala'::text
    ])
);