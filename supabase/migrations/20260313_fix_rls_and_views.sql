-- 1. ASIGURĂM RLS PENTRU SPORTIVI
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Manage Own Club Sportivi" ON public.sportivi;
CREATE POLICY "Staff - Manage Own Club Sportivi" ON public.sportivi
FOR ALL TO authenticated
USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Sportiv - View Own Profile" ON public.sportivi;
CREATE POLICY "Sportiv - View Own Profile" ON public.sportivi
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2. ASIGURĂM RLS PENTRU TITLURI SPORTIVE
ALTER TABLE public.titluri_sportive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Manage Titluri" ON public.titluri_sportive;
CREATE POLICY "Staff - Manage Titluri" ON public.titluri_sportive
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = titluri_sportive.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- 3. ASIGURĂM RLS PENTRU NOM_CATEGORII_COMPETITIE
ALTER TABLE public.nom_categorii_competitie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone - View Categorii" ON public.nom_categorii_competitie;
CREATE POLICY "Anyone - View Categorii" ON public.nom_categorii_competitie
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin - Manage Categorii" ON public.nom_categorii_competitie;
CREATE POLICY "Admin - Manage Categorii" ON public.nom_categorii_competitie
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
    )
);

-- 4. RE-CREARE VIEW-URI DACĂ ESTE NECESAR (Exemplu: vedere_sportivi_detaliat)
-- Aceasta depinde de ce erori de view-uri au fost raportate, dar de obicei vizează accesul la datele sportivilor.

CREATE OR REPLACE VIEW public.vedere_sportivi_detaliat AS
SELECT 
    s.*,
    c.nume as club_nume,
    g.nume as grad_nume,
    gr.denumire as grupa_nume  -- Corectat din gr.nume în gr.denumire
FROM public.sportivi s
LEFT JOIN public.cluburi c ON s.club_id = c.id
LEFT JOIN public.grade g ON s.grad_actual_id = g.id
LEFT JOIN public.grupe gr ON s.grupa_id = gr.id;

GRANT SELECT ON public.vedere_sportivi_detaliat TO authenticated;
