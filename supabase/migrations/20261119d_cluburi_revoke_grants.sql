-- Quick 261119-ihl, din review Val 3: grant-uri implicite Supabase prea largi pe cluburi si rbv_cluburi_detaliu.
-- STARE: APLICAT pe live 19.11.2026 (dry-run cu rollback: anon/super admin/admin club/sportiv ok, TRUNCATE refuzat).
-- RLS nu acopera TRUNCATE/TRIGGER/REFERENCES. SELECT/INSERT/UPDATE/DELETE pentru authenticated raman (filtrate de RLS).
-- ROLLBACK: GRANT INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.cluburi TO anon;
--           GRANT TRUNCATE, TRIGGER, REFERENCES ON public.cluburi TO authenticated;
--           GRANT ALL ON public.rbv_cluburi_detaliu TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.cluburi FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.cluburi FROM authenticated;
REVOKE ALL ON public.rbv_cluburi_detaliu FROM authenticated;
GRANT SELECT ON public.rbv_cluburi_detaliu TO authenticated;
