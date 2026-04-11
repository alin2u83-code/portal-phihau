-- =============================================================================
-- REFACTOR_VIZE_FEDERALE.sql
-- Subiect: Implementare Sistem de Vize Federale si Taxe Anuale
-- Autor: Senior Software Architect
-- =============================================================================

-- 1. Tabel Configurare Taxe Anuale
-- Permite Federatiei (club_id IS NULL) sau Cluburilor sa defineasca taxe specifice.
CREATE TABLE IF NOT EXISTS public.taxe_anuale_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    an INTEGER NOT NULL,
    suma DECIMAL(10, 2) NOT NULL,
    descriere TEXT,
    club_id UUID REFERENCES public.cluburi(id), -- NULL daca este taxa de Federatie (obligatorie pt toti)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(an, club_id)
);

COMMENT ON TABLE public.taxe_anuale_config IS 'Configurarea sumelor pentru vizele anuale federale sau taxe de club.';

-- 2. Tabel Vize Sportivi
-- Inregistreaza platile efective si starea vizei per sportiv si an.
CREATE TABLE IF NOT EXISTS public.vize_sportivi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    an INTEGER NOT NULL,
    plata_id UUID REFERENCES public.plati(id), -- Legatura cu sistemul financiar (factura/plata)
    data_platii TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status_viza TEXT DEFAULT 'Activ' CHECK (status_viza IN ('Activ', 'Inactiv', 'Suspendat')),
    observatii TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(sportiv_id, an)
);

COMMENT ON TABLE public.vize_sportivi IS 'Inregistrarea vizelor anuale platite de sportivi. Esential pentru eligibilitatea la examene.';

-- 3. Functie de verificare eligibilitate (Viza Valida)
-- Arhitectura: Logica de business este incapsulata in DB pentru a fi folosita atat in RLS cat si in Triggere.
CREATE OR REPLACE FUNCTION public.fn_are_viza_anuala_valida(p_sportiv_id UUID, p_an INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Un sportiv este eligibil daca are o inregistrare 'Activ' pentru anul respectiv.
    RETURN EXISTS (
        SELECT 1 FROM public.vize_sportivi
        WHERE sportiv_id = p_sportiv_id
          AND an = p_an
          AND status_viza = 'Activ'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.fn_are_viza_anuala_valida IS 'Verifica eligibilitatea sportivului pe baza vizei anuale.';

-- 4. Constraint de Integritate: Blocare inscriere examen fara viza
-- Arhitectura: "Fail-fast" la nivel de baza de date pentru a preveni erorile de UI sau bypass-ul API-ului.
CREATE OR REPLACE FUNCTION public.fn_check_viza_before_inscriere()
RETURNS TRIGGER AS $$
DECLARE
    v_an_examen INTEGER;
BEGIN
    -- Determinam anul in care are loc sesiunea de examen
    SELECT EXTRACT(YEAR FROM data)::INTEGER INTO v_an_examen
    FROM public.sesiuni_examene
    WHERE id = NEW.sesiune_id;

    -- Verificam viza pentru anul respectiv
    IF NOT public.fn_are_viza_anuala_valida(NEW.sportiv_id, v_an_examen) THEN
        RAISE EXCEPTION 'Eroare Eligibilitate: Sportivul nu are viza federala activa pentru anul %.', v_an_examen
        USING ERRCODE = 'P0001'; -- Custom error code for UI handling
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_viza_before_inscriere ON public.inscrieri_examene;
CREATE TRIGGER trg_check_viza_before_inscriere
BEFORE INSERT OR UPDATE ON public.inscrieri_examene
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_viza_before_inscriere();

COMMENT ON TRIGGER trg_check_viza_before_inscriere ON public.inscrieri_examene IS 'Garanteaza ca doar sportivii cu viza la zi pot fi inscrisi la examene.';

-- 5. Actualizare View Master: vedere_detalii_examen
-- Arhitectura: Vederea devine "Data Hub" pentru frontend, incluzand statusul vizei.
-- Nota: Recrearea vederii pentru a include noile campuri si logica JSONB.

CREATE OR REPLACE VIEW public.vedere_detalii_examen AS
SELECT 
    ie.id AS inscriere_id,
    ie.sportiv_id,
    ie.sesiune_id,
    ie.grad_sustinut_id,
    ie.rezultat,
    ie.note_detaliate,
    s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume,
    s.club_id,
    c.nume AS club_nume,
    g.nume AS grad_sustinut_nume,
    se.data AS data_examen,
    -- Coloana calculata pentru validare automata (JSONB logic folosind functia creata anterior)
    public.fn_valideaza_toate_notele_sapte(ie.note_detaliate) AS este_promovabil_automat,
    -- Status Viza (pentru UI)
    public.fn_are_viza_anuala_valida(ie.sportiv_id, EXTRACT(YEAR FROM se.data)::INTEGER) AS are_viza_platita
FROM public.inscrieri_examene ie
JOIN public.sportivi s ON ie.sportiv_id = s.id
JOIN public.cluburi c ON s.club_id = c.id
JOIN public.grade g ON ie.grad_sustinut_id = g.id
JOIN public.sesiuni_examene se ON ie.sesiune_id = se.id;

COMMENT ON VIEW public.vedere_detalii_examen IS 'Hub central de date pentru examene, integrat cu validarea JSONB si statusul vizei federale.';

-- 6. Securitate RLS (Multi-tenant)
ALTER TABLE public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vize_sportivi ENABLE ROW LEVEL SECURITY;

-- Politici pentru SUPER_ADMIN_FEDERATIE (Acces Total)
-- Presupunem ca rolul este stocat in metadata sau tabelul de roluri.
DROP POLICY IF EXISTS "Federatie - Full Access Taxe" ON public.taxe_anuale_config;
CREATE POLICY "Federatie - Full Access Taxe" ON public.taxe_anuale_config FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() AND rol_nume = 'SUPER_ADMIN_FEDERATIE'));

DROP POLICY IF EXISTS "Federatie - Full Access Vize" ON public.vize_sportivi;
CREATE POLICY "Federatie - Full Access Vize" ON public.vize_sportivi FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() AND rol_nume = 'SUPER_ADMIN_FEDERATIE'));

-- Politici pentru ADMIN_CLUB (Vizualizare taxe si gestionare vize proprii)
DROP POLICY IF EXISTS "Club - View Taxe" ON public.taxe_anuale_config;
CREATE POLICY "Club - View Taxe" ON public.taxe_anuale_config FOR SELECT TO authenticated 
USING (club_id IS NULL OR club_id = (SELECT club_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() LIMIT 1));

DROP POLICY IF EXISTS "Club - Manage Vize" ON public.vize_sportivi;
CREATE POLICY "Club - Manage Vize" ON public.vize_sportivi FOR ALL TO authenticated 
USING (EXISTS (
    SELECT 1 FROM public.sportivi s 
    WHERE s.id = vize_sportivi.sportiv_id 
    AND s.club_id = (SELECT club_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() LIMIT 1)
));
