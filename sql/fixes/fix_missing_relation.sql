DO $$
DECLARE
    func_rec RECORD;
    view_rec RECORD;
BEGIN
    -- 1. Caută și șterge funcții care referă tabela inexistentă 'profil_utilizator'
    -- Ștergerea funcției cu CASCADE va șterge automat și triggerele care o folosesc.
    FOR func_rec IN
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.prosrc ILIKE '%profil_utilizator%'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE', func_rec.schema_name, func_rec.function_name);
        RAISE NOTICE 'A fost ștearsă funcția % pentru că referea profil_utilizator', func_rec.function_name;
    END LOOP;

    -- 2. Caută și șterge view-uri care referă tabela inexistentă
    FOR view_rec IN
        SELECT table_schema, table_name
        FROM information_schema.views
        WHERE view_definition ILIKE '%profil_utilizator%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_rec.table_schema, view_rec.table_name);
        RAISE NOTICE 'A fost șters view-ul % pentru că referea profil_utilizator', view_rec.table_name;
    END LOOP;
    
END $$;
