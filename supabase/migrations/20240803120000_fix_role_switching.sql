-- =================================================================
-- Remediere Comutare Rol (Context Switching)
-- v1.0
-- =================================================================
-- Scop: Înlocuiește funcția RPC `set_active_role` cu una nouă, `set_active_context`,
-- care acceptă și `p_sportiv_id` pentru a identifica unic contextul dorit.
-- Acest lucru rezolvă o problemă în care, pentru utilizatorii cu roluri
-- multiple în cluburi diferite, sistemul nu putea determina ce `club_id`
-- să stocheze în JWT, ducând la erori de RLS.
-- Noua funcție actualizează direct metadatele din `auth.users`,
-- eliminând dependența de triggere complexe și predispuse la erori.
-- =================================================================

-- Șterge funcția veche pentru a evita confuzia
DROP FUNCTION IF EXISTS public.set_active_role(p_role_name text);

-- Creează noua funcție RPC
CREATE OR REPLACE FUNCTION public.set_active_context(p_sportiv_id uuid, p_rol_denumire text)
RETURNS void AS $$
DECLARE
  target_club_id uuid;
  roles_array text[];
BEGIN
  -- 1. Actualizează tabela `sportivi` pentru a persista contextul activ
  -- Aceasta asigură că la următorul login, contextul corect este preluat.
  UPDATE public.sportivi
  SET rol_activ_context = p_rol_denumire
  WHERE id = p_sportiv_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profilul de sportiv nu a fost găsit sau nu aveți permisiunea de a-l modifica.';
  END IF;

  -- 2. Obține `club_id`-ul din profilul de sportiv specificat și
  --    colectează toate rolurile disponibile pentru utilizator.
  SELECT club_id INTO target_club_id FROM public.sportivi WHERE id = p_sportiv_id;
  
  SELECT array_agg(rol_denumire)
  INTO roles_array
  FROM public.utilizator_roluri_multicont
  WHERE user_id = auth.uid();

  -- 3. Actualizează direct metadatele din `auth.users` pentru sesiunea curentă.
  -- Acest pas este esențial pentru ca modificările să aibă efect imediat
  -- după reîmprospătarea token-ului JWT (prin reîncărcarea paginii).
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'club_id', target_club_id,          -- ID-ul clubului din contextul selectat
    'rol_activ_context', p_rol_denumire, -- Numele rolului din contextul selectat
    'roles', COALESCE(roles_array, '{}')  -- Lista completă de roluri
  )
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
