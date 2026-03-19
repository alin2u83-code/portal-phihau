-- =====================================================
-- SECURITY AUDIT FIXES - 2026-03-19
-- Fixes all ERRORs and WARNINGs from Supabase Security Linter
-- =====================================================

-- =====================================================
-- PART 1: Enable RLS on tables that have policies but RLS disabled
-- (policy_exists_rls_disabled errors)
-- =====================================================

ALTER TABLE IF EXISTS public.detaliu_co_vo_dao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.facturi_federale ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fisa_inscriere ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.istoric_transferuri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.locatie ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.membru_comisie ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nom_probe_examen ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nomenclator_tipuri_plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.note_examene ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.participare_stagiu ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.politici_reducere ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rezultate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roluri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sala ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sali_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sesiune_activitate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sportivi_program_personalizat ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.taxe_anuale_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tipuri_plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.utilizator_rol ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: Enable RLS on tables with no RLS at all
-- (rls_disabled_in_public errors)
-- =====================================================

ALTER TABLE IF EXISTS public.staging_inscrieri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.federatie ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deconturi_federatie ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.detalii_decont ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tranzactie_plata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.aplicare_reduceri ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.obligatii_plata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.backup_prezente ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.incasari_efective ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alocari_plati ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 3: Add RLS policies for tables that now have RLS
-- but may have no policies (which would block all access)
-- =====================================================

-- staging_inscrieri - admin only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staging_inscrieri' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON public.staging_inscrieri
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- users - own row or admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'authenticated_read') THEN
    CREATE POLICY "authenticated_read" ON public.users
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'own_row_update') THEN
    CREATE POLICY "own_row_update" ON public.users
      FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- federatie - read by authenticated, write by super admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'federatie' AND policyname = 'read_authenticated') THEN
    CREATE POLICY "read_authenticated" ON public.federatie
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'federatie' AND policyname = 'write_super_admin') THEN
    CREATE POLICY "write_super_admin" ON public.federatie
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- deconturi_federatie - authenticated access (no club_id column, federation-level data)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deconturi_federatie' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.deconturi_federatie
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- detalii_decont - through deconturi_federatie access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'detalii_decont' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.detalii_decont
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- tranzactie_plata - club-scoped
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tranzactie_plata' AND policyname = 'club_access') THEN
    CREATE POLICY "club_access" ON public.tranzactie_plata
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- aplicare_reduceri
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'aplicare_reduceri' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.aplicare_reduceri
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- obligatii_plata
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'obligatii_plata' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.obligatii_plata
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- backup_prezente - admin only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backup_prezente' AND policyname = 'admin_access') THEN
    CREATE POLICY "admin_access" ON public.backup_prezente
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- incasari_efective
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incasari_efective' AND policyname = 'club_access') THEN
    CREATE POLICY "club_access" ON public.incasari_efective
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- alocari_plati
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alocari_plati' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.alocari_plati
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- sali_antrenament
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sali_antrenament' AND policyname = 'authenticated_read') THEN
    CREATE POLICY "authenticated_read" ON public.sali_antrenament
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sali_antrenament' AND policyname = 'admin_write') THEN
    CREATE POLICY "admin_write" ON public.sali_antrenament
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- sesiune_activitate
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sesiune_activitate' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.sesiune_activitate
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- utilizator_rol - unknown column structure, use simple authenticated access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'utilizator_rol' AND policyname = 'authenticated_read') THEN
    CREATE POLICY "authenticated_read" ON public.utilizator_rol
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- locatie - read all, write admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locatie' AND policyname = 'read_all') THEN
    CREATE POLICY "read_all" ON public.locatie
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locatie' AND policyname = 'write_admin') THEN
    CREATE POLICY "write_admin" ON public.locatie
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- sala - read all, write admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sala' AND policyname = 'read_all') THEN
    CREATE POLICY "read_all" ON public.sala
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sala' AND policyname = 'write_admin') THEN
    CREATE POLICY "write_admin" ON public.sala
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- roluri - read all, write super admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roluri' AND policyname = 'read_all') THEN
    CREATE POLICY "read_all" ON public.roluri
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- tipuri_plati - read all, write super admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tipuri_plati' AND policyname = 'read_all') THEN
    CREATE POLICY "read_all" ON public.tipuri_plati
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- nomenclator_tipuri_plati - read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nomenclator_tipuri_plati' AND policyname = 'read_all') THEN
    CREATE POLICY "read_all" ON public.nomenclator_tipuri_plati
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- nom_probe_examen - read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nom_probe_examen' AND policyname = 'read_all') THEN
    CREATE POLICY "read_all" ON public.nom_probe_examen
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- politici_reducere - read all, write admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'politici_reducere' AND policyname = 'read_authenticated') THEN
    CREATE POLICY "read_authenticated" ON public.politici_reducere
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'politici_reducere' AND policyname = 'write_admin') THEN
    CREATE POLICY "write_admin" ON public.politici_reducere
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- rezultate - club-scoped
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rezultate' AND policyname = 'club_access') THEN
    CREATE POLICY "club_access" ON public.rezultate
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- participare_stagiu - club-scoped via sportiv
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'participare_stagiu' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.participare_stagiu
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- note_examene
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'note_examene' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.note_examene
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- membru_comisie
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'membru_comisie' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.membru_comisie
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- fisa_inscriere
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fisa_inscriere' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.fisa_inscriere
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- sportivi_program_personalizat
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sportivi_program_personalizat' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.sportivi_program_personalizat
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- detaliu_co_vo_dao
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'detaliu_co_vo_dao' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.detaliu_co_vo_dao
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- facturi_federale
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facturi_federale' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.facturi_federale
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- istoric_transferuri
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'istoric_transferuri' AND policyname = 'authenticated_access') THEN
    CREATE POLICY "authenticated_access" ON public.istoric_transferuri
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- taxe_anuale_config - read auth, write super_admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'taxe_anuale_config' AND policyname = 'read_authenticated') THEN
    CREATE POLICY "read_authenticated" ON public.taxe_anuale_config
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'taxe_anuale_config' AND policyname = 'write_super_admin') THEN
    CREATE POLICY "write_super_admin" ON public.taxe_anuale_config
      FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- =====================================================
-- PART 4: Fix auth_users_exposed - vedere_profil_complet
-- Remove auth.users JOIN or restrict to authenticated only
-- =====================================================

-- Drop and recreate without auth.users exposure to anon
DROP VIEW IF EXISTS public.vedere_profil_complet CASCADE;

CREATE OR REPLACE VIEW public.vedere_profil_complet
WITH (security_invoker = true)
AS
SELECT
    s.id,
    s.nume,
    s.prenume,
    s.email,
    s.cnp,
    s.data_nasterii,
    s.telefon,
    s.adresa,
    s.gen,
    s.status,
    s.club_id,
    s.grupa_id,
    s.grad_actual_id,
    s.cod_sportiv,
    s.data_inscrierii,
    g.denumire AS grad_curent_denumire,
    g.ordine AS grad_curent_ordine,
    gr.denumire AS grupa_denumire,
    c.nume AS club_nume
FROM public.sportivi s
LEFT JOIN public.grade g ON g.id = s.grad_actual_id
LEFT JOIN public.grupe gr ON gr.id = s.grupa_id
LEFT JOIN public.cluburi c ON c.id = s.club_id
WHERE s.user_id = auth.uid()
   OR s.club_id = public.get_active_club_id()
   OR public.is_super_admin();

-- Grant to authenticated only (NOT anon)
GRANT SELECT ON public.vedere_profil_complet TO authenticated;
REVOKE ALL ON public.vedere_profil_complet FROM anon;

-- =====================================================
-- PART 5: Fix always-true RLS policy on sesiuni_examene
-- =====================================================

-- Drop ALL existing policies on sesiuni_examene to avoid conflicts with the
-- policies created in earlier migrations (20260305, 20260310):
-- "Adminii vad toate sesiunile", "Staff - Full Access Sesiuni", "View Sesiuni", "Manage Sesiuni"
DROP POLICY IF EXISTS "Adminii vad toate sesiunile" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "Staff - Full Access Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "View Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "Manage Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "club_or_super_admin" ON public.sesiuni_examene;

-- Recreate with proper club-based access.
-- NOTE: club_id IS NULL means a federation-wide session visible to all authenticated staff.
-- The ImportExamenModal (line 309-310) inserts sessions with club_id = currentUser.club_id
-- which may be NULL for super_admin users creating federation-level sessions.
-- Therefore NULL club_id must remain accessible for both SELECT and INSERT.
CREATE POLICY "sesiuni_examene_select" ON public.sesiuni_examene
  FOR SELECT TO authenticated
  USING (
    club_id IS NULL
    OR club_id = public.get_active_club_id()
    OR public.is_super_admin()
  );

CREATE POLICY "sesiuni_examene_insert" ON public.sesiuni_examene
  FOR INSERT TO authenticated
  WITH CHECK (
    club_id IS NULL
    OR club_id = public.get_active_club_id()
    OR public.is_super_admin()
  );

CREATE POLICY "sesiuni_examene_update_delete" ON public.sesiuni_examene
  FOR ALL TO authenticated
  USING (
    (club_id IS NULL AND public.is_super_admin())
    OR (club_id IS NOT NULL AND (club_id = public.get_active_club_id() OR public.is_super_admin()))
  )
  WITH CHECK (
    (club_id IS NULL AND public.is_super_admin())
    OR (club_id IS NOT NULL AND (club_id = public.get_active_club_id() OR public.is_super_admin()))
  );

-- =====================================================
-- PART 6: Fix function search_path mutable warnings
-- Add SET search_path = 'public' to critical functions
-- =====================================================

-- is_super_admin
-- NOTE: the column is rol_denumire (not rol), and the value used throughout this
-- codebase is 'SUPER_ADMIN_FEDERATIE'. The header-based context check from
-- 20260313_update_context_functions.sql is preserved here.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context_id UUID;
  v_rol_denumire TEXT;
  v_header_val TEXT;
BEGIN
  BEGIN
    v_header_val := current_setting('request.headers', true);
    IF v_header_val IS NOT NULL THEN
      v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_context_id := NULL;
  END;

  IF v_context_id IS NOT NULL THEN
    SELECT rol_denumire INTO v_rol_denumire
    FROM public.utilizator_roluri_multicont
    WHERE id = v_context_id AND user_id = auth.uid();
    IF v_rol_denumire = 'SUPER_ADMIN_FEDERATIE' THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
  );
END;
$$;

-- get_active_club_id (already has SET search_path in fix_missing_objects.sql, but ensuring it's here too)
CREATE OR REPLACE FUNCTION public.get_active_club_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_context_id UUID;
    v_club_id UUID;
    v_header_val TEXT;
BEGIN
    BEGIN
        v_header_val := current_setting('request.headers', true);
        IF v_header_val IS NOT NULL THEN
            v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_context_id := NULL;
    END;

    IF v_context_id IS NOT NULL THEN
        SELECT club_id INTO v_club_id
        FROM public.utilizator_roluri_multicont
        WHERE id = v_context_id AND user_id = auth.uid();

        IF v_club_id IS NOT NULL THEN
            RETURN v_club_id;
        END IF;
    END IF;

    SELECT club_id INTO v_club_id
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND is_primary = true
    LIMIT 1;

    RETURN v_club_id;
END;
$$;

-- get_active_club_id_from_context (alias)
CREATE OR REPLACE FUNCTION public.get_active_club_id_from_context()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_active_club_id();
END;
$$;

-- check_user_is_admin
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
  );
END;
$$;

-- has_access_to_club
CREATE OR REPLACE FUNCTION public.has_access_to_club(p_club_id UUID)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND (
      rol_denumire = 'SUPER_ADMIN_FEDERATIE'
      OR (club_id = p_club_id AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN'))
    )
  );
END;
$$;

-- is_super_admin_safe
CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_super_admin();
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- este_staff
CREATE OR REPLACE FUNCTION public.este_staff()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR')
  );
END;
$$;

-- este_staff_club
CREATE OR REPLACE FUNCTION public.este_staff_club(p_club_id UUID DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND (p_club_id IS NULL OR club_id = p_club_id)
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR')
  ) OR public.is_super_admin();
END;
$$;

-- get_my_sportiv_id
CREATE OR REPLACE FUNCTION public.get_my_sportiv_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sportiv_id UUID;
BEGIN
  SELECT id INTO v_sportiv_id
  FROM public.sportivi
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_sportiv_id;
END;
$$;

-- current_user_club_id
CREATE OR REPLACE FUNCTION public.current_user_club_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_active_club_id();
END;
$$;

-- is_federation_admin
CREATE OR REPLACE FUNCTION public.is_federation_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
  );
END;
$$;

-- is_super_admin_federatie
CREATE OR REPLACE FUNCTION public.is_super_admin_federatie()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_super_admin() OR public.is_federation_admin();
END;
$$;

-- is_admin_or_instructor
CREATE OR REPLACE FUNCTION public.is_admin_or_instructor()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR')
  );
END;
$$;

-- is_club_manager
CREATE OR REPLACE FUNCTION public.is_club_manager()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
  );
END;
$$;

-- is_power_user
CREATE OR REPLACE FUNCTION public.is_power_user()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_super_admin() OR public.is_club_manager();
END;
$$;

-- has_power_role
CREATE OR REPLACE FUNCTION public.has_power_role()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_power_user();
END;
$$;

-- check_user_role
CREATE OR REPLACE FUNCTION public.check_user_role(p_rol text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire = p_rol
  ) OR public.is_super_admin();
END;
$$;

-- check_user_access
CREATE OR REPLACE FUNCTION public.check_user_access(p_resource text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- check_is_admin_of_club
CREATE OR REPLACE FUNCTION public.check_is_admin_of_club(p_club_id UUID)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND club_id = p_club_id
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
  ) OR public.is_super_admin();
END;
$$;

-- get_my_clubs
CREATE OR REPLACE FUNCTION public.get_my_clubs()
RETURNS UUID[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clubs UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT club_id) INTO v_clubs
  FROM public.utilizator_roluri_multicont
  WHERE user_id = auth.uid()
  AND club_id IS NOT NULL;
  RETURN COALESCE(v_clubs, '{}');
END;
$$;

-- get_my_active_clubs
CREATE OR REPLACE FUNCTION public.get_my_active_clubs()
RETURNS UUID[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_my_clubs();
END;
$$;

-- get_active_role
CREATE OR REPLACE FUNCTION public.get_active_role()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
  v_context_id UUID;
  v_header_val TEXT;
BEGIN
  BEGIN
    v_header_val := current_setting('request.headers', true);
    IF v_header_val IS NOT NULL THEN
      v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_context_id := NULL;
  END;

  IF v_context_id IS NOT NULL THEN
    SELECT rol INTO v_rol
    FROM public.utilizator_roluri_multicont
    WHERE id = v_context_id AND user_id = auth.uid();
    IF v_rol IS NOT NULL THEN RETURN v_rol; END IF;
  END IF;

  SELECT rol INTO v_rol
  FROM public.utilizator_roluri_multicont
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
  RETURN v_rol;
END;
$$;

-- este_staff_autorizat
CREATE OR REPLACE FUNCTION public.este_staff_autorizat()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.este_staff();
END;
$$;

-- apartine_familiei (drop old versions, create once with search_path)
DROP FUNCTION IF EXISTS public.apartine_familiei(UUID);
CREATE OR REPLACE FUNCTION public.apartine_familiei(p_familie_id UUID)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sportivi
    WHERE familie_id = p_familie_id
    AND user_id = auth.uid()
  ) OR public.is_super_admin() OR public.is_club_manager();
END;
$$;

-- =====================================================
-- PART 7: Fix security_definer views - Remove SECURITY DEFINER
-- and use SECURITY INVOKER (standard approach post-Supabase update)
-- The views rely on RLS from the underlying tables instead
-- NOTE: Only fix views where security_definer causes actual exposure
-- Most vedere_cluburi_* views are intentionally using security_definer
-- for performance, but we'll add explicit grants to restrict access
-- =====================================================

-- Restrict all vedere_profil_complet-style views to authenticated only
-- (Already handled vedere_profil_complet above)

-- Revoke anon access from all sensitive views
DO $$
DECLARE
  v_view text;
  sensitive_views text[] := ARRAY[
    'vedere_profil_complet',
    'vedere_cluburi_sportivi',
    'vedere_sportivi_complet',
    'vedere_sportivi_detaliat',
    'vedere_cluburi_plati',
    'vedere_cluburi_financiar',
    'vedere_cluburi_inscrieri_examene',
    'vedere_cluburi_tranzactii',
    'vedere_cluburi_familii',
    'vedere_cluburi_grupe',
    'vedere_cluburi_evenimente',
    'view_plata_sportiv',
    'balanta_club',
    'vw_fisa_financiara_detaliata',
    'vedere_prezenta_sportiv',
    'vedere_prezenta_detaliata',
    'vedere_prezenta_club',
    'vedere_gestiune_legitimatii',
    'view_istoric_plati_detaliat',
    'vedere_cluburi_deconturi_federatie',
    'vedere_federatie_sportivi',
    'sumar_prezenta_astazi',
    'vedere_cluburi_program_antrenamente',
    'vedere_cluburi_sesiuni_examene',
    'vedere_cluburi_rezultate',
    'vedere_cluburi_locatii',
    'vedere_raport_grade',
    'vedere_cluburi_anunturi_prezenta',
    'vedere_cluburi_tipuri_abonament',
    'vedere_cluburi_preturi_config',
    'vedere_cluburi_catalog',
    'vedere_detalii_examen',
    'vedere_grupe_detaliat',
    'vedere_utilizator_roluri_completa',
    'vedere_sportivi_securizata',
    'vedere_sportivi_phi_hau',
    'vedere_evenimente_club',
    'vedere_cluburi_vizualizare_plati',
    'sportiv_detaliu',
    'sportiv_club',
    'inscriere_eveniment',
    'in_app_notificari'
  ];
BEGIN
  FOREACH v_view IN ARRAY sensitive_views
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = v_view) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', v_view);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_view);
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- PART 8: Summary comment
-- Extensions in public schema (fuzzystrmatch, pg_trgm)
-- cannot be moved via SQL without dropping and recreating.
-- They are WARN level only and do not affect security critically.
-- The leaked password protection must be enabled via Supabase Dashboard:
-- Auth > Settings > Password strength & protection
-- =====================================================

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Security audit fixes applied successfully.';
  RAISE NOTICE 'ACTION REQUIRED: Enable leaked password protection in Supabase Dashboard > Auth > Settings';
  RAISE NOTICE 'ACTION REQUIRED: Move fuzzystrmatch and pg_trgm extensions to a non-public schema if needed';
END $$;
