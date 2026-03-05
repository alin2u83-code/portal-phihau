-- Enable RLS on tables
ALTER TABLE program_antrenamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranzactii ENABLE ROW LEVEL SECURITY;

-- 1. program_antrenamente Policies
CREATE POLICY "Staff manage program_antrenamente" ON program_antrenamente
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = program_antrenamente.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
  )
);

CREATE POLICY "Sportiv read program_antrenamente" ON program_antrenamente
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sportivi s
    WHERE s.user_id = auth.uid()
    AND (
      s.grupa_id = program_antrenamente.grupa_id 
      OR 
      (program_antrenamente.grupa_id IS NULL AND s.club_id = program_antrenamente.club_id)
    )
  )
);

-- 2. prezenta_antrenament Policies
CREATE POLICY "Staff manage prezenta_antrenament" ON prezenta_antrenament
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    JOIN public.program_antrenamente pa ON pa.id = prezenta_antrenament.antrenament_id
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = pa.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
  )
);

CREATE POLICY "Sportiv read own prezenta" ON prezenta_antrenament
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sportivi s
    WHERE s.user_id = auth.uid()
    AND s.id = prezenta_antrenament.sportiv_id
  )
);

-- 3. plati Policies
CREATE POLICY "Admin manage plati" ON plati
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = plati.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'ADMIN')
  )
);

CREATE POLICY "Sportiv read own plati" ON plati
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sportivi s
    WHERE s.user_id = auth.uid()
    AND (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)
  )
);

-- 4. tranzactii Policies
CREATE POLICY "Admin manage tranzactii" ON tranzactii
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont urmc
    WHERE urmc.user_id = auth.uid()
    AND urmc.club_id = tranzactii.club_id
    AND urmc.rol_denumire IN ('ADMIN_CLUB', 'ADMIN')
  )
);

CREATE POLICY "Sportiv read own tranzactii" ON tranzactii
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sportivi s
    WHERE s.user_id = auth.uid()
    AND (s.id = tranzactii.sportiv_id OR s.familie_id = tranzactii.familie_id)
  )
);