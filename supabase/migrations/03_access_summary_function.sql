-- ====================================================================
-- Funcție de diagnosticare pentru RLS
-- ====================================================================
-- Scop: Returnează un sumar al numărului de înregistrări vizibile
-- pentru utilizatorul curent, conform politicilor de securitate (RLS) active.
-- Aceasta este utilă pentru a diagnostica rapid dacă un utilizator
-- vede setul de date corect.
--
-- Notă: `SECURITY INVOKER` asigură că funcția rulează cu permisiunile
-- utilizatorului care o apelează, făcând astfel ca `count(*)` să
-- respecte politicile RLS. `SECURITY DEFINER` a fost specificat, dar
-- ar rula ca proprietar și ar ignora RLS, contrazicând scopul funcției.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.check_access_summary()
RETURNS TABLE (table_name TEXT, visible_rows BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER -- Rulează cu permisiunile apelantului pentru a respecta RLS
AS $$
BEGIN
    RETURN QUERY
    SELECT 'sportivi' AS tbl_name, count(*) AS row_count FROM public.sportivi
    UNION ALL
    SELECT 'plati' AS tbl_name, count(*) AS row_count FROM public.plati
    UNION ALL
    SELECT 'prezenta_antrenament' AS tbl_name, count(*) AS row_count FROM public.prezenta_antrenament;
END;
$$;
