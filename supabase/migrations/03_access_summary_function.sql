-- ====================================================================
-- Funcție de diagnosticare pentru RLS
-- ====================================================================
-- Scop: Returnează un sumar al numărului de înregistrări vizibile
-- pentru utilizatorul curent, conform politicilor de securitate (RLS) active.
-- Aceasta este utilă pentru a diagnostica rapid dacă un utilizator
-- vede setul de date corect.
--
-- Notă: Această funcție este definită cu `SECURITY INVOKER` (implicit).
-- Acest lucru este INTENȚIONAT și CORECT pentru scopul de diagnosticare.
-- O funcție `SECURITY INVOKER` rulează cu permisiunile utilizatorului care o APELEAZĂ,
-- permițându-ne să vedem exact câte înregistrări poate accesa un anumit rol, conform politicilor RLS.
--
-- O funcție `SECURITY DEFINER`, pe de altă parte, ar rula cu permisiunile DEFINITORULUI
-- (de obicei, un super-administrator), ar ignora politicile RLS ale apelantului și ar returna
-- numărul total de înregistrări din tabel, făcând-o inutilă pentru depanarea problemelor de permisiuni.
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