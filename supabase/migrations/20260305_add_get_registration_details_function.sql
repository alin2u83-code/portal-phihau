-- Migration to add get_registration_details function
CREATE OR REPLACE FUNCTION public.get_registration_details(p_sportiv_id uuid)
RETURNS TABLE (
    grad_sugerat_id uuid,
    grad_sugerat_nume text,
    taxa_suma numeric,
    is_debtor boolean
) LANGUAGE plpgsql AS $$
DECLARE
    v_grad_id uuid;
    v_suma numeric;
BEGIN
    -- 1. Calculăm gradul următor folosind logica de vârstă definită anterior
    SELECT next_grad_id INTO v_grad_id FROM public.get_next_eligible_grade(p_sportiv_id);
    
    -- 2. Identificăm prețul activ pentru acest grad din configurația trimisă de tine
    SELECT suma INTO v_suma 
    FROM public.grade_preturi_config 
    WHERE grad_id = v_grad_id AND is_activ = true 
    ORDER BY data_activare DESC LIMIT 1;

    RETURN QUERY SELECT 
        v_grad_id, 
        (SELECT nume FROM public.grade WHERE id = v_grad_id),
        COALESCE(v_suma, 0),
        EXISTS (SELECT 1 FROM public.plati WHERE sportiv_id = p_sportiv_id AND status = 'Restanta');
END;
$$;
