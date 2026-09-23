-- Fix RPC public.refactor_create_user_account -- quick task 260923-upx
-- Aplicat live pe proiectul wuhidifzsutwgdfkwhmd (23.09.2026) via MCP apply_migration.
--
-- Context: audit flux inregistrare sportivi + creare conturi (2026-09-23).
--
-- 1. UPX-01 [Mediu]: ramura UPDATE (activare cont pt sportiv existent, p_sportiv_id dat)
--    nu scria cnp/gen/telefon/adresa/data_nasterii din p_additional_data, desi
--    hooks/useRoleAssignment.ts le trimite mereu. Adaugate cu garzi anti-suprascriere:
--    - gol/null -> pastreaza valoarea existenta (COALESCE + NULLIF)
--    - data_nasterii placeholder '1900-01-01' (trimis cand data lipseste) -> pastreaza
--    - cnp mascat (contine '*', ex. din view-ul sportivi_instructor) -> pastreaza
--
-- 2. UPX-03 [Foarte mic]: overload vechi cu 8 parametri (fara p_sportiv_id) sters.
--    Singurul apelant al semnaturii vechi, api/genereaza-magic-link.ts (8 argumente
--    numite), se rezolva dupa DROP pe functia cu 9 parametri, p_sportiv_id=DEFAULT NULL,
--    comportament identic (verificat RESOLVE_OK).
--
-- 3. Hardening: functia e SECURITY DEFINER; Supabase acorda implicit EXECUTE catre
--    PUBLIC/anon/authenticated pe functiile din public. Orice user logat putea apela
--    RPC-ul direct si-si putea da rol SUPER_ADMIN_FEDERATIE, ocolind garda per-club din
--    api/_permisiuniCont.ts. Singurii apelanti reali (api/creare-cont.ts,
--    api/genereaza-magic-link.ts) folosesc SUPABASE_SERVICE_ROLE_KEY. EXECUTE restrictionat
--    la service_role.

-- 1. Ramura UPDATE scrie datele personale

CREATE OR REPLACE FUNCTION public.refactor_create_user_account(p_nume text, p_prenume text, p_email text, p_username text, p_club_id uuid, p_roles text[], p_user_id uuid, p_additional_data jsonb DEFAULT '{}'::jsonb, p_sportiv_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_sportiv_id UUID;
    v_role_name  TEXT;
    v_existing_id UUID;
    v_effective_club_id UUID;
BEGIN
    IF p_sportiv_id IS NOT NULL THEN
        v_existing_id := p_sportiv_id;
    ELSE
        SELECT id INTO v_existing_id FROM public.sportivi WHERE email = p_email;
    END IF;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.sportivi
        SET
            nume           = COALESCE(p_nume, nume),
            prenume        = COALESCE(p_prenume, prenume),
            email          = COALESCE(p_email, email),
            username       = COALESCE(p_username, username),
            user_id        = COALESCE(p_user_id, user_id),
            club_id        = COALESCE(p_club_id, club_id),
            grad_actual_id = COALESCE(
                                (p_additional_data->>'grad_actual_id')::UUID,
                                grad_actual_id
                             ),
            cnp            = CASE
                                WHEN NULLIF(btrim(p_additional_data->>'cnp'), '') IS NULL THEN cnp
                                WHEN strpos(p_additional_data->>'cnp', '*') > 0 THEN cnp
                                ELSE btrim(p_additional_data->>'cnp')
                              END,
            gen            = COALESCE(NULLIF(btrim(p_additional_data->>'gen'), ''), gen),
            telefon        = COALESCE(NULLIF(btrim(p_additional_data->>'telefon'), ''), telefon),
            adresa         = COALESCE(NULLIF(btrim(p_additional_data->>'adresa'), ''), adresa),
            data_nasterii  = CASE
                                WHEN NULLIF(btrim(p_additional_data->>'data_nasterii'), '') IS NULL THEN data_nasterii
                                WHEN btrim(p_additional_data->>'data_nasterii') = '1900-01-01' THEN data_nasterii
                                ELSE (p_additional_data->>'data_nasterii')::DATE
                              END
        WHERE id = v_existing_id;

        v_sportiv_id := v_existing_id;
    ELSE
        INSERT INTO public.sportivi (
            nume, prenume, email, username, club_id, user_id,
            data_nasterii, status, data_inscrierii,
            cnp, gen, telefon, adresa,
            grad_actual_id, grupa_id
        ) VALUES (
            p_nume, p_prenume, p_email, p_username, p_club_id, p_user_id,
            COALESCE((p_additional_data->>'data_nasterii')::DATE, '1900-01-01'::DATE),
            'Activ',
            COALESCE((p_additional_data->>'data_inscrierii')::DATE, CURRENT_DATE),
            p_additional_data->>'cnp',
            p_additional_data->>'gen',
            p_additional_data->>'telefon',
            p_additional_data->>'adresa',
            (p_additional_data->>'grad_actual_id')::UUID,
            (p_additional_data->>'grupa_id')::UUID
        )
        RETURNING id INTO v_sportiv_id;

        IF (p_additional_data->>'grad_actual_id') IS NOT NULL THEN
            INSERT INTO public.istoric_grade (
                sportiv_id, grad_id, data_obtinere, observatii
            ) VALUES (
                v_sportiv_id,
                (p_additional_data->>'grad_actual_id')::UUID,
                COALESCE((p_additional_data->>'data_inscrierii')::DATE, CURRENT_DATE),
                'Inregistrare initiala'
            )
            ON CONFLICT (sportiv_id, grad_id) DO NOTHING;
        END IF;
    END IF;

    -- Folosim club_id-ul real al sportivului (nu parametrul, care poate fi NULL)
    SELECT club_id INTO v_effective_club_id FROM public.sportivi WHERE id = v_sportiv_id;

    DELETE FROM public.utilizator_roluri_multicont WHERE sportiv_id = v_sportiv_id;

    FOREACH v_role_name IN ARRAY p_roles
    LOOP
        INSERT INTO public.utilizator_roluri_multicont (
            user_id, sportiv_id, club_id, rol_denumire, is_primary
        ) VALUES (
            p_user_id, v_sportiv_id, v_effective_club_id, v_role_name,
            (v_role_name = 'SPORTIV')
        );
    END LOOP;

    RETURN v_sportiv_id;
END;
$function$
;

-- 2. DROP overload vechi (8 parametri) + EXECUTE doar service_role

DROP FUNCTION public.refactor_create_user_account(text, text, text, text, uuid, text[], uuid, jsonb);

REVOKE EXECUTE ON FUNCTION public.refactor_create_user_account(text, text, text, text, uuid, text[], uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refactor_create_user_account(text, text, text, text, uuid, text[], uuid, jsonb, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ROLLBACK (NU se ruleaza automat) -- pentru revenire completa la starea dinainte de acest fix
--
-- -- 1. Recreeaza overload-ul vechi cu 8 parametri
-- CREATE OR REPLACE FUNCTION public.refactor_create_user_account(p_nume text, p_prenume text, p_email text, p_username text, p_club_id uuid, p_roles text[], p_user_id uuid, p_additional_data jsonb DEFAULT '{}'::jsonb)
--  RETURNS uuid
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions'
-- AS $function$
-- DECLARE
--     v_sportiv_id UUID;
--     v_role_name  TEXT;
--     v_existing_id UUID;
--     v_effective_club_id UUID;
-- BEGIN
--     SELECT id INTO v_existing_id FROM public.sportivi WHERE email = p_email;
--
--     IF v_existing_id IS NOT NULL THEN
--         UPDATE public.sportivi
--         SET
--             nume           = COALESCE(p_nume, nume),
--             prenume        = COALESCE(p_prenume, prenume),
--             username       = COALESCE(p_username, username),
--             user_id        = COALESCE(p_user_id, user_id),
--             club_id        = COALESCE(p_club_id, club_id),
--             grad_actual_id = COALESCE(
--                                 (p_additional_data->>'grad_actual_id')::UUID,
--                                 grad_actual_id
--                              )
--         WHERE id = v_existing_id;
--
--         v_sportiv_id := v_existing_id;
--     ELSE
--         INSERT INTO public.sportivi (
--             nume, prenume, email, username, club_id, user_id,
--             data_nasterii, status, data_inscrierii,
--             cnp, gen, telefon, adresa,
--             grad_actual_id, grupa_id
--         ) VALUES (
--             p_nume, p_prenume, p_email, p_username, p_club_id, p_user_id,
--             COALESCE((p_additional_data->>'data_nasterii')::DATE, '1900-01-01'::DATE),
--             'Activ',
--             COALESCE((p_additional_data->>'data_inscrierii')::DATE, CURRENT_DATE),
--             p_additional_data->>'cnp',
--             p_additional_data->>'gen',
--             p_additional_data->>'telefon',
--             p_additional_data->>'adresa',
--             (p_additional_data->>'grad_actual_id')::UUID,
--             (p_additional_data->>'grupa_id')::UUID
--         )
--         RETURNING id INTO v_sportiv_id;
--
--         IF (p_additional_data->>'grad_actual_id') IS NOT NULL THEN
--             INSERT INTO public.istoric_grade (
--                 sportiv_id, grad_id, data_obtinere, observatii
--             ) VALUES (
--                 v_sportiv_id,
--                 (p_additional_data->>'grad_actual_id')::UUID,
--                 COALESCE((p_additional_data->>'data_inscrierii')::DATE, CURRENT_DATE),
--                 'Inregistrare initiala'
--             )
--             ON CONFLICT (sportiv_id, grad_id) DO NOTHING;
--         END IF;
--     END IF;
--
--     SELECT club_id INTO v_effective_club_id FROM public.sportivi WHERE id = v_sportiv_id;
--
--     DELETE FROM public.utilizator_roluri_multicont WHERE sportiv_id = v_sportiv_id;
--
--     FOREACH v_role_name IN ARRAY p_roles
--     LOOP
--         INSERT INTO public.utilizator_roluri_multicont (
--             user_id, sportiv_id, club_id, rol_denumire, is_primary
--         ) VALUES (
--             p_user_id, v_sportiv_id, v_effective_club_id, v_role_name,
--             (v_role_name = 'SPORTIV')
--         );
--     END LOOP;
--
--     RETURN v_sportiv_id;
-- END;
-- $function$;
--
-- -- 2. Restaureaza grant-urile originale de pe overload-ul cu 9 parametri
-- -- (proacl inainte de fix: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres})
-- GRANT EXECUTE ON FUNCTION public.refactor_create_user_account(text, text, text, text, uuid, text[], uuid, jsonb, uuid) TO PUBLIC, anon, authenticated;
--
-- -- 3. Revert ramura UPDATE la varianta fara cnp/gen/telefon/adresa/data_nasterii
-- -- (vezi definitia originala pastrata in scratchpad-ul sesiunii 260923-upx)
