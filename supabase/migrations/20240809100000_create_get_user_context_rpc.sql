-- =================================================================
-- Funcție RPC pentru Preluarea Contextului Utilizatorului
-- v1.0
-- =================================================================
-- Scop: Înlocuiește interogarea directă a vederii 'v_user_access'
-- cu o funcție RPC dedicată. Aceasta returnează un singur rând
-- (ca obiect JSON) cu toate detaliile de profil și rolurile agregate pentru
-- utilizatorul autentificat curent.
--
-- Avantaje:
-- - Simplifică logica din frontend la un singur apel RPC.
-- - Acționează ca un API stabil, decuplând frontend-ul de
--   structura internă a vederii sau a tabelelor.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS json
LANGUAGE sql
STABLE -- Funcția nu modifică date, doar le citește
SECURITY INVOKER -- Rulează cu permisiunile apelantului pentru a respecta RLS
AS $$
    SELECT row_to_json(t)
    FROM (
        SELECT
            s.*,
            c.nume AS club_nume,
            (
                SELECT array_agg(ur.rol_denumire)
                FROM public.utilizator_roluri_multicont ur
                WHERE ur.user_id = s.user_id
            ) AS roles_list
        FROM
            public.sportivi s
        LEFT JOIN
            public.cluburi c ON s.club_id = c.id
        WHERE
            s.user_id = auth.uid()
        LIMIT 1
    ) t;
$$;
