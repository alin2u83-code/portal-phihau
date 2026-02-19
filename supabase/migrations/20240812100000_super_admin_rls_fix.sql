
-- =================================================================
-- Remediere Politici RLS pentru SUPER_ADMIN_FEDERATIE (v1.0)
-- =================================================================
-- Scop: Asigură că rolul 'SUPER_ADMIN_FEDERATIE' are acces neîngrădit
-- la toate tabelele de date, rezolvând problema în care dashboard-ul
-- nu afișează date din cauza politicilor RLS inconsistente.
-- De asemenea, permite tuturor utilizatorilor autentificați să CITEASCĂ
-- lista de cluburi, pentru funcționalitatea UI (ex: filtre).
-- =================================================================

DO $$
DECLARE
    table_name_var TEXT;
    -- Lista tabelelor de date principale unde este necesară o politică de bypass pentru Super Admin
    data_tables TEXT[] := ARRAY[
        'sportivi', 'grupe', 'plati', 'tranzactii', 'sesiuni_examene',
        'inscrieri_examene', 'istoric_grade', 'program_antrenamente',
        'prezenta_antrenament', 'anunturi_prezenta', 'evenimente', 'rezultate',
        'familii', 'tipuri_abonament', 'reduceri', 'preturi_config',
        'grade_preturi_config', 'taxe_anuale_config', 'deconturi_federatie', 'notificari',
        'push_subscriptions', 'alocare_plata', 'utilizator_roluri_multicont'
    ];
BEGIN
    -- Aplică politica de acces total pentru Super Admin pe toate tabelele de date
    FOREACH table_name_var IN ARRAY data_tables
    LOOP
        -- Activează RLS dacă nu este deja activ
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name_var);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', table_name_var);

        -- Șterge politicile vechi cu nume diferite care ar putea intra în conflict
        EXECUTE format('DROP POLICY IF EXISTS "Admin Federație - Acces total la %s" ON public.%I;', table_name_var, table_name_var);
        EXECUTE format('DROP POLICY IF EXISTS "Super Admin - Acces total la %s" ON public.%I;', table_name_var, table_name_var);

        -- Creează noua politică standardizată de bypass pentru Super Admin
        EXECUTE format('CREATE POLICY "Super Admin - Full Access" ON public.%I FOR ALL USING (public.get_active_role() = ''SUPER_ADMIN_FEDERATIE'');', table_name_var);
    END LOOP;

    -- Politică specială pentru 'cluburi': Toți utilizatorii autentificați pot citi (SELECT) toate cluburile.
    -- Acest lucru este necesar pentru filtre, dropdown-uri etc. Managementul (INSERT/UPDATE/DELETE) este încă restricționat.
    ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.cluburi FORCE ROW LEVEL SECURITY;
    
    -- Elimină politici SELECT vechi care ar putea fi prea restrictive
    DROP POLICY IF EXISTS "Utilizatorii își văd propriul club" ON public.cluburi;

    DROP POLICY IF EXISTS "All authenticated users can read clubs" ON public.cluburi;
    CREATE POLICY "All authenticated users can read clubs" ON public.cluburi
        FOR SELECT USING (auth.role() = 'authenticated');
        
    -- Asigură că Super Admin poate și scrie în 'cluburi' (pe lângă politica de mai sus, care este doar pentru SELECT)
    DROP POLICY IF EXISTS "Super Admin - Full Access" ON public.cluburi;
    CREATE POLICY "Super Admin - Full Access" ON public.cluburi
        FOR ALL USING (public.get_active_role() = 'SUPER_ADMIN_FEDERATIE');

END;
$$;
