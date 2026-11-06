-- Faza 37 (37-04) Val 2/1: garzi pe functiile de BANI (categoria B, triaj 3.6/3.7).
--  * proceseaza_incasare_normalizata: club tranzactie (JSON / sportiv) + clubul fiecarei plati alocate.
--  * recalculare_stare_plata: clubul platii (plati.club_id, fallback sportivi.club_id).
--  * generare_factura_examen(uuid,uuid): sportivi.club_id.
--  * generare_factura_examen(uuid): STEARSA (INSERT in plati.data_platii, coloana inexistenta; zero apelanti).
-- Garda: auth.uid() IS NOT NULL AND (este_doar_extern() OR NOT (is_super_admin() OR has_access_to_club(club))) => 42501.
-- auth.uid() IS NULL (service_role, pg_cron, SQL administrativ) trece. Triggerul tranzactie_plata_change_trigger
-- (definer) apeleaza recalculare_stare_plata cu auth.uid() al utilizatorului final: ADMIN/INSTRUCTOR al clubului trec.
-- Plati fara club derivabil (96 cu club_id NULL, 6 fara sportiv): doar federatia (is_super_admin) le poate incasa/recalcula.
-- Super admin federatie: fara restrictie de club (poate aloca cross-club).
-- NU se modifica logica de calcul / date existente. Rollback: rollback/37-04-before.sql
-- (corpurile vechi + generare_factura_examen(uuid)); dupa rollback re-aplica REVOKE ALL FROM PUBLIC, anon + GRANT authenticated, service_role.

-- 1. proceseaza_incasare_normalizata
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
            FOREACH v_plata IN ARRAY p_plati LOOP
                SELECT COALESCE(pl.club_id, sp.club_id) INTO v_club_plata
                  FROM public.plati pl LEFT JOIN public.sportivi sp ON sp.id = pl.sportiv_id
                 WHERE pl.id = NULLIF(v_plata->>'plata_id', '')::UUID;
                -- plata inexistenta: comportament vechi (eroare FK mai jos); plata fara club: doar federatia
                IF FOUND AND v_club_plata IS DISTINCT FROM v_club THEN
                    RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
                END IF;
            END LOOP;
        END IF;
    END IF;

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

-- 2. recalculare_stare_plata (singura schimbare in corp: SELECT-ul initial aduce si clubul; garda dupa verificarea "found")
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
    v_club          uuid;
begin
    select p.suma, p.status, coalesce(p.club_id, (select s.club_id from public.sportivi s where s.id = p.sportiv_id))
      into v_suma_totala, v_status_curent, v_club
    from public.plati p where p.id = p_plata_id;

    if not found or v_status_curent = 'Anulat' then
        return;
    end if;

    -- GARDA (37-04)
    if auth.uid() is not null
       and (public.este_doar_extern()
            or not (public.is_super_admin() or (v_club is not null and public.has_access_to_club(v_club)))) then
        raise exception 'acces_interzis' using errcode = '42501';
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

-- 3. generare_factura_examen(uuid,uuid): garda dupa verificarea clubului; search_path + pg_catalog
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

    IF v_club_id IS NULL OR v_grad_actual_id IS NULL THEN
        RAISE EXCEPTION 'Sportivul nu are club sau grad actual setat.';
    END IF;

    -- GARDA (37-04)
    IF auth.uid() IS NOT NULL
       AND (public.este_doar_extern() OR NOT (public.is_super_admin() OR public.has_access_to_club(v_club_id))) THEN
        RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
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

-- 4. Varianta cu 1 argument: sterge (semnatura exacta, fara CASCADE; esueaza daca exista dependente)
DROP FUNCTION public.generare_factura_examen(uuid);

-- 5. ACL (idempotent; protejeaza starea din 37-03)
REVOKE ALL ON FUNCTION public.proceseaza_incasare_normalizata(jsonb, jsonb[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recalculare_stare_plata(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generare_factura_examen(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proceseaza_incasare_normalizata(jsonb, jsonb[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculare_stare_plata(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generare_factura_examen(uuid, uuid) TO authenticated, service_role;

-- 6. Post-conditii
DO $$
BEGIN
  IF to_regprocedure('public.generare_factura_examen(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'post: varianta cu 1 argument inca exista'; END IF;
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace
        AND proname IN ('proceseaza_incasare_normalizata','recalculare_stare_plata','generare_factura_examen')
        AND prosrc LIKE '%acces_interzis%') <> 3 THEN
    RAISE EXCEPTION 'post: garda lipseste dintr-una din cele 3 functii'; END IF;
  IF has_function_privilege('anon', 'public.proceseaza_incasare_normalizata(jsonb,jsonb[])', 'EXECUTE')
     OR has_function_privilege('anon', 'public.recalculare_stare_plata(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.generare_factura_examen(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'post: anon are EXECUTE'; END IF;
  IF NOT (has_function_privilege('authenticated', 'public.proceseaza_incasare_normalizata(jsonb,jsonb[])', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.recalculare_stare_plata(uuid)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.generare_factura_examen(uuid,uuid)', 'EXECUTE')) THEN
    RAISE EXCEPTION 'post: authenticated a pierdut EXECUTE'; END IF;
END $$;

NOTIFY pgrst, 'reload schema';
