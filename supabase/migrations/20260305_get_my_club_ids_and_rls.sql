-- Migration: Fix RLS and Functions for Club Phi Hau
-- 1. SQL Function get_my_club_ids()
-- Adăugat SECURITY DEFINER pentru a evita problemele de permisiuni RLS la citirea rolurilor
CREATE OR REPLACE FUNCTION public.get_my_club_ids()
RETURNS uuid[] 
LANGUAGE sql 
SECURITY DEFINER 
STABLE 
SET search_path = public -- Securizează funcția
AS $$
    SELECT COALESCE(array_agg(club_id), '{}'::uuid[])
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('INSTRUCTOR', 'ADMIN_CLUB');
$$;

-- 2. RLS Policies for PLATI
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;

CREATE POLICY "Staff - Full Access Plati" ON public.plati
FOR ALL 
TO authenticated
USING (
    club_id ANY (public.get_my_club_ids()) -- Mult mai rapid decât EXISTS
    OR 
    public.is_super_admin() -- Folosim funcția helper existentă
);

-- 3. RLS Policies for GRUPE
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Grupe" ON public.grupe;

CREATE POLICY "Staff - Full Access Grupe" ON public.grupe
FOR ALL 
TO authenticated
USING (
    club_id = ANY(public.get_my_club_ids())
    OR 
    public.is_super_admin()
);

-- 4. RLS Policies for EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;

CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL 
TO authenticated
USING (
    club_id = ANY(public.get_my_club_ids())
    OR 
    public.is_super_admin()
);

-- 5. IMPORTANT: Permisiuni pentru tabelul de roluri (Sursa erorii 42501)
-- Dacă acest tabel are RLS activ și politicile sunt greșite, restul pică.
ALTER TABLE public.utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Utilizatorii isi vad propriile roluri" ON public.utilizator_roluri_multicont;

CREATE POLICY "Utilizatorii isi vad propriile roluri" 
ON public.utilizator_roluri_multicont
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());