-- =================================================================
-- Politici de Securitate la Nivel de Rând (RLS) pentru Phi Hau Iași
-- V2.2 - Arhitectură Multi-Tenant Securizată
-- =================================================================
-- Acest script activează RLS și definește reguli de acces pentru
-- fiecare tabel din schema 'public', luând în considerare
-- apartenența sportivilor și administratorilor la un anumit club.
--
-- Roluri definite:
--   - Super Admin (sau Admin): Acces total la nivel de Federație.
--   - Admin Club: Acces limitat la datele unde club_id coincide cu ID-ul clubului său.
--   - Sportiv (Utilizator autentificat): Acces limitat la propriile date.
-- =================================================================

-- -----------------------------------------------------------------
-- Funcții Helper pentru RLS
-- -----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_my_club_id();
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
DECLARE
    user_club_id UUID;
BEGIN
    SELECT club_id INTO user_club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1;
    RETURN user_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.is_super_admin();
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS ( SELECT 1 FROM public.sportivi s JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id JOIN public.roluri r ON sr.rol_id = r.id WHERE s.user_id = auth.uid() AND (r.nume = 'Super Admin' OR r.nume = 'Admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.is_admin_or_instructor();
CREATE OR REPLACE FUNCTION public.is_admin_or_instructor()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS ( SELECT 1 FROM public.sportivi s JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id JOIN public.roluri r ON sr.rol_id = r.id WHERE s.user_id = auth.uid() AND (r.nume IN ('Admin', 'Instructor', 'Super Admin', 'Admin Club')));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =================================================================
-- Aplicarea Politicilor RLS
-- =================================================================
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reduceri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nom_locatii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preturi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_preturi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.istoric_grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi_roluri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roluri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipuri_plati ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- Politici pentru Tabele Tenanted
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "RLS Sportivi" ON public.sportivi;
CREATE POLICY "RLS Sportivi" ON public.sportivi FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id() OR user_id = auth.uid()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Cluburi" ON public.cluburi;
CREATE POLICY "RLS Cluburi" ON public.cluburi FOR ALL USING (public.is_super_admin() OR id = public.get_my_club_id()) WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "RLS Grupe" ON public.grupe;
CREATE POLICY "RLS Grupe" ON public.grupe FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Sesiuni Examene" ON public.sesiuni_examene;
CREATE POLICY "RLS Sesiuni Examene" ON public.sesiuni_examene FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Evenimente" ON public.evenimente;
CREATE POLICY "RLS Evenimente" ON public.evenimente FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Familii" ON public.familii;
CREATE POLICY "RLS Familii" ON public.familii FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Tipuri Abonament" ON public.tipuri_abonament;
CREATE POLICY "RLS Tipuri Abonament" ON public.tipuri_abonament FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Reduceri" ON public.reduceri;
CREATE POLICY "RLS Reduceri" ON public.reduceri FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Locatii" ON public.nom_locatii;
CREATE POLICY "RLS Locatii" ON public.nom_locatii FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Preturi Config" ON public.preturi_config;
CREATE POLICY "RLS Preturi Config" ON public.preturi_config FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Grade Preturi Config" ON public.grade_preturi_config;
CREATE POLICY "RLS Grade Preturi Config" ON public.grade_preturi_config FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id()) WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
DROP POLICY IF EXISTS "RLS Program Antrenamente" ON public.program_antrenamente;
CREATE POLICY "RLS Program Antrenamente" ON public.program_antrenamente FOR ALL USING (public.is_super_admin() OR grupa_id IN (SELECT id FROM public.grupe)) WITH CHECK (public.is_super_admin() OR grupa_id IN (SELECT id FROM public.grupe));

-- -----------------------------------------------------------------
-- Politici pentru Tabele Indirect Tenanted (prin relații) - ACTUALIZAT
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "RLS Plati" ON public.plati;
CREATE POLICY "RLS Plati" ON public.plati FOR ALL
USING (
    (public.is_admin_or_instructor() AND (public.is_super_admin() OR sportiv_id IN (SELECT id FROM public.sportivi) OR familie_id IN (SELECT id FROM public.familii)))
    OR (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    OR (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
)
WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "RLS Tranzactii" ON public.tranzactii;
CREATE POLICY "RLS Tranzactii" ON public.tranzactii FOR ALL
USING (
    (public.is_admin_or_instructor() AND (public.is_super_admin() OR sportiv_id IN (SELECT id FROM public.sportivi) OR familie_id IN (SELECT id FROM public.familii)))
    OR (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    OR (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
)
WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "RLS Inscrieri Examene" ON public.inscrieri_examene;
CREATE POLICY "RLS Inscrieri Examene" ON public.inscrieri_examene FOR ALL
USING (
    (public.is_admin_or_instructor() AND (public.is_super_admin() OR sportiv_id IN (SELECT id FROM public.sportivi)))
    OR (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
)
WITH CHECK (public.is_admin_or_instructor());

DROP POLICY IF EXISTS "RLS Rezultate" ON public.rezultate;
CREATE POLICY "RLS Rezultate" ON public.rezultate FOR ALL
USING (
    (public.is_admin_or_instructor() AND (public.is_super_admin() OR sportiv_id IN (SELECT id FROM public.sportivi)))
    OR (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
)
WITH CHECK (public.is_admin_or_instructor());

-- -----------------------------------------------------------------
-- Tabele Globale
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read grades" ON public.grade;
CREATE POLICY "Authenticated users can read grades" ON public.grade FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage grades" ON public.grade;
CREATE POLICY "Admins can manage grades" ON public.grade FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
