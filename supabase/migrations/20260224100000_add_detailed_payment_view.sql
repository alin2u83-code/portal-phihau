-- =================================================================
-- View: view_istoric_plati_detaliat
-- Scop: Oferă un istoric detaliat al plăților și tranzacțiilor asociate.
-- =================================================================

CREATE OR REPLACE VIEW public.view_istoric_plati_detaliat AS
WITH plati_calculate AS (
    SELECT 
        p.id AS plata_id,
        p.sportiv_id,
        p.familie_id,
        p.descriere,
        p.suma AS suma_datorata,
        p.status,
        p.data AS data_emitere,
        COALESCE((
            SELECT SUM(t.suma) 
            FROM public.tranzactii t 
            WHERE p.id = ANY(t.plata_ids)
        ), 0) AS total_incasat
    FROM public.plati p
)
SELECT 
    pc.plata_id,
    pc.sportiv_id,
    pc.familie_id,
    COALESCE(s.nume || ' ' || s.prenume, 'Familia ' || f.nume) AS nume_complet,
    pc.descriere,
    pc.suma_datorata,
    pc.status,
    pc.data_emitere,
    pc.total_incasat,
    (pc.suma_datorata - pc.total_incasat) AS rest_de_plata,
    t.id AS tranzactie_id,
    t.data_platii AS data_plata,
    t.suma AS suma_incasata,
    t.metoda_plata
FROM plati_calculate pc
LEFT JOIN public.sportivi s ON pc.sportiv_id = s.id
LEFT JOIN public.familii f ON pc.familie_id = f.id
LEFT JOIN public.tranzactii t ON pc.plata_id = ANY(t.plata_ids)
ORDER BY pc.data_emitere DESC, t.data_platii DESC;

-- Acordă permisiuni de citire pentru toți utilizatorii autentificați (RLS va filtra datele)
GRANT SELECT ON public.view_istoric_plati_detaliat TO authenticated;
