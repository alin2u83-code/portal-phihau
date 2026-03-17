CREATE OR REPLACE FUNCTION finalizeaza_examen(p_sesiune_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inscriere RECORD;
    v_sesiune RECORD;
    v_decont_id UUID;
    v_total_sportivi INTEGER := 0;
    v_grad_sustinut_nume TEXT;
BEGIN
    -- Obține detalii despre sesiune
    SELECT * INTO v_sesiune FROM sesiuni_examene WHERE id = p_sesiune_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesiunea de examen nu a fost găsită.';
    END IF;

    -- Actualizează statusul sesiunii
    UPDATE sesiuni_examene SET status = 'Finalizat' WHERE id = p_sesiune_id;

    -- Iterează prin înscrieri
    FOR v_inscriere IN 
        SELECT ie.*, g.nume as grad_nume 
        FROM inscrieri_examene ie
        JOIN grade g ON g.id = ie.grad_sustinut_id
        WHERE ie.sesiune_id = p_sesiune_id
    LOOP
        -- Dacă sportivul a fost admis
        IF v_inscriere.rezultat = 'Admis' THEN
            -- Adaugă în istoric grade (verifică duplicat)
            IF NOT EXISTS (
                SELECT 1 FROM istoric_grade 
                WHERE sportiv_id = v_inscriere.sportiv_id 
                AND grad_id = v_inscriere.grad_sustinut_id 
                AND data_obtinere = v_sesiune.data
            ) THEN
                INSERT INTO istoric_grade (sportiv_id, grad_id, data_obtinere, sesiune_examen_id)
                VALUES (v_inscriere.sportiv_id, v_inscriere.grad_sustinut_id, v_sesiune.data, p_sesiune_id);
            END IF;
        END IF;

        v_total_sportivi := v_total_sportivi + 1;
    END LOOP;

    -- Încearcă să creeze decontul doar dacă există club_id
    IF v_sesiune.club_id IS NOT NULL THEN
        INSERT INTO deconturi_federatie (club_id, activitate, data_activitate, numar_sportivi, suma_totala, status)
        VALUES (v_sesiune.club_id, 'Examen ' || v_sesiune.data, v_sesiune.data, v_total_sportivi, 0, 'In asteptare')
        RETURNING id INTO v_decont_id;
        
        RETURN (SELECT row_to_json(d) FROM deconturi_federatie d WHERE id = v_decont_id);
    ELSE
        RETURN NULL;
    END IF;
END;
$$;
