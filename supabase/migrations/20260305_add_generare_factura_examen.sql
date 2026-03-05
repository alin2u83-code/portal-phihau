-- 1. Fix JSON parsing in useLocalStorage.ts
-- (I will apply this in the next step, but I'll write the SQL function first)

-- 2. SQL Function: generare_factura_examen(p_sportiv_id UUID)
CREATE OR REPLACE FUNCTION public.generare_factura_examen(p_sportiv_id UUID)
RETURNS JSON AS $$
DECLARE
    v_club_id UUID;
    v_grad_actual_id UUID;
    v_ordine_grad_actual INTEGER;
    v_next_grad_id UUID;
    v_pret NUMERIC;
    v_plata_id UUID;
    v_descriere TEXT;
BEGIN
    -- 1. Get sportiv info
    SELECT club_id, grad_actual_id INTO v_club_id, v_grad_actual_id
    FROM public.sportivi WHERE id = p_sportiv_id;

    IF v_club_id IS NULL OR v_grad_actual_id IS NULL THEN
        RAISE EXCEPTION 'Sportivul nu are club sau grad actual setat.';
    END IF;

    -- 2. Get order of current grade
    SELECT ordine INTO v_ordine_grad_actual FROM public.grade WHERE id = v_grad_actual_id;

    -- 3. Get next grade ID
    SELECT id INTO v_next_grad_id FROM public.grade WHERE ordine = v_ordine_grad_actual + 1 LIMIT 1;

    IF v_next_grad_id IS NULL THEN
        RAISE EXCEPTION 'Nu există un grad superior pentru acest sportiv.';
    END IF;

    -- 4. Get price
    SELECT pret INTO v_pret FROM public.grade_preturi_config
    WHERE club_id = v_club_id AND grad_id = v_next_grad_id;

    IF v_pret IS NULL THEN
        RAISE EXCEPTION 'Nu există preț configurat pentru gradul următor.';
    END IF;

    v_descriere := 'Taxă examen grad ' || v_next_grad_id;

    -- 5. Insert payment
    INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data_platii)
    VALUES (p_sportiv_id, v_club_id, v_pret, v_descriere, CURRENT_DATE)
    RETURNING id INTO v_plata_id;

    -- 6. Return JSON
    RETURN json_build_object(
        'plata_id', v_plata_id,
        'suma', v_pret,
        'descriere', v_descriere
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
