-- =================================================================
-- Funcție RPC pentru Sistemul Hibrid de Orar
-- v1.0
-- =================================================================
-- Scop: Populează tabela `program_antrenamente` cu instanțe de
-- antrenament pentru un număr specificat de zile în avans,
-- bazându-se pe template-ul recurent definit în `orar_saptamanal`.
--
-- Funcționalitate Cheie:
-- - Utilizează `ON CONFLICT DO NOTHING` pentru a fi idempotentă,
--   prevenind crearea de duplicate dacă este rulată de mai multe ori.
-- - Marchează antrenamentele generate cu `is_recurent = true`.
-- - Calculează data exactă pe baza zilei săptămânii (Luni, Marți, etc.).
-- =================================================================

-- Adaugă coloana `is_recurent` dacă nu există, pentru a diferenția antrenamentele
ALTER TABLE public.program_antrenamente
ADD COLUMN IF NOT EXISTS is_recurent BOOLEAN NOT NULL DEFAULT false;

-- Adaugă o constrângere de unicitate pentru a preveni duplicatele la nivel de bază de date
ALTER TABLE public.program_antrenamente
ADD CONSTRAINT program_antrenamente_unic_idx UNIQUE (data, ora_start, grupa_id);

-- Funcția RPC
CREATE OR REPLACE FUNCTION public.genereaza_antrenamente_din_orar(p_zile_in_avans INT DEFAULT 30)
RETURNS TEXT -- Returnează un sumar
LANGUAGE plpgsql
AS $$
DECLARE
    -- Mapează numele zilelor la standardul ISO DOW (Luni=1, Duminică=7)
    zi_map JSONB := '{
        "Luni": 1, "Marți": 2, "Miercuri": 3, "Joi": 4, 
        "Vineri": 5, "Sâmbătă": 6, "Duminică": 7
    }';
    v_count_generat INT := 0;
BEGIN
    INSERT INTO public.program_antrenamente (data, ora_start, ora_sfarsit, grupa_id, ziua, is_recurent, orar_id)
    SELECT
        d.zi::date AS data_antrenament,
        o.ora_start,
        o.ora_sfarsit,
        o.grupa_id,
        o.ziua_saptamanii AS ziua,
        true, -- Marcăm ca fiind generate recurent
        o.id -- Stocăm legătura către intrarea din orar
    FROM 
        generate_series(
            CURRENT_DATE,
            CURRENT_DATE + (p_zile_in_avans || ' days')::interval,
            '1 day'::interval
        ) AS d(zi)
    CROSS JOIN public.orar_saptamanal o
    WHERE 
        o.is_activ = true
        AND EXTRACT(ISODOW FROM d.zi) = (zi_map ->> o.ziua_saptamanii)::INT
    ON CONFLICT (data, ora_start, grupa_id) DO NOTHING;

    GET DIAGNOSTICS v_count_generat = ROW_COUNT;
    
    RETURN 'Operațiune finalizată. Au fost generate ' || v_count_generat || ' antrenamente noi.';
END;
$$;
