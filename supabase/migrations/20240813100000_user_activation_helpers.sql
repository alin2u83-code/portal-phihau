
-- =================================================================
-- Funcție RPC pentru Asignarea Rolurilor de către Admin Club
-- v1.0
-- =================================================================
-- Scop: Permite unui administrator de club să asigneze un rol
-- unui utilizator existent (care are cont în `auth.users` și profil
-- în `sportivi`). Funcția este securizată și atomică.
--
-- SECURITY DEFINER este folosit pentru a permite citirea din `auth.users`,
-- operațiune care nu este permisă rolurilor standard.
-- =================================================================

CREATE OR REPLACE FUNCTION public.assign_role_to_user(
    p_email TEXT, 
    p_rol_denumire TEXT, 
    p_admin_club_id UUID
)
RETURNS TEXT -- Returnează un mesaj de succes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_sportiv_id UUID;
  v_club_id UUID;
BEGIN
  -- Pas 1: Găsește utilizatorul în sistemul de autentificare
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: Nu există un cont de utilizator înregistrat cu acest email.';
  END IF;

  -- Pas 2: Găsește profilul de sportiv asociat utilizatorului
  SELECT id, club_id INTO v_sportiv_id, v_club_id FROM public.sportivi WHERE user_id = v_user_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: Utilizatorul există, dar nu are un profil de sportiv asociat. Creați profilul întâi.';
  END IF;

  -- Pas 3: Verificare de securitate - Adminul nu poate asigna roluri în afara clubului său.
  -- Această verificare este omisă dacă `p_admin_club_id` este NULL (ex: Super Admin).
  IF p_admin_club_id IS NOT NULL AND v_club_id <> p_admin_club_id THEN
     RAISE EXCEPTION 'PERMISSION_DENIED: Nu puteți asigna roluri pentru sportivi din alt club.';
  END IF;

  -- Pas 4: Inserează noul rol. Va eșua cu `unique_violation` dacă există deja.
  INSERT INTO public.utilizator_roluri_multicont(user_id, sportiv_id, rol_denumire, club_id, is_primary)
  VALUES (v_user_id, v_sportiv_id, p_rol_denumire, v_club_id, false);

  RETURN 'Rolul ' || p_rol_denumire || ' a fost asignat cu succes.';
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'DUPLICATE_ROLE: Utilizatorul are deja acest rol asignat.';
  WHEN OTHERS THEN
    RAISE;
END;
$$;
