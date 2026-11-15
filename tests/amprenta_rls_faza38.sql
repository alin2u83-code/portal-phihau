-- =====================================================================
-- Faza 38 / 38-08 — AMPRENTA RLS: dovada "nu se largeste accesul" (D-04)
--
-- CE DEMONSTREAZA
--   Pentru un user + context (header active-role-context-id), calculeaza pe fiecare
--   relatie din matrice: count(*) + md5 al cheilor vizibile, INAINTE si DUPA un DDL
--   optional. Daca toate liniile sunt EGAL, DDL-ul nu a schimbat ce vede userul.
--
-- CUM SE RULEAZA (orchestratorul, Supabase MCP execute_sql, in afara orelor de varf)
--   1. Copiaza fisierul, inlocuieste placeholderele:
--        __USER_ID__   uuid user (vezi tabelul de mai jos)
--        __CTX_ID__    uuid context (utilizator_roluri_multicont.id)
--        __ETICHETA__  text scurt, ex. 'SUPER_ADMIN' (apare in prefixul liniilor)
--        corpul DDL intre $ddl$ ... $ddl$ (gol = doar snapshot, fara DDL)
--      Corpul DDL NU poate contine tagurile $do$ sau $ddl$ (foloseste alt tag, ex. $x$).
--   2. UN user per apel (timp scurt de lock).
--   3. Rezultatul vine ca eroare (RAISE EXCEPTION): asta e INTENTIONAT. Exceptia
--      anuleaza TOT (inclusiv DDL-ul). Scriptul nu face niciodata COMMIT.
--
-- SETARI LOCALE (SET LOCAL, doar pentru aceasta tranzactie de masurare, mereu
--   anulate de RAISE EXCEPTION). NU e ALTER ROLE si NU e ridicare in productie (D-04).
--
-- GDPR: iese doar numaratori si hash-uri md5. Zero nume/date personale.
--
-- MATRICE (din 38-01-LIVE.md; doar id-uri)
--   eticheta                       user_id                               ctx_id
--   1 SUPER_ADMIN_FEDERATIE        7024ca87-0ef7-416a-8526-66f84d78149a  ff8369f0-fa14-4c09-bba9-4e195f242c52
--   2 ADMIN_CLUB (482 sportivi)    e63de316-c318-4eeb-8a7d-df58d6de1ab0  5734c90b-5fc5-4d03-89d9-dc53b761a094
--   3 ADMIN_CLUB (139 sportivi)    6f0ca486-c4a8-4258-a02d-59ed9b88d1db  65e22399-fefa-4aca-822e-9bfb73341e2a
--   4 ADMIN_CLUB multi-rol (482)   f69fe240-32cb-45f1-a2a9-47ce27426712  9b33afd3-e7b1-4ace-9f03-fe76d8b291d7
--   5 INSTRUCTOR (+1 rol)          e10edec4-eeca-4eda-ac89-6f0fc712401f  4c39a21b-51d2-4cb5-94db-3e0664494569
--   6 SPORTIV (acelasi user ca #1) 7024ca87-0ef7-416a-8526-66f84d78149a  47703993-1335-4c8e-97bc-db2e0fa54e6e
--   7 REPREZENTANT_COMPETITIE ext. 99198246-fabc-4679-9546-ae301239e0a0  79aab2ca-1fe4-43bf-b904-53a2e35c2799
--   LIPSA (punct deschis 38-01): SPORTIV cu familie_id, membru comisie examen, ADMIN_CLUB club mic.
-- =====================================================================

DO $do$
DECLARE
  v_user  text := '__USER_ID__';
  v_ctx   text := '__CTX_ID__';
  v_et    text := '__ETICHETA__';
  v_ddl   text := $ddl$
$ddl$;

  -- relatie | expresia cheii (text) hash-uita
  v_rel text[] := ARRAY[
    'sportivi', 'rbv_sportivi_complet', 'plati', 'rbv_plati_club', 'vize_sportivi',
    'grupe', 'program_antrenamente', 'vedere_cluburi_program_antrenamente',
    'prezenta_antrenament', 'istoric_grade', 'inscrieri_competitie',
    'echipa_sportivi', 'view_istoric_plati_detaliat', 'tranzactii'];
  v_key text[] := ARRAY[
    'id', 'id', 'id', 'id', 'id',
    'id', 'id', $k$concat_ws(':', id, sportivi_count)$k$,
    $k$concat_ws(':', antrenament_id, sportiv_id)$k$, 'id', 'id',
    'id', $k$concat_ws(':', plata_id, total_incasat, rest_de_plata, coalesce(tranzactie_id::text,''), coalesce(data_plata_string,''), coalesce(metoda_plata,''))$k$, 'id'];

  v_n   int := array_length(v_rel, 1);
  v_a   text[] := array_fill(NULL::text, ARRAY[v_n]);
  v_b   text[] := array_fill(NULL::text, ARRAY[v_n]);
  v_fp  text;
  v_out text := '';
  p     int;
  i     int;
BEGIN
  SET LOCAL lock_timeout = '3s';
  SET LOCAL statement_timeout = '25s';

  FOR p IN 1..2 LOOP
    -- faza DDL (ruleaza ca rolul de conectare, inainte de amprenta B)
    IF p = 2 AND btrim(v_ddl, E' \n\t\r') <> '' THEN
      EXECUTE v_ddl;
    END IF;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.headers',
      json_build_object('active-role-context-id', v_ctx)::text, true);
    EXECUTE 'set local role authenticated';

    FOR i IN 1..v_n LOOP
      BEGIN
        EXECUTE format(
          'select count(*)::text || '':'' || md5(coalesce(string_agg(k, '','' order by k), '''')) '
          'from (select (%s)::text as k from public.%I) q', v_key[i], v_rel[i])
        INTO v_fp;
      EXCEPTION WHEN OTHERS THEN
        v_fp := 'EROARE ' || SQLSTATE || ':-';
      END;
      IF p = 1 THEN v_a[i] := v_fp; ELSE v_b[i] := v_fp; END IF;
    END LOOP;

    EXECUTE 'reset role';
  END LOOP;

  FOR i IN 1..v_n LOOP
    v_out := v_out || E'\n' || v_et || ' | ' || rpad(v_rel[i], 38)
      || ' | A=' || split_part(v_a[i], ':', 1)
      || ' | B=' || split_part(v_b[i], ':', 1)
      || ' | ' || CASE WHEN v_a[i] = v_b[i] THEN 'EGAL' ELSE 'DIFERIT' END
      || CASE WHEN v_a[i] LIKE 'EROARE%' THEN ' (' || v_a[i] || ')' ELSE '' END;
  END LOOP;

  -- Rollback garantat: nimic din acest bloc (inclusiv DDL) nu se pastreaza.
  RAISE EXCEPTION 'AMPRENTA_FAZA38 (rollback intentionat)%', v_out;
END
$do$;
