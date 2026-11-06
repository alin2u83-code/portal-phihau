-- Rollback 37-03: ACL-urile de dinainte (din pg_proc.proacl, 6.11.2026). NU se aplica automat.
-- 1) functiile care aveau PUBLIC + anon (=X, anon=X):
DO $$ DECLARE s text; BEGIN FOREACH s IN ARRAY ARRAY[
 'cauta_utilizatori_comisie(text)','cere_schimbare_locatie_grupa(uuid,uuid,date)','cerere_gdpr_sportiv_club_id(uuid)',
 'decide_cerere_locatie_grupa(uuid,boolean)','este_sportivul_meu(uuid)','fisa_practicant_club_id(uuid)',
 'fn_automatizeaza_legatura_utilizator()','incasare_club_id(uuid)','is_comisie_member(uuid)','is_comisie_pentru_sportiv(uuid)',
 'is_sportiv_candidat_comisie(uuid)','locatie_grupa_la_data(uuid,date)','obligatie_club_id(uuid)','plata_club_id(uuid)',
 'poate_gestiona_taxe_club(uuid)','schimba_locatie_grupa(uuid,uuid,date)','set_cerere_gdpr_procesare()',
 'sync_grad_actual_canonical()','transfer_sportiv(uuid,uuid)'] LOOP
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO PUBLIC, anon', s); END LOOP; END $$;
-- 2) anon explicit (fara PUBLIC):
GRANT EXECUTE ON FUNCTION public.get_statistici_alerte_securitate() TO anon;
GRANT EXECUTE ON FUNCTION public.get_statistici_emailuri_auth() TO anon;
-- 3) authenticated pierdut de C (22 cu auth inainte) + SERVICE_ONLY (10):
DO $$ DECLARE s text; BEGIN FOREACH s IN ARRAY ARRAY[
 'ajusteaza_debutant_la_import_examen()','audit_trigger_fn()','auto_set_primary_role()','fn_automatizeaza_legatura_utilizator()',
 'handle_new_user_phihau()','handle_sportiv_automation()','handle_sportiv_insert_automation()','on_tranzactie_change()',
 'on_tranzactie_plata_change()','rls_auto_enable()','set_cerere_gdpr_procesare()','set_default_grade_for_new_sportiv()',
 'sync_email_to_sportivi()','sync_grad_actual_canonical()','sync_grad_actual_from_istoric_grade()','sync_grad_actual_on_manual_grade()',
 'sync_istoric_grade_on_exam_result()','sync_user_metadata_from_profile()','sync_user_metadata()','sync_user_roles_to_multicont()',
 'tr_completeaza_rol_id()','trg_plata_confirmare_sms()',
 'check_user_access(uuid)','encrypt_cnp(text)','find_similar_sportivi()','genereaza_antrenamente_din_orar(integer)',
 'get_primary_user_context(uuid)','get_statistici_financiare(date,integer,integer)','get_user_context(uuid)','get_user_contexts(uuid)',
 'inregistreaza_sportiv_v2(text,text,date,text,text,uuid,uuid)','schedule_training_reminders()'] LOOP
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', s); END LOOP; END $$;
-- 4) D: PUBLIC nu avea (ACL: postgres, anon, authenticated, service_role) -> nimic de refacut.
-- 5) Defaults:
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
-- 6) Corpul vechi cauta_utilizatori_comisie (LANGUAGE sql, STABLE SECURITY DEFINER, search_path public):
CREATE OR REPLACE FUNCTION public.cauta_utilizatori_comisie(p_query text)
 RETURNS TABLE(sportiv_id uuid, user_id uuid, nume text, prenume text, club_nume text, rol_denumire text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT DISTINCT ON (s.id, urmc.rol_denumire)
        s.id AS sportiv_id, s.user_id, s.nume, s.prenume, c.nume AS club_nume, urmc.rol_denumire
    FROM public.utilizator_roluri_multicont urmc
    JOIN public.sportivi s ON s.id = urmc.sportiv_id
    LEFT JOIN public.cluburi c ON c.id = s.club_id
    WHERE urmc.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
      AND s.user_id IS NOT NULL
      AND (p_query IS NULL OR p_query = '' OR (s.nume || ' ' || s.prenume) ILIKE '%' || p_query || '%')
    ORDER BY s.id, urmc.rol_denumire
    LIMIT 20;
$function$;
