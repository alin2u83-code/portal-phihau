-- Faza 37 (37-03) Val 1: reducerea suprafetei RPC SECURITY DEFINER.
-- Sursa deciziilor: .planning/phases/37-hardening-securitate-db-reducere-suprafata-rpc-security-defi/37-TRIAJ.md (3.1-3.5).
--
--  * anon pastreaza EXECUTE doar pe lista D (4): get_competitie_publica, inregistreaza_email_auth,
--    lista_cluburi_publice, trimite_cerere_acces. Restul: REVOKE FROM PUBLIC, anon (anon mosteneste din PUBLIC!).
--  * C (25 functii trigger/event trigger): REVOKE FROM PUBLIC, anon, authenticated.
--  * SERVICE_ONLY (10): REVOKE FROM PUBLIC, anon, authenticated; service_role pastrat.
--  * cauta_utilizatori_comisie: rescrisa plpgsql cu garda authenticated + staff (42501).
--  * ALTER DEFAULT PRIVILEGES: functiile noi nu mai sunt apelabile implicit de PUBLIC/anon.
--  * scoala_ioncreanga_*: NU se ating (decizie 5.11.2026): excluse din toate buclele, ACL verificat identic la final.
--  * authenticated pastreaza EXACT ce avea (GRANT explicit, doar unde avea deja EXECUTE), minus C si SERVICE_ONLY.
--
-- ROLLBACK: .planning/phases/37-hardening-securitate-db-reducere-suprafata-rpc-security-defi/rollback/37-03-acl-before.sql
-- (ACL-urile originale per functie, generate din pg_proc.proacl inainte de aplicare) + corpul vechi al
-- cauta_utilizatori_comisie (LANGUAGE sql) din acelasi fisier. Pentru defaults:
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

-- 1. Starea de dinainte (folosita de post-conditii).
CREATE TEMP TABLE _acl_inainte ON COMMIT DROP AS
SELECT p.oid AS oid, p.oid::regprocedure::text AS sig, p.proname::text AS nume,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  AS svc,
       p.proacl::text AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind IN ('f', 'p')
  AND p.proname NOT LIKE 'scoala\_ioncreanga\_%'
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e');

-- 2-3. GRANT explicit apoi REVOKE (ordinea conteaza), pe liste transcrise din triaj.
DO $$
DECLARE
  v_d text[] := ARRAY[
    'public.get_competitie_publica(uuid)',
    'public.inregistreaza_email_auth(text,boolean)',
    'public.lista_cluburi_publice()',
    'public.trimite_cerere_acces(uuid,text,text,uuid,text)'];
  v_c text[] := ARRAY[
    'public.ajusteaza_debutant_la_import_examen()','public.audit_trigger_fn()','public.auto_set_primary_role()',
    'public.fn_automatizeaza_legatura_utilizator()','public.handle_new_user_phihau()','public.handle_sportiv_automation()',
    'public.handle_sportiv_insert_automation()','public.on_tranzactie_change()','public.on_tranzactie_plata_change()',
    'public.rls_auto_enable()','public.set_cerere_gdpr_procesare()','public.set_default_grade_for_new_sportiv()',
    'public.sync_email_to_sportivi()','public.sync_grad_actual_canonical()','public.sync_grad_actual_from_istoric_grade()',
    'public.sync_grad_actual_on_manual_grade()','public.sync_istoric_grade_on_exam_result()','public.sync_user_metadata_from_profile()',
    'public.sync_user_metadata()','public.sync_user_roles_to_multicont()','public.tr_completeaza_rol_id()',
    'public.trg_activeaza_taxa_anuala()','public.trg_plata_confirmare_sms()','public.trg_taxa_config_factureaza_asteptare()',
    'public.valideaza_antrenament_data_in_sezon_grupa()'];
  v_so text[] := ARRAY[
    'public.check_user_access(uuid)','public.encrypt_cnp(text)','public.find_similar_sportivi()',
    'public.genereaza_antrenamente_din_orar(integer)','public.get_primary_user_context(uuid)',
    'public.get_statistici_financiare(date,integer,integer)','public.get_user_context(uuid)','public.get_user_contexts(uuid)',
    'public.inregistreaza_sportiv_v2(text,text,date,text,text,uuid,uuid)','public.schedule_training_reminders()'];
  v_sig text; v_oid oid; r record;
BEGIN
  -- liste fara goluri / semnaturi inexistente (post-conditiile nu trec "pe gol")
  FOREACH v_sig IN ARRAY v_d || v_c || v_so LOOP
    IF to_regprocedure(v_sig) IS NULL THEN RAISE EXCEPTION 'semnatura inexistenta in lista: %', v_sig; END IF;
    IF NOT EXISTS (SELECT 1 FROM _acl_inainte WHERE oid = to_regprocedure(v_sig)::oid) THEN
      RAISE EXCEPTION 'functia nu e definer in scope: %', v_sig; END IF;
  END LOOP;

  -- 2. GRANT explicit INAINTE de orice REVOKE
  FOR r IN SELECT oid, sig FROM _acl_inainte LOOP
    v_sig := 'public.' || r.sig;
    IF v_sig = ANY (v_d) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', v_sig);
    ELSIF v_sig = ANY (v_c) OR v_sig = ANY (v_so) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
      IF (SELECT auth FROM _acl_inainte WHERE oid = r.oid) THEN   -- doar unde authenticated avea deja
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
      END IF;
    END IF;
  END LOOP;

  -- 3. REVOKE
  FOR r IN SELECT oid, sig FROM _acl_inainte LOOP
    v_sig := 'public.' || r.sig;
    IF v_sig = ANY (v_d) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_sig);
    ELSIF v_sig = ANY (v_c) OR v_sig = ANY (v_so) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', v_sig);
    END IF;
  END LOOP;
END $$;

-- 4. cauta_utilizatori_comisie: plpgsql cu garda (corpul interogarii neschimbat). Semnatura/tip identice.
CREATE OR REPLACE FUNCTION public.cauta_utilizatori_comisie(p_query text)
 RETURNS TABLE(sportiv_id uuid, user_id uuid, nume text, prenume text, club_nume text, rol_denumire text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
    IF auth.uid() IS NULL OR NOT (public.este_staff() OR public.is_super_admin()) THEN
        RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT DISTINCT ON (s.id, urmc.rol_denumire)
        s.id::uuid AS sportiv_id,
        s.user_id::uuid,
        s.nume::text,
        s.prenume::text,
        c.nume::text AS club_nume,
        urmc.rol_denumire::text
    FROM public.utilizator_roluri_multicont urmc
    JOIN public.sportivi s ON s.id = urmc.sportiv_id
    LEFT JOIN public.cluburi c ON c.id = s.club_id
    WHERE urmc.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
      AND s.user_id IS NOT NULL
      AND (
          p_query IS NULL OR p_query = ''
          OR (s.nume || ' ' || s.prenume) ILIKE '%' || p_query || '%'
      )
    ORDER BY s.id, urmc.rol_denumire
    LIMIT 20;
END;
$function$;
REVOKE ALL ON FUNCTION public.cauta_utilizatori_comisie(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cauta_utilizatori_comisie(text) TO authenticated, service_role;

-- 5. Default privileges (functii noi). postgres obligatoriu; supabase_admin best-effort (cere apartenenta la rol).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
DO $$
BEGIN
  BEGIN
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'supabase_admin default privileges NEACOPERITE (insufficient_privilege): de rulat din dashboard SQL editor';
  END;
END $$;

-- 6. Post-conditii: orice incalcare anuleaza tranzactia.
DO $$
DECLARE
  v_d text[] := ARRAY['get_competitie_publica','inregistreaza_email_auth','lista_cluburi_publice','trimite_cerere_acces'];
  v_n int;
BEGIN
  -- (a) anon/PUBLIC doar pe D
  SELECT count(*) INTO v_n FROM _acl_inainte i
   WHERE i.nume <> ALL (v_d)
     AND has_function_privilege('anon', i.oid, 'EXECUTE');
  IF v_n > 0 THEN RAISE EXCEPTION 'post(a): % functii definer inca apelabile de anon', v_n; END IF;
  SELECT count(*) INTO v_n FROM _acl_inainte i
   WHERE i.nume <> ALL (v_d) AND EXISTS (SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a WHERE p.oid = i.oid AND a.grantee = 0);
  IF v_n > 0 THEN RAISE EXCEPTION 'post(a): % functii definer inca cu EXECUTE la PUBLIC', v_n; END IF;
  -- (b) D apelabile de anon
  SELECT count(*) INTO v_n FROM _acl_inainte i WHERE i.nume = ANY (v_d) AND has_function_privilege('anon', i.oid, 'EXECUTE');
  IF v_n <> 4 THEN RAISE EXCEPTION 'post(b): D apelabile de anon = % (asteptat 4)', v_n; END IF;
  -- (c) authenticated pastreaza tot ce avea, minus C/SERVICE_ONLY (25 + 10 = 35 pierdute, toate cu auth=true inainte)
  SELECT count(*) INTO v_n FROM _acl_inainte i
   WHERE i.auth AND NOT has_function_privilege('authenticated', i.oid, 'EXECUTE');
  IF v_n <> 35 - (SELECT count(*) FROM _acl_inainte i WHERE NOT i.auth AND i.nume IN (
      'trg_activeaza_taxa_anuala','trg_taxa_config_factureaza_asteptare','valideaza_antrenament_data_in_sezon_grupa')) THEN
    RAISE EXCEPTION 'post(c): authenticated a pierdut % functii (asteptat 35 minus C deja revocate)', v_n; END IF;
  SELECT count(*) INTO v_n FROM _acl_inainte i
   WHERE NOT i.auth AND has_function_privilege('authenticated', i.oid, 'EXECUTE');
  IF v_n > 0 THEN RAISE EXCEPTION 'post(c): authenticated a CAPATAT EXECUTE pe % functii', v_n; END IF;
  -- (d) scoala_ioncreanga_*: neatinse = nicio functie definer din prefix nu apare in _acl_inainte (excluse); verificare ACL identic imposibila fara snapshot -> verificata in test (acl_definer_faza37.ts, anon pe prefix)
  -- (e) service_role pe tot
  SELECT count(*) INTO v_n FROM _acl_inainte i WHERE NOT has_function_privilege('service_role', i.oid, 'EXECUTE');
  IF v_n > 0 THEN RAISE EXCEPTION 'post(e): service_role fara EXECUTE pe % functii', v_n; END IF;
  -- (f) cele 10 + 25 nu mai sunt apelabile de authenticated
  SELECT count(*) INTO v_n FROM _acl_inainte i WHERE has_function_privilege('authenticated', i.oid, 'EXECUTE')
    AND i.nume IN ('check_user_access','encrypt_cnp','find_similar_sportivi','genereaza_antrenamente_din_orar','get_primary_user_context',
      'get_statistici_financiare','get_user_context','get_user_contexts','inregistreaza_sportiv_v2','schedule_training_reminders',
      'ajusteaza_debutant_la_import_examen','audit_trigger_fn','auto_set_primary_role','fn_automatizeaza_legatura_utilizator',
      'handle_new_user_phihau','handle_sportiv_automation','handle_sportiv_insert_automation','on_tranzactie_change',
      'on_tranzactie_plata_change','rls_auto_enable','set_cerere_gdpr_procesare','set_default_grade_for_new_sportiv',
      'sync_email_to_sportivi','sync_grad_actual_canonical','sync_grad_actual_from_istoric_grade','sync_grad_actual_on_manual_grade',
      'sync_istoric_grade_on_exam_result','sync_user_metadata_from_profile','sync_user_metadata','sync_user_roles_to_multicont',
      'tr_completeaza_rol_id','trg_plata_confirmare_sms');
  IF v_n > 0 THEN RAISE EXCEPTION 'post(f): % functii C/SERVICE_ONLY inca apelabile de authenticated', v_n; END IF;
  -- (g) multimea nu e goala
  SELECT count(*) INTO v_n FROM _acl_inainte;
  IF v_n < 100 THEN RAISE EXCEPTION 'post(g): scope suspect de mic (%)', v_n; END IF;
END $$;

NOTIFY pgrst, 'reload schema';
