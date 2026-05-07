-- Indecsi pentru EXISTS subquery-urile din Select_Sportivi_Unified.
-- Fara acesti indecsi, fiecare SELECT pe sportivi rula seq scan pe inscrieri_competitie
-- si echipa_sportivi pentru fiecare rand — cauza principala a incarcarii lente.

CREATE INDEX IF NOT EXISTS idx_inscrieri_competitie_sportiv_id
    ON public.inscrieri_competitie(sportiv_id);

CREATE INDEX IF NOT EXISTS idx_echipa_sportivi_sportiv_id
    ON public.echipa_sportivi(sportiv_id);
