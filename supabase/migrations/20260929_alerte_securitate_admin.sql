-- =============================================================================
-- Alerte securitate admin (login brute-force + dispozitiv admin necunoscut).
--
-- Scop (D-securitate): SUPER_ADMIN_FEDERATIE primeste email automat la:
--   1. 5 login-uri esuate in 15 minute pe același email/username (brute-force);
--   2. login cu succes ADMIN_CLUB/SUPER_ADMIN_FEDERATIE de pe o combinatie
--      IP+browser nemaivazuta pentru acel cont (dispozitiv necunoscut).
--
-- Spre diferenta de auth_email_events (Faza 32, complet anonimizat), aici se
-- stocheaza email/IP/user-agent — necesar functional pentru identificarea
-- contului/dispozitivului tinta al alertei. Baza legala GDPR Art. 6(1)(f)
-- interes legitim de securitate a retelei; acces restrictionat strict la
-- SUPER_ADMIN_FEDERATIE (RLS SELECT-only), scriere exclusiv service_role
-- (bypass RLS, din handlerul Vercel api/alerta-securitate-login.ts).
--
-- Fara FORCE ROW LEVEL SECURITY: proiectul are un default care seteaza FORCE
-- automat la CREATE TABLE — dezactivat explicit mai jos, altfel functiile
-- SECURITY DEFINER se blocheaza singure (memorie proiect:
-- feedback_rls_force_security_definer_recursion).
--
-- Migrare strict aditiva, re-rulabila (IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS), nu atinge obiecte existente.
--
-- STATUS: aplicata live via MCP apply_migration (proiect wuhidifzsutwgdfkwhmd).
-- =============================================================================

-- ── auth_tentative_login ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_tentative_login (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    email_folosit text NOT NULL,
    ip text,
    user_agent text,
    reusit boolean NOT NULL DEFAULT true,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_tentative_login_burst
    ON public.auth_tentative_login (email_folosit, created_at DESC)
    WHERE reusit = false;

CREATE INDEX IF NOT EXISTS idx_auth_tentative_login_created_at
    ON public.auth_tentative_login (created_at DESC);

ALTER TABLE public.auth_tentative_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_tentative_login NO FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_tentative_login FROM anon, authenticated;
GRANT SELECT ON public.auth_tentative_login TO authenticated;

DROP POLICY IF EXISTS auth_tentative_login_select_super_admin ON public.auth_tentative_login;
CREATE POLICY auth_tentative_login_select_super_admin
    ON public.auth_tentative_login
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- ── auth_dispozitive_cunoscute ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_dispozitive_cunoscute (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip text NOT NULL,
    user_agent_hash text NOT NULL,
    prima_vazut timestamptz NOT NULL DEFAULT now(),
    ultima_vazut timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, ip, user_agent_hash)
);

CREATE INDEX IF NOT EXISTS idx_auth_dispozitive_cunoscute_user
    ON public.auth_dispozitive_cunoscute (user_id);

ALTER TABLE public.auth_dispozitive_cunoscute ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_dispozitive_cunoscute NO FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_dispozitive_cunoscute FROM anon, authenticated;
GRANT SELECT ON public.auth_dispozitive_cunoscute TO authenticated;

DROP POLICY IF EXISTS auth_dispozitive_cunoscute_select_super_admin ON public.auth_dispozitive_cunoscute;
CREATE POLICY auth_dispozitive_cunoscute_select_super_admin
    ON public.auth_dispozitive_cunoscute
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- ── auth_alerte_trimise ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_alerte_trimise (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    tip text NOT NULL CHECK (tip IN ('login_esuat_burst', 'dispozitiv_necunoscut')),
    referinta text,
    destinatari_count integer NOT NULL DEFAULT 0,
    reusit boolean NOT NULL DEFAULT true,
    eroare text
);

CREATE INDEX IF NOT EXISTS idx_auth_alerte_trimise_cooldown
    ON public.auth_alerte_trimise (tip, referinta, created_at DESC);

ALTER TABLE public.auth_alerte_trimise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_alerte_trimise NO FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_alerte_trimise FROM anon, authenticated;
GRANT SELECT ON public.auth_alerte_trimise TO authenticated;

DROP POLICY IF EXISTS auth_alerte_trimise_select_super_admin ON public.auth_alerte_trimise;
CREATE POLICY auth_alerte_trimise_select_super_admin
    ON public.auth_alerte_trimise
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- ── get_statistici_alerte_securitate() ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_statistici_alerte_securitate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_pe_tip jsonb;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Acces interzis' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(jsonb_object_agg(tip, n), '{}'::jsonb) INTO v_pe_tip
    FROM (
        SELECT tip, count(*) AS n
        FROM public.auth_alerte_trimise
        WHERE reusit = true AND created_at > now() - interval '24 hours'
        GROUP BY tip
    ) sub;

    RETURN jsonb_build_object(
        'tentative_esuate_ultima_ora', (SELECT count(*) FROM public.auth_tentative_login WHERE reusit = false AND created_at > now() - interval '1 hour'),
        'tentative_esuate_ultimele_24h', (SELECT count(*) FROM public.auth_tentative_login WHERE reusit = false AND created_at > now() - interval '24 hours'),
        'dispozitive_noi_ultimele_24h', (SELECT count(*) FROM public.auth_dispozitive_cunoscute WHERE prima_vazut > now() - interval '24 hours'),
        'alerte_trimise_24h', (SELECT count(*) FROM public.auth_alerte_trimise WHERE reusit = true AND created_at > now() - interval '24 hours'),
        'alerte_esuate_trimitere_24h', (SELECT count(*) FROM public.auth_alerte_trimise WHERE reusit = false AND created_at > now() - interval '24 hours'),
        'pe_tip_24h', v_pe_tip
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_statistici_alerte_securitate() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_statistici_alerte_securitate() TO authenticated;
