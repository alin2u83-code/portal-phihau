-- =================================================================
-- Curățare Funcție RPC 'check_is_admin'
-- v1.2 - Eliminare funcție, deoarece RLS se bazează acum pe JWT.
-- =================================================================
DROP FUNCTION IF EXISTS public.check_is_admin();