-- =================================================================
-- Politici de Securitate (RLS) pentru Tabela `cluburi`
-- v1.0
-- =================================================================
-- Scop: Asigură că utilizatorii pot vedea doar cluburile relevante
-- pentru contextul lor, rezolvând problema în care un sportiv
-- nu își putea vedea propriul club în profil.
-- =================================================================

-- Procedură helper pentru resetarea politicilor (dacă nu există deja)
-- Acest bloc asigură că procedura există înainte de a o apela.
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


-- == Aplicare Politici pe tabelul `cluburi` ==
CALL public.reset_all_policies_for_table('cluburi');
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluburi FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii (Federație) au acces total.
-- Aceasta le permite să vadă și să gestioneze toate cluburile.
CREATE POLICY "Super Admin - Acces total la cluburi" ON public.cluburi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Utilizatorii (Staff sau Sportivi) își pot vedea propriul club.
-- Această politică este esențială pentru ca un sportiv să-și poată vedea
-- numele clubului în profilul său. `get_active_club_id()` citește club_id din JWT.
CREATE POLICY "Utilizatorii își văd propriul club" ON public.cluburi
    FOR SELECT USING (id = get_active_club_id());

-- Politica 3: Toți utilizatorii autentificați pot vedea înregistrarea pentru "Federație".
-- Asigură că entitatea Federație este vizibilă pentru toți,
-- util pentru afișarea corectă în liste sau filtre.
CREATE POLICY "Toți utilizatorii văd Federația" ON public.cluburi
    FOR SELECT USING (id = '00000000-0000-0000-0000-000000000000'); -- FEDERATIE_ID
