-- =================================================================
-- Script Complet pentru Revizuirea Securității RLS
-- v8.0 - Bazat pe Contextul de Rol din JWT
-- =================================================================
-- Acest script execută 3 pași critici:
-- 1. Curăță politicile vechi, hardcodate.
-- 2. Modifică trigger-ul de sincronizare a metadatelor pentru a include `rol_activ_context` în JWT.
-- 3. Implementează un set nou de politici RLS, securizate și bazate pe contextul din JWT.
-- =================================================================

-- =================================================================
-- PASUL 1: Curățarea politicilor vechi, nesecurizate
-- =================================================================
-- Elimină politicile hardcodate bazate pe email din TOATE tabelele.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Emergency_Alin_Access" ON public.' || quote_ident(r.tablename) || ';';
        EXECUTE 'DROP POLICY IF EXISTS "MASTER_ACCESS_ALIN" ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END;
$$;


-- =================================================================
-- PASUL 2: Actualizarea Sincronizării Metadatelor pentru JWT
-- =================================================================

-- MODIFICARE Funcție Trigger: Se adaugă `rol_activ_context`
CREATE OR REPLACE FUNCTION public.sync_user_metadata_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_sportiv_id uuid;
  target_user_id uuid;
  target_club_id uuid;
  target_rol_activ text; -- Variabilă nouă pentru rolul activ
  roles_array text[];
BEGIN
  IF TG_TABLE_NAME = 'sportivi' THEN
    target_sportiv_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_sportiv_id := COALESCE(NEW.sportiv_id, OLD.sportiv_id);
  END IF;

  SELECT user_id, club_id, rol_activ_context INTO target_user_id, target_club_id, target_rol_activ
  FROM public.sportivi
  WHERE id = target_sportiv_id;
  
  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(r.nume)
  INTO roles_array
  FROM public.sportivi_roluri sr
  JOIN public.roluri r ON sr.rol_id = r.id
  WHERE sr.sportiv_id = target_sportiv_id;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'club_id', target_club_id,
    'rol_activ_context', target_rol_activ, -- Adăugare câmp nou
    'roles', COALESCE(roles_array, '{}')
  )
  WHERE id = target_user_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- MODIFICARE Trigger pe `sportivi`: Se declanșează și la schimbarea rolului activ
DROP TRIGGER IF EXISTS on_sportivi_club_change_sync_user_meta ON public.sportivi;
CREATE TRIGGER on_sportivi_club_change_sync_user_meta
  AFTER INSERT OR UPDATE OF club_id, rol_activ_context ON public.sportivi
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();

-- Re-creare Trigger pe `sportivi_roluri` pentru a asigura consistența
DROP TRIGGER IF EXISTS on_sportivi_roluri_change_sync_user_meta ON public.sportivi_roluri;
CREATE TRIGGER on_sportivi_roluri_change_sync_user_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.sportivi_roluri
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();


-- =================================================================
-- PASUL 3: Funcții Helper și Politici RLS Noi
-- =================================================================

-- Funcții helper care citesc din JWT (performant și sigur)
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS text AS $$
BEGIN RETURN auth.jwt() -> 'user_metadata' ->> 'rol_activ_context'; END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS uuid AS $$
BEGIN RETURN (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid; END;
$$ LANGUAGE plpgsql STABLE;

-- Procedură helper pentru resetarea politicilor
CREATE OR REPLACE PROCEDURE public.reset_all_policies_for_table(p_table_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY %I ON public.%I;', policy_record.policyname, p_table_name);
    END LOOP;
END;
$$;


-- == Aplicare Politici pe tabelul `sportivi` ==
CALL public.reset_all_policies_for_table('sportivi');
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii au acces total (SELECT, INSERT, UPDATE, DELETE).
CREATE POLICY "Super Admin - Acces total la sportivi" ON public.sportivi
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Instructorii și Adminii de Club pot vedea sportivii din clubul lor.
CREATE POLICY "Staff-ul clubului vede sportivii din propriul club" ON public.sportivi
    FOR SELECT USING (
        (get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND club_id = get_active_club_id()
    );

-- Politica 3: Utilizatorii își pot vedea și modifica propriul profil.
-- `user_id` este cheia externă către `auth.users`, deci `auth.uid()` este corect.
CREATE POLICY "Utilizatorii își gestionează propriul profil" ON public.sportivi
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- == Aplicare Politici pe tabelul `plati` (ca exemplu general) ==
CALL public.reset_all_policies_for_table('plati');
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati FORCE ROW LEVEL SECURITY;

-- Politica 1: Super Adminii au acces total.
CREATE POLICY "Super Admin - Acces total la plăți" ON public.plati
    FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- Politica 2: Staff-ul clubului poate gestiona plățile sportivilor din clubul lor.
CREATE POLICY "Staff-ul clubului gestionează plățile clubului" ON public.plati
    FOR ALL USING ((get_active_role() = 'Admin Club' OR get_active_role() = 'Instructor')
        AND EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)
            AND s.club_id = get_active_club_id()
        )
    );

-- Politica 3: Fiecare utilizator își vede plățile personale sau ale familiei.
CREATE POLICY "Utilizatorii își văd propriile plăți" ON public.plati
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.user_id = auth.uid()
        AND (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)
    ));
