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
    v_cod_sportiv text;
BEGIN
    -- Get Grade ID
    SELECT id INTO v_grad_id FROM public.grade WHERE ordine = p_ordine_grad LIMIT 1;
    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid: %', p_ordine_grad;
    END IF;

    -- Determine Sportiv ID
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
        
        -- Update birthdate if provided and currently null
        IF p_data_nasterii IS NOT NULL THEN
            UPDATE public.sportivi 
            SET data_nasterii = p_data_nasterii 
            WHERE id = v_sportiv_id AND data_nasterii IS NULL;
        END IF;
    ELSE
        -- If cod_sportiv is not provided, generate it
        IF p_cod_sportiv IS NULL THEN
             -- Simple generation logic or call another function if needed. 
             -- For now, we assume the frontend passes it or we generate a simple one.
             -- Let's try to use the generate_sportiv_code function if available, otherwise fallback.
             -- Since we can't easily call RPC from here without knowing if it exists as a SQL function,
             -- we'll rely on the input. If input is null, we generate a placeholder.
             v_cod_sportiv := 'TEMP-' || floor(random() * 100000)::text;
        ELSE
             v_cod_sportiv := p_cod_sportiv;
        END IF;

        -- Create new sportiv
        -- Removed 'cod_sportiv' column from insert if it doesn't exist in your schema, 
        -- BUT the error says "column cod_sportiv does not exist", so we must remove it from the INSERT statement.
        
        INSERT INTO public.sportivi (
            nume, prenume, cnp, club_id, grad_actual_id, status, data_inscrierii, data_nasterii
        ) VALUES (
            p_nume, p_prenume, p_cnp, p_club_id, v_grad_id, 'Activ', CURRENT_DATE, p_data_nasterii
        ) RETURNING id INTO v_sportiv_id;
    END IF;

    -- Insert Exam Result
    INSERT INTO public.istoric_examene (
        sportiv_id, sesiune_id, grad_id, rezultat, data_examen, contributie_achitata
    ) VALUES (
        v_sportiv_id, p_sesiune_id, v_grad_id, p_rezultat, p_data_examen, p_contributie
    );

    -- If Admis, also update istoric_grade
    IF p_rezultat = 'Admis' THEN
        INSERT INTO public.istoric_grade (sportiv_id, grad_id, data_obtinere, sesiune_examen_id)
        VALUES (v_sportiv_id, v_grad_id, p_data_examen, p_sesiune_id)
        ON CONFLICT (sportiv_id, grad_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;
