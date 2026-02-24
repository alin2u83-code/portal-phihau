-- =================================================================
-- Data Integrity Enhancement for `plati` table
-- =================================================================
-- Scop: Asigură că fiecare înregistrare de plată este asociată
-- fie cu un sportiv, fie cu o familie, prevenind datele orfane.
-- =================================================================

-- Adăugarea unei constrângeri CHECK la tabela `plati`
-- Această constrângere impune ca cel puțin una dintre coloanele
-- `sportiv_id` sau `familie_id` să aibă o valoare non-nulă.
ALTER TABLE public.plati
ADD CONSTRAINT chk_plata_has_owner
CHECK (sportiv_id IS NOT NULL OR familie_id IS NOT NULL);
