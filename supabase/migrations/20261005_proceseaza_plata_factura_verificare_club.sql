-- Hardening proceseaza_plata_factura (SECURITY DEFINER): verificare acces la clubul facturii
-- (aceeasi regula ca rbv_plati_update), club_id pe tranzactie, factura inexistenta, suma valida,
-- lock pe factura contra incasarilor concurente.
CREATE OR REPLACE FUNCTION public.proceseaza_plata_factura(p_plata_id uuid, p_suma_incasata numeric, p_metoda_plata text, p_data_plata date DEFAULT CURRENT_DATE, p_descriere_aditionala text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_plata RECORD;
    v_club_id UUID;
    v_total_incasat NUMERIC;
    v_status_nou TEXT;
    v_tranzactie_id UUID;
BEGIN
    IF p_suma_incasata IS NULL OR p_suma_incasata <= 0 THEN
        RAISE EXCEPTION 'Suma incasata trebuie sa fie pozitiva' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_plata FROM public.plati WHERE id = p_plata_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Factura inexistenta' USING ERRCODE = 'P0002';
    END IF;

    v_club_id := COALESCE(v_plata.club_id, (SELECT s.club_id FROM public.sportivi s WHERE s.id = v_plata.sportiv_id));

    IF NOT public.has_access_to_club(v_club_id) THEN
        RAISE EXCEPTION 'Acces refuzat la factura' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(SUM(suma), 0) + p_suma_incasata INTO v_total_incasat
    FROM public.tranzactii WHERE p_plata_id = ANY(plata_ids);

    v_status_nou := CASE
        WHEN v_total_incasat >= v_plata.suma THEN 'Achitat'
        WHEN v_total_incasat > 0 THEN 'Achitat Parțial'
        ELSE 'Neachitat'
    END;

    INSERT INTO public.tranzactii (plata_ids, sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id)
    VALUES (ARRAY[p_plata_id], v_plata.sportiv_id, v_plata.familie_id, p_suma_incasata, p_data_plata, p_metoda_plata, v_club_id)
    RETURNING id INTO v_tranzactie_id;

    UPDATE public.plati SET status = v_status_nou WHERE id = p_plata_id;

    RETURN jsonb_build_object('success', true, 'status_nou', v_status_nou, 'tranzactie_id', v_tranzactie_id);
END;
$function$;
