-- Migration to add get_my_club_ids() and update RLS policies
-- 1. SQL Function get_my_club_ids()
CREATE OR REPLACE FUNCTION public.get_my_club_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(array_agg(club_id), '{}'::uuid[])
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire = 'INSTRUCTOR';
$$;

-- 2. RLS Policies for PLATI
DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;
CREATE POLICY "Staff - Full Access Plati" ON public.plati
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')
        AND club_id = public.plati.club_id
    )
    OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
);

-- 3. RLS Policies for GRUPE
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Grupe" ON public.grupe;
CREATE POLICY "Staff - Full Access Grupe" ON public.grupe
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')
        AND club_id = public.grupe.club_id
    )
    OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
);

-- 4. RLS Policies for EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')
        AND club_id = public.evenimente.club_id
    )
    OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
);
