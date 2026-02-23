-- Function to check if the current user is a SUPER_ADMIN_FEDERATIE
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.utilizator_roluri_multicont urmc
    JOIN public.roluri r ON urmc.rol_id = r.id
    WHERE urmc.user_id = auth.uid()
      AND r.nume = 'SUPER_ADMIN_FEDERATIE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy for 'plati' table
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for super admins and club admins/instructors for plati" ON public.plati;
CREATE POLICY "Enable full access for super admins and club admins/instructors for plati" ON public.plati
  FOR SELECT
  USING (public.is_super_admin() OR auth.uid() IN (
    SELECT urmc.user_id
    FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.club_id = (SELECT club_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() AND is_primary LIMIT 1)
  ));

-- RLS Policy for 'evenimente' table
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for super admins and club admins/instructors for evenimente" ON public.evenimente;
CREATE POLICY "Enable full access for super admins and club admins/instructors for evenimente" ON public.evenimente
  FOR SELECT
  USING (public.is_super_admin() OR auth.uid() IN (
    SELECT urmc.user_id
    FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.club_id = (SELECT club_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid() AND is_primary LIMIT 1)
  ));

-- RLS Policy for 'utilizator_roluri_multicont' table
ALTER TABLE public.utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for super admins, club admins/instructors for their club's roles, and users for their own roles on utilizator_roluri_multicont" ON public.utilizator_roluri_multicont;
CREATE POLICY "Enable full access for super admins, club admins/instructors for their club's roles, and users for their own roles on utilizator_roluri_multicont" ON public.utilizator_roluri_multicont
  FOR SELECT
  USING (public.is_super_admin() OR
         (auth.uid() = user_id) OR
         (EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont urmc_admin WHERE urmc_admin.user_id = auth.uid() AND urmc_admin.club_id = utilizator_roluri_multicont.club_id AND urmc_admin.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR'))));
