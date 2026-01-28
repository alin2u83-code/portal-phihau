-- ====================================================================
-- Sincronizare Metadate Utilizator pentru Optimizare RLS
-- ====================================================================
-- Scop: La fiecare modificare a clubului sau rolurilor unui sportiv,
-- se copiază `club_id` și lista de roluri în `raw_user_meta_data`
-- din `auth.users`. Acest lucru permite politicilor RLS să citească
-- datele direct din JWT (via `auth.jwt()`) fără a interoga tabelele
-- publice, evitând astfel eroarea de 'infinite recursion'.
-- ====================================================================

-- Pasul 1: Crearea funcției de trigger
-- Această funcție este concepută pentru a fi apelată de triggere
-- definite pe tabelele `sportivi` și `sportivi_roluri`.
-- `SECURITY DEFINER` este esențial, permițând funcției să scrie
-- în schema `auth`, o acțiune interzisă utilizatorilor normali.

CREATE OR REPLACE FUNCTION public.sync_user_metadata_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_sportiv_id uuid;
  target_user_id uuid;
  target_club_id uuid;
  roles_array text[];
BEGIN
  -- Determină ID-ul sportivului afectat de operațiunea curentă
  -- (INSERT, UPDATE sau DELETE pe `sportivi` sau `sportivi_roluri`)
  IF TG_TABLE_NAME = 'sportivi' THEN
    target_sportiv_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    target_sportiv_id := OLD.sportiv_id;
  ELSE -- INSERT sau UPDATE pe `sportivi_roluri`
    target_sportiv_id := NEW.sportiv_id;
  END IF;

  -- Obține user_id și club_id din tabelul `sportivi`
  SELECT user_id, club_id INTO target_user_id, target_club_id
  FROM public.sportivi
  WHERE id = target_sportiv_id;
  
  -- Dacă nu există un user_id asociat (sportiv fără cont), ieșim din funcție
  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Colectează toate rolurile actuale pentru sportivul respectiv
  SELECT array_agg(r.nume)
  INTO roles_array
  FROM public.sportivi_roluri sr
  JOIN public.roluri r ON sr.rol_id = r.id
  WHERE sr.sportiv_id = target_sportiv_id;

  -- Actualizează metadatele în `auth.users`
  -- Operatorul `||` face un "merge" JSON, păstrând alte metadate care ar putea exista deja.
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'club_id', target_club_id,
    'roles', COALESCE(roles_array, '{}') -- Asigură un array gol în loc de NULL
  )
  WHERE id = target_user_id;

  RETURN NULL; -- Valoarea returnată este ignorată pentru trigger-ele AFTER
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Pasul 2: Crearea trigger-elor
-- Se șterg triggerele vechi, dacă există, pentru a asigura o reinstalare curată.

DROP TRIGGER IF EXISTS on_sportivi_club_change_sync_user_meta ON public.sportivi;
DROP TRIGGER IF EXISTS on_sportivi_roluri_change_sync_user_meta ON public.sportivi_roluri;

-- Trigger 1: Se declanșează când se adaugă un sportiv nou (cu user_id) sau i se schimbă `club_id`-ul.
CREATE TRIGGER on_sportivi_club_change_sync_user_meta
  AFTER INSERT OR UPDATE OF club_id ON public.sportivi
  FOR EACH ROW
  -- Se execută doar dacă sportivul are un cont de autentificare asociat
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();

-- Trigger 2: Se declanșează când se modifică (adaugă, editează, șterge) rolurile unui sportiv.
CREATE TRIGGER on_sportivi_roluri_change_sync_user_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.sportivi_roluri
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();

-- Notă: Acum, politicile RLS pot fi simplificate folosind:
-- `(auth.jwt() ->> 'club_id')::uuid` pentru a obține club_id
-- `(auth.jwt() -> 'roles') ?& array['Instructor', 'Admin Club']` pentru a verifica rolurile
-- Acest lucru elimină necesitatea funcțiilor helper (ex: is_club_staff, get_my_club_id) în RLS, rezolvând eroarea de recursivitate.
