-- Copie a migrarii aplicate direct pe DB live (2026-09-12): proceseaza_plata_factura
-- fara coloana inexistenta tranzactii.descriere. Pastrata in repo pentru trasabilitate.
CREATE OR REPLACE FUNCTION public.proceseaza_plata_factura(p_plata_id uuid, p_suma_incasata numeric, p_metoda_plata text, p_data_plata date DEFAULT CURRENT_DATE, p_descriere_aditionala text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_plata RECORD;
    v_total_incasat NUMERIC;
    v_status_nou TEXT;
    v_tranzactie_id UUID;
BEGIN
    SELECT * INTO v_plata FROM public.plati WHERE id = p_plata_id;

    SELECT COALESCE(SUM(suma), 0) + p_suma_incasata INTO v_total_incasat
    FROM public.tranzactii WHERE p_plata_id = ANY(plata_ids);

    v_status_nou := CASE
        WHEN v_total_incasat >= v_plata.suma THEN 'Achitat'
        WHEN v_total_incasat > 0 THEN 'Achitat Parțial'
        ELSE 'Neachitat'
    END;

    INSERT INTO public.tranzactii (plata_ids, sportiv_id, familie_id, suma, data_platii, metoda_plata)
    VALUES (ARRAY[p_plata_id], v_plata.sportiv_id, v_plata.familie_id, p_suma_incasata, p_data_plata, p_metoda_plata)
    RETURNING id INTO v_tranzactie_id;

    UPDATE public.plati SET status = v_status_nou WHERE id = p_plata_id;

    RETURN jsonb_build_object('success', true, 'status_nou', v_status_nou, 'tranzactie_id', v_tranzactie_id);
END;
$function$;
