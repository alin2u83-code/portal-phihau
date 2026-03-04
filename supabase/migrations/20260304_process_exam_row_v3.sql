CREATE OR REPLACE FUNCTION public.process_exam_row_v3(
    p_nume text,
    p_prenume text,
    p_cnp text,
    p_cod_sportiv text,
    p_existing_sportiv_id uuid,
    p_club_id uuid,
    p_ordine_grad integer,
    p_rezultat text,
    p_contributie numeric,
    p_data_examen date,
    p_sesiune_id uuid,
    p_data_nasterii date DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_sportiv_id uuid;
    v_grad_id uuid;
BEGIN
    -- Get Grade ID
    SELECT id INTO v_grad_id FROM public.grade WHERE ordine = p_ordine_grad LIMIT 1;
    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid: %', p_ordine_grad;
    END IF;

    -- Determine Sportiv ID
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
        
        -- Optional: Update birthdate if provided and missing? 
        -- For now, we assume "Use Existing" means strictly linking, not updating personal data unless explicitly requested.
        -- But the user said "scrie datele la sportivul care a fost gasit", which implies updating exam history, not necessarily overwriting personal info.
    ELSE
        -- Create new sportiv
        INSERT INTO public.sportivi (
            nume, prenume, cnp, cod_sportiv, club_id, grad_actual_id, status, data_inscrierii, data_nasterii
        ) VALUES (
            p_nume, p_prenume, p_cnp, p_cod_sportiv, p_club_id, v_grad_id, 'Activ', CURRENT_DATE, p_data_nasterii
        ) RETURNING id INTO v_sportiv_id;
    END IF;

    -- Insert Exam Result
    INSERT INTO public.istoric_examene (
        sportiv_id, sesiune_id, grad_id, rezultat, data_examen, contributie_achitata
    ) VALUES (
        v_sportiv_id, p_sesiune_id, v_grad_id, p_rezultat, p_data_examen, p_contributie
    );
END;
$$ LANGUAGE plpgsql;
