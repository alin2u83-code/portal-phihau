-- =================================================================
-- Funcție RPC pentru Context de Autentificare
-- v1.0
-- =================================================================
-- Scop: Returnează un obiect JSON cu contextul de securitate
-- al utilizatorului curent: dacă este admin, lista rolurilor sale
-- și ID-ul clubului primar.
-- Aceasta devine sursa unică de adevăr la login.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_user_auth_context()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER -- Rulează cu permisiunile apelantului pentru a respecta RLS
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_roles text[];
  v_primary_club_id uuid;
BEGIN
  -- Verifică dacă utilizatorul are orice rol de tip staff
  SELECT EXISTS (
    SELECT 1
    FROM public.utilizator_roluri_multicont
    WHERE user_id = v_user_id
    AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'Instructor')
  ) INTO v_is_admin;

  -- Preia toate denumirile unice de roluri pentru utilizator
  SELECT array_agg(DISTINCT rol_denumire)
  INTO v_roles
  FROM public.utilizator_roluri_multicont
  WHERE user_id = v_user_id;

  -- Preia club_id-ul din contextul marcat ca primar
  SELECT club_id
  INTO v_primary_club_id
  FROM public.utilizator_roluri_multicont
  WHERE user_id = v_user_id AND is_primary = true
  LIMIT 1;

  -- Fallback dacă niciun context nu este setat ca primar
  IF v_primary_club_id IS NULL THEN
    SELECT club_id
    INTO v_primary_club_id
    FROM public.utilizator_roluri_multicont
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  RETURN json_build_object(
    'is_admin', v_is_admin,
    'roles', COALESCE(v_roles, '{}'),
    'primaryClubId', v_primary_club_id
  );
END;
$$;
