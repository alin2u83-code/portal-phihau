-- Functie pentru a verifica daca un utilizator este admin de club, fara a declansa RLS
CREATE OR REPLACE FUNCTION is_admin_check(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass pentru Super Admin
  IF p_user_id = 'f69fe240-32cb-45f1-a2a9-47ce27426712'::uuid THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.utilizator_roluri_multicont ur
    JOIN public.roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = p_user_id
      AND (r.nume = 'ADMIN_CLUB' OR r.nume = 'SUPER_ADMIN_FEDERATIE')
  );
END;
$$;

-- Rescrierea politicii RLS pentru 'sportivi'
DROP POLICY IF EXISTS "Allow club admin to view own club members" ON public.sportivi;

CREATE POLICY "Allow club admin to view own club members" ON public.sportivi
FOR SELECT
USING (
  (auth.uid() = 'f69fe240-32cb-45f1-a2a9-47ce27426712'::uuid) OR
  (is_admin_check(auth.uid()) AND club_id IN (
    SELECT club_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid()
  ))
);
