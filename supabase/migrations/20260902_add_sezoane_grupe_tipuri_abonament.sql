-- 2026-09-02: Fundatie sistem sezoane (Faza 27)
-- Scop: tabel public.sezoane (interval de date liber per club, un singur sezon
-- activ per club impus de DB) + coloane noi pe grupe (tip_grupa/sezon_id/arhivat)
-- si pe tipuri_abonament (sezon_id).
-- Decizii acoperite: D-01 (interval liber), D-02 (doar ADMIN_CLUB/ADMIN/SUPER_ADMIN_FEDERATIE
-- scriu sezoane, nu INSTRUCTOR), D-03 (un singur sezon activ per club, impus de DB),
-- D-04 (grupe permanente/per-sezon, INSTRUCTOR poate seta campurile pe grupe),
-- D-06 (arhivare), D-09 (tipuri_abonament legate de sezon, randuri istorice raman valide).
--
-- Audit live inainte de scriere (2026-09-05, proiect wuhidifzsutwgdfkwhmd):
--   - pg_policies pe grupe: "Staff - Full Access Grupe" (ALL, has_access_to_club(club_id)) — neatinsa.
--   - pg_policies pe tipuri_abonament: tipuri_abonament_select (is_super_admin() OR has_access_to_club()
--     OR sportiv propriu) si tipuri_abonament_write (rol IN (SUPER_ADMIN_FEDERATIE,ADMIN,ADMIN_CLUB)
--     AND (este_staff_club(club_id) OR is_super_admin())) — neatinse.
--   - public.sezoane nu exista (to_regclass = null).
--   - grupe: 15 randuri; tipuri_abonament: 5 randuri.
--   - DEVIATIE fata de presupunerea din 27-RESEARCH.md/27-01-PLAN.md: tabelul `plati` ARE coloana
--     `tip_abonament_id` (nullable, uuid) — nu este denormalizat exclusiv prin suma+descriere cum
--     presupunea planul. Referinte reale catre tipuri_abonament.id: sportivi.tip_abonament_id,
--     familii.tip_abonament_id, participare_vacanta.tip_abonament_anterior_id, plati.tip_abonament_id.
--     Aceasta migratie nu modifica plati — relevant doar pentru planurile 27-04/27-05 (raportat in SUMMARY).

-- SECTIUNEA 1 — tabel sezoane
CREATE TABLE IF NOT EXISTS public.sezoane (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id UUID NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
  denumire TEXT NOT NULL,
  data_start DATE NOT NULL,
  data_final DATE NOT NULL,
  activ BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT sezon_date_valide CHECK (data_final >= data_start)
);

-- SECTIUNEA 2 — indexuri
CREATE INDEX IF NOT EXISTS sezoane_club_id_idx ON public.sezoane(club_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sezoane_activ_per_club
  ON public.sezoane(club_id) WHERE activ = true;

-- SECTIUNEA 3 — RLS sezoane
ALTER TABLE public.sezoane ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sezoane_select" ON public.sezoane;
CREATE POLICY "sezoane_select" ON public.sezoane
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.has_access_to_club(club_id));

-- NU folosim este_staff_club(club_id) ca predicat de scoping aici — acea functie
-- include INSTRUCTOR, ceea ce ar contrazice D-02 (doar ADMIN_CLUB/ADMIN/SUPER_ADMIN_FEDERATIE
-- pot crea/edita/sterge sezoane). Gate-ul de rol e explicit mai jos.
-- Rolul de gate trebuie evaluat STRICT pe randul de context activ
-- (active-role-context-id), la fel ca is_super_admin()/has_access_to_club() —
-- altfel un user cu roluri multiple (ex. ADMIN_CLUB + INSTRUCTOR la acelasi club)
-- ar trece gate-ul prin randul ADMIN_CLUB chiar si cand contextul activ e INSTRUCTOR.
DROP POLICY IF EXISTS "sezoane_write" ON public.sezoane;
CREATE POLICY "sezoane_write" ON public.sezoane
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utilizator_roluri_multicont
      WHERE user_id = auth.uid()
        AND id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid
        AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
    )
    AND (public.has_access_to_club(club_id) OR public.is_super_admin())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.utilizator_roluri_multicont
      WHERE user_id = auth.uid()
        AND id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid
        AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB')
    )
    AND (public.has_access_to_club(club_id) OR public.is_super_admin())
  );

-- SECTIUNEA 4 — grupe: tip_grupa / sezon_id / arhivat
ALTER TABLE public.grupe ADD COLUMN IF NOT EXISTS tip_grupa TEXT NOT NULL DEFAULT 'permanent';

ALTER TABLE public.grupe DROP CONSTRAINT IF EXISTS grupe_tip_grupa_check;
ALTER TABLE public.grupe ADD CONSTRAINT grupe_tip_grupa_check
  CHECK (tip_grupa IN ('permanent', 'per_sezon'));

ALTER TABLE public.grupe ADD COLUMN IF NOT EXISTS sezon_id UUID REFERENCES public.sezoane(id) ON DELETE SET NULL;
ALTER TABLE public.grupe ADD COLUMN IF NOT EXISTS arhivat BOOLEAN NOT NULL DEFAULT false;

-- SECTIUNEA 5 — tipuri_abonament: sezon_id (nullable, randuri istorice raman valide)
ALTER TABLE public.tipuri_abonament ADD COLUMN IF NOT EXISTS sezon_id UUID REFERENCES public.sezoane(id) ON DELETE SET NULL;

-- SECTIUNEA 6 — indexuri de suport
CREATE INDEX IF NOT EXISTS grupe_sezon_id_idx ON public.grupe(sezon_id);
CREATE INDEX IF NOT EXISTS tipuri_abonament_sezon_id_idx ON public.tipuri_abonament(sezon_id);
