CREATE OR REPLACE FUNCTION public.proceseaza_incasare_normalizata(
    p_tranzactie JSONB,
    p_plati JSONB[] -- Array of {plata_id: UUID, suma_alocata: NUMERIC}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tranzactie_id UUID;
    v_plata JSONB;
BEGIN
    -- 1. Insert tranzactie
    INSERT INTO public.tranzactii (
        sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id
    ) VALUES (
        (p_tranzactie->>'sportiv_id')::UUID,
        (p_tranzactie->>'familie_id')::UUID,
        (p_tranzactie->>'suma')::NUMERIC,
        (p_tranzactie->>'data_platii')::DATE,
        (p_tranzactie->>'metoda_plata'),
        (p_tranzactie->>'club_id')::UUID
    ) RETURNING id INTO v_tranzactie_id;

    -- 2. Insert tranzactie_plata
    FOREACH v_plata IN ARRAY p_plati LOOP
        INSERT INTO public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
        VALUES (
            v_tranzactie_id,
            (v_plata->>'plata_id')::UUID,
            (v_plata->>'suma_alocata')::NUMERIC
        );
    END LOOP;

    RETURN v_tranzactie_id;
END;
$$;
