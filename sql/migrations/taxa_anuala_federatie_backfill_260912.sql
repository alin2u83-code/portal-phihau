-- =============================================================================
-- Migration: taxa_anuala_federatie_backfill_260912.sql
-- Subiect: Backfill idempotent al celor 37 facturi FRQKD Sezonul 2025-2026
--          in noul model de date (deconturi_federatie / vize_sportivi / decont_sportivi)
-- Depinde de: taxa_anuala_federatie_schema_260912.sql (indecsii unici folositi in ON CONFLICT)
-- Sursa numerelor: 29-SCHEMA-AUDIT.md sectiunea 8 (1 club, 37 facturi, 37 sportivi distincti, 0 orfani)
-- B3: status_viza acceptat live = 'Activ' (nu 'Activa' din spec)
-- D-11: status_plata = 'In asteptare' — nu exista dovada de virament catre federatie
-- Rulare: aplicata live prin MCP Supabase apply_migration pe wuhidifzsutwgdfkwhmd
-- =============================================================================

-- Pasul 1 — decont agregat per club (an_fiscal fix 2025 pentru acest sezon istoric)
WITH sursa AS (
    SELECT * FROM public.plati
    WHERE tip = 'FRQKD' AND descriere = 'FRQKD Sezonul 2025-2026'
)
INSERT INTO public.deconturi_federatie (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata, data_generare)
SELECT
    club_id,
    2025 AS an_fiscal,
    'FRQKD' AS tip_activitate,
    sum(suma) AS suma_totala,
    count(DISTINCT sportiv_id) AS nr_participanti,
    'In asteptare' AS status_plata,
    min(data)::timestamptz AS data_generare
FROM sursa
WHERE club_id IS NOT NULL
GROUP BY club_id
ON CONFLICT (club_id, an_fiscal) DO NOTHING;

-- Pasul 2 — vize sportivi (o viza per sportiv, determinist la re-rulare)
WITH sursa AS (
    SELECT * FROM public.plati
    WHERE tip = 'FRQKD' AND descriere = 'FRQKD Sezonul 2025-2026'
)
INSERT INTO public.vize_sportivi (sportiv_id, an, status_viza, plata_id, data_platii)
SELECT DISTINCT ON (sportiv_id)
    sportiv_id,
    2025 AS an,
    'Activ' AS status_viza,
    id AS plata_id,
    data AS data_platii
FROM sursa
WHERE sportiv_id IS NOT NULL
ORDER BY sportiv_id, data ASC, id ASC
ON CONFLICT (sportiv_id, an) DO NOTHING;

-- Pasul 3 — legatura decont <-> sportiv
WITH sursa AS (
    SELECT * FROM public.plati
    WHERE tip = 'FRQKD' AND descriere = 'FRQKD Sezonul 2025-2026'
)
INSERT INTO public.decont_sportivi (decont_id, sportiv_id, an)
SELECT DISTINCT d.id, p.sportiv_id, 2025
FROM sursa p
JOIN public.deconturi_federatie d ON d.club_id = p.club_id AND d.an_fiscal = 2025
WHERE p.sportiv_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Verificari post-aplicare (rulate manual prin execute_sql)
-- -----------------------------------------------------------------------------
-- SELECT count(*) FROM public.deconturi_federatie WHERE an_fiscal = 2025; -- asteptat 1
-- SELECT nr_participanti, suma_totala, status_plata FROM public.deconturi_federatie WHERE an_fiscal = 2025; -- 37, 6120, 'In asteptare'
-- SELECT count(*) FROM public.vize_sportivi WHERE an = 2025; -- asteptat 37
-- SELECT count(*) FROM public.decont_sportivi WHERE an = 2025; -- asteptat 37
-- SELECT count(*) FROM public.plati WHERE tip='FRQKD' AND descriere='FRQKD Sezonul 2025-2026'; -- ramane 37, neatins
