-- 1. Create missing views for Sportiv Portal
-- These views are used by the frontend to fetch data for the logged-in sportiv.

DROP VIEW IF EXISTS public.vedere_inscrieri_examene_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vedere_inscrieri_examene_sportiv AS
SELECT 
    ie.*,
    s.nume as sportiv_nume,
    s.prenume as sportiv_prenume,
    g.nume as grad_nume
FROM public.inscrieri_examene ie
LEFT JOIN public.sportivi s ON ie.sportiv_id = s.id
LEFT JOIN public.grade g ON ie.grad_vizat_id = g.id;

DROP VIEW IF EXISTS public.vedere_istoric_grade_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vedere_istoric_grade_sportiv AS
SELECT 
    hg.*,
    g.nume as grad_nume
FROM public.istoric_grade hg
LEFT JOIN public.grade g ON hg.grad_id = g.id;

DROP VIEW IF EXISTS public.vedere_prezenta_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vedere_prezenta_sportiv AS
SELECT 
    pa.id as antrenament_id,
    pa.id,
    pr.sportiv_id,
    pa.data,
    pr.status,
    pa.club_id,
    pa.grupa_id,
    pa.ora_start,
    g.denumire as nume_grupa
FROM public.program_antrenamente pa
JOIN public.prezenta_antrenament pr ON pa.id = pr.antrenament_id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id;

-- 2. Enable RLS on tables if not already enabled
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.istoric_grade ENABLE ROW LEVEL SECURITY;

-- 3. Add policies for Sportiv to see their own data
-- We use the utilizator_roluri_multicont table to find which sportiv_id(s) belong to the current user.

DROP POLICY IF EXISTS "Sportiv - View Own Inscrieri" ON public.inscrieri_examene;
CREATE POLICY "Sportiv - View Own Inscrieri" ON public.inscrieri_examene
FOR SELECT TO authenticated USING (
    sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Sportiv - View Own Istoric Grade" ON public.istoric_grade;
CREATE POLICY "Sportiv - View Own Istoric Grade" ON public.istoric_grade
FOR SELECT TO authenticated USING (
    sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
);

-- 4. Ensure Staff has access too
DROP POLICY IF EXISTS "Staff - Full Access Inscrieri" ON public.inscrieri_examene;
CREATE POLICY "Staff - Full Access Inscrieri" ON public.inscrieri_examene
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = inscrieri_examene.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

DROP POLICY IF EXISTS "Staff - Full Access Istoric Grade" ON public.istoric_grade;
CREATE POLICY "Staff - Full Access Istoric Grade" ON public.istoric_grade
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = istoric_grade.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- 5. Grant permissions on views
GRANT SELECT ON public.vedere_inscrieri_examene_sportiv TO authenticated;
GRANT SELECT ON public.vedere_istoric_grade_sportiv TO authenticated;
GRANT SELECT ON public.vedere_prezenta_sportiv TO authenticated;
