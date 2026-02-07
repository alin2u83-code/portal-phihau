-- =================================================================
-- Funcție RPC pentru Obținerea Contextului Primar
-- v1.0
-- =================================================================
-- Scop: Returnează un obiect JSON care conține detaliile contextului
-- marcat ca `is_primary = true` pentru utilizatorul curent.
-- Utilizat de hook-ul `useClubFilter` pentru a determina clubul activ
-- fără a necesita transmiterea contextului prin props.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_primary_user_context()
RETURNS jsonb -- Folosim jsonb pentru performanță
LANGUAGE sql
STABLE
SECURITY INVOKER -- Rulează cu permisiunile utilizatorului pentru a respecta RLS
AS $$
    SELECT
        jsonb_build_object(
            'active_club_id', club_id,
            'active_role', rol_denumire,
            'active_sportiv_id', sportiv_id
        )
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid() AND is_primary = true
    LIMIT 1;
$$;
