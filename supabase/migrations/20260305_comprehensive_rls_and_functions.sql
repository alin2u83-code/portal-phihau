-- 0. REPARĂ FUNCȚIA HELPER (Sursa probabilă a erorii)
CREATE OR REPLACE FUNCTION public.has_access_to_club(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN') -- Admini globali
            OR (club_id = p_club_id AND rol_denumire = 'ADMIN_CLUB') -- Admin local
            OR (club_id = p_club_id AND rol_denumire = 'INSTRUCTOR') -- Instructor local
        )
    );
END;
$$;

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
        r.nume::TEXT as rol_nume,
        c.nume::TEXT as club_nume,
        s.nume::TEXT as sportiv_nume,
        s.prenume::TEXT as sportiv_prenume
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

-- 3. RLS Policies (Corectate pentru a evita dependenta de 'users')

-- A. PLATI
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;
CREATE POLICY "Staff - Full Access Plati" ON public.plati
FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Sportiv - View Own Plati" ON public.plati;
CREATE POLICY "Sportiv - View Own Plati" ON public.plati
FOR SELECT TO authenticated USING (
    sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
);

-- B. TRANZACTII
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Tranzactii" ON public.tranzactii;
CREATE POLICY "Staff - Full Access Tranzactii" ON public.tranzactii
FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

-- C. PROGRAM_ANTRENAMENTE
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Staff - Full Access Antrenamente" ON public.program_antrenamente
FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

-- D. PREZENTA_ANTRENAMENT
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Prezenta" ON public.prezenta_antrenament;
CREATE POLICY "Staff - Full Access Prezenta" ON public.prezenta_antrenament
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = prezenta_antrenament.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- E. SESIUNI_EXAMENE
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Sesiuni" ON public.sesiuni_examene;
CREATE POLICY "Staff - Full Access Sesiuni" ON public.sesiuni_examene
FOR ALL TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

-- F. INSCRIERI_EXAMENE
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Inscrieri" ON public.inscrieri_examene;
CREATE POLICY "Staff - Full Access Inscrieri" ON public.inscrieri_examene
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = inscrieri_examene.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- G. EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

-- H. ANUNTURI_PREZENTA
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Anunturi" ON public.anunturi_prezenta;
CREATE POLICY "Staff - Full Access Anunturi" ON public.anunturi_prezenta
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = anunturi_prezenta.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- I. CLUBURI
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Cluburi" ON public.cluburi;
CREATE POLICY "Staff - Full Access Cluburi" ON public.cluburi
FOR ALL TO authenticated USING (public.has_access_to_club(id));