-- Enable RLS on tables
ALTER TABLE program_antrenamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE prezenta_antrenament ENABLE ROW LEVEL SECURITY;
ALTER TABLE plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranzactii ENABLE ROW LEVEL SECURITY;

-- 1. program_antrenamente Policies

-- Staff Policy (Read/Write): Allows Admin and Instructors to manage trainings for their club
CREATE POLICY "Staff manage program_antrenamente" ON program_antrenamente
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM utilizator_roluri ur
    JOIN roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.club_id = program_antrenamente.club_id
    AND r.nume IN ('ADMIN_CLUB', 'INSTRUCTOR')
  )
);

-- Sportiv Policy (Read Only): Allows athletes to see trainings for their group or general club trainings
CREATE POLICY "Sportiv read program_antrenamente" ON program_antrenamente
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sportivi s
    WHERE s.user_id = auth.uid()
    AND (
      s.grupa_id = program_antrenamente.grupa_id -- Matches group
      OR
      (program_antrenamente.grupa_id IS NULL AND s.club_id = program_antrenamente.club_id) -- Or general club training
    )
  )
);

-- 2. prezenta_antrenament Policies

-- Staff Policy (Manage): Allows Admin and Instructors to manage attendance for their club's trainings
-- Ensures they can only mark attendance for athletes belonging to the same club
CREATE POLICY "Staff manage prezenta_antrenament" ON prezenta_antrenament
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM utilizator_roluri ur
    JOIN roluri r ON ur.rol_id = r.id
    JOIN program_antrenamente pa ON pa.id = prezenta_antrenament.antrenament_id
    JOIN sportivi s ON s.id = prezenta_antrenament.sportiv_id
    WHERE ur.user_id = auth.uid()
    AND ur.club_id = pa.club_id
    AND s.club_id = pa.club_id -- Ensure sportiv belongs to the club of the training
    AND r.nume IN ('ADMIN_CLUB', 'INSTRUCTOR')
  )
);

-- Sportiv Policy (Read Only): Allows athletes to see their own attendance records
CREATE POLICY "Sportiv read own prezenta" ON prezenta_antrenament
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sportivi s
    WHERE s.user_id = auth.uid()
    AND s.id = prezenta_antrenament.sportiv_id
  )
);

-- 3. plati Policies

-- Admin Policy (Manage): Allows Club Admins to manage payments for their club
CREATE POLICY "Admin manage plati" ON plati
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM utilizator_roluri ur
    JOIN roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.club_id = plati.club_id
    AND r.nume = 'ADMIN_CLUB'
  )
);

-- Sportiv Policy (Read Only): Allows athletes to see their own payments or family payments
CREATE POLICY "Sportiv read own plati" ON plati
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sportivi s
    WHERE s.user_id = auth.uid()
    AND (
      s.id = plati.sportiv_id 
      OR 
      (plati.familie_id IS NOT NULL AND s.familie_id = plati.familie_id)
    )
  )
);

-- 4. tranzactii Policies

-- Admin Policy (Manage): Allows Club Admins to manage transactions for their club
CREATE POLICY "Admin manage tranzactii" ON tranzactii
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM utilizator_roluri ur
    JOIN roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.club_id = tranzactii.club_id
    AND r.nume = 'ADMIN_CLUB'
  )
);

-- Sportiv Policy (Read Only): Allows athletes to see their own transactions or family transactions
CREATE POLICY "Sportiv read own tranzactii" ON tranzactii
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sportivi s
    WHERE s.user_id = auth.uid()
    AND (
      s.id = tranzactii.sportiv_id 
      OR 
      (tranzactii.familie_id IS NOT NULL AND s.familie_id = tranzactii.familie_id)
    )
  )
);
