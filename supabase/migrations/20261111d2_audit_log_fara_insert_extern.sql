-- Faza 39 (decizie utilizator 11.11.2026): contul extern (doar competitie) NU poate scrie direct in audit_log;
-- randurile lui apar doar prin trigger (SECURITY DEFINER), cu actorul din sesiune. Previne randuri de jurnal falsificate.
DROP POLICY IF EXISTS ext_r_audit_log_ins ON public.audit_log;
CREATE POLICY ext_r_audit_log_ins ON public.audit_log AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (NOT (select public.este_doar_extern()));
NOTIFY pgrst, 'reload schema';
-- Rollback: recreeaza ext_r_audit_log_ins cu WITH CHECK (NOT (select public.este_doar_extern()) OR user_id = (select auth.uid())).
