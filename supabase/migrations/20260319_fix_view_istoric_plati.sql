-- =====================================================
-- MIGRATION: Fix view_istoric_plati_detaliat
-- Problema: view-ul nu includea campuri necesare:
--   - nume_complet_sportiv (era null mereu)
--   - suma_datorata, total_incasat, rest_de_plata
--   - suma_incasata, metoda_plata (din tranzactii)
--   - tranzactie_id, data_emitere, data_plata_string
-- =====================================================

DROP VIEW IF EXISTS public.view_istoric_plati_detaliat CASCADE;

CREATE OR REPLACE VIEW public.view_istoric_plati_detaliat AS
SELECT
    p.id AS plata_id,
    p.sportiv_id,
    p.familie_id,
    -- Numele complet al sportivului
    CASE
        WHEN s.id IS NOT NULL THEN s.nume || ' ' || s.prenume
        WHEN f.id IS NOT NULL THEN f.nume
        ELSE NULL
    END AS nume_complet_sportiv,
    p.descriere,
    -- Suma totala a platii (datorata)
    COALESCE(p.suma, 0) AS suma_datorata,
    p.status,
    -- Data emiterii platii
    (p.data)::text AS data_emitere,
    -- Suma totala incasata prin tranzactii
    COALESCE(SUM(t.suma), 0) AS total_incasat,
    -- Rest de plata
    GREATEST(COALESCE(p.suma, 0) - COALESCE(SUM(t.suma), 0), 0) AS rest_de_plata,
    -- Ultima tranzactie asociata
    MAX(t.id) AS tranzactie_id,
    -- Data ultimei plati (din tranzactii)
    MAX(t.data_tranzactie)::text AS data_plata_string,
    -- Suma incasata (ultima tranzactie sau total)
    COALESCE(SUM(t.suma), 0) AS suma_incasata,
    -- Metoda de plata (din ultima tranzactie)
    (SELECT t2.metoda_plata FROM public.tranzactii t2 WHERE t2.plata_id = p.id ORDER BY t2.data_tranzactie DESC LIMIT 1) AS metoda_plata,
    COALESCE(p.club_id, s.club_id) AS club_id
FROM public.plati p
LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
LEFT JOIN public.familii f ON p.familie_id = f.id
LEFT JOIN public.tranzactii t ON t.plata_id = p.id
WHERE COALESCE(p.club_id, s.club_id) = public.get_active_club_id() OR public.is_super_admin()
GROUP BY
    p.id,
    p.sportiv_id,
    p.familie_id,
    s.id,
    s.nume,
    s.prenume,
    f.id,
    f.nume,
    p.descriere,
    p.suma,
    p.status,
    p.data,
    p.club_id,
    s.club_id;

GRANT SELECT ON public.view_istoric_plati_detaliat TO authenticated;
REVOKE ALL ON public.view_istoric_plati_detaliat FROM anon;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260319_fix_view_istoric_plati applied. view_istoric_plati_detaliat rebuilt with all required fields.';
END $$;
