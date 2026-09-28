-- =============================================================================
-- Faza 32 (D-06): monitorizare praguri emailuri Auth (SMTP custom Hostinger).
--
-- Supabase NU expune prin API client numărul de emailuri Auth trimise.
-- `auth.audit_log_entries` există dar e schema internă `auth`, nu e expusă
-- prin PostgREST și numele acțiunilor nu sunt documentate stabil
-- (32-RESEARCH.md Pitfall 3) — de aceea tabel de contorizare propriu,
-- populat explicit de aplicație la fiecare apel resetPasswordForEmail /
-- signUp / signInWithOtp / updateUser({email}).
--
-- Fără FORCE ROW LEVEL SECURITY: FORCE ar aplica RLS și owner-ului funcțiilor
-- SECURITY DEFINER (postgres), care trebuie să poată scrie/citi liber
-- (memorie proiect: feedback_rls_force_security_definer_recursion).
--
-- Fără date personale (fără email, fără user_id) — doar tip, reușit, timestamp
-- (minimizare GDPR, Faza 28).
--
-- Migrare strict aditivă, re-rulabilă (IF NOT EXISTS / CREATE OR REPLACE),
-- nu atinge obiecte existente.
--
-- STATUS: APLICATA LIVE 2026-09-28 via MCP apply_migration (proiect
-- wuhidifzsutwgdfkwhmd). Descoperire in verificare: proiectul are un default
-- care seteaza FORCE ROW LEVEL SECURITY automat la CREATE TABLE (nu venea din
-- aceasta migrare) — corectat explicit mai jos cu NO FORCE, verificat live
-- relforcerowsecurity=false pe ambele tabele. Detalii in 32-03-SUMMARY.md.
-- =============================================================================

-- ── auth_email_events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_email_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    tip text NOT NULL CHECK (tip IN ('reset_parola', 'confirmare_cont', 'cod_mfa', 'schimbare_email')),
    reusit boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_auth_email_events_created_at ON public.auth_email_events (created_at DESC);

ALTER TABLE public.auth_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_email_events NO FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_email_events FROM anon, authenticated;
GRANT SELECT ON public.auth_email_events TO authenticated;

DROP POLICY IF EXISTS auth_email_events_select_super_admin ON public.auth_email_events;
CREATE POLICY auth_email_events_select_super_admin
    ON public.auth_email_events
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- ── auth_email_praguri ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_email_praguri (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    prag_ora integer NOT NULL DEFAULT 30 CHECK (prag_ora > 0),
    prag_zi integer NOT NULL DEFAULT 500 CHECK (prag_zi > 0),
    actualizat_la timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.auth_email_praguri (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.auth_email_praguri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_email_praguri NO FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_email_praguri FROM anon, authenticated;
GRANT SELECT ON public.auth_email_praguri TO authenticated;

DROP POLICY IF EXISTS auth_email_praguri_select_super_admin ON public.auth_email_praguri;
CREATE POLICY auth_email_praguri_select_super_admin
    ON public.auth_email_praguri
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- ── inregistreaza_email_auth(p_tip, p_reusit) ────────────────────────────────
-- anon e necesar în GRANT: resetPasswordForEmail se apelează înainte de login.
-- Plafon anti-spam: 300 inserări/minut — peste, ignoră silențios (contorul e
-- indicativ, nu trebuie să poată fi folosit ca vector de DoS pe DB).
CREATE OR REPLACE FUNCTION public.inregistreaza_email_auth(p_tip text, p_reusit boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF p_tip IS NULL OR p_tip NOT IN ('reset_parola', 'confirmare_cont', 'cod_mfa', 'schimbare_email') THEN
        RAISE EXCEPTION 'Tip email Auth invalid: %', p_tip USING ERRCODE = '22023';
    END IF;

    IF (SELECT count(*) FROM public.auth_email_events WHERE created_at > now() - interval '1 minute') >= 300 THEN
        RETURN;
    END IF;

    INSERT INTO public.auth_email_events (tip, reusit) VALUES (p_tip, COALESCE(p_reusit, true));
END;
$$;

REVOKE ALL ON FUNCTION public.inregistreaza_email_auth(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inregistreaza_email_auth(text, boolean) TO anon, authenticated;

-- ── get_statistici_emailuri_auth() ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_statistici_emailuri_auth()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_praguri public.auth_email_praguri%ROWTYPE;
    v_pe_tip jsonb;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Acces interzis' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_praguri FROM public.auth_email_praguri WHERE id = 1;

    SELECT COALESCE(jsonb_object_agg(tip, n), '{}'::jsonb) INTO v_pe_tip
    FROM (
        SELECT tip, count(*) AS n
        FROM public.auth_email_events
        WHERE reusit = true AND created_at > now() - interval '24 hours'
        GROUP BY tip
    ) sub;

    RETURN jsonb_build_object(
        'trimise_ultima_ora', (SELECT count(*) FROM public.auth_email_events WHERE reusit = true AND created_at > now() - interval '1 hour'),
        'trimise_ultimele_24h', (SELECT count(*) FROM public.auth_email_events WHERE reusit = true AND created_at > now() - interval '24 hours'),
        'esuate_ultimele_24h', (SELECT count(*) FROM public.auth_email_events WHERE reusit = false AND created_at > now() - interval '24 hours'),
        'prag_ora', v_praguri.prag_ora,
        'prag_zi', v_praguri.prag_zi,
        'praguri_actualizate_la', v_praguri.actualizat_la,
        'pe_tip_24h', v_pe_tip
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_statistici_emailuri_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_statistici_emailuri_auth() TO authenticated;
