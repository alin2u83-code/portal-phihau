-- Fix: familii table missing RLS policies
-- ADMIN_CLUB saw families from all clubs because no RLS existed on familii

ALTER TABLE familii ENABLE ROW LEVEL SECURITY;

-- Super admin / federation admin: vede toate familiile
CREATE POLICY "Federation admins see all familii"
ON familii FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
  )
);

-- ADMIN_CLUB / INSTRUCTOR: vede doar familiile clubului propriu
CREATE POLICY "Club staff see own club familii"
ON familii FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = familii.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR')
  )
);

-- SPORTIV: vede propria familie
CREATE POLICY "Sportiv sees own familie"
ON familii FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sportivi s
    WHERE s.user_id = auth.uid()
    AND s.familie_id = familii.id
  )
);

-- ADMIN_CLUB: poate crea / modifica / șterge familii în clubul propriu
CREATE POLICY "Club admin manage familii"
ON familii FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = familii.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'ADMIN', 'SUPER_ADMIN_FEDERATIE')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = familii.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'ADMIN', 'SUPER_ADMIN_FEDERATIE')
  )
);
