-- Quick 261111-pza -> reproiectat Faza 39 (D-08): doar proprietarul aplicatiei.
-- Reproiectat Faza 39 (D-08): managementul se acorda pe contul de club, vezi 20261111e.
-- NEAPLICATA LIVE la scrierea fisierului (verificat 11.11.2026: proprietari_aplicatie / este_proprietar() nu exista live).
-- supabase/ e gitignored -> `git add -f`.
--
-- Au fost eliminate (nu fusesera aplicate niciodata): acces_management_acordat, acorda_acces_management,
-- revoca_acces_management, acces_management_stare (modelul per grant din acces_competitie_extern).
--
-- Nota FORCE: proprietari_aplicatie NU are FORCE ROW LEVEL SECURITY. Cu FORCE si fara nicio politica, o functie
-- SECURITY DEFINER (este_proprietar) ar rula sub RLS si ar vedea zero randuri -> ar intoarce mereu false
-- (vezi feedback_rls_force_security_definer_recursion). Acces direct: REVOKE ALL pentru PUBLIC/anon/authenticated.

-- 1. Proprietari ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proprietari_aplicatie (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    creat_la timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proprietari_aplicatie ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.proprietari_aplicatie FROM PUBLIC, anon, authenticated;
-- endpoint-urile serverless (39-02) verifica proprietarul cu service role
GRANT SELECT ON public.proprietari_aplicatie TO service_role;

INSERT INTO public.proprietari_aplicatie (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'alin2u83@gmail.com'
ON CONFLICT DO NOTHING;

-- 2. este_proprietar() -------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.este_proprietar()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
    SELECT EXISTS (SELECT 1 FROM public.proprietari_aplicatie WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.este_proprietar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.este_proprietar() TO authenticated, service_role;

-- Rollback:
--   DROP FUNCTION public.este_proprietar(); DROP TABLE public.proprietari_aplicatie;
