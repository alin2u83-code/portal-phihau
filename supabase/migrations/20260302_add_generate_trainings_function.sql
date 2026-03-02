-- =================================================================
-- FUNCȚIE GENERARE ANTRENAMENTE DIN ORAR
-- =================================================================
-- Această funcție populează tabela 'program_antrenamente' pe baza
-- șabloanelor definite în 'orar_saptamanal'.
-- =================================================================

CREATE OR REPLACE FUNCTION public.genereaza_antrenamente_din_orar(
    p_zile_in_avans INTEGER DEFAULT 30,
    p_grupa_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data_curenta DATE;
    v_zi_saptamana_ro TEXT;
    v_zi_idx INTEGER;
BEGIN
    -- Iterăm prin fiecare zi din intervalul solicitat
    FOR i IN 0..p_zile_in_avans LOOP
        v_data_curenta := CURRENT_DATE + i;
        v_zi_idx := EXTRACT(DOW FROM v_data_curenta);
        
        -- Mapăm indexul zilei la denumirea în Română
        v_zi_saptamana_ro := CASE v_zi_idx
            WHEN 1 THEN 'Luni'
            WHEN 2 THEN 'Marți'
            WHEN 3 THEN 'Miercuri'
            WHEN 4 THEN 'Joi'
            WHEN 5 THEN 'Vineri'
            WHEN 6 THEN 'Sâmbătă'
            WHEN 0 THEN 'Duminică'
        END;

        -- Inserăm antrenamentele care nu există deja
        INSERT INTO public.program_antrenamente (
            data,
            ora_start,
            ora_sfarsit,
            grupa_id,
            club_id,
            is_recurent
        )
        SELECT 
            v_data_curenta,
            o.ora_start,
            o.ora_sfarsit,
            o.grupa_id,
            o.club_id,
            TRUE
        FROM public.orar_saptamanal o
        WHERE o.ziua = v_zi_saptamana_ro
        AND o.is_activ = TRUE
        AND (p_grupa_id IS NULL OR o.grupa_id = p_grupa_id)
        AND NOT EXISTS (
            -- Evităm duplicatele
            SELECT 1 
            FROM public.program_antrenamente p
            WHERE p.data = v_data_curenta
            AND p.ora_start = o.ora_start
            AND p.ora_sfarsit = o.ora_sfarsit
            AND p.grupa_id = o.grupa_id
        );
    END LOOP;
END;
$$;

-- Acordăm permisiuni de execuție pentru rolurile relevante
GRANT EXECUTE ON FUNCTION public.genereaza_antrenamente_din_orar(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genereaza_antrenamente_din_orar(INTEGER, UUID) TO service_role;
