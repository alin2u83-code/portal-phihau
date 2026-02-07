-- ====================================================================
-- Sincronizare Metadate Utilizator pentru Optimizare RLS
-- v3.0 - Bazat pe `is_primary` ca sursă de adevăr
-- ====================================================================
-- Scop: La fiecare modificare în `utilizator_roluri_multicont`, acest trigger
-- identifică contextul marcat ca `is_primary = true`, extrage `club_id`
-- și `rol_denumire` din acel rând și le sincronizează în `raw_user_meta_data`.
-- Acest mecanism asigură că JWT-ul conține întotdeauna contextul activ corect
-- pentru politicile RLS, eliminând necesitatea coloanei `rol_activ_context`
-- de pe tabela `sportivi` ca sursă de adevăr.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.sync_user_metadata_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  primary_context RECORD;
  roles_array text[];
BEGIN
  -- Determină ID-ul utilizatorului afectat de operațiune
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Găsește contextul primar pentru utilizator (cel marcat cu is_primary = true)
  SELECT rol_denumire, club_id, sportiv_id INTO primary_context
  FROM public.utilizator_roluri_multicont
  WHERE user_id = target_user_id AND is_primary = true
  LIMIT 1;
  
  -- Fallback: Dacă niciun context nu este primar, alege cel mai vechi rol creat
  IF NOT FOUND THEN
    SELECT rol_denumire, club_id, sportiv_id INTO primary_context
    FROM public.utilizator_roluri_multicont
    WHERE user_id = target_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Colectează toate rolurile disponibile pentru utilizator
  SELECT array_agg(DISTINCT rol_denumire) INTO roles_array
  FROM public.utilizator_roluri_multicont
  WHERE user_id = target_user_id;

  -- Actualizează metadatele în `auth.users`
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'club_id', primary_context.club_id,
    'sportiv_id', primary_context.sportiv_id,
    'rol_activ_context', primary_context.rol_denumire,
    'roles', COALESCE(roles_array, '{}')
  )
  WHERE id = target_user_id;

  RETURN NULL; -- Valoarea returnată este ignorată pentru trigger-ele AFTER
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Șterge triggerele vechi pentru a asigura o reinstalare curată
DROP TRIGGER IF EXISTS on_sportivi_profile_change_sync_user_meta ON public.sportivi;
DROP TRIGGER IF EXISTS on_multicont_roles_change_sync_user_meta ON public.utilizator_roluri_multicont;
DROP TRIGGER IF EXISTS on_user_roles_change_sync_user_meta ON public.utilizator_roluri_multicont;


-- Creează un singur trigger robust pe sursa de adevăr: `utilizator_roluri_multicont`
-- Se declanșează la orice operațiune care ar putea afecta rolul activ sau lista de roluri.
CREATE TRIGGER on_user_roles_change_sync_user_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.utilizator_roluri_multicont
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();