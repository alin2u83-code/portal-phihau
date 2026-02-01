-- ====================================================================
-- Sincronizare Metadate Utilizator pentru Optimizare RLS
-- v2.0 - Include `rol_activ_context`
-- ====================================================================
-- Scop: La fiecare modificare a clubului, rolurilor sau rolului activ
-- al unui sportiv, se copiază aceste date critice în `raw_user_meta_data`
-- din `auth.users`. Acest lucru permite politicilor RLS să citească
-- datele direct din JWT (via `auth.jwt()`) fără a interoga tabelele
-- publice, evitând astfel eroarea de 'infinite recursion'.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.sync_user_metadata_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_sportiv_id uuid;
  target_user_id uuid;
  target_club_id uuid;
  target_rol_activ text;
  roles_array text[];
BEGIN
  -- Determină ID-ul sportivului afectat de operațiune
  IF TG_TABLE_NAME = 'sportivi' THEN
    target_sportiv_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_sportiv_id := COALESCE(NEW.sportiv_id, OLD.sportiv_id);
  END IF;

  -- Obține datele relevante din profilul sportivului
  SELECT user_id, club_id, rol_activ_context INTO target_user_id, target_club_id, target_rol_activ
  FROM public.sportivi
  WHERE id = target_sportiv_id;
  
  -- Dacă nu există un cont de autentificare asociat, ieșim
  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Colectează toate rolurile din noua tabelă multi-cont
  SELECT array_agg(rol_denumire)
  INTO roles_array
  FROM public.utilizator_roluri_multicont
  WHERE user_id = target_user_id;

  -- Actualizează metadatele în `auth.users`
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'club_id', target_club_id,
    'rol_activ_context', target_rol_activ, -- Câmpul adăugat pentru context
    'roles', COALESCE(roles_array, '{}')
  )
  WHERE id = target_user_id;

  RETURN NULL; -- Valoarea returnată este ignorată pentru trigger-ele AFTER
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Șterge triggerele vechi pentru a asigura o reinstalare curată
DROP TRIGGER IF EXISTS on_sportivi_club_change_sync_user_meta ON public.sportivi;
DROP TRIGGER IF EXISTS on_sportivi_roluri_change_sync_user_meta ON public.sportivi_roluri;
DROP TRIGGER IF EXISTS on_multicont_roles_change_sync_user_meta ON public.utilizator_roluri_multicont;


-- Trigger 1: Se declanșează la schimbarea clubului SAU a rolului activ pe profilul sportivului.
CREATE TRIGGER on_sportivi_profile_change_sync_user_meta
  AFTER INSERT OR UPDATE OF club_id, rol_activ_context ON public.sportivi
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();

-- Trigger 2: Se declanșează la orice modificare în tabela de roluri multi-cont.
CREATE TRIGGER on_multicont_roles_change_sync_user_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.utilizator_roluri_multicont
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();
