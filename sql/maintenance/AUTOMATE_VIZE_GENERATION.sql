-- =============================================================================
-- AUTOMATE_VIZE_GENERATION.sql
-- Subiect: Automatizare creare vize sportivi la plata taxei anuale
-- =============================================================================

-- 1. Asiguram ca tipul de plata 'Taxa Anuala' este permis (daca exista o constrangere)
-- Nota: Daca nu exista constrangerea, acest cod nu va face nimic sau va da eroare (pe care o ignoram).
DO $$ 
BEGIN
    -- Incercam sa adaugam 'Taxa Anuala' in tipuri_plati daca tabelul exista
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tipuri_plati') THEN
        INSERT INTO public.tipuri_plati (nume, is_system_type) 
        VALUES ('Taxa Anuala', true)
        ON CONFLICT (nume) DO NOTHING;
    END IF;
END $$;

-- 2. Functie pentru crearea automata a vizei
CREATE OR REPLACE FUNCTION public.fn_automate_viza_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_an_viza INTEGER;
BEGIN
    -- Verificam daca plata este de tip 'Taxa Anuala' si a devenit 'Achitat'
    -- NEW.tip poate fi 'Taxa Anuala' sau poate contine 'Taxa FRQKD' etc.
    -- In TaxeAnuale.tsx, tipul este setat ca taxaToGenerate.nume
    
    IF NEW.status = 'Achitat' AND (NEW.tip = 'Taxa Anuala' OR NEW.descriere ILIKE '%Taxa Anuala%' OR NEW.descriere ILIKE '%Viza Federale%') THEN
        
        -- Incercam sa extragem anul din descriere (ex: "Taxa Anuala 2026")
        v_an_viza := substring(NEW.descriere from '\d{4}')::INTEGER;
        
        -- Daca nu gasim anul in descriere, folosim anul curent
        IF v_an_viza IS NULL THEN
            v_an_viza := EXTRACT(YEAR FROM NEW.data)::INTEGER;
        END IF;

        -- Cream sau actualizam viza
        INSERT INTO public.vize_sportivi (sportiv_id, an, plata_id, status_viza, data_platii)
        VALUES (NEW.sportiv_id, v_an_viza, NEW.id, 'Activ', now())
        ON CONFLICT (sportiv_id, an) DO UPDATE 
        SET status_viza = 'Activ', 
            plata_id = NEW.id,
            data_platii = now();
            
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger pe tabelul plati
DROP TRIGGER IF EXISTS trg_automate_viza_on_payment ON public.plati;
CREATE TRIGGER trg_automate_viza_on_payment
AFTER INSERT OR UPDATE OF status ON public.plati
FOR EACH ROW
EXECUTE FUNCTION public.fn_automate_viza_on_payment();

COMMENT ON FUNCTION public.fn_automate_viza_on_payment IS 'Creeaza automat o viza activa cand factura de taxa anuala este achitata.';
