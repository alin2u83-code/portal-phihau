-- =================================================================
-- REVIZUIRE RLS: PLATI SI TRANZACTII
-- =================================================================
-- Obiectiv:
-- 1. Asigurarea existenței coloanei 'club_id' pe tabelele financiare.
-- 2. Restricționarea accesului pe bază de rol (Club vs Sportiv).
-- 3. Backfill date pentru coloana club_id (dacă e cazul).
-- =================================================================

-- 1. Asigurare structură (club_id)
DO $$
BEGIN
    -- Adăugare club_id la PLATI
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plati' AND column_name = 'club_id') THEN
        ALTER TABLE public.plati ADD COLUMN club_id UUID REFERENCES public.cluburi(id);
    END IF;

    -- Adăugare club_id la TRANZACTII
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tranzactii' AND column_name = 'club_id') THEN
        ALTER TABLE public.tranzactii ADD COLUMN club_id UUID REFERENCES public.cluburi(id);
    END IF;
END $$;

-- 2. Backfill date (Populare club_id din tabela sportivi pentru datele existente)
UPDATE public.plati p
SET club_id = s.club_id
FROM public.sportivi s
WHERE p.sportiv_id = s.id AND p.club_id IS NULL;

UPDATE public.tranzactii t
SET club_id = s.club_id
FROM public.sportivi s
WHERE t.sportiv_id = s.id AND t.club_id IS NULL;

-- 3. Activare RLS
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;

-- 4. Resetare politici vechi
DROP POLICY IF EXISTS "Sportiv - Vizualizare plati proprii" ON public.plati;
DROP POLICY IF EXISTS "Staff Club - Management plati" ON public.plati;
DROP POLICY IF EXISTS "Sportiv - Vizualizare tranzactii proprii" ON public.tranzactii;
DROP POLICY IF EXISTS "Staff Club - Management tranzactii" ON public.tranzactii;

-- =================================================================
-- POLITICI PENTRU PLATI
-- =================================================================

-- A. SPORTIV: Vede doar plățile proprii sau ale familiei sale
CREATE POLICY "Sportiv - Vizualizare plati proprii" ON public.plati
FOR SELECT
USING (
    (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    OR
    (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
);

-- B. STAFF CLUB (Instructor/Admin): Acces complet (CRUD) la plățile clubului lor
CREATE POLICY "Staff Club - Management plati" ON public.plati
FOR ALL
USING (
    club_id IN (
        SELECT club_id 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
    )
);

-- =================================================================
-- POLITICI PENTRU TRANZACTII
-- =================================================================

-- A. SPORTIV: Vede doar tranzacțiile proprii sau ale familiei sale
CREATE POLICY "Sportiv - Vizualizare tranzactii proprii" ON public.tranzactii
FOR SELECT
USING (
    (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    OR
    (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
);

-- B. STAFF CLUB (Instructor/Admin): Acces complet (CRUD) la tranzacțiile clubului lor
CREATE POLICY "Staff Club - Management tranzactii" ON public.tranzactii
FOR ALL
USING (
    club_id IN (
        SELECT club_id 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
    )
);
