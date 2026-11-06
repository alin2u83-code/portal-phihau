-- Faza 37 / 37-04 — fix-uri din review aprobate de utilizator (6.11.2026):
--  * proceseaza_incasare_normalizata: club_id DERIVAT (din sportiv) ajunge in INSERT cand lipseste din payload.
--  * generare_factura_examen(uuid,uuid): garda inaintea oricarei verificari care dezvaluie date (existenta sportiv / grad).
-- Doar CREATE OR REPLACE (ACL pastrat). Corpurile de dupa garda sunt cele LIVE de dinainte.

CREATE OR REPLACE FUNCTION public.proceseaza_incasare_normalizata(p_tranzactie jsonb, p_plati jsonb[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_tranzactie_id UUID;
    v_plata JSONB;
    v_club UUID;
    v_club_sp UUID;
    v_club_plata UUID;
    v_fam UUID;
    v_super BOOLEAN;
BEGIN
    -- GARDA (37-04)
    IF auth.uid() IS NOT NULL THEN
        v_super := public.is_super_admin();
        IF public.este_doar_extern() THEN
            RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
        END IF;
        IF NOT v_super THEN
            v_club := NULLIF(p_tranzactie->>'club_id', '')::UUID;
            SELECT s.club_id INTO v_club_sp FROM public.sportivi s
             WHERE s.id = NULLIF(p_tranzactie->>'sportiv_id', '')::UUID;
            IF v_club IS NULL THEN v_club := v_club_sp; END IF;
            IF v_club IS NULL
               OR (v_club_sp IS NOT NULL AND v_club_sp IS DISTINCT FROM v_club)
               OR NOT public.has_access_to_club(v_club) THEN
                RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
            END IF;
            -- familie_id din payload: trebuie sa existe un membru al familiei in clubul tranzactiei
            v_fam := NULLIF(p_tranzactie->>'familie_id', '')::UUID;
            IF v_fam IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM public.sportivi sf WHERE sf.familie_id = v_fam AND sf.club_id = v_club) THEN
                RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
            END IF;
            FOREACH v_plata IN ARRAY p_plati LOOP
                SELECT COALESCE(pl.club_id, sp.club_id,
                                (SELECT sf.club_id FROM public.sportivi sf WHERE sf.familie_id = pl.familie_id ORDER BY sf.id LIMIT 1))
                  INTO v_club_plata
                  FROM public.plati pl LEFT JOIN public.sportivi sp ON sp.id = pl.sportiv_id
                 WHERE pl.id = NULLIF(v_plata->>'plata_id', '')::UUID;
                -- plata inexistenta: comportament vechi (eroare FK mai jos); plata fara club: doar federatia
                IF FOUND AND v_club_plata IS DISTINCT FROM v_club THEN
                    RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- 1. Insert tranzactie (club_id din payload, altfel cel derivat si validat de garda)
    INSERT INTO public.tranzactii (
        sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id
    ) VALUES (
        (p_tranzactie->>'sportiv_id')::UUID,
        (p_tranzactie->>'familie_id')::UUID,
        (p_tranzactie->>'suma')::NUMERIC,
        (p_tranzactie->>'data_platii')::DATE,
        (p_tranzactie->>'metoda_plata'),
        COALESCE(NULLIF(p_tranzactie->>'club_id', '')::UUID, v_club)
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

CREATE OR REPLACE FUNCTION public.generare_factura_examen(p_sportiv_id uuid, p_sesiune_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

    -- GARDA (37-04, mutata inaintea verificarii de grad: sportiv inexistent / fara club => 42501 pentru non-federatie)
    IF auth.uid() IS NOT NULL
       AND (public.este_doar_extern()
            OR NOT (public.is_super_admin() OR (v_club_id IS NOT NULL AND public.has_access_to_club(v_club_id)))) THEN
        RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
    END IF;

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

REVOKE ALL ON FUNCTION public.proceseaza_incasare_normalizata(jsonb, jsonb[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proceseaza_incasare_normalizata(jsonb, jsonb[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generare_factura_examen(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generare_factura_examen(uuid, uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
