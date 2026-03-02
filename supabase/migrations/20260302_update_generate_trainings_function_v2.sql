-- =================================================================
-- FUNCȚIE GENERARE ANTRENAMENTE DIN ORAR (UPDATE)
-- =================================================================
-- Această funcție populează tabela 'program_antrenamente' pe baza
-- șabloanelor definite în 'orar_saptamanal'.
-- Include RAISE NOTICE pentru debugging și folosește EXTRACT(DOW)
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
    v_zi_idx INTEGER;
    v_rows_found INTEGER;
BEGIN
    -- Iterăm prin fiecare zi din intervalul solicitat
    FOR i IN 0..p_zile_in_avans LOOP
        v_data_curenta := CURRENT_DATE + i;
        v_zi_idx := EXTRACT(DOW FROM v_data_curenta);
        
        -- Debugging: Afișăm data curentă și indexul zilei
        RAISE NOTICE 'Procesare data: %, Ziua Index: %', v_data_curenta, v_zi_idx;

        -- Numărăm câte rânduri potențiale există în orar pentru această zi
        SELECT COUNT(*) INTO v_rows_found
        FROM public.orar_saptamanal o
        WHERE 
            CASE o.ziua
                WHEN 'Duminică' THEN 0
                WHEN 'Luni' THEN 1
                WHEN 'Marți' THEN 2
                WHEN 'Miercuri' THEN 3
                WHEN 'Joi' THEN 4
                WHEN 'Vineri' THEN 5
                WHEN 'Sâmbătă' THEN 6
                ELSE -1
            END = v_zi_idx
        AND o.is_activ = TRUE
        AND (p_grupa_id IS NULL OR o.grupa_id = p_grupa_id);

        RAISE NOTICE 'Rânduri găsite în orar pentru data %: %', v_data_curenta, v_rows_found;

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
        WHERE 
            CASE o.ziua
                WHEN 'Duminică' THEN 0
                WHEN 'Luni' THEN 1
                WHEN 'Marți' THEN 2
                WHEN 'Miercuri' THEN 3
                WHEN 'Joi' THEN 4
                WHEN 'Vineri' THEN 5
                WHEN 'Sâmbătă' THEN 6
                ELSE -1
            END = v_zi_idx
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
