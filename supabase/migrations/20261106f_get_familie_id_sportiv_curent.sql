-- Faza 36 follow-up (261105-gax): functia exista live, dar nicio migrare din repo nu o definea
-- (drift: pe un DB curat prezenta_familie_sel din 20261106e nu s-ar putea crea).
-- Definitia live era: SELECT familie_id FROM sportivi WHERE user_id = auth.uid() LIMIT 1 (fara ORDER BY).
-- Adaugam ORDER BY ca rezultatul sa fie determinist cand un user are mai multe randuri sportivi;
-- preferam randurile cu familie_id setat. Semnatura, SECURITY DEFINER si search_path raman neschimbate.
CREATE OR REPLACE FUNCTION public.get_familie_id_sportiv_curent()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT familie_id FROM public.sportivi
    WHERE user_id = auth.uid()
    ORDER BY (familie_id IS NULL), created_at NULLS LAST, id
    LIMIT 1;
$$;
