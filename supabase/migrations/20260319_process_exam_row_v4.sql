-- =====================================================
-- MIGRATION: process_exam_row_v4
-- Fixes vs v3:
--   1. Sportiv nou: grad_actual_id setat DOAR dacă Admis
--   2. Sportiv existent: grad_actual_id actualizat dacă Admis și gradul nou e mai mare
--   3. Evită duplicate în istoric_examene (același sportiv+sesiune+grad)
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_exam_row_v4(
    p_nume              text,
    p_prenume           text,
    p_cnp               text,
    p_existing_sportiv_id uuid,
    p_club_id           uuid,
    p_ordine_grad       integer,
    p_rezultat          text,
    p_contributie       numeric,
    p_data_examen       date,
    p_sesiune_id        uuid,
    p_data_nasterii     date DEFAULT NULL
)
RETURNS uuid AS $$   -- returnează sportiv_id (util pentru logging în frontend)
DECLARE
    v_sportiv_id        uuid;
    v_grad_id           uuid;
    v_current_grad_ordine integer;
BEGIN
    -- 1. Validare grad
    SELECT id INTO v_grad_id
    FROM public.grade
    WHERE ordine = p_ordine_grad
    LIMIT 1;

    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid (ordine=%)', p_ordine_grad;
    END IF;

    -- 2. Determină / creează sportivul
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;

        -- Completează data nașterii dacă lipsea
        IF p_data_nasterii IS NOT NULL THEN
            UPDATE public.sportivi
            SET data_nasterii = p_data_nasterii
            WHERE id = v_sportiv_id AND data_nasterii IS NULL;
        END IF;

    ELSE
        -- Sportiv nou — grad_actual_id setat NUMAI dacă trece
        INSERT INTO public.sportivi (
            nume, prenume, cnp, club_id,
            grad_actual_id,
            status, data_inscrierii, data_nasterii
        ) VALUES (
            p_nume, p_prenume, NULLIF(TRIM(p_cnp), ''), p_club_id,
            CASE WHEN p_rezultat = 'Admis' THEN v_grad_id ELSE NULL END,
            'Activ', CURRENT_DATE, p_data_nasterii
        )
        RETURNING id INTO v_sportiv_id;
    END IF;

    -- 3. Rezultat examen (evită duplicate)
    INSERT INTO public.istoric_examene (
        sportiv_id, sesiune_id, grad_id,
        rezultat, data_examen, contributie_achitata
    )
    VALUES (
        v_sportiv_id, p_sesiune_id, v_grad_id,
        p_rezultat, p_data_examen, p_contributie
    )
    ON CONFLICT (sportiv_id, sesiune_id, grad_id) DO UPDATE
        SET rezultat             = EXCLUDED.rezultat,
            contributie_achitata = EXCLUDED.contributie_achitata;

    -- 4. Dacă Admis: actualizează grad_actual_id (doar dacă noul grad e mai mare)
    IF p_rezultat = 'Admis' THEN

        SELECT COALESCE(g.ordine, -1)
        INTO v_current_grad_ordine
        FROM public.sportivi s
        LEFT JOIN public.grade g ON g.id = s.grad_actual_id
        WHERE s.id = v_sportiv_id;

        IF p_ordine_grad > v_current_grad_ordine THEN
            UPDATE public.sportivi
            SET grad_actual_id = v_grad_id
            WHERE id = v_sportiv_id;
        END IF;

        -- Înregistrează în istoricul de grade
        INSERT INTO public.istoric_grade (
            sportiv_id, grad_id, data_obtinere, sesiune_examen_id
        )
        VALUES (v_sportiv_id, v_grad_id, p_data_examen, p_sesiune_id)
        ON CONFLICT (sportiv_id, grad_id) DO UPDATE
            SET data_obtinere    = EXCLUDED.data_obtinere,
                sesiune_examen_id = EXCLUDED.sesiune_examen_id;

    END IF;

    RETURN v_sportiv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_exam_row_v4 TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'process_exam_row_v4 created: fixes grad on fail + upgrades grad for existing sportivi.';
END $$;
