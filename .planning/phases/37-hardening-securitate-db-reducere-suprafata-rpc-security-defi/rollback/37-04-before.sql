-- Rollback 37-04: definitiile LIVE de dinainte (6.11.2026). NU se aplica automat. Dupa aplicare: REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated, service_role.
CREATE OR REPLACE FUNCTION public.proceseaza_incasare_normalizata(p_tranzactie jsonb, p_plati jsonb[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_tranzactie_id UUID;
    v_plata JSONB;
BEGIN
    -- 1. Insert tranzactie
    INSERT INTO public.tranzactii (
        sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id
    ) VALUES (
        (p_tranzactie->>'sportiv_id')::UUID,
        (p_tranzactie->>'familie_id')::UUID,
        (p_tranzactie->>'suma')::NUMERIC,
        (p_tranzactie->>'data_platii')::DATE,
        (p_tranzactie->>'metoda_plata'),
        (p_tranzactie->>'club_id')::UUID
    ) RETURNING id INTO v_tranzactie_id;

    -- 2. Insert tranzactie_plata
    FOREACH v_plata IN ARRAY p_plati LOOP
        INSERT INTO public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
        VALUES (
            v_tranzactie_id,
            (v_plata->>'plata_id')::UUID,
            (v_plata->>'suma_alocata')::NUMERIC
        );
    END LOOP;

    RETURN v_tranzactie_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculare_stare_plata(p_plata_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
    v_suma_totala   numeric;
    v_status_curent text;
    v_total_incasat numeric;
    v_rest_de_plata numeric;
    v_status_nou    text;
begin
    select suma, status into v_suma_totala, v_status_curent
    from public.plati where id = p_plata_id;

    if not found or v_status_curent = 'Anulat' then
        return;
    end if;

    select coalesce(sum(suma_alocata), 0) into v_total_incasat
    from public.tranzactie_plata
    where plata_id = p_plata_id;

    v_rest_de_plata := greatest(v_suma_totala - v_total_incasat, 0);

    if v_suma_totala - v_total_incasat <= 0.01 then
        v_status_nou := 'Achitat';
        v_rest_de_plata := 0;
    elsif v_total_incasat > 0 then
        v_status_nou := 'Achitat Parțial';
    else
        v_status_nou := 'Neachitat';
    end if;

    update public.plati
    set suma_ramasa = v_rest_de_plata, status = v_status_nou
    where id = p_plata_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generare_factura_examen(p_sportiv_id uuid, p_sesiune_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_club_id UUID;
    v_grad_actual_id UUID;
    v_ordine_grad_actual INTEGER;
    v_next_grad_id UUID;
    v_pret NUMERIC;
    v_plata_id UUID;
    v_descriere TEXT;
BEGIN
    -- 1. Date sportiv
    SELECT club_id, grad_actual_id INTO v_club_id, v_grad_actual_id
    FROM public.sportivi WHERE id = p_sportiv_id;

    IF v_club_id IS NULL OR v_grad_actual_id IS NULL THEN
        RAISE EXCEPTION 'Sportivul nu are club sau grad actual setat.';
    END IF;

    -- 2. Ordine grad curent
    SELECT ordine INTO v_ordine_grad_actual FROM public.grade WHERE id = v_grad_actual_id;

    -- 3. Gradul urmator
    SELECT id INTO v_next_grad_id FROM public.grade WHERE ordine = v_ordine_grad_actual + 1 LIMIT 1;

    IF v_next_grad_id IS NULL THEN
        RAISE EXCEPTION 'Nu exista un grad superior pentru acest sportiv.';
    END IF;

    -- 4. Pret
    SELECT pret INTO v_pret FROM public.grade_preturi_config
    WHERE club_id = v_club_id AND grad_id = v_next_grad_id;

    IF v_pret IS NULL THEN
        RAISE EXCEPTION 'Nu exista pret configurat pentru gradul urmator.';
    END IF;

    v_descriere := 'Taxa examen grad ' || v_next_grad_id;

    -- 5. Upsert plata (evita duplicat daca sesiune_id e furnizat)
    IF p_sesiune_id IS NOT NULL THEN
        INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data, tip, status, sesiune_id)
        VALUES (p_sportiv_id, v_club_id, v_pret, v_descriere, CURRENT_DATE, 'Taxa Examen', 'Neachitat', p_sesiune_id)
        ON CONFLICT (sportiv_id, sesiune_id)
            WHERE tip = 'Taxa Examen' AND sportiv_id IS NOT NULL AND sesiune_id IS NOT NULL
        DO UPDATE SET suma = EXCLUDED.suma, descriere = EXCLUDED.descriere
        RETURNING id INTO v_plata_id;
    ELSE
        INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data, tip, status)
        VALUES (p_sportiv_id, v_club_id, v_pret, v_descriere, CURRENT_DATE, 'Taxa Examen', 'Neachitat')
        RETURNING id INTO v_plata_id;
    END IF;

    -- 6. Returneaza JSON
    RETURN json_build_object(
        'plata_id',   v_plata_id,
        'suma',       v_pret,
        'descriere',  v_descriere
    );
END;
$function$;

-- Varianta stearsa de migrare (INSERT in plati.data_platii, coloana inexistenta; esua mereu):
CREATE OR REPLACE FUNCTION public.generare_factura_examen(p_sportiv_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_club_id UUID; v_grad_actual_id UUID; v_ordine_grad_actual INTEGER; v_next_grad_id UUID;
    v_pret NUMERIC; v_plata_id UUID; v_descriere TEXT;
BEGIN
    SELECT club_id, grad_actual_id INTO v_club_id, v_grad_actual_id FROM public.sportivi WHERE id = p_sportiv_id;
    IF v_club_id IS NULL OR v_grad_actual_id IS NULL THEN RAISE EXCEPTION 'Sportivul nu are club sau grad actual setat.'; END IF;
    SELECT ordine INTO v_ordine_grad_actual FROM public.grade WHERE id = v_grad_actual_id;
    SELECT id INTO v_next_grad_id FROM public.grade WHERE ordine = v_ordine_grad_actual + 1 LIMIT 1;
    IF v_next_grad_id IS NULL THEN RAISE EXCEPTION 'Nu există un grad superior pentru acest sportiv.'; END IF;
    SELECT pret INTO v_pret FROM public.grade_preturi_config WHERE club_id = v_club_id AND grad_id = v_next_grad_id;
    IF v_pret IS NULL THEN RAISE EXCEPTION 'Nu există preț configurat pentru gradul următor.'; END IF;
    v_descriere := 'Taxă examen grad ' || v_next_grad_id;
    INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data_platii)
    VALUES (p_sportiv_id, v_club_id, v_pret, v_descriere, CURRENT_DATE) RETURNING id INTO v_plata_id;
    RETURN json_build_object('plata_id', v_plata_id, 'suma', v_pret, 'descriere', v_descriere);
END;
$function$;
-- ACL original al ambelor: postgres, authenticated, service_role (fara PUBLIC/anon la momentul 37-03).
