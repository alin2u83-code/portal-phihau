-- Faza 37 (37-01): instrument de introspectie ACL pentru testul tests/acl_definer_faza37.ts.
-- Aditiva: nu schimba niciun comportament existent. SECURITY INVOKER (pg_catalog e citibil de toti).
-- Apelabila DOAR de service_role. Rollback: DROP FUNCTION public.acl_functii_snapshot();
CREATE OR REPLACE FUNCTION public.acl_functii_snapshot()
RETURNS TABLE (
    semnatura text,
    nume text,
    definer boolean,
    tip_retur text,
    anon boolean,
    authenticated boolean,
    service_role boolean
)
LANGUAGE sql STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT
        p.oid::regprocedure::text,
        p.proname::text,
        p.prosecdef,
        p.prorettype::regtype::text,
        has_function_privilege('anon', p.oid, 'EXECUTE'),
        has_function_privilege('authenticated', p.oid, 'EXECUTE'),
        has_function_privilege('service_role', p.oid, 'EXECUTE')
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
          SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
    ORDER BY 1
$$;

REVOKE ALL ON FUNCTION public.acl_functii_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acl_functii_snapshot() TO service_role;

NOTIFY pgrst, 'reload schema';
