-- =================================================================
-- Tabelă și Politici pentru Abonamente Push Notificări
-- v1.0
-- =================================================================
-- Scop: Creează tabela `push_subscriptions` pentru a stoca endpoint-urile
-- de notificare ale utilizatorilor și aplică politici de securitate
-- pentru a asigura că fiecare utilizator își poate gestiona doar
-- propriile abonamente.
-- =================================================================

-- Creează tabela `push_subscriptions`
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adaugă un index pentru căutări rapide după user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Documentație pentru coloane
COMMENT ON TABLE public.push_subscriptions IS 'Stochează abonamentele pentru notificări push ale utilizatorilor.';
COMMENT ON COLUMN public.push_subscriptions.user_id IS 'ID-ul utilizatorului din auth.users. Unic pentru a permite upsert-uri simple.';
COMMENT ON COLUMN public.push_subscriptions.subscription IS 'Obiectul de abonament generat de browser (include endpoint, keys etc.)';

-- Aplică politici de securitate (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;

-- Resetează politicile existente pentru a asigura o stare curată
DO $$
BEGIN
   IF EXISTS (SELECT FROM pg_proc WHERE proname = 'reset_all_policies_for_table') THEN
      CALL public.reset_all_policies_for_table('push_subscriptions');
   END IF;
END;
$$;

-- Politica 1: Utilizatorii își pot gestiona propriile abonamente.
-- Le permite să insereze, să vadă, să actualizeze sau să șteargă
-- doar rândurile care corespund propriului lor auth.uid().
CREATE POLICY "Utilizatorii își gestionează propriile abonamente push"
ON public.push_subscriptions
FOR ALL
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Nu este necesară o politică de admin, deoarece funcțiile server-side (Edge Functions)
-- vor folosi cheia de serviciu (service_role_key) care ocolește RLS.