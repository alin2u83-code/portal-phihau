
-- =================================================================
-- Politici de Securitate RLS pentru Tabela `plati` (v10.0)
-- =================================================================
-- Obiective:
-- - Permite acces total pentru Super Admini.
-- - Permite acces total (ALL) pentru Adminii de Club la plățile din clubul lor.
-- - Permite acces de citire (SELECT) pentru Instructori la plățile din clubul lor.
-- - Revocă orice acces direct pentru rolul 'Sportiv' la acest tabel, conform cerințelor.
-- =================================================================

-- Resetarea politicilor existente pentru a asigura o stare curată
CALL public.reset_all_policies_for_table('plati');

-- Activarea RLS pe tabelă
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati FORCE ROW LEVEL SECURITY;

-- Politica 1: Adminii de Federație (Super Admin & Admin) au acces total.
CREATE POLICY "Admin Federație - Acces total la plăți" ON public.plati
    FOR ALL USING (get_active_role() IN ('SUPER_ADMIN_FEDERATIE', 'Admin'));

-- Politica 2: Adminii de Club au acces total (ALL) la plățile sportivilor/familiilor din clubul lor.
-- Se folosește o subinterogare pe `sportivi` pentru a determina apartenența la club.
CREATE POLICY "Admin Club - Management total al plăților din propriul club" ON public.plati
    FOR ALL USING (get_active_role() = 'ADMIN_CLUB' AND EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE (s.id = plati.sportiv_id OR (plati.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
        AND s.club_id = get_active_club_id()
    ));

-- Politica 3: Instructorii pot doar vizualiza (SELECT) plățile din clubul lor.
-- Politica este similară cu cea de Admin Club, dar limitată la operațiunea SELECT.
CREATE POLICY "Instructor - Vizualizare plăți din propriul club" ON public.plati
    FOR SELECT USING (get_active_role() = 'INSTRUCTOR' AND EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE (s.id = plati.sportiv_id OR (plati.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
        AND s.club_id = get_active_club_id()
    ));

-- NOTĂ: Nu există o politică explicită pentru rolul 'SPORTIV'.
-- Conform principiului RLS "deny by default", accesul este implicit refuzat pentru aceștia.
-- Politica anterioară care le permitea să-și vadă propriile plăți a fost eliminată conform cerinței.
      