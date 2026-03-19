-- =====================================================
-- MIGRATION: Creare view-uri si obiecte lipsa (404 errors)
-- Bazat pe fix_missing_objects.sql
-- =====================================================

-- =====================================================
-- PART 1: Coloane lipsa in tabele existente
-- =====================================================

DO $$
BEGIN
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
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='program_antrenamente' AND column_name='tip_antrenament') THEN
        ALTER TABLE public.program_antrenamente ADD COLUMN tip_antrenament TEXT DEFAULT 'regular' CHECK (tip_antrenament IN ('regular', 'stagiu', 'examen'));
    END IF;
END $$;

-- =====================================================
-- PART 2: View-uri principale (filtrate pe club)
-- =====================================================

DROP VIEW IF EXISTS public.vedere_cluburi_sportivi CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_sportivi AS
SELECT * FROM public.sportivi
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_grupe CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_grupe AS
SELECT * FROM public.grupe
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_plati CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_plati AS
SELECT p.* FROM public.plati p
LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
WHERE COALESCE(p.club_id, s.club_id) = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_tranzactii CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_tranzactii AS
SELECT * FROM public.tranzactii
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_evenimente CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_evenimente AS
SELECT * FROM public.evenimente;

DROP VIEW IF EXISTS public.vedere_cluburi_rezultate CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_rezultate AS
SELECT r.* FROM public.rezultate r
JOIN public.sportivi s ON r.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_sesiuni_examene CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_sesiuni_examene AS
SELECT
    s.*,
    (SELECT count(*) FROM public.inscrieri_examene i WHERE i.sesiune_id = s.id) as nr_inscrisi
FROM public.sesiuni_examene s
WHERE s.club_id = public.get_active_club_id() OR s.club_id IS NULL OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_inscrieri_examene CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_inscrieri_examene AS
SELECT i.* FROM public.inscrieri_examene i
JOIN public.sportivi s ON i.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_familii CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_familii AS
SELECT DISTINCT f.* FROM public.familii f
JOIN public.sportivi s ON s.familie_id = f.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_tipuri_abonament CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_tipuri_abonament AS
SELECT * FROM public.tipuri_abonament
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_locatii CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_locatii AS
SELECT * FROM public.nom_locatii;

DROP VIEW IF EXISTS public.vedere_cluburi_preturi_config CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_preturi_config AS
SELECT * FROM public.preturi_config;

DROP VIEW IF EXISTS public.vedere_cluburi_deconturi_federatie CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_deconturi_federatie AS
SELECT * FROM public.deconturi_federatie;

DROP VIEW IF EXISTS public.vedere_cluburi_anunturi_prezenta CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_anunturi_prezenta AS
SELECT * FROM public.anunturi_prezenta
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

DROP VIEW IF EXISTS public.vedere_cluburi_program_antrenamente CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_program_antrenamente AS
SELECT
    pa.*,
    g.denumire as nume_grupa,
    g.sala as sala,
    (SELECT count(*) FROM public.sportivi s WHERE s.grupa_id = g.id) as sportivi_count
FROM public.program_antrenamente pa
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
WHERE pa.club_id = public.get_active_club_id() OR public.is_super_admin();

-- =====================================================
-- PART 3: View-uri lipsă raportate ca 404
-- =====================================================

-- vedere_cluburi_vizualizare_plati
DROP VIEW IF EXISTS public.vedere_cluburi_vizualizare_plati CASCADE;
CREATE OR REPLACE VIEW public.vedere_cluburi_vizualizare_plati AS
SELECT
    p.id,
    p.sportiv_id,
    p.familie_id,
    p.suma,
    p.suma_initiala,
    p.reducere_id,
    p."reducereDetalii",
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

-- view_istoric_plati_detaliat
DROP VIEW IF EXISTS public.view_istoric_plati_detaliat CASCADE;
CREATE OR REPLACE VIEW public.view_istoric_plati_detaliat AS
SELECT
    p.id,
    p.sportiv_id,
    p.familie_id,
    p.suma,
    p.suma_initiala,
    p.reducere_id,
    p."reducereDetalii",
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

-- vedere_detalii_examen
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

-- vedere_sportivi_detaliat
DROP VIEW IF EXISTS public.vedere_sportivi_detaliat CASCADE;
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

-- vedere_gestiune_legitimatii
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

-- vedere_prezenta_sportiv
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

-- vedere_prezenta_detaliata
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

-- =====================================================
-- PART 4: Grants pentru toate view-urile
-- =====================================================

DO $$
DECLARE
    v_view text;
    v_views text[] := ARRAY[
        'vedere_cluburi_sportivi',
        'vedere_cluburi_grupe',
        'vedere_cluburi_plati',
        'vedere_cluburi_tranzactii',
        'vedere_cluburi_evenimente',
        'vedere_cluburi_rezultate',
        'vedere_cluburi_sesiuni_examene',
        'vedere_cluburi_inscrieri_examene',
        'vedere_cluburi_familii',
        'vedere_cluburi_tipuri_abonament',
        'vedere_cluburi_locatii',
        'vedere_cluburi_preturi_config',
        'vedere_cluburi_deconturi_federatie',
        'vedere_cluburi_anunturi_prezenta',
        'vedere_cluburi_program_antrenamente',
        'vedere_cluburi_vizualizare_plati',
        'view_istoric_plati_detaliat',
        'vedere_detalii_examen',
        'vedere_sportivi_detaliat',
        'vedere_gestiune_legitimatii',
        'vedere_prezenta_sportiv',
        'vedere_prezenta_detaliata'
    ];
BEGIN
    FOREACH v_view IN ARRAY v_views
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = v_view) THEN
            EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_view);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon', v_view);
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PART 5: RLS pe grade
-- =====================================================

ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read grade" ON public.grade;
CREATE POLICY "Anyone read grade" ON public.grade
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "SuperAdmin manage grade" ON public.grade;
CREATE POLICY "SuperAdmin manage grade" ON public.grade
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- =====================================================
-- PART 6: Sincronizare rol_id din rol_denumire
-- (fix pentru sportivi fara rol_id setat)
-- =====================================================

UPDATE public.utilizator_roluri_multicont urm
SET rol_id = r.id
FROM public.roluri r
WHERE r.nume = urm.rol_denumire
  AND urm.rol_id IS NULL;

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260319_create_missing_views applied successfully.';
END $$;

-- =====================================================
-- PART 7: vw_antrenamente_viitoare_sportiv
-- Folosit de UpcomingTrainingsWidget pe dashboard-ul sportivului
-- =====================================================

DROP VIEW IF EXISTS public.vw_antrenamente_viitoare_sportiv CASCADE;
CREATE OR REPLACE VIEW public.vw_antrenamente_viitoare_sportiv
WITH (security_invoker = false) AS
SELECT DISTINCT ON (pa.id)
    pa.id,
    pa.data,
    pa.ora_start,
    pa.ora_sfarsit,
    pa.grupa_id,
    pa.club_id,
    l.nume AS nume_locatie
FROM public.program_antrenamente pa
LEFT JOIN public.nom_locatii l ON pa.locatie_id = l.id
WHERE pa.data >= CURRENT_DATE
  AND pa.grupa_id IN (
      SELECT s.grupa_id
      FROM public.sportivi s
      WHERE s.user_id = auth.uid()
        AND s.grupa_id IS NOT NULL
  );

GRANT SELECT ON public.vw_antrenamente_viitoare_sportiv TO authenticated;
REVOKE ALL ON public.vw_antrenamente_viitoare_sportiv FROM anon;

NOTIFY pgrst, 'reload schema';
