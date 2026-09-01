-- ============================================================
-- Anunțuri Federație — dashboard newsfeed
-- Creat: 2026-09-01
-- Scop: Anunțuri manuale SUPER_ADMIN_FEDERATIE afișate pe
--   dashboard-ul cluburilor țintă (sau tuturor, dacă club_id_target
--   e NULL). Vezi docs/superpowers/specs/2026-09-01-dashboard-
--   newsfeed-acces-platit-design.md secțiunea A.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anunturi_federatie (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titlu           TEXT NOT NULL,
    continut        TEXT NOT NULL,
    club_id_target  UUID NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    creat_de        UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_la       TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS anunturi_federatie_club_target_idx ON public.anunturi_federatie(club_id_target);
CREATE INDEX IF NOT EXISTS anunturi_federatie_created_idx ON public.anunturi_federatie(created_at DESC);

-- ============================================================
-- RLS — folosește helperele context-aware existente
-- (sql/migrations/fix_rls_context_aware_role_helpers.sql):
--   is_super_admin()          -> rol activ SUPER_ADMIN_FEDERATIE
--   has_access_to_club(uuid)  -> rol activ are acces la clubul dat
-- ============================================================

ALTER TABLE public.anunturi_federatie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anunturi_federatie_select" ON public.anunturi_federatie;
CREATE POLICY "anunturi_federatie_select"
    ON public.anunturi_federatie FOR SELECT TO authenticated
    USING (
        club_id_target IS NULL
        OR public.has_access_to_club(club_id_target)
    );

DROP POLICY IF EXISTS "anunturi_federatie_write" ON public.anunturi_federatie;
CREATE POLICY "anunturi_federatie_write"
    ON public.anunturi_federatie FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DO $$
BEGIN
    RAISE NOTICE 'add_anunturi_federatie applied successfully.';
END $$;
