-- Functie RPC pentru a seta contextul principal al utilizatorului daca acesta lipseste
CREATE OR REPLACE FUNCTION set_primary_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  primary_role_context json;
BEGIN
  -- Selecteaza contextul primar sau primul disponibil pentru utilizatorul curent
  SELECT json_build_object('id', id, 'club_id', club_id, 'rol_denumire', rol_denumire)
  INTO primary_role_context
  FROM public.utilizator_roluri_multicont
  WHERE user_id = auth.uid()
  ORDER BY is_primary DESC, created_at ASC
  LIMIT 1;

  -- Daca un context a fost gasit, actualizeaza metadatele utilizatorului
  IF primary_role_context IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('rol_activ_context', primary_role_context)
    WHERE id = auth.uid();
  END IF;

  RETURN primary_role_context;
END;
$$;
