-- =====================================================
-- SCRIPT: Creare obiecte lipsa (sigur pentru rulat pe DB existenta)
-- Sterge view-urile existente si le recreaza
-- =====================================================

-- 1. Functia get_active_club_id (necesara pentru view-uri)
-- Citeste club_id din header-ul active-role-context-id (setat de client per sesiune activa),
-- cu fallback la rolul primar din baza de date.
CREATE OR REPLACE FUNCTION public.get_active_club_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_context_id UUID;
    v_club_id UUID;
    v_header_val TEXT;
BEGIN
    -- 1. Incearca sa citeasca contextul din header-ul HTTP
    BEGIN
        v_header_val := current_setting('request.headers', true);
        IF v_header_val IS NOT NULL THEN
            v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_context_id := NULL;
    END;

    -- 2. Daca avem context ID din header, cauta club_id-ul corespunzator
    IF v_context_id IS NOT NULL THEN
        SELECT club_id INTO v_club_id
        FROM public.utilizator_roluri_multicont
        WHERE id = v_context_id AND user_id = auth.uid();

        IF v_club_id IS NOT NULL THEN
            RETURN v_club_id;
        END IF;
    END IF;

    -- 3. Fallback la rolul primar din baza de date
    SELECT club_id INTO v_club_id
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND is_primary = true
    LIMIT 1;

    RETURN v_club_id;
END;
$$;

-- 2. Stergere view-uri vechi (CASCADE sterge si dependentele)
DROP VIEW IF EXISTS public.vedere_cluburi_sportivi CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_grupe CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_plati CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_tranzactii CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_evenimente CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_rezultate CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_sesiuni_examene CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_inscrieri_examene CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_familii CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_tipuri_abonament CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_locatii CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_preturi_config CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_deconturi_federatie CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_anunturi_prezenta CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_program_antrenamente CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_vizualizare_plati CASCADE;
DROP VIEW IF EXISTS public.vedere_cluburi_istoric_plati_detaliat CASCADE;
DROP VIEW IF EXISTS public.vedere_sportivi_detaliat CASCADE;

-- 3. Adaugare coloane lipsa in tabele existente

DO $$
BEGIN
    -- Verifica daca tabelul evenimente exista
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='evenimente') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evenimente' AND column_name='club_id') THEN
            ALTER TABLE public.evenimente ADD COLUMN club_id UUID REFERENCES public.cluburi(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evenimente' AND column_name='tip_eveniment') THEN
            ALTER TABLE public.evenimente ADD COLUMN tip_eveniment TEXT DEFAULT 'CLUB' CHECK (tip_eveniment IN ('CLUB', 'FEDERATIE'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evenimente' AND column_name='vizibilitate_globala') THEN
            ALTER TABLE public.evenimente ADD COLUMN vizibilitate_globala BOOLEAN DEFAULT false;
        END IF;
    ELSE
        -- Creeaza tabelul evenimente daca nu exista
        CREATE TABLE public.evenimente (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            denumire TEXT NOT NULL,
            data DATE NOT NULL,
            data_sfarsit DATE NOT NULL,
            locatie TEXT,
            organizator TEXT,
            tip TEXT NOT NULL CHECK (tip IN ('Stagiu', 'Competitie')),
            probe_disponibile TEXT[],
            club_id UUID REFERENCES public.cluburi(id),
            tip_eveniment TEXT DEFAULT 'CLUB' CHECK (tip_eveniment IN ('CLUB', 'FEDERATIE')),
            vizibilitate_globala BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Authenticated read evenimente" ON public.evenimente FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Staff manage evenimente" ON public.evenimente FOR ALL TO authenticated
            USING (
                club_id IS NULL OR
                EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() AND club_id = evenimente.club_id AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN_FEDERATIE'))
            );
    END IF;

    -- Acelasi pattern pentru tabelul rezultate
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rezultate') THEN
        CREATE TABLE public.rezultate (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
            eveniment_id UUID NOT NULL REFERENCES public.evenimente(id) ON DELETE CASCADE,
            rezultat TEXT NOT NULL DEFAULT 'Participare',
            probe TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Authenticated read rezultate" ON public.rezultate FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Staff manage rezultate" ON public.rezultate FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- 4. Recreare view-uri

CREATE OR REPLACE VIEW public.vedere_cluburi_sportivi AS
SELECT * FROM public.sportivi
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_grupe AS
SELECT * FROM public.grupe
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_plati AS
SELECT p.* FROM public.plati p
LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
WHERE COALESCE(p.club_id, s.club_id) = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_tranzactii AS
SELECT * FROM public.tranzactii
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_evenimente AS
SELECT * FROM public.evenimente;

CREATE OR REPLACE VIEW public.vedere_cluburi_rezultate AS
SELECT r.* FROM public.rezultate r
JOIN public.sportivi s ON r.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_sesiuni_examene AS
SELECT
    s.*,
    (SELECT count(*) FROM public.inscrieri_examene i WHERE i.sesiune_id = s.id) as nr_inscrisi
FROM public.sesiuni_examene s
WHERE s.club_id = public.get_active_club_id() OR s.club_id IS NULL OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_inscrieri_examene AS
SELECT i.* FROM public.inscrieri_examene i
JOIN public.sportivi s ON i.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_familii AS
SELECT DISTINCT f.* FROM public.familii f
JOIN public.sportivi s ON s.familie_id = f.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

CREATE OR REPLACE VIEW public.vedere_cluburi_tipuri_abonament AS
SELECT * FROM public.tipuri_abonament;

CREATE OR REPLACE VIEW public.vedere_cluburi_locatii AS
SELECT * FROM public.nom_locatii;

CREATE OR REPLACE VIEW public.vedere_cluburi_preturi_config AS
SELECT * FROM public.preturi_config;

CREATE OR REPLACE VIEW public.vedere_cluburi_deconturi_federatie AS
SELECT * FROM public.deconturi_federatie;

CREATE OR REPLACE VIEW public.vedere_cluburi_anunturi_prezenta AS
SELECT * FROM public.anunturi_prezenta;

CREATE OR REPLACE VIEW public.vedere_cluburi_program_antrenamente AS
SELECT
    pa.*,
    g.denumire as nume_grupa,
    g.sala as sala,
    (SELECT count(*) FROM public.sportivi s WHERE s.grupa_id = g.id) as sportivi_count
FROM public.program_antrenamente pa
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
WHERE pa.club_id = public.get_active_club_id() OR public.is_super_admin();

-- View detalii examen (folosit pentru inscrieri examene)
DROP VIEW IF EXISTS public.vedere_detalii_examen CASCADE;
CREATE OR REPLACE VIEW public.vedere_detalii_examen AS
SELECT
    ie.id AS inscriere_id,
    ie.sportiv_id,
    ie.sesiune_id,
    ie.plata_id,
    ie.grad_sustinut_id,
    ie.grad_actual_id,
    ie.varsta_la_examen,
    ie.observatii,
    ie.rezultat,
    ie.status_inscriere,
    ie.note_detaliate,
    s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume,
    s.club_id,
    s.cnp,
    s.data_nasterii,
    s.gen,
    s.cod_sportiv,
    c.nume AS club_nume,
    c.nume AS nume_club,
    g.nume AS grad_sustinut,
    g.ordine AS grad_ordine,
    ga.nume AS nume_grad_actual,
    se.data AS data_examen,
    se.status AS status_sesiune,
    l.nume AS locatie_nume
FROM public.inscrieri_examene ie
JOIN public.sportivi s ON ie.sportiv_id = s.id
LEFT JOIN public.cluburi c ON s.club_id = c.id
LEFT JOIN public.grade g ON ie.grad_sustinut_id = g.id
LEFT JOIN public.grade ga ON ie.grad_actual_id = ga.id
LEFT JOIN public.sesiuni_examene se ON ie.sesiune_id = se.id
LEFT JOIN public.nom_locatii l ON se.locatie_id = l.id;

GRANT SELECT ON public.vedere_detalii_examen TO authenticated;

CREATE OR REPLACE VIEW public.vedere_sportivi_detaliat AS
SELECT
    s.*,
    c.nume as club_nume,
    g.nume as grad_nume,
    gr.denumire as grupa_nume
FROM public.sportivi s
LEFT JOIN public.cluburi c ON s.club_id = c.id
LEFT JOIN public.grade g ON s.grad_actual_id = g.id
LEFT JOIN public.grupe gr ON s.grupa_id = gr.id;

GRANT SELECT ON public.vedere_sportivi_detaliat TO authenticated;

-- 4. Tabel vize_medicale
CREATE TABLE IF NOT EXISTS public.vize_medicale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    data_emitere DATE NOT NULL,
    data_expirare DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Valid', 'Expirat', 'În așteptare')),
    document_url TEXT,
    observatii TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vize_medicale_expirare ON public.vize_medicale(data_expirare);
CREATE INDEX IF NOT EXISTS idx_vize_medicale_sportiv ON public.vize_medicale(sportiv_id);

ALTER TABLE public.vize_medicale ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sportivii își văd propriile vize" ON public.vize_medicale;
CREATE POLICY "Sportivii își văd propriile vize" ON public.vize_medicale
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.sportivi WHERE id = sportiv_id));

DROP POLICY IF EXISTS "Adminii și Instructorii gestionează vizele" ON public.vize_medicale;
CREATE POLICY "Adminii și Instructorii gestionează vizele" ON public.vize_medicale
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid()
            AND rol_denumire IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
        )
    );

-- 5. Coloana 'nume' in sesiuni_examene (daca lipseste)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sesiuni_examene' AND column_name = 'nume') THEN
        ALTER TABLE public.sesiuni_examene ADD COLUMN nume TEXT;
        UPDATE public.sesiuni_examene SET nume = 'Vara' WHERE nume IS NULL;
        ALTER TABLE public.sesiuni_examene ALTER COLUMN nume SET NOT NULL;
    END IF;
    ALTER TABLE public.sesiuni_examene DROP CONSTRAINT IF EXISTS check_sesiune_nume;
    ALTER TABLE public.sesiuni_examene ADD CONSTRAINT check_sesiune_nume CHECK (nume IN ('Vara', 'Iarna'));
END $$;

-- 6. Coloana tip_antrenament in program_antrenamente (daca lipseste)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='program_antrenamente' AND column_name='tip_antrenament') THEN
        ALTER TABLE public.program_antrenamente ADD COLUMN tip_antrenament TEXT DEFAULT 'regular' CHECK (tip_antrenament IN ('regular', 'stagiu', 'examen'));
    END IF;
END $$;

-- 7. View-uri lipsă raportate in erori (404)

-- vedere_cluburi_vizualizare_plati (folosit in useDataProvider pentru facturi/plati)
DROP VIEW IF EXISTS public.vedere_cluburi_vizualizare_plati CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_vizualizare_plati AS
SELECT
    p.id,
    p.sportiv_id,
    p.familie_id,
    p.suma,
    p.suma_initiala,
    p.reducere_id,
    p.reducere_detalii,
    p.data,
    p.status,
    p.descriere,
    p.tip,
    p.observatii,
    COALESCE(p.club_id, s.club_id) AS club_id,
    s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume,
    c.nume AS club_nume,
    f.nume AS familie_denumire
FROM public.plati p
LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
LEFT JOIN public.cluburi c ON COALESCE(p.club_id, s.club_id) = c.id
LEFT JOIN public.familii f ON p.familie_id = f.id
WHERE COALESCE(p.club_id, s.club_id) = public.get_active_club_id() OR public.is_super_admin();

GRANT SELECT ON public.vedere_cluburi_vizualizare_plati TO authenticated;

-- vedere_gestiune_legitimatii (folosit in LegitimatiiPage)
DROP VIEW IF EXISTS public.vedere_gestiune_legitimatii CASCADE;
CREATE OR REPLACE VIEW public.vedere_gestiune_legitimatii AS
SELECT
    s.id,
    s.nume,
    s.prenume,
    s.nr_legitimatie,
    s.data_inscrierii,
    s.status,
    s.club_id,
    g.nume AS grad_nume,
    g.ordine AS grad_ordine,
    gr.denumire AS grupa_denumire,
    c.nume AS club_nume
FROM public.sportivi s
LEFT JOIN public.grade g ON s.grad_actual_id = g.id
LEFT JOIN public.grupe gr ON s.grupa_id = gr.id
LEFT JOIN public.cluburi c ON s.club_id = c.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

GRANT SELECT ON public.vedere_gestiune_legitimatii TO authenticated;

-- vedere_prezenta_sportiv (folosit in IstoricPrezentaSportiv si ListaPrezentaAntrenament)
DROP VIEW IF EXISTS public.vedere_prezenta_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vedere_prezenta_sportiv AS
SELECT
    pa.id AS antrenament_id,
    pa.id,
    pr.sportiv_id,
    pa.data,
    pa.ora_start,
    pa.club_id,
    pa.grupa_id,
    pr.status,
    g.denumire AS nume_grupa
FROM public.prezenta_antrenament pr
JOIN public.program_antrenamente pa ON pr.antrenament_id = pa.id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
WHERE pa.club_id = public.get_active_club_id()
   OR EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = pr.sportiv_id AND s.user_id = auth.uid())
   OR public.is_super_admin();

GRANT SELECT ON public.vedere_prezenta_sportiv TO authenticated;

-- vedere_prezenta_detaliata (fallback folosit in useDataProvider)
DROP VIEW IF EXISTS public.vedere_prezenta_detaliata CASCADE;
CREATE OR REPLACE VIEW public.vedere_prezenta_detaliata AS
SELECT
    pa.id AS antrenament_id,
    pa.id,
    pr.sportiv_id,
    pa.data,
    pa.ora_start,
    pa.club_id,
    pa.grupa_id,
    pr.status,
    g.denumire AS nume_grupa
FROM public.prezenta_antrenament pr
JOIN public.program_antrenamente pa ON pr.antrenament_id = pa.id
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
WHERE pa.club_id = public.get_active_club_id()
   OR EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = pr.sportiv_id AND s.user_id = auth.uid())
   OR public.is_super_admin();

GRANT SELECT ON public.vedere_prezenta_detaliata TO authenticated;

-- view_istoric_plati_detaliat (folosit in useDataProvider)
DROP VIEW IF EXISTS public.view_istoric_plati_detaliat CASCADE;
CREATE OR REPLACE VIEW public.view_istoric_plati_detaliat AS
SELECT
    p.id,
    p.sportiv_id,
    p.familie_id,
    p.suma,
    p.suma_initiala,
    p.reducere_id,
    p.reducere_detalii,
    p.data,
    p.status,
    p.descriere,
    p.tip,
    p.observatii,
    COALESCE(p.club_id, s.club_id) AS club_id,
    p.data AS data_plata_string,
    s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume
FROM public.plati p
LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
WHERE COALESCE(p.club_id, s.club_id) = public.get_active_club_id() OR public.is_super_admin();

GRANT SELECT ON public.view_istoric_plati_detaliat TO authenticated;

-- taxe_anuale_config (folosit in TaxeAnuale)
CREATE TABLE IF NOT EXISTS public.taxe_anuale_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.cluburi(id),
    denumire TEXT NOT NULL,
    suma NUMERIC(10,2) NOT NULL DEFAULT 0,
    an INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Club admin manage taxe" ON public.taxe_anuale_config;
CREATE POLICY "Club admin manage taxe" ON public.taxe_anuale_config
    FOR ALL TO authenticated
    USING (club_id = public.get_active_club_id() OR public.is_super_admin());

-- 8. Fix vedere_cluburi_tipuri_abonament - filtrat pe club
DROP VIEW IF EXISTS public.vedere_cluburi_tipuri_abonament CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_tipuri_abonament AS
SELECT * FROM public.tipuri_abonament
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

GRANT SELECT ON public.vedere_cluburi_tipuri_abonament TO authenticated;

-- 9. Fix vedere_cluburi_anunturi_prezenta - filtrat pe club
DROP VIEW IF EXISTS public.vedere_cluburi_anunturi_prezenta CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_anunturi_prezenta AS
SELECT * FROM public.anunturi_prezenta
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

GRANT SELECT ON public.vedere_cluburi_anunturi_prezenta TO authenticated;

-- 10. RLS pe grade (citire libera, scriere doar super admin)
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read grade" ON public.grade;
CREATE POLICY "Anyone read grade" ON public.grade FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "SuperAdmin manage grade" ON public.grade;
CREATE POLICY "SuperAdmin manage grade" ON public.grade
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 11. Fix RLS pe vize_medicale - filtrat pe club activ pentru admin/instructor
-- Politica veche permitea oricărui admin să vadă vizele din orice club.
-- Politica nouă filtrează pe clubul activ din contextul de sesiune.
DROP POLICY IF EXISTS "Adminii și Instructorii gestionează vizele" ON public.vize_medicale;
CREATE POLICY "Adminii și Instructorii gestionează vizele" ON public.vize_medicale
    FOR ALL USING (
        public.is_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = vize_medicale.sportiv_id
            AND s.club_id = public.get_active_club_id()
        )
    );
