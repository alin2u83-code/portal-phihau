-- Permite tuturor utilizatorilor autentificati sa vada sportivii inscrisi la competitii.
-- Necesar pentru tab-ul categorii si inscrieri: join-ul sportivi.* returna null din cauza RLS
-- chiar daca inscrierea era vizibila (ADMIN_CLUB/INSTRUCTOR nu vedeau numele altor cluburi).

DROP POLICY IF EXISTS "Select_Sportivi_Unified" ON public.sportivi;

CREATE POLICY "Select_Sportivi_Unified" ON public.sportivi
FOR SELECT USING (
    public.is_super_admin()
    OR club_id = (
        SELECT club_id FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND id = NULLIF(current_setting('request.headers', true)::json->>'active-role-context-id', '')::uuid
    )
    OR EXISTS (
        SELECT 1 FROM public.inscrieri_competitie ic
        WHERE ic.sportiv_id = sportivi.id
    )
    OR EXISTS (
        SELECT 1 FROM public.echipa_sportivi es
        WHERE es.sportiv_id = sportivi.id
    )
);
