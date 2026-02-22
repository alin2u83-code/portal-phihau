-- =================================================================
-- Script pentru trecerea RLS și View-urilor de la rol_denumire la rol_id
-- =================================================================

-- 1. Recreere View v_user_access
DROP VIEW IF EXISTS public.v_user_access CASCADE;
CREATE OR REPLACE VIEW public.v_user_access AS
SELECT 
    urm.id,
    urm.user_id,
    urm.sportiv_id,
    urm.club_id,
    urm.rol_id,
    r.nume AS rol_denumire,
    urm.is_primary,
    urm.created_at
FROM public.utilizator_roluri_multicont urm
JOIN public.roluri r ON urm.rol_id = r.id;

-- 2. Recreere View vizibilitate_sportivi_dinamica
DROP VIEW IF EXISTS public.vizibilitate_sportivi_dinamica CASCADE;
CREATE OR REPLACE VIEW public.vizibilitate_sportivi_dinamica AS
SELECT s.*
FROM public.sportivi s
WHERE EXISTS (
    SELECT 1 
    FROM public.utilizator_roluri_multicont urm
    JOIN public.roluri r ON urm.rol_id = r.id
    WHERE urm.user_id = auth.uid() 
      AND urm.is_primary = true
      AND (
          r.nume IN ('SUPER_ADMIN_FEDERATIE', 'Admin') 
          OR 
          (r.nume IN ('Admin Club', 'Instructor') AND urm.club_id = s.club_id)
          OR
          (s.user_id = auth.uid())
      )
);

-- 3. Actualizare Politici RLS pentru tabela sportivi
DROP POLICY IF EXISTS "Admin Federație - Acces total la sportivi" ON public.sportivi;
CREATE POLICY "Admin Federație - Acces total la sportivi" ON public.sportivi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume IN ('SUPER_ADMIN_FEDERATIE', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Admin Club - Management total al sportivilor din propriul club" ON public.sportivi;
CREATE POLICY "Admin Club - Management total al sportivilor din propriul club" ON public.sportivi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Admin Club' AND urm.club_id = sportivi.club_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Admin Club' AND urm.club_id = sportivi.club_id
        )
    );

DROP POLICY IF EXISTS "Instructor - Vizualizare și actualizare sportivi din propriul club" ON public.sportivi;
CREATE POLICY "Instructor - Vizualizare sportivi din propriul club" ON public.sportivi
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Instructor' AND urm.club_id = sportivi.club_id
        )
    );

CREATE POLICY "Instructor - Actualizare sportivi din propriul club" ON public.sportivi
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Instructor' AND urm.club_id = sportivi.club_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Instructor' AND urm.club_id = sportivi.club_id
        )
    );

-- 4. Actualizare Politici RLS pentru tabela plati
DROP POLICY IF EXISTS "Admin Federație - Acces total la plăți" ON public.plati;
CREATE POLICY "Admin Federație - Acces total la plăți" ON public.plati
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume IN ('SUPER_ADMIN_FEDERATIE', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Admin Club - Management total al plăților din propriul club" ON public.plati;
CREATE POLICY "Admin Club - Management total al plăților din propriul club" ON public.plati
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Admin Club'
            AND EXISTS (
                SELECT 1 FROM public.sportivi s
                WHERE (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
                AND s.club_id = urm.club_id
            )
        )
    );

DROP POLICY IF EXISTS "Instructor - Vizualizare plăți din propriul club" ON public.plati;
CREATE POLICY "Instructor - Vizualizare plăți din propriul club" ON public.plati
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume = 'Instructor'
            AND EXISTS (
                SELECT 1 FROM public.sportivi s
                WHERE (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
                AND s.club_id = urm.club_id
            )
        )
    );

-- 5. Actualizare Politici RLS pentru tabela grupe
DROP POLICY IF EXISTS "Super Admin - Acces total la grupe" ON public.grupe;
CREATE POLICY "Super Admin - Acces total la grupe" ON public.grupe
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume IN ('SUPER_ADMIN_FEDERATIE', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Staff-ul clubului gestionează grupele proprii" ON public.grupe;
CREATE POLICY "Staff-ul clubului gestionează grupele proprii" ON public.grupe
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume IN ('Admin Club', 'Instructor') AND urm.club_id = grupe.club_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            JOIN public.roluri r ON urm.rol_id = r.id
            WHERE urm.user_id = auth.uid() AND urm.is_primary = true AND r.nume IN ('Admin Club', 'Instructor') AND urm.club_id = grupe.club_id
        )
    );
