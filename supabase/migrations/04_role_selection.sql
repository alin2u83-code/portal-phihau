-- =================================================================
-- Remediere Comutare Rol (Context Switching) v2.0
-- =================================================================
-- Scop: Înlocuiește funcția RPC veche cu una nouă, `set_primary_context`,
-- care actualizează direct flag-ul `is_primary` în `utilizator_roluri_multicont`.
-- Aceasta devine singura sursă de adevăr pentru rolul activ.
-- Operațiunea este atomică: resetează toate rolurile la `false`, apoi
-- setează noul rol la `true`.
-- Acest mecanism declanșează automat trigger-ul `sync_user_metadata_from_profile`,
-- care va citi noul rol primar și va actualiza JWT-ul.
-- =================================================================

-- Șterge funcția veche pentru a evita confuzia
DROP FUNCTION IF EXISTS public.set_active_role(text);

-- Creează noua funcție RPC
CREATE OR REPLACE FUNCTION public.set_primary_context(p_sportiv_id uuid, p_rol_denumire text)
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  target_context_id uuid;
BEGIN
  -- Pas 1: Găsește ID-ul unic al contextului pe baza profilului de sportiv și a numelui rolului
  SELECT id INTO target_context_id
  FROM public.utilizator_roluri_multicont
  WHERE user_id = v_user_id
    AND sportiv_id = p_sportiv_id
    AND rol_denumire = p_rol_denumire
  LIMIT 1;

  IF target_context_id IS NULL THEN
    RAISE EXCEPTION 'Contextul specificat nu a fost găsit pentru acest utilizator.';
  END IF;

  -- Pas 2: Actualizează atomic flag-urile `is_primary`
  -- Toate rândurile pentru utilizator devin `false`, cu excepția celui vizat.
  UPDATE public.utilizator_roluri_multicont
  SET is_primary = (id = target_context_id)
  WHERE user_id = v_user_id;
  
  -- Trigger-ul `on_user_roles_change_sync_user_meta` de pe tabela `utilizator_roluri_multicont`
  -- va fi declanșat automat de acest UPDATE, sincronizând metadatele în JWT.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;