-- Comprehensive Migration for RLS and SQL Functions
-- 1. SQL Function: get_user_roles(user_id UUID)
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    rol_id UUID,
    sportiv_id UUID,
    club_id UUID,
    is_primary BOOLEAN,
    rol_denumire TEXT,
    rol_nume TEXT,
    club_nume TEXT,
    sportiv_nume TEXT,
    sportiv_prenume TEXT
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        urm.id,
        urm.rol_id,
        urm.sportiv_id,
        urm.club_id,
        urm.is_primary,
        urm.rol_denumire,
        r.nume as rol_nume,
        c.nume as club_nume,
        s.nume as sportiv_nume,
        s.prenume as sportiv_prenume
    FROM public.utilizator_roluri_multicont urm
    LEFT JOIN public.roluri r ON urm.rol_id = r.id
    LEFT JOIN public.cluburi c ON urm.club_id = c.id
    LEFT JOIN public.sportivi s ON urm.sportiv_id = s.id
    WHERE urm.user_id = p_user_id;
END;
$$;

-- 2. SQL Function: switch_primary_context(target_context_id UUID)
CREATE OR REPLACE FUNCTION public.switch_primary_context(p_target_context_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Reset all primary flags for this user
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = false
    WHERE user_id = v_user_id;
    
    -- Set the target context as primary
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = true
    WHERE id = p_target_context_id AND user_id = v_user_id;
    
    RETURN FOUND;
END;
$$;

-- 3. RLS Policies for requested tables
-- Helper function has_access_to_club(club_id) is already defined.

-- A. PLATI
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;
CREATE POLICY "Staff - Full Access Plati" ON public.plati
FOR ALL USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Sportiv - View Own Plati" ON public.plati;
CREATE POLICY "Sportiv - View Own Plati" ON public.plati
FOR SELECT USING (
    sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
    OR familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL)
);

-- B. TRANZACTII
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Tranzactii" ON public.tranzactii;
CREATE POLICY "Staff - Full Access Tranzactii" ON public.tranzactii
FOR ALL USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Sportiv - View Own Tranzactii" ON public.tranzactii;
CREATE POLICY "Sportiv - View Own Tranzactii" ON public.tranzactii
FOR SELECT USING (
    sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
    OR familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL)
);

-- C. PROGRAM_ANTRENAMENTE
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Staff - Full Access Antrenamente" ON public.program_antrenamente
FOR ALL USING (public.has_access_to_club(club_id));

-- D. PREZENTA_ANTRENAMENT
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Prezenta" ON public.prezenta_antrenament;
CREATE POLICY "Staff - Full Access Prezenta" ON public.prezenta_antrenament
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = prezenta_antrenament.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

DROP POLICY IF EXISTS "Sportiv - View Own Prezenta" ON public.prezenta_antrenament;
CREATE POLICY "Sportiv - View Own Prezenta" ON public.prezenta_antrenament
FOR SELECT USING (
    sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
);

-- E. SESIUNI_EXAMENE
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Sesiuni" ON public.sesiuni_examene;
CREATE POLICY "Staff - Full Access Sesiuni" ON public.sesiuni_examene
FOR ALL USING (
    club_id IS NULL 
    OR public.has_access_to_club(club_id)
);

-- F. INSCRIERI_EXAMENE
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Inscrieri" ON public.inscrieri_examene;
CREATE POLICY "Staff - Full Access Inscrieri" ON public.inscrieri_examene
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = inscrieri_examene.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

DROP POLICY IF EXISTS "Sportiv - View Own Inscrieri" ON public.inscrieri_examene;
CREATE POLICY "Sportiv - View Own Inscrieri" ON public.inscrieri_examene
FOR SELECT USING (
    sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
);

-- G. EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL USING (
    club_id IS NULL 
    OR public.has_access_to_club(club_id)
);

-- H. ANUNTURI_PREZENTA
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Anunturi" ON public.anunturi_prezenta;
CREATE POLICY "Staff - Full Access Anunturi" ON public.anunturi_prezenta
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = anunturi_prezenta.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- I. FAMILII
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Familii" ON public.familii;
CREATE POLICY "Staff - Full Access Familii" ON public.familii
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.familie_id = familii.id
        AND public.has_access_to_club(s.club_id)
    )
);

DROP POLICY IF EXISTS "Sportiv - View Own Familie" ON public.familii;
CREATE POLICY "Sportiv - View Own Familie" ON public.familii
FOR SELECT USING (
    id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL)
);

-- J. CLUBURI
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Cluburi" ON public.cluburi;
CREATE POLICY "Staff - Full Access Cluburi" ON public.cluburi
FOR ALL USING (public.has_access_to_club(id));

-- K. GRADE
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Global - View Grade" ON public.grade;
CREATE POLICY "Global - View Grade" ON public.grade
FOR SELECT USING (true); -- Gradele sunt nomenclatoare globale

DROP POLICY IF EXISTS "SuperAdmin - Manage Grade" ON public.grade;
CREATE POLICY "SuperAdmin - Manage Grade" ON public.grade
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
);
