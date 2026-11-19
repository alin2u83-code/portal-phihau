-- Quick 261119-ihl, Val 1b: unicitate CIF pe tabelul nou (UNIQUE-ul vechi e pe cluburi.cif, care nu mai e scris de UI).
-- STARE: APLICAT pe live 19.11.2026 (0 duplicate verificat inainte). Valorile NULL nu se constrang (index partial).
-- ROLLBACK: DROP INDEX public.cluburi_detalii_cif_unic;
CREATE UNIQUE INDEX cluburi_detalii_cif_unic ON public.cluburi_detalii (cif) WHERE cif IS NOT NULL;
