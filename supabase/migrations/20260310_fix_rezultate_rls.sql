-- RLS for REZULTATE
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access Rezultate" ON public.rezultate;
DROP POLICY IF EXISTS "Sportiv - View Own Rezultate" ON public.rezultate;

-- Everyone can see results for federation events or their own athletes
CREATE POLICY "View Rezultate" ON public.rezultate
FOR SELECT TO authenticated USING (
    -- Own record (if sportiv)
    sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
    OR
    -- Staff of the club
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = rezultate.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
    OR
    -- Federation event results are public to all authenticated users
    EXISTS (
        SELECT 1 FROM public.evenimente e
        WHERE e.id = rezultate.eveniment_id
        AND e.club_id IS NULL
    )
);

-- Only staff can manage results for their club's athletes
CREATE POLICY "Manage Rezultate" ON public.rezultate
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = rezultate.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- Ensure sportivi RLS allows viewing participants in federation events
DROP POLICY IF EXISTS "Admin Club Full Access Sportivi" ON public.sportivi;
DROP POLICY IF EXISTS "Instructor Read Access Sportivi" ON public.sportivi;
DROP POLICY IF EXISTS "Sportiv Own Profile Access" ON public.sportivi;

CREATE POLICY "View Sportivi" ON public.sportivi
FOR SELECT TO authenticated USING (
    -- Own record
    user_id = auth.uid()
    OR
    -- Staff of the club
    public.has_access_to_club(club_id)
    OR
    -- Participants in federation events (only basic info should be visible, but RLS is table-level)
    -- This allows seeing names in the results list
    EXISTS (
        SELECT 1 FROM public.rezultate r
        JOIN public.evenimente e ON r.eveniment_id = e.id
        WHERE r.sportiv_id = public.sportivi.id
        AND e.club_id IS NULL
    )
);

CREATE POLICY "Manage Sportivi" ON public.sportivi
FOR ALL TO authenticated USING (
    -- Own record (limited)
    user_id = auth.uid()
    OR
    -- Staff of the club
    public.has_access_to_club(club_id)
);

-- Everyone can see federation events and events from their own club
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
DROP POLICY IF EXISTS "Sportiv - View Evenimente" ON public.evenimente;
DROP POLICY IF EXISTS "View Evenimente" ON public.evenimente;
DROP POLICY IF EXISTS "Manage Evenimente" ON public.evenimente;

CREATE POLICY "View Evenimente" ON public.evenimente
FOR SELECT TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

-- Only authorized staff can manage events
CREATE POLICY "Manage Evenimente" ON public.evenimente
FOR ALL TO authenticated USING (
    (club_id IS NULL AND (public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
    )))
    OR 
    (club_id IS NOT NULL AND public.has_access_to_club(club_id))
);

-- Similar logic for sesiuni_examene
DROP POLICY IF EXISTS "Staff - Full Access Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "View Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "Manage Sesiuni" ON public.sesiuni_examene;

CREATE POLICY "View Sesiuni" ON public.sesiuni_examene
FOR SELECT TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

CREATE POLICY "Manage Sesiuni" ON public.sesiuni_examene
FOR ALL TO authenticated USING (
    (club_id IS NULL AND (public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
    )))
    OR 
    (club_id IS NOT NULL AND public.has_access_to_club(club_id))
);
