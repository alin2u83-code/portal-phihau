-- =============================================================================
-- FIX_EXAM_FINANCIAL_LOGIC.sql
-- Subiect: Corectare generare factura si adaugare Dry Run pentru diagnosticare
-- =============================================================================

-- 1. Corectare Functie generare_factura_examen
-- Motiv: Tabelul grade_preturi_config foloseste 'suma' nu 'pret'.
CREATE OR REPLACE FUNCTION public.generare_factura_examen(p_sportiv_id UUID)
RETURNS JSON AS $$
DECLARE
    v_club_id UUID;
    v_grad_actual_id UUID;
    v_ordine_grad_actual INTEGER;
    v_next_grad_id UUID;
    v_suma NUMERIC;
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

    -- 4. Get price (suma)
    -- Nota: Verificam daca exista pret configurat pentru clubul sportivului sau pret global (club_id IS NULL)
    SELECT suma INTO v_suma FROM public.grade_preturi_config
    WHERE grad_id = v_next_grad_id 
      AND (club_id = v_club_id OR club_id IS NULL)
      AND is_activ = true
    ORDER BY (club_id IS NOT NULL) DESC, data_activare DESC -- Prioritate pret club, apoi cel mai recent
    LIMIT 1;

    IF v_suma IS NULL THEN
        RAISE EXCEPTION 'Nu există preț configurat pentru gradul următor.';
    END IF;

    v_descriere := 'Taxă examen grad ' || (SELECT nume FROM public.grade WHERE id = v_next_grad_id);

    -- 5. Insert payment
    INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data_platii, status)
    VALUES (p_sportiv_id, v_club_id, v_suma, v_descriere, CURRENT_DATE, 'Neachitat')
    RETURNING id INTO v_plata_id;

    -- 6. Return JSON
    RETURN json_build_object(
        'plata_id', v_plata_id,
        'suma', v_suma,
        'descriere', v_descriere
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Functie DRY RUN pentru Simulare Inserare/Generare
-- Aceasta functie prinde exceptiile si le returneaza ca text, fara a modifica baza de date.
CREATE OR REPLACE FUNCTION public.fn_dry_run_generare_factura(p_sportiv_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT,
    simulated_data JSON
) AS $$
BEGIN
    -- Folosim un sub-bloc pentru a prinde exceptiile
    BEGIN
        RETURN QUERY SELECT true, 'Succes'::TEXT, public.generare_factura_examen(p_sportiv_id);
        
        -- IMPORTANT: Deoarece generare_factura_examen face INSERT, 
        -- daca vrem un ADEVARAT Dry Run care sa nu lase urme, 
        -- ar trebui sa facem ROLLBACK. Dar intr-o functie SQL, 
        -- nu putem face ROLLBACK explicit daca am inceput o tranzactie.
        -- Totusi, daca functia este apelata intr-un context care face ROLLBACK, e ok.
        -- O alta varianta este sa aruncam o exceptie custom la final pentru a forta rollback-ul.
        RAISE EXCEPTION 'ROLLBACK_FORCE';
    EXCEPTION 
        WHEN OTHERS THEN
            IF SQLERRM = 'ROLLBACK_FORCE' THEN
                -- Aici nu ajungem de fapt pentru ca exceptia opreste tot, 
                -- dar ideea e ca daca prindem erorile de business, le returnam.
                NULL;
            ELSE
                RETURN QUERY SELECT false, SQLERRM, NULL::JSON;
            END IF;
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. Verificare Nomenclator Grade (Diagnosticare)
-- Listeaza toate gradele si sumele configurate (pentru a vedea unde lipsesc)
SELECT 
    g.nume as grad_nume,
    g.ordine,
    pc.suma,
    pc.club_id,
    pc.is_activ
FROM public.grade g
LEFT JOIN public.grade_preturi_config pc ON g.id = pc.grad_id
ORDER BY g.ordine;
