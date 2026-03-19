-- =====================================================
-- MIGRATION: Fix view_istoric_plati_detaliat
-- Problema: view-ul nu includea campuri necesare.
-- Nota: tranzactii.plata_ids este UUID[] (array), nu UUID
-- =====================================================

DROP VIEW IF EXISTS public.view_istoric_plati_detaliat CASCADE;

CREATE OR REPLACE VIEW public.view_istoric_plati_detaliat AS
SELECT
    p.id AS plata_id,
    p.sportiv_id,
    p.familie_id,
    CASE
        WHEN s.id IS NOT NULL THEN s.nume || ' ' || s.prenume
        WHEN f.id IS NOT NULL THEN f.nume
        ELSE NULL
    END AS nume_complet_sportiv,
    p.descriere,
    COALESCE(p.suma, 0) AS suma_datorata,
    p.status,
    (p.data)::text AS data_emitere,
    -- Total incasat prin tranzactii (suma_alocata din tranzactie_plata daca exista, altfel din tranzactii.plata_ids)
    COALESCE(
        (SELECT SUM(tp.suma_alocata)
         FROM public.tranzactie_plata tp
         WHERE tp.plata_id = p.id),
        (SELECT SUM(t.suma)
         FROM public.tranzactii t
         WHERE p.id = ANY(t.plata_ids)),
        0
    ) AS total_incasat,
    -- Rest de plata
    GREATEST(
        COALESCE(p.suma, 0) - COALESCE(
            (SELECT SUM(tp.suma_alocata) FROM public.tranzactie_plata tp WHERE tp.plata_id = p.id),
            (SELECT SUM(t.suma) FROM public.tranzactii t WHERE p.id = ANY(t.plata_ids)),
            0
        ),
        0
    ) AS rest_de_plata,
    -- ID ultima tranzactie
    COALESCE(
        (SELECT t.id FROM public.tranzactii t JOIN public.tranzactie_plata tp ON tp.tranzactie_id = t.id WHERE tp.plata_id = p.id ORDER BY t.data_tranzactie DESC LIMIT 1),
        (SELECT t.id FROM public.tranzactii t WHERE p.id = ANY(t.plata_ids) ORDER BY t.data_tranzactie DESC LIMIT 1)
    ) AS tranzactie_id,
    -- Data ultimei plati
    COALESCE(
        (SELECT t.data_tranzactie::text FROM public.tranzactii t JOIN public.tranzactie_plata tp ON tp.tranzactie_id = t.id WHERE tp.plata_id = p.id ORDER BY t.data_tranzactie DESC LIMIT 1),
        (SELECT t.data_tranzactie::text FROM public.tranzactii t WHERE p.id = ANY(t.plata_ids) ORDER BY t.data_tranzactie DESC LIMIT 1)
    ) AS data_plata_string,
    -- Suma incasata (aceeasi ca total_incasat)
    COALESCE(
        (SELECT SUM(tp.suma_alocata) FROM public.tranzactie_plata tp WHERE tp.plata_id = p.id),
        (SELECT SUM(t.suma) FROM public.tranzactii t WHERE p.id = ANY(t.plata_ids)),
        0
    ) AS suma_incasata,
    -- Metoda de plata din ultima tranzactie
    COALESCE(
        (SELECT t.metoda_plata FROM public.tranzactii t JOIN public.tranzactie_plata tp ON tp.tranzactie_id = t.id WHERE tp.plata_id = p.id ORDER BY t.data_tranzactie DESC LIMIT 1),
        (SELECT t.metoda_plata FROM public.tranzactii t WHERE p.id = ANY(t.plata_ids) ORDER BY t.data_tranzactie DESC LIMIT 1)
    ) AS metoda_plata,
    COALESCE(p.club_id, s.club_id) AS club_id
FROM public.plati p
LEFT JOIN public.sportivi s ON p.sportiv_id = s.id
LEFT JOIN public.familii f ON p.familie_id = f.id
WHERE COALESCE(p.club_id, s.club_id) = public.get_active_club_id() OR public.is_super_admin();

GRANT SELECT ON public.view_istoric_plati_detaliat TO authenticated;
REVOKE ALL ON public.view_istoric_plati_detaliat FROM anon;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'view_istoric_plati_detaliat rebuilt with correct tranzactii joins.';
END $$;
