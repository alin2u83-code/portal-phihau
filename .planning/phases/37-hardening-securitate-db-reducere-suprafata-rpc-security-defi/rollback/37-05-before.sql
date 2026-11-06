-- 37-05 rollback: definitiile LIVE de dinainte (pg_get_functiondef, 6.11.2026).
-- ACL inainte pentru toate: {postgres=X, authenticated=X, service_role=X} (anon deja revocat de 37-03).
-- Aplicare: ruleaza tot fisierul; apoi GRANT-urile de la final.

CREATE OR REPLACE FUNCTION public.adauga_sportiv_complet(p_nume text, p_prenume text, p_data_nasterii date, p_email text, p_parola text, p_club_id uuid DEFAULT NULL::uuid, p_cnp text DEFAULT NULL::text, p_gen text DEFAULT 'Masculin'::text, p_telefon text DEFAULT NULL::text, p_adresa text DEFAULT NULL::text, p_grad_actual_id uuid DEFAULT NULL::uuid, p_grupa_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_new_sportiv_id uuid;
    v_club_id uuid;
BEGIN
    v_club_id := COALESCE(p_club_id, public.get_active_club_id());
    INSERT INTO public.sportivi (
        nume, prenume, data_nasterii, email, club_id, cnp, gen, telefon, adresa,
        grad_actual_id, grupa_id, status, status_viza_medicala, data_inscrierii, username
    ) VALUES (
        p_nume, p_prenume, p_data_nasterii, p_email, v_club_id, p_cnp, p_gen, p_telefon, p_adresa,
        p_grad_actual_id, p_grupa_id, 'Activ', 'Expirat', CURRENT_DATE, lower(p_nume || '.' || p_prenume)
    )
    RETURNING id INTO v_new_sportiv_id;
    RETURN v_new_sportiv_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_sms_to_queue(p_club_id uuid, p_sportiv_id uuid, p_tip text, p_variabile jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.has_access_to_club(p_club_id) THEN
    RAISE EXCEPTION 'Access denied to club %', p_club_id;
  END IF;

  RETURN public.add_sms_to_queue_intern(p_club_id, p_sportiv_id, p_tip, p_variabile);
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_cnp(cnp_encrypted text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
    SELECT extensions.pgp_sym_decrypt(
        decode(cnp_encrypted, 'base64'),
        current_setting('app.cnp_encryption_key')
    );
$function$;

CREATE OR REPLACE FUNCTION public.export_sportivi_selectati(p_sportivi_ids uuid[])
 RETURNS TABLE("Nr.crt" integer, "NUME SPORTIV" text, "PRENUME SPORTIV" text, "CATEGORIE" text, "SEX" text, "CNP" text, "DATA NAȘTERII" date, "ORAȘ/JUDEȚ" text, "LOCUL NAȘTERII" text, "ADRESA" text, "NR. PAȘAPORT" text, "CETĂȚENIA" text, "CLUB" text, "DEPARTAMENT" text, "MAESTRU" text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        (ROW_NUMBER() OVER (ORDER BY s.nume, s.prenume))::int,
        UPPER(s.nume),
        UPPER(s.prenume),
        COALESCE(cat.denumire, 'Nespecificat'),
        s.gen,
        s.cnp,
        s.data_nasterii,
        c.oras,
        s.locul_nasterii,
        s.adresa,
        COALESCE(s.custom_fields->>'nr_pasaport', 'NU ARE'),
        s.cetatenia,
        c.nume,
        s.departament,
        CASE WHEN EXISTS (SELECT 1 FROM titluri_sportive ts WHERE ts.sportiv_id = s.id) THEN 'DA' ELSE 'NU' END
    FROM public.sportivi s
    JOIN public.cluburi c ON s.club_id = c.id
    LEFT JOIN public.nom_categorii_competitie cat
        ON date_part('year', age(s.data_nasterii)) >= cat.varsta_min
        AND date_part('year', age(s.data_nasterii)) <= cat.varsta_max
    WHERE s.id = ANY(p_sportivi_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_all_app_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'sportivi', (
            SELECT jsonb_agg(s) FROM (
                SELECT id, nume, prenume, email
                FROM public.sportivi
                LIMIT 100
            ) s
        ),
        'cluburi', (SELECT jsonb_agg(c) FROM public.cluburi c),
        'grade', (SELECT jsonb_agg(g) FROM public.grade g)
    ) INTO result;

    RETURN COALESCE(result, '{"sportivi":[], "cluburi":[], "grade":[]}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_exam_row_v4(p_nume text, p_prenume text, p_cnp text, p_existing_sportiv_id uuid, p_club_id uuid, p_ordine_grad integer, p_rezultat text, p_contributie numeric, p_data_examen date, p_sesiune_id uuid, p_data_nasterii date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_sportiv_id        uuid;
    v_grad_id           uuid;
    v_current_grad_ordine integer;
BEGIN
    SELECT id INTO v_grad_id FROM public.grade WHERE ordine = p_ordine_grad LIMIT 1;
    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid (ordine=%)', p_ordine_grad;
    END IF;

    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
        IF p_data_nasterii IS NOT NULL THEN
            UPDATE public.sportivi SET data_nasterii = p_data_nasterii
            WHERE id = v_sportiv_id AND data_nasterii IS NULL;
        END IF;
    ELSE
        INSERT INTO public.sportivi (nume, prenume, cnp, club_id, grad_actual_id, status, data_inscrierii, data_nasterii)
        VALUES (p_nume, p_prenume, NULLIF(TRIM(p_cnp), ''), p_club_id,
                CASE WHEN p_rezultat = 'Admis' THEN v_grad_id ELSE NULL END,
                'Activ', CURRENT_DATE, p_data_nasterii)
        RETURNING id INTO v_sportiv_id;
    END IF;

    INSERT INTO public.istoric_examene (sportiv_id, sesiune_id, grad_id, rezultat, data_examen, contributie_achitata)
    VALUES (v_sportiv_id, p_sesiune_id, v_grad_id, p_rezultat, p_data_examen, p_contributie)
    ON CONFLICT (sportiv_id, sesiune_id, grad_id) DO UPDATE
        SET rezultat = EXCLUDED.rezultat, contributie_achitata = EXCLUDED.contributie_achitata;

    IF p_rezultat = 'Admis' THEN
        SELECT COALESCE(g.ordine, -1) INTO v_current_grad_ordine
        FROM public.sportivi s LEFT JOIN public.grade g ON g.id = s.grad_actual_id
        WHERE s.id = v_sportiv_id;

        IF p_ordine_grad > v_current_grad_ordine THEN
            UPDATE public.sportivi SET grad_actual_id = v_grad_id WHERE id = v_sportiv_id;
        END IF;

        INSERT INTO public.istoric_grade (sportiv_id, grad_id, data_obtinere, sesiune_examen_id)
        VALUES (v_sportiv_id, v_grad_id, p_data_examen, p_sesiune_id)
        ON CONFLICT (sportiv_id, grad_id) DO UPDATE
            SET data_obtinere = EXCLUDED.data_obtinere, sesiune_examen_id = EXCLUDED.sesiune_examen_id;
    END IF;

    RETURN v_sportiv_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_sportiv(p_sportiv_id uuid, p_new_club_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_sportiv RECORD;
BEGIN
    SELECT id, club_id, nume, prenume INTO v_sportiv FROM public.sportivi WHERE id = p_sportiv_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sportivul nu a fost găsit (id: %).', p_sportiv_id;
    END IF;
    IF NOT (public.has_access_to_club(v_sportiv.club_id) OR public.has_access_to_club(p_new_club_id) OR public.is_super_admin()) THEN
        RAISE EXCEPTION 'Nu aveți permisiunea de a transfera acest sportiv.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cluburi WHERE id = p_new_club_id) THEN
        RAISE EXCEPTION 'Clubul destinație nu a fost găsit (id: %).', p_new_club_id;
    END IF;
    UPDATE public.sportivi SET club_id = p_new_club_id, grupa_id = NULL WHERE id = p_sportiv_id;
    RETURN json_build_object('success', true, 'sportiv_id', p_sportiv_id, 'old_club_id', v_sportiv.club_id, 'new_club_id', p_new_club_id);
END;
$function$;

-- ACL de restaurat (anon ramane fara EXECUTE)
REVOKE ALL ON FUNCTION public.adauga_sportiv_complet(text,text,date,text,text,uuid,text,text,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adauga_sportiv_complet(text,text,date,text,text,uuid,text,text,text,text,uuid,uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.add_sms_to_queue(uuid,uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_sms_to_queue(uuid,uuid,text,jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.decrypt_cnp(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_cnp(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.export_sportivi_selectati(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_sportivi_selectati(uuid[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_all_app_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_app_data() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.process_exam_row_v4(text,text,text,uuid,uuid,integer,text,numeric,date,uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_exam_row_v4(text,text,text,uuid,uuid,integer,text,numeric,date,uuid,date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.transfer_sportiv(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_sportiv(uuid,uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
