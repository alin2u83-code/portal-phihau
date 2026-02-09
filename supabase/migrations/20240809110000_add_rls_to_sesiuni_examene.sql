-- =================================================================
-- Politici de Securitate (RLS) pentru Tabela `sesiuni_examene`
-- v1.0
-- =================================================================
-- Scop: Asigură că utilizatorii pot vedea și gestiona doar sesiunile
-- de examen relevante pentru contextul lor de rol și club.
-- =================================================================

-- Procedură helper pentru resetarea politicilor (dacă nu există deja)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'reset_all_policies_for_table') THEN
      CREATE PROCEDURE public.reset_all_policies_for_table(p_table_name TEXT)
      LANGUAGE plpgsql AS $procedure$
      DECLARE
          policy_record RECORD;
      BEGIN
          FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public' LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_record.policyname, p_table_name);
          END LOOP;
      END;
      $procedure$;
   END IF;
END;
$$;


-- == Aplicare Politici pe tabelul `sesiuni_examene` ==
CALL public.reset_all_policies_for_table('sesiuni_examene');
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiuni_examene FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii Federației au acces total.
CREATE POLICY "Super Admin - Acces total la sesiuni examen" ON public.sesiuni_examene
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Staff-ul de club poate gestiona examenele clubului sau cele federale (unde club_id este NULL).
CREATE POLICY "Staff Club - Management sesiuni proprii și federale" ON public.sesiuni_examene
    FOR ALL USING (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor') AND
        (club_id = get_active_club_id() OR club_id IS NULL)
    );

-- Politica 3: Sportivii pot vedea (SELECT) examenele clubului lor sau cele federale.
CREATE POLICY "Sportivii văd sesiunile clubului și cele federale" ON public.sesiuni_examene
    FOR SELECT USING (
        club_id = get_active_club_id() OR club_id IS NULL
    );
