-- REFACTOR_FINANCIAL.sql

-- 1. Funcție pentru recalcularea stării unei facturi (suma rămasă și status)
-- Această funcție este sursa de adevăr pentru starea financiară a unei facturi.
CREATE OR REPLACE FUNCTION public.recalculare_stare_plata(p_plata_id UUID)
RETURNS VOID AS $$
DECLARE
    v_suma_totala NUMERIC;
    v_total_incasat NUMERIC;
    v_rest_de_plata NUMERIC;
    v_status_nou TEXT;
BEGIN
    -- Determinăm suma totală a facturii (după reduceri, dar înainte de încasări)
    -- Dacă suma_initiala este null, înseamnă că factura nu a fost încă procesată, deci suma curentă este suma totală.
    SELECT suma_initiala, suma INTO v_suma_totala, v_rest_de_plata FROM public.plati WHERE id = p_plata_id;
    
    IF v_suma_totala IS NULL THEN
        v_suma_totala := v_rest_de_plata;
        UPDATE public.plati SET suma_initiala = v_suma_totala WHERE id = p_plata_id;
    END IF;
    
    -- Calculăm totalul încasat din tranzacții
    SELECT COALESCE(SUM(suma), 0) INTO v_total_incasat 
    FROM public.tranzactii 
    WHERE p_plata_id = ANY(plata_ids);
    
    -- Calculăm restul de plată
    v_rest_de_plata := v_suma_totala - v_total_incasat;
    
    -- Determinăm statusul
    IF v_rest_de_plata <= 0.01 THEN
        v_status_nou := 'Achitat';
        v_rest_de_plata := 0;
    ELSIF v_total_incasat > 0 THEN
        v_status_nou := 'Achitat Parțial';
    ELSE
        v_status_nou := 'Neachitat';
    END IF;
    
    -- Actualizăm factura
    UPDATE public.plati 
    SET 
        suma = v_rest_de_plata,
        status = v_status_nou
    WHERE id = p_plata_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger pe tranzactii (AFTER INSERT OR UPDATE OR DELETE)
CREATE OR REPLACE FUNCTION public.on_tranzactie_change()
RETURNS TRIGGER AS $$
DECLARE
    v_plata_id UUID;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        FOREACH v_plata_id IN ARRAY NEW.plata_ids LOOP
            PERFORM public.recalculare_stare_plata(v_plata_id);
        END LOOP;
    END IF;
    
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        FOREACH v_plata_id IN ARRAY OLD.plata_ids LOOP
            PERFORM public.recalculare_stare_plata(v_plata_id);
        END LOOP;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tranzactie_change_trigger ON public.tranzactii;
CREATE TRIGGER tranzactie_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tranzactii
FOR EACH ROW EXECUTE FUNCTION public.on_tranzactie_change();

-- 3. Funcție pentru procesarea plății unei facturi (rămâne valabilă ca utilitar RPC)
CREATE OR REPLACE FUNCTION public.proceseaza_plata_factura(
    p_plata_id UUID,
    p_suma_incasata NUMERIC,
    p_metoda_plata TEXT, -- 'Cash' | 'Transfer Bancar'
    p_data_plata DATE DEFAULT CURRENT_DATE,
    p_descriere_aditionala TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plata RECORD;
    v_tranzactie_id UUID;
BEGIN
    SELECT * INTO v_plata FROM public.plati WHERE id = p_plata_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Factura nu a fost găsită.');
    END IF;

    INSERT INTO public.tranzactii (
        plata_ids,
        sportiv_id,
        familie_id,
        suma,
        data_platii,
        metoda_plata,
        descriere
    ) VALUES (
        ARRAY[p_plata_id],
        v_plata.sportiv_id,
        v_plata.familie_id,
        p_suma_incasata,
        p_data_plata,
        p_metoda_plata,
        COALESCE(p_descriere_aditionala, 'Plată factură: ' || v_plata.descriere)
    ) RETURNING id INTO v_tranzactie_id;

    -- Notă: Trigger-ul on_tranzactie_change va actualiza automat statusul și suma în plati.
    
    RETURN jsonb_build_object(
        'success', true, 
        'tranzactie_id', v_tranzactie_id
    );
END;
$$;
