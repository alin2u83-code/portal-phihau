-- Refactorizări Sugerate pentru Baza de Date

-- 1. Adăugarea coloanelor club_id și reprezentant_id în tabelul familii
-- Acest lucru permite filtrarea familiilor per club și desemnarea unui contact principal.
ALTER TABLE public.familii ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.cluburi(id);
ALTER TABLE public.familii ADD COLUMN IF NOT EXISTS reprezentant_id UUID REFERENCES public.sportivi(id);

-- 2. Indexare pentru performanță
CREATE INDEX IF NOT EXISTS idx_familii_club_id ON public.familii(club_id);
CREATE INDEX IF NOT EXISTS idx_sportivi_familie_id ON public.sportivi(familie_id);

-- 3. Constrângere pentru a asigura că reprezentantul aparține familiei (Opțional, necesită trigger)
-- Momentan gestionat în UI, dar un trigger ar fi mai sigur.

-- 4. Sugestie: Tabel pentru "Conturi de Facturare" (Billing Accounts)
-- În loc să avem sportiv_id și familie_id în plati/tranzactii, am putea avea:
-- CREATE TABLE public.conturi_facturare (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     tip TEXT CHECK (tip IN ('SPORTIV', 'FAMILIE')),
--     sportiv_id UUID REFERENCES public.sportivi(id),
--     familie_id UUID REFERENCES public.familii(id),
--     sold NUMERIC DEFAULT 0
-- );
-- Aceasta ar simplifica enorm logica financiară.
