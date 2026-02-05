-- =================================================================
-- Script Complet pentru Refined Row Level Security (RLS) v9
-- =================================================================
-- Obiective:
-- 1. Elimină complet politicile hardcodate (ex: 'MASTER_ACCESS_ALIN').
-- 2. Implementează politici granulare bazate pe contextul din JWT (`rol_activ_context`, `club_id`).
-- 3. Asigură permisiuni specifice pe rol:
--    - plati: 'Admin Club' (ALL), 'Instructor' (SELECT).
--    - sportivi: 'Admin Club' (ALL), 'Instructor' (SELECT, UPDATE).
-- 4. Este idempotent (poate fi rulat de mai multe ori fără erori).
-- =================================================================

-- =================================================================
-- PASUL 1: DEFINIREA FUNCȚIILOR HELPER ȘI A PROCEDURILOR
-- Asigură existența instrumentelor necesare pentru politici.
-- =================================================================

-- Procedură helper pentru resetarea politicilor
CREATE OR REPLACE PROCEDURE public.reset_all_policies_for_table(p_table_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_record.policyname, p_table_name);
    END LOOP;
END;
$$;

-- Funcții helper care citesc contextul din JWT (performant și sigur)
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS text AS $$
BEGIN RETURN auth.jwt() -> 'user_metadata' ->> 'rol_activ_context'; END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS uuid AS $$
BEGIN RETURN (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid; END;
$$ LANGUAGE plpgsql STABLE;


-- =================================================================
-- PASUL 2: APLICAREA POLITICILOR PE TABELA `sportivi`
-- =================================================================
CALL public.reset_all_policies_for_table('sportivi');
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii Federației au acces total.
CREATE POLICY "Super Admin - Acces total la sportivi" ON public.sportivi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Adminii de Club au acces total la sportivii din clubul lor.
CREATE POLICY "Admin Club - Management total al sportivilor din propriul club" ON public.sportivi
    FOR ALL USING (get_active_role() = 'Admin Club' AND club_id = get_active_club_id())
    WITH CHECK (get_active_role() = 'Admin Club' AND club_id = get_active_club_id());

-- Politica 3: Instructorii pot vedea și actualiza sportivii din clubul lor (dar nu pot crea/șterge).
CREATE POLICY "Instructor - Vizualizare și actualizare sportivi din propriul club" ON public.sportivi
    FOR SELECT, UPDATE USING (get_active_role() = 'Instructor' AND club_id = get_active_club_id())
    WITH CHECK (get_active_role() = 'Instructor' AND club_id = get_active_club_id());

-- Politica 4: Utilizatorii își pot gestiona propriul profil.
CREATE POLICY "Utilizatorii își gestionează propriul profil" ON public.sportivi
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- =================================================================
-- PASUL 3: APLICAREA POLITICILOR PE TABELA `plati`
-- =================================================================
CALL public.reset_all_policies_for_table('plati');
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii Federației au acces total.
CREATE POLICY "Super Admin - Acces total la plăți" ON public.plati
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Adminii de Club au acces total (inclusiv INSERT) la plățile din clubul lor.
CREATE POLICY "Admin Club - Management total al plăților din propriul club" ON public.plati
    FOR ALL USING (get_active_role() = 'Admin Club' AND EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
        AND s.club_id = get_active_club_id()
    ));

-- Politica 3: Instructorii pot doar vizualiza (SELECT) plățile din clubul lor.
CREATE POLICY "Instructor - Vizualizare plăți din propriul club" ON public.plati
    FOR SELECT USING (get_active_role() = 'Instructor' AND EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
        AND s.club_id = get_active_club_id()
    ));

-- Politica 4: Fiecare utilizator își poate vedea plățile personale sau ale familiei.
CREATE POLICY "Utilizatorii își văd propriile plăți" ON public.plati
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.user_id = auth.uid()
        AND (s.id = plati.sportiv_id OR (s.familie_id IS NOT NULL AND s.familie_id = plati.familie_id))
    ));


-- =================================================================
-- PASUL 4: Asigurarea politicilor pe tabele adiționale (Exemple)
-- =================================================================

-- Politici pentru `grupe`
CALL public.reset_all_policies_for_table('grupe');
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupe FORCE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin - Acces total la grupe" ON public.grupe
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

CREATE POLICY "Staff-ul clubului gestionează grupele proprii" ON public.grupe
    FOR ALL USING ((get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor') AND club_id = get_active_club_id())
    WITH CHECK ((get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor') AND club_id = get_active_club_id());

CREATE POLICY "Sportivii își văd propria grupă" ON public.grupe
    FOR SELECT USING (id IN (SELECT grupa_id FROM public.sportivi WHERE user_id = auth.uid()));

-- =================================================================
-- FINALIZARE SCRIPT
-- =================================================================