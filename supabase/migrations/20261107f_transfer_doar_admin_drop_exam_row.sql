-- Faza 37 — decizii utilizator 6.11.2026:
--  1. transfer_sportiv: doar ADMIN_CLUB al clubului sursa (sau federatia/ADMIN) poate transfera; INSTRUCTOR nu.
--  2. process_exam_row_v4 stearsa: nefunctionala (public.istoric_examene nu exista), zero apelanti. Definitia veche: rollback/37-05-before.sql.
-- Rollback transfer: rollback/37-05-before.sql nu il acopera (versiunea 37-05 are has_access_to_club); vezi 20261107d_... sectiunea 5.

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

    -- Doar contextul activ de ADMIN_CLUB al clubului sursa, sau federatia/ADMIN. INSTRUCTOR: nu.
    IF auth.uid() IS NOT NULL AND (
         (SELECT public.este_doar_extern())
         OR NOT (
              public.is_super_admin()
              OR EXISTS (
                   SELECT 1 FROM public.utilizator_roluri_multicont r
                   WHERE r.user_id = auth.uid()
                     AND r.id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid
                     AND (r.rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
                          OR (r.rol_denumire = 'ADMIN_CLUB' AND r.club_id = v_sportiv.club_id))
              )
         )
       ) THEN
        RAISE EXCEPTION 'Nu aveți permisiunea de a transfera acest sportiv.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.cluburi WHERE id = p_new_club_id) THEN
        RAISE EXCEPTION 'Clubul destinație nu a fost găsit (id: %).', p_new_club_id;
    END IF;
    UPDATE public.sportivi SET club_id = p_new_club_id, grupa_id = NULL WHERE id = p_sportiv_id;
    RETURN json_build_object('success', true, 'sportiv_id', p_sportiv_id, 'old_club_id', v_sportiv.club_id, 'new_club_id', p_new_club_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.transfer_sportiv(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_sportiv(uuid,uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.process_exam_row_v4(text,text,text,uuid,uuid,integer,text,numeric,date,uuid,date);

NOTIFY pgrst, 'reload schema';
