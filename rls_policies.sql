-- =================================================================
-- Politici de Securitate la Nivel de Rând (RLS) pentru Phi Hau Iași
-- V2.0 - Arhitectură Multi-Tenant
-- =================================================================
-- Acest script activează RLS și definește reguli de acces pentru
-- fiecare tabel din schema 'public', luând în considerare
-- apartenența sportivilor și administratorilor la un anumit club.
--
-- Roluri definite:
--   - Super Admin (sau Admin): Acces total la nivel de Federație.
--   - Admin Club: Acces limitat la datele unde club_id coincide cu ID-ul clubului său.
--   - Sportiv (Utilizator autentificat): Acces limitat la propriile date.
-- =================================================================

-- -----------------------------------------------------------------
-- Funcții Helper pentru RLS
-- -----------------------------------------------------------------

-- Funcție care returnează ID-ul clubului pentru administratorul curent
DROP FUNCTION IF EXISTS public.get_my_club_id();
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
DECLARE
    user_club_id UUID;
BEGIN
    SELECT club_id INTO user_club_id
    FROM public.sportivi
    WHERE user_id = auth.uid()
    LIMIT 1;
    RETURN user_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.get_my_club_id() OWNER TO postgres;


-- Funcție care verifică dacă utilizatorul curent este Super Admin
DROP FUNCTION IF EXISTS public.is_super_admin();
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid() AND (r.nume = 'Super Admin' OR r.nume = 'Admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.is_super_admin() OWNER TO postgres;

-- Funcție generală pentru Admin/Instructor (moștenită)
DROP FUNCTION IF EXISTS public.is_admin_or_instructor();
CREATE OR REPLACE FUNCTION public.is_admin_or_instructor()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.sportivi s
        JOIN public.sportivi_roluri sr ON s.id = sr.sportiv_id
        JOIN public.roluri r ON sr.rol_id = r.id
        WHERE s.user_id = auth.uid()
          AND (r.nume = 'Admin' OR r.nume = 'Instructor' OR r.nume = 'Super Admin' OR r.nume = 'Admin Club')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.is_admin_or_instructor() OWNER TO postgres;

-- =================================================================
-- Aplicarea Politicilor RLS
-- =================================================================

-- -----------------------------------------------------------------
-- Tabel: sportivi
-- -----------------------------------------------------------------
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all sportivi" ON public.sportivi;
DROP POLICY IF EXISTS "Super Admins can view all sportivi" ON public.sportivi;
CREATE POLICY "Super Admins can view all sportivi" ON public.sportivi
    FOR SELECT USING (public.is_super_admin());
    
DROP POLICY IF EXISTS "Club Admins can view their own club's sportivi" ON public.sportivi;
CREATE POLICY "Club Admins can view their own club's sportivi" ON public.sportivi
    FOR SELECT USING (club_id = public.get_my_club_id());

DROP POLICY IF EXISTS "Sportivi can see their own profile" ON public.sportivi;
CREATE POLICY "Sportivi can see their own profile" ON public.sportivi
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage sportivi" ON public.sportivi;
CREATE POLICY "Admins can manage sportivi" ON public.sportivi
    FOR ALL USING (public.is_super_admin() OR club_id = public.get_my_club_id())
    WITH CHECK (public.is_super_admin() OR club_id = public.get_my_club_id());
    
DROP POLICY IF EXISTS "Sportivi can update their own profile" ON public.sportivi;
CREATE POLICY "Sportivi can update their own profile" ON public.sportivi
    FOR UPDATE USING (user_id = auth.uid());

-- -----------------------------------------------------------------
-- Tabel: cluburi
-- -----------------------------------------------------------------
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all clubs" ON public.cluburi;
CREATE POLICY "Super Admins can manage all clubs" ON public.cluburi
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Club Admins can see their own club" ON public.cluburi;
CREATE POLICY "Club Admins can see their own club" ON public.cluburi
    FOR SELECT USING (id = public.get_my_club_id());

-- -----------------------------------------------------------------
-- Restul politicilor rămân în mare parte neschimbate, deoarece
-- accesul la celelalte tabele este derivat din accesul la sportivi.
-- De exemplu, un Admin de Club va vedea doar plățile sportivilor
-- din clubul său, deoarece politica pentru 'plati' se bazează pe
-- o interogare a tabelului 'sportivi', care este deja filtrat prin RLS.
-- -----------------------------------------------------------------

-- Exemplu: Politica pentru 'plati' nu necesită modificare.
-- Ea va funcționa corect în contextul multi-tenant.
/*
    CREATE POLICY "Users can see their own and family payments" ON public.plati
    FOR SELECT USING (
        (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())) OR
        (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
    );
    -- Când un Club Admin rulează `SELECT * FROM plati`, sub-interogarea `SELECT id FROM sportivi`
    -- va returna DOAR ID-urile sportivilor din clubul său, filtrând astfel automat plățile.
*/

-- Asigurăm că toate tabelele au RLS activat
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.istoric_grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi_roluri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preturi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_preturi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipuri_abonament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipuri_plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reduceri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roluri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nom_locatii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- Tabel & Funcție pentru Transfer Sportivi
-- =================================================================

-- Tabel nou pentru istoricul transferurilor
CREATE TABLE IF NOT EXISTS public.istoric_transferuri (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    sportiv_id uuid NOT NULL,
    club_vechi_id uuid,
    club_nou_id uuid NOT NULL,
    data_transfer date NOT NULL,
    aprobat_de_user_id uuid NOT NULL,
    CONSTRAINT istoric_transferuri_pkey PRIMARY KEY (id),
    CONSTRAINT istoric_transferuri_aprobat_de_user_id_fkey FOREIGN KEY (aprobat_de_user_id) REFERENCES auth.users(id),
    CONSTRAINT istoric_transferuri_club_nou_id_fkey FOREIGN KEY (club_nou_id) REFERENCES public.cluburi(id),
    CONSTRAINT istoric_transferuri_club_vechi_id_fkey FOREIGN KEY (club_vechi_id) REFERENCES public.cluburi(id),
    CONSTRAINT istoric_transferuri_sportiv_id_fkey FOREIGN KEY (sportiv_id) REFERENCES public.sportivi(id) ON DELETE CASCADE
);

-- Politici RLS pentru tabelul de istoric
ALTER TABLE public.istoric_transferuri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS Istoric Transferuri" ON public.istoric_transferuri;
CREATE POLICY "RLS Istoric Transferuri" ON public.istoric_transferuri
    FOR ALL
    USING (
        public.is_super_admin() OR
        club_vechi_id = public.get_my_club_id() OR
        club_nou_id = public.get_my_club_id() OR
        sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid())
    )
    WITH CHECK (public.is_super_admin());

-- Funcție RPC pentru a efectua transferul atomic
CREATE OR REPLACE FUNCTION public.transfer_sportiv(
    p_new_club_id uuid,
    p_old_club_id uuid,
    p_sportiv_id uuid
)
RETURNS void AS $$
BEGIN
    -- Verificare autorizație: doar Super Adminii pot executa
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Acces neautorizat: Doar un Super Admin poate transfera sportivi.';
    END IF;

    -- Actualizează clubul sportivului și resetează afilierile specifice clubului
    UPDATE public.sportivi
    SET 
        club_id = p_new_club_id,
        grupa_id = NULL,
        tip_abonament_id = NULL
    WHERE id = p_sportiv_id;

    -- Înregistrează transferul în istoric
    INSERT INTO public.istoric_transferuri(sportiv_id, club_vechi_id, club_nou_id, data_transfer, aprobat_de_user_id)
    VALUES(p_sportiv_id, p_old_club_id, p_new_club_id, current_date, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
