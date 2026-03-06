-- Migration to implement Automatic Grade Invoice logic
-- 1. Function to get next eligible grade
CREATE OR REPLACE FUNCTION public.get_next_eligible_grade(p_sportiv_id uuid)
RETURNS TABLE (
    next_grad_id uuid,
    next_grad_nume text
) LANGUAGE plpgsql AS $$
DECLARE
    v_current_grad_id uuid;
    v_current_ordine integer;
BEGIN
    SELECT grad_actual_id INTO v_current_grad_id FROM public.sportivi WHERE id = p_sportiv_id;
    
    IF v_current_grad_id IS NULL THEN
        -- If no grade, return the first grade (lowest order)
        RETURN QUERY SELECT id, nume FROM public.grade ORDER BY ordine ASC LIMIT 1;
    ELSE
        SELECT ordine INTO v_current_ordine FROM public.grade WHERE id = v_current_grad_id;
        RETURN QUERY SELECT id, nume FROM public.grade WHERE ordine > v_current_ordine ORDER BY ordine ASC LIMIT 1;
    END IF;
END;
$$;

-- 2. Function to calculate exam fee based on grade type and age
CREATE OR REPLACE FUNCTION public.calculate_exam_fee(p_sportiv_id uuid, p_grad_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
    v_grad_nume text;
    v_data_nasterii date;
    v_age integer;
    v_fee numeric;
BEGIN
    SELECT nume INTO v_grad_nume FROM public.grade WHERE id = p_grad_id;
    SELECT data_nasterii INTO v_data_nasterii FROM public.sportivi WHERE id = p_sportiv_id;
    
    v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_data_nasterii));
    
    -- Logic for Cap (Junior grades)
    IF v_grad_nume ILIKE '%Cap%' THEN
        IF v_age < 14 THEN
            v_fee := 50;
        ELSE
            v_fee := 70;
        END IF;
    -- Logic for Dang (Senior/Black belt grades)
    ELSIF v_grad_nume ILIKE '%Dang%' THEN
        IF v_age < 18 THEN
            v_fee := 150;
        ELSE
            v_fee := 200;
        END IF;
    ELSE
        -- Default fee
        v_fee := 60;
    END IF;
    
    RETURN v_fee;
END;
$$;

-- 3. Update get_registration_details to use the new logic
CREATE OR REPLACE FUNCTION public.get_registration_details(p_sportiv_id uuid)
RETURNS TABLE (
    grad_sugerat_id uuid,
    grad_sugerat_nume text,
    taxa_suma numeric,
    is_debtor boolean
) LANGUAGE plpgsql AS $$
DECLARE
    v_grad_id uuid;
    v_grad_nume text;
    v_suma numeric;
BEGIN
    -- 1. Get next grade
    SELECT next_grad_id, next_grad_nume INTO v_grad_id, v_grad_nume FROM public.get_next_eligible_grade(p_sportiv_id);
    
    -- 2. Calculate fee
    v_suma := public.calculate_exam_fee(p_sportiv_id, v_grad_id);

    RETURN QUERY SELECT 
        v_grad_id, 
        v_grad_nume,
        COALESCE(v_suma, 0),
        EXISTS (SELECT 1 FROM public.plati WHERE sportiv_id = p_sportiv_id AND status = 'Restanta');
END;
$$;
