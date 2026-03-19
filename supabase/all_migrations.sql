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
);-- =================================================================
-- 1. CURĂȚARE DEPENDENȚE REZIDUALE (Fix eroare 42501)
-- =================================================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Ștergem ORICE politică de pe tabelele cheie care ar putea conține referințe vechi
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('program_antrenamente', 'prezenta_antrenament', 'sportivi', 'utilizator_roluri_multicont')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- =================================================================
-- 2. RECREARE FUNCȚIE HELPER (Security Definer este CRUCIAL)
-- =================================================================
-- Folosim SECURITY DEFINER pentru ca funcția să poată citi tabelele de sistem 
-- chiar și atunci când utilizatorul are drepturi limitate RLS.
CREATE OR REPLACE FUNCTION public.has_access_to_club(target_club_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    is_allowed BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE'
            OR (
                rol_denumire IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR') 
                AND club_id = target_club_id
            )
        )
    ) INTO is_allowed;
    
    RETURN COALESCE(is_allowed, FALSE);
END;
$$;

-- =================================================================
-- 3. REFACTORIZARE POLITICI (TABELE CU club_id)
-- =================================================================

-- SPORTIVI
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Sportivi" ON public.sportivi
    FOR SELECT TO authenticated USING (public.has_access_to_club(club_id));

-- PROGRAM ANTRENAMENTE
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Program" ON public.program_antrenamente
    FOR SELECT TO authenticated USING (public.has_access_to_club(club_id));

-- GRUPE
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Grupe" ON public.grupe
    FOR SELECT TO authenticated USING (public.has_access_to_club(club_id));

-- =================================================================
-- 4. REFACTORIZARE POLITICI (TABELE LINKATE PRIN sportiv_id)
-- =================================================================

-- PREZENTA ANTRENAMENT (Aici apărea eroarea de obicei)
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Prezenta" ON public.prezenta_antrenament
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = prezenta_antrenament.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- ANUNTURI PREZENTA
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Select_Anunturi" ON public.anunturi_prezenta
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.sportivi s
            WHERE s.id = anunturi_prezenta.sportiv_id
            AND public.has_access_to_club(s.club_id)
        )
    );

-- =================================================================
-- 5. ACCES PENTRU PROPRIUL PROFIL (Sportivi)
-- =================================================================
-- Permitem sportivilor să își vadă propriile date, indiferent de club
CREATE POLICY "Sportiv_Select_Own_Data" ON public.sportivi
    FOR SELECT TO authenticated USING (
        id IN (
            SELECT sportiv_id FROM public.utilizator_roluri_multicont 
            WHERE user_id = auth.uid()
        )
    );-- =================================================================
-- REVIZUIRE RLS: PLATI SI TRANZACTII
-- =================================================================
-- Obiectiv:
-- 1. Asigurarea existenței coloanei 'club_id' pe tabelele financiare.
-- 2. Restricționarea accesului pe bază de rol (Club vs Sportiv).
-- 3. Backfill date pentru coloana club_id (dacă e cazul).
-- =================================================================

-- 1. Asigurare structură (club_id)
DO $$
BEGIN
    -- Adăugare club_id la PLATI
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plati' AND column_name = 'club_id') THEN
        ALTER TABLE public.plati ADD COLUMN club_id UUID REFERENCES public.cluburi(id);
    END IF;

    -- Adăugare club_id la TRANZACTII
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tranzactii' AND column_name = 'club_id') THEN
        ALTER TABLE public.tranzactii ADD COLUMN club_id UUID REFERENCES public.cluburi(id);
    END IF;
END $$;

-- 2. Backfill date (Populare club_id din tabela sportivi pentru datele existente)
UPDATE public.plati p
SET club_id = s.club_id
FROM public.sportivi s
WHERE p.sportiv_id = s.id AND p.club_id IS NULL;

UPDATE public.tranzactii t
SET club_id = s.club_id
FROM public.sportivi s
WHERE t.sportiv_id = s.id AND t.club_id IS NULL;

-- 3. Activare RLS
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;

-- 4. Resetare politici vechi
DROP POLICY IF EXISTS "Sportiv - Vizualizare plati proprii" ON public.plati;
DROP POLICY IF EXISTS "Staff Club - Management plati" ON public.plati;
DROP POLICY IF EXISTS "Sportiv - Vizualizare tranzactii proprii" ON public.tranzactii;
DROP POLICY IF EXISTS "Staff Club - Management tranzactii" ON public.tranzactii;

-- =================================================================
-- POLITICI PENTRU PLATI
-- =================================================================

-- A. SPORTIV: Vede doar plățile proprii sau ale familiei sale
CREATE POLICY "Sportiv - Vizualizare plati proprii" ON public.plati
FOR SELECT
USING (
    (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    OR
    (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
);

-- B. STAFF CLUB (Instructor/Admin): Acces complet (CRUD) la plățile clubului lor
CREATE POLICY "Staff Club - Management plati" ON public.plati
FOR ALL
USING (
    club_id IN (
        SELECT club_id 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
    )
);

-- =================================================================
-- POLITICI PENTRU TRANZACTII
-- =================================================================

-- A. SPORTIV: Vede doar tranzacțiile proprii sau ale familiei sale
CREATE POLICY "Sportiv - Vizualizare tranzactii proprii" ON public.tranzactii
FOR SELECT
USING (
    (sportiv_id IN (SELECT id FROM public.sportivi WHERE user_id = auth.uid()))
    OR
    (familie_id IN (SELECT familie_id FROM public.sportivi WHERE user_id = auth.uid() AND familie_id IS NOT NULL))
);

-- B. STAFF CLUB (Instructor/Admin): Acces complet (CRUD) la tranzacțiile clubului lor
CREATE POLICY "Staff Club - Management tranzactii" ON public.tranzactii
FOR ALL
USING (
    club_id IN (
        SELECT club_id 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
    )
);
-- Adăugare suport pentru SUPER_ADMIN_FEDERATIE în politicile financiare

-- 1. Actualizare politică PLATI pentru Staff Club + Super Admin
DROP POLICY IF EXISTS "Staff Club - Management plati" ON public.plati;
CREATE POLICY "Staff Club - Management plati" ON public.plati
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE'
            OR (
                rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
                AND club_id = plati.club_id
            )
        )
    )
);

-- 2. Actualizare politică TRANZACTII pentru Staff Club + Super Admin
DROP POLICY IF EXISTS "Staff Club - Management tranzactii" ON public.tranzactii;
CREATE POLICY "Staff Club - Management tranzactii" ON public.tranzactii
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE'
            OR (
                rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
                AND club_id = tranzactii.club_id
            )
        )
    )
);
-- =================================================================
-- FUNCȚIE GENERARE ANTRENAMENTE DIN ORAR
-- =================================================================
-- Această funcție populează tabela 'program_antrenamente' pe baza
-- șabloanelor definite în 'orar_saptamanal'.
-- =================================================================

CREATE OR REPLACE FUNCTION public.genereaza_antrenamente_din_orar(
    p_zile_in_avans INTEGER DEFAULT 30,
    p_grupa_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data_curenta DATE;
    v_zi_saptamana_ro TEXT;
    v_zi_idx INTEGER;
BEGIN
    -- Iterăm prin fiecare zi din intervalul solicitat
    FOR i IN 0..p_zile_in_avans LOOP
        v_data_curenta := CURRENT_DATE + i;
        v_zi_idx := EXTRACT(DOW FROM v_data_curenta);
        
        -- Mapăm indexul zilei la denumirea în Română
        v_zi_saptamana_ro := CASE v_zi_idx
            WHEN 1 THEN 'Luni'
            WHEN 2 THEN 'Marți'
            WHEN 3 THEN 'Miercuri'
            WHEN 4 THEN 'Joi'
            WHEN 5 THEN 'Vineri'
            WHEN 6 THEN 'Sâmbătă'
            WHEN 0 THEN 'Duminică'
        END;

        -- Inserăm antrenamentele care nu există deja
        INSERT INTO public.program_antrenamente (
            data,
            ora_start,
            ora_sfarsit,
            grupa_id,
            club_id,
            is_recurent
        )
        SELECT 
            v_data_curenta,
            o.ora_start,
            o.ora_sfarsit,
            o.grupa_id,
            o.club_id,
            TRUE
        FROM public.orar_saptamanal o
        WHERE o.ziua = v_zi_saptamana_ro
        AND o.is_activ = TRUE
        AND (p_grupa_id IS NULL OR o.grupa_id = p_grupa_id)
        AND NOT EXISTS (
            -- Evităm duplicatele
            SELECT 1 
            FROM public.program_antrenamente p
            WHERE p.data = v_data_curenta
            AND p.ora_start = o.ora_start
            AND p.ora_sfarsit = o.ora_sfarsit
            AND p.grupa_id = o.grupa_id
        );
    END LOOP;
END;
$$;

-- Acordăm permisiuni de execuție pentru rolurile relevante
GRANT EXECUTE ON FUNCTION public.genereaza_antrenamente_din_orar(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genereaza_antrenamente_din_orar(INTEGER, UUID) TO service_role;
-- =================================================================
-- ADD IS_ACTIV COLUMN TO ORAR_SAPTAMANAL
-- =================================================================
-- This column is used to toggle whether a specific training slot
-- in the weekly schedule should be used for generation.
-- =================================================================

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS is_activ BOOLEAN DEFAULT TRUE;

-- Update existing records to be active by default
UPDATE public.orar_saptamanal SET is_activ = TRUE WHERE is_activ IS NULL;
-- =================================================================
-- FIX MISSING ZIUA COLUMN IN ORAR_SAPTAMANAL
-- =================================================================
-- This column is used to store the day of the week for training templates.
-- =================================================================

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS ziua TEXT;

-- If it was named differently, we could try to rename it, 
-- but since we don't know, we just ensure it exists.
-- We also ensure other required columns exist.

ALTER TABLE public.orar_saptamanal 
ADD COLUMN IF NOT EXISTS ora_start TIME,
ADD COLUMN IF NOT EXISTS ora_sfarsit TIME,
ADD COLUMN IF NOT EXISTS grupa_id UUID REFERENCES public.grupe(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;

-- Ensure RLS is enabled and policies exist for this table
ALTER TABLE public.orar_saptamanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin - Vizualizare Orar Club" ON public.orar_saptamanal;
CREATE POLICY "Admin - Vizualizare Orar Club" ON public.orar_saptamanal
    FOR SELECT USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Admin - Modificare Orar Club" ON public.orar_saptamanal;
CREATE POLICY "Admin - Modificare Orar Club" ON public.orar_saptamanal
    FOR ALL USING (public.has_access_to_club(club_id));
-- 0. Definim sau actualizăm funcția helper has_access_to_club 
-- Aceasta este "motorul" politicilor tale și trebuie să fie SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_access_to_club(target_club_id uuid)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER -- Permite citirea din tabele protejate
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid() 
        AND club_id = target_club_id
        AND rol_denumire IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
    );
END;
$$;

-- 1. Enable RLS
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Management Antrenamente Club" ON public.program_antrenamente;

-- 3. Create Select Policy (Vizualizare)
CREATE POLICY "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente
    FOR SELECT USING (
        club_id IS NULL 
        OR public.has_access_to_club(club_id)
    );

-- 4. Create Management Policy (INSERT, UPDATE, DELETE)
CREATE POLICY "Staff - Management Antrenamente Club" ON public.program_antrenamente
    FOR ALL USING (
        public.has_access_to_club(club_id)
    ) WITH CHECK (
        public.has_access_to_club(club_id)
    );

-- 5. Ensure prezenta_antrenament also has RLS and policies
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament;
CREATE POLICY "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.program_antrenamente a
            WHERE a.id = prezenta_antrenament.antrenament_id
            AND public.has_access_to_club(a.club_id)
        )
    );

DROP POLICY IF EXISTS "Staff - Management Prezenta Club" ON public.prezenta_antrenament;
CREATE POLICY "Staff - Management Prezenta Club" ON public.prezenta_antrenament
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.program_antrenamente a
            WHERE a.id = prezenta_antrenament.antrenament_id
            AND public.has_access_to_club(a.club_id)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.program_antrenamente a
            WHERE a.id = prezenta_antrenament.antrenament_id
            AND public.has_access_to_club(a.club_id)
        )
    );-- Enable RLS on tables
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- TABELA: SPORTIVI
-- =================================================================

-- 1. ADMIN_CLUB: Acces total (ALL) dacă club_id se potrivește
DROP POLICY IF EXISTS "Admin Club Full Access Sportivi" ON public.sportivi;
CREATE POLICY "Admin Club Full Access Sportivi" ON public.sportivi
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.sportivi.club_id
    )
);

-- 2. INSTRUCTOR: Acces de citire (SELECT) la toți sportivii din clubul său
DROP POLICY IF EXISTS "Instructor Read Access Sportivi" ON public.sportivi;
CREATE POLICY "Instructor Read Access Sportivi" ON public.sportivi
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
        AND urm.club_id = public.sportivi.club_id
    )
);

-- 3. SPORTIV: Acces doar la propriile date (UID match)
DROP POLICY IF EXISTS "Sportiv Own Profile Access" ON public.sportivi;
CREATE POLICY "Sportiv Own Profile Access" ON public.sportivi
FOR ALL
USING (
    user_id = auth.uid()
);

-- =================================================================
-- TABELA: PLATI
-- =================================================================

-- 1. ADMIN_CLUB: Acces total (ALL) dacă club_id se potrivește
DROP POLICY IF EXISTS "Admin Club Full Access Plati" ON public.plati;
CREATE POLICY "Admin Club Full Access Plati" ON public.plati
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.plati.club_id
    )
);

-- 2. SPORTIV: Acces doar la propriile date (prin sportiv_id legat de user_id)
DROP POLICY IF EXISTS "Sportiv Own Payments Access" ON public.plati;
CREATE POLICY "Sportiv Own Payments Access" ON public.plati
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = public.plati.sportiv_id
        AND s.user_id = auth.uid()
    )
);

-- =================================================================
-- TABELA: PROGRAM_ANTRENAMENTE
-- =================================================================

-- 1. ADMIN_CLUB: Acces total (ALL) dacă club_id se potrivește
DROP POLICY IF EXISTS "Admin Club Full Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Admin Club Full Access Antrenamente" ON public.program_antrenamente
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

-- 2. INSTRUCTOR: Acces de citire (SELECT) la antrenamentele din clubul său
DROP POLICY IF EXISTS "Instructor Read Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Instructor Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

-- 3. SPORTIV: Acces de citire (SELECT) la antrenamentele din clubul său
DROP POLICY IF EXISTS "Sportiv Read Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Sportiv Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'SPORTIV'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);-- =================================================================
-- FUNCȚIE GENERARE ANTRENAMENTE DIN ORAR (UPDATE)
-- =================================================================
-- Această funcție populează tabela 'program_antrenamente' pe baza
-- șabloanelor definite în 'orar_saptamanal'.
-- Include RAISE NOTICE pentru debugging și folosește EXTRACT(DOW)
-- =================================================================

CREATE OR REPLACE FUNCTION public.genereaza_antrenamente_din_orar(
    p_zile_in_avans INTEGER DEFAULT 30,
    p_grupa_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data_curenta DATE;
    v_zi_idx INTEGER;
    v_rows_found INTEGER;
BEGIN
    -- Iterăm prin fiecare zi din intervalul solicitat
    FOR i IN 0..p_zile_in_avans LOOP
        v_data_curenta := CURRENT_DATE + i;
        v_zi_idx := EXTRACT(DOW FROM v_data_curenta);
        
        -- Debugging: Afișăm data curentă și indexul zilei
        RAISE NOTICE 'Procesare data: %, Ziua Index: %', v_data_curenta, v_zi_idx;

        -- Numărăm câte rânduri potențiale există în orar pentru această zi
        SELECT COUNT(*) INTO v_rows_found
        FROM public.orar_saptamanal o
        WHERE 
            CASE o.ziua
                WHEN 'Duminică' THEN 0
                WHEN 'Luni' THEN 1
                WHEN 'Marți' THEN 2
                WHEN 'Miercuri' THEN 3
                WHEN 'Joi' THEN 4
                WHEN 'Vineri' THEN 5
                WHEN 'Sâmbătă' THEN 6
                ELSE -1
            END = v_zi_idx
        AND o.is_activ = TRUE
        AND (p_grupa_id IS NULL OR o.grupa_id = p_grupa_id);

        RAISE NOTICE 'Rânduri găsite în orar pentru data %: %', v_data_curenta, v_rows_found;

        -- Inserăm antrenamentele care nu există deja
        INSERT INTO public.program_antrenamente (
            data,
            ora_start,
            ora_sfarsit,
            grupa_id,
            club_id,
            is_recurent
        )
        SELECT 
            v_data_curenta,
            o.ora_start,
            o.ora_sfarsit,
            o.grupa_id,
            o.club_id,
            TRUE
        FROM public.orar_saptamanal o
        WHERE 
            CASE o.ziua
                WHEN 'Duminică' THEN 0
                WHEN 'Luni' THEN 1
                WHEN 'Marți' THEN 2
                WHEN 'Miercuri' THEN 3
                WHEN 'Joi' THEN 4
                WHEN 'Vineri' THEN 5
                WHEN 'Sâmbătă' THEN 6
                ELSE -1
            END = v_zi_idx
        AND o.is_activ = TRUE
        AND (p_grupa_id IS NULL OR o.grupa_id = p_grupa_id)
        AND NOT EXISTS (
            -- Evităm duplicatele
            SELECT 1 
            FROM public.program_antrenamente p
            WHERE p.data = v_data_curenta
            AND p.ora_start = o.ora_start
            AND p.ora_sfarsit = o.ora_sfarsit
            AND p.grupa_id = o.grupa_id
        );
    END LOOP;
END;
$$;

-- Acordăm permisiuni de execuție pentru rolurile relevante
GRANT EXECUTE ON FUNCTION public.genereaza_antrenamente_din_orar(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.genereaza_antrenamente_din_orar(INTEGER, UUID) TO service_role;
-- Add status column to sesiuni_examene table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sesiuni_examene' AND column_name = 'status') THEN
        ALTER TABLE public.sesiuni_examene ADD COLUMN status TEXT DEFAULT 'Programat';
    END IF;
END $$;
CREATE OR REPLACE FUNCTION public.process_exam_row_v3(
    p_nume text,
    p_prenume text,
    p_cnp text,
    p_cod_sportiv text,
    p_existing_sportiv_id uuid,
    p_club_id uuid,
    p_ordine_grad integer,
    p_rezultat text,
    p_contributie numeric,
    p_data_examen date,
    p_sesiune_id uuid,
    p_data_nasterii date DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_sportiv_id uuid;
    v_grad_id uuid;
BEGIN
    -- Get Grade ID
    SELECT id INTO v_grad_id FROM public.grade WHERE ordine = p_ordine_grad LIMIT 1;
    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid: %', p_ordine_grad;
    END IF;

    -- Determine Sportiv ID
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
        
        -- Optional: Update birthdate if provided and missing? 
        -- For now, we assume "Use Existing" means strictly linking, not updating personal data unless explicitly requested.
        -- But the user said "scrie datele la sportivul care a fost gasit", which implies updating exam history, not necessarily overwriting personal info.
    ELSE
        -- Create new sportiv
        INSERT INTO public.sportivi (
            nume, prenume, cnp, cod_sportiv, club_id, grad_actual_id, status, data_inscrierii, data_nasterii
        ) VALUES (
            p_nume, p_prenume, p_cnp, p_cod_sportiv, p_club_id, v_grad_id, 'Activ', CURRENT_DATE, p_data_nasterii
        ) RETURNING id INTO v_sportiv_id;
    END IF;

    -- Insert Exam Result
    INSERT INTO public.istoric_examene (
        sportiv_id, sesiune_id, grad_id, rezultat, data_examen, contributie_achitata
    ) VALUES (
        v_sportiv_id, p_sesiune_id, v_grad_id, p_rezultat, p_data_examen, p_contributie
    );
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.process_exam_row_v3(
    p_nume text,
    p_prenume text,
    p_cnp text,
    p_cod_sportiv text,
    p_existing_sportiv_id uuid,
    p_club_id uuid,
    p_ordine_grad integer,
    p_rezultat text,
    p_contributie numeric,
    p_data_examen date,
    p_sesiune_id uuid,
    p_data_nasterii date DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_sportiv_id uuid;
    v_grad_id uuid;
    v_cod_sportiv text;
BEGIN
    -- Get Grade ID
    SELECT id INTO v_grad_id FROM public.grade WHERE ordine = p_ordine_grad LIMIT 1;
    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid: %', p_ordine_grad;
    END IF;

    -- Determine Sportiv ID
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
        
        -- Update birthdate if provided and currently null
        IF p_data_nasterii IS NOT NULL THEN
            UPDATE public.sportivi 
            SET data_nasterii = p_data_nasterii 
            WHERE id = v_sportiv_id AND data_nasterii IS NULL;
        END IF;
    ELSE
        -- If cod_sportiv is not provided, generate it
        IF p_cod_sportiv IS NULL THEN
             -- Simple generation logic or call another function if needed. 
             -- For now, we assume the frontend passes it or we generate a simple one.
             -- Let's try to use the generate_sportiv_code function if available, otherwise fallback.
             -- Since we can't easily call RPC from here without knowing if it exists as a SQL function,
             -- we'll rely on the input. If input is null, we generate a placeholder.
             v_cod_sportiv := 'TEMP-' || floor(random() * 100000)::text;
        ELSE
             v_cod_sportiv := p_cod_sportiv;
        END IF;

        -- Create new sportiv
        -- Removed 'cod_sportiv' column from insert if it doesn't exist in your schema, 
        -- BUT the error says "column cod_sportiv does not exist", so we must remove it from the INSERT statement.
        
        INSERT INTO public.sportivi (
            nume, prenume, cnp, club_id, grad_actual_id, status, data_inscrierii, data_nasterii
        ) VALUES (
            p_nume, p_prenume, p_cnp, p_club_id, v_grad_id, 'Activ', CURRENT_DATE, p_data_nasterii
        ) RETURNING id INTO v_sportiv_id;
    END IF;

    -- Insert Exam Result
    INSERT INTO public.istoric_examene (
        sportiv_id, sesiune_id, grad_id, rezultat, data_examen, contributie_achitata
    ) VALUES (
        v_sportiv_id, p_sesiune_id, v_grad_id, p_rezultat, p_data_examen, p_contributie
    );

    -- If Admis, also update istoric_grade
    IF p_rezultat = 'Admis' THEN
        INSERT INTO public.istoric_grade (sportiv_id, grad_id, data_obtinere, sesiune_examen_id)
        VALUES (v_sportiv_id, v_grad_id, p_data_examen, p_sesiune_id)
        ON CONFLICT (sportiv_id, grad_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;
-- 1. Fix JSON parsing in useLocalStorage.ts
-- (I will apply this in the next step, but I'll write the SQL function first)

-- 2. SQL Function: generare_factura_examen(p_sportiv_id UUID)
CREATE OR REPLACE FUNCTION public.generare_factura_examen(p_sportiv_id UUID)
RETURNS JSON AS $$
DECLARE
    v_club_id UUID;
    v_grad_actual_id UUID;
    v_ordine_grad_actual INTEGER;
    v_next_grad_id UUID;
    v_pret NUMERIC;
    v_plata_id UUID;
    v_descriere TEXT;
BEGIN
    -- 1. Get sportiv info
    SELECT club_id, grad_actual_id INTO v_club_id, v_grad_actual_id
    FROM public.sportivi WHERE id = p_sportiv_id;

    IF v_club_id IS NULL OR v_grad_actual_id IS NULL THEN
        RAISE EXCEPTION 'Sportivul nu are club sau grad actual setat.';
    END IF;

    -- 2. Get order of current grade
    SELECT ordine INTO v_ordine_grad_actual FROM public.grade WHERE id = v_grad_actual_id;

    -- 3. Get next grade ID
    SELECT id INTO v_next_grad_id FROM public.grade WHERE ordine = v_ordine_grad_actual + 1 LIMIT 1;

    IF v_next_grad_id IS NULL THEN
        RAISE EXCEPTION 'Nu există un grad superior pentru acest sportiv.';
    END IF;

    -- 4. Get price
    SELECT pret INTO v_pret FROM public.grade_preturi_config
    WHERE club_id = v_club_id AND grad_id = v_next_grad_id;

    IF v_pret IS NULL THEN
        RAISE EXCEPTION 'Nu există preț configurat pentru gradul următor.';
    END IF;

    v_descriere := 'Taxă examen grad ' || v_next_grad_id;

    -- 5. Insert payment
    INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data_platii)
    VALUES (p_sportiv_id, v_club_id, v_pret, v_descriere, CURRENT_DATE)
    RETURNING id INTO v_plata_id;

    -- 6. Return JSON
    RETURN json_build_object(
        'plata_id', v_plata_id,
        'suma', v_pret,
        'descriere', v_descriere
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration to add get_registration_details function
CREATE OR REPLACE FUNCTION public.get_registration_details(p_sportiv_id uuid)
RETURNS TABLE (
    grad_sugerat_id uuid,
    grad_sugerat_nume text,
    taxa_suma numeric,
    is_debtor boolean
) LANGUAGE plpgsql AS $$
DECLARE
    v_grad_id uuid;
    v_suma numeric;
BEGIN
    -- 1. Calculăm gradul următor folosind logica de vârstă definită anterior
    SELECT next_grad_id INTO v_grad_id FROM public.get_next_eligible_grade(p_sportiv_id);
    
    -- 2. Identificăm prețul activ pentru acest grad din configurația trimisă de tine
    SELECT suma INTO v_suma 
    FROM public.grade_preturi_config 
    WHERE grad_id = v_grad_id AND is_activ = true 
    ORDER BY data_activare DESC LIMIT 1;

    RETURN QUERY SELECT 
        v_grad_id, 
        (SELECT nume FROM public.grade WHERE id = v_grad_id),
        COALESCE(v_suma, 0),
        EXISTS (SELECT 1 FROM public.plati WHERE sportiv_id = p_sportiv_id AND status = 'Restanta');
END;
$$;
-- Migration to run cleanup_trigger_invalide.sql
-- This script cleans up invalid triggers and checks data consistency

-- 1. Curățare Trigger-e pe schema auth care referă tabele inexistente
DO $$
DECLARE
    r RECORD;
    v_func_src TEXT;
    v_table_name TEXT;
    v_table_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Verificare trigger-e pe auth.users...';
    
    FOR r IN (
        SELECT 
            t.trigger_name, 
            t.event_object_table, 
            p.proname as func_name,
            p.prosrc as func_src
        FROM information_schema.triggers t
        JOIN pg_proc p ON t.action_statement LIKE '%' || p.proname || '%'
        WHERE t.trigger_schema = 'auth' AND t.event_object_table = 'users'
    ) LOOP
        v_func_src := r.func_src;
        
        FOREACH v_table_name IN ARRAY ARRAY['profiles', 'users', 'user_profiles'] LOOP
            IF v_func_src LIKE '%public.' || v_table_name || '%' THEN
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = v_table_name
                ) INTO v_table_exists;
                
                IF NOT v_table_exists THEN
                    RAISE NOTICE 'Trigger-ul % apelează funcția % care referă tabelul inexistent public.%. Se șterge trigger-ul.', r.trigger_name, r.func_name, v_table_name;
                    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 2. Verificare sportivi cu user_id setat dar fără roluri în utilizator_roluri_multicont
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verificare sportivi orfani de roluri...';
    
    FOR r IN (
        SELECT s.id, s.nume, s.prenume, s.user_id, s.club_id
        FROM public.sportivi s
        LEFT JOIN public.utilizator_roluri_multicont urm ON s.user_id = urm.user_id
        WHERE s.user_id IS NOT NULL AND urm.id IS NULL
    ) LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'Sportiv ID: %, Nume: % %, User ID: % nu are roluri asociate.', r.id, r.nume, r.prenume, r.user_id;
    END LOOP;
END $$;
-- 1. Redefinim funcția tr_completeaza_rol_id
-- SECURITY DEFINER îi permite să ruleze cu drepturi de sistem
CREATE OR REPLACE FUNCTION public.tr_completeaza_rol_id()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Completare rol_id dacă lipsește
    IF NEW.rol_id IS NULL AND NEW.rol_denumire IS NOT NULL THEN
        SELECT id INTO NEW.rol_id FROM public.roluri WHERE denumire = NEW.rol_denumire;
    END IF;

    -- 2. Completare nume_utilizator_cache dacă lipsește
    IF NEW.nume_utilizator_cache IS NULL THEN
        -- Încercăm din metadata sesiune (auth.jwt())
        NEW.nume_utilizator_cache := auth.jwt() ->> 'full_name';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefinim funcția de verificare Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    );
END;
$$;

-- 3. Actualizăm politica pentru Sportivi
-- Eliminăm orice condiție care ar putea declanșa un join ascuns cu schema auth
DROP POLICY IF EXISTS "Select_Sportivi_Unified" ON public.sportivi;

CREATE POLICY "Select_Sportivi_Unified" ON public.sportivi
FOR SELECT USING (
    public.is_super_admin() 
    OR club_id = (
        SELECT club_id FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND id = NULLIF(current_setting('request.headers', true)::json->>'active-role-context-id', '')::uuid
    )
);
-- 0. REPARĂ FUNCȚIA HELPER (Sursa probabilă a erorii)
CREATE OR REPLACE FUNCTION public.has_access_to_club(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN') -- Admini globali
            OR (club_id = p_club_id AND rol_denumire = 'ADMIN_CLUB') -- Admin local
            OR (club_id = p_club_id AND rol_denumire = 'INSTRUCTOR') -- Instructor local
        )
    );
END;
$$;

-- 1. SQL Function: get_user_roles(user_id UUID)
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    rol_id UUID,
    sportiv_id UUID,
    club_id UUID,
    is_primary BOOLEAN,
    rol_denumire TEXT,
    rol_nume TEXT,
    club_nume TEXT,
    sportiv_nume TEXT,
    sportiv_prenume TEXT
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        urm.id,
        urm.rol_id,
        urm.sportiv_id,
        urm.club_id,
        urm.is_primary,
        urm.rol_denumire,
        r.nume::TEXT as rol_nume,
        c.nume::TEXT as club_nume,
        s.nume::TEXT as sportiv_nume,
        s.prenume::TEXT as sportiv_prenume
    FROM public.utilizator_roluri_multicont urm
    LEFT JOIN public.roluri r ON urm.rol_id = r.id
    LEFT JOIN public.cluburi c ON urm.club_id = c.id
    LEFT JOIN public.sportivi s ON urm.sportiv_id = s.id
    WHERE urm.user_id = p_user_id;
END;
$$;

-- 2. SQL Function: switch_primary_context(target_context_id UUID)
CREATE OR REPLACE FUNCTION public.switch_primary_context(p_target_context_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Reset all primary flags for this user
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = false
    WHERE user_id = v_user_id;
    
    -- Set the target context as primary
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = true
    WHERE id = p_target_context_id AND user_id = v_user_id;
    
    RETURN FOUND;
END;
$$;

-- 3. RLS Policies (Corectate pentru a evita dependenta de 'users')

-- A. PLATI
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;
CREATE POLICY "Staff - Full Access Plati" ON public.plati
FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Sportiv - View Own Plati" ON public.plati;
CREATE POLICY "Sportiv - View Own Plati" ON public.plati
FOR SELECT TO authenticated USING (
    sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
);

-- B. TRANZACTII
ALTER TABLE public.tranzactii ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Tranzactii" ON public.tranzactii;
CREATE POLICY "Staff - Full Access Tranzactii" ON public.tranzactii
FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

-- C. PROGRAM_ANTRENAMENTE
ALTER TABLE public.program_antrenamente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Antrenamente" ON public.program_antrenamente;
CREATE POLICY "Staff - Full Access Antrenamente" ON public.program_antrenamente
FOR ALL TO authenticated USING (public.has_access_to_club(club_id));

-- D. PREZENTA_ANTRENAMENT
ALTER TABLE public.prezenta_antrenament ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Prezenta" ON public.prezenta_antrenament;
CREATE POLICY "Staff - Full Access Prezenta" ON public.prezenta_antrenament
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = prezenta_antrenament.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- E. SESIUNI_EXAMENE
ALTER TABLE public.sesiuni_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Sesiuni" ON public.sesiuni_examene;
CREATE POLICY "Staff - Full Access Sesiuni" ON public.sesiuni_examene
FOR ALL TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

-- F. INSCRIERI_EXAMENE
ALTER TABLE public.inscrieri_examene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Inscrieri" ON public.inscrieri_examene;
CREATE POLICY "Staff - Full Access Inscrieri" ON public.inscrieri_examene
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = inscrieri_examene.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- G. EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

-- H. ANUNTURI_PREZENTA
ALTER TABLE public.anunturi_prezenta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Anunturi" ON public.anunturi_prezenta;
CREATE POLICY "Staff - Full Access Anunturi" ON public.anunturi_prezenta
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = anunturi_prezenta.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- I. CLUBURI
ALTER TABLE public.cluburi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Cluburi" ON public.cluburi;
CREATE POLICY "Staff - Full Access Cluburi" ON public.cluburi
FOR ALL TO authenticated USING (public.has_access_to_club(id));-- 1. Eliminare definitivă a oricăror politici sau grant-uri pe public.users
-- (Dacă tabelul nu există, aceste comenzi vor fi ignorate sau vor returna erori pe care le putem ignora)
DO $$ 
BEGIN
    -- Ștergere politici (dacă tabelul există)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DROP POLICY IF EXISTS "Users_Self_Access" ON public.users;
        -- Grant-uri (nu pot fi șterse direct, dar putem revoca)
        REVOKE ALL ON TABLE public.users FROM authenticated;
        REVOKE ALL ON TABLE public.users FROM anon;
    END IF;
END $$;

-- 2. Script de Curățare a Trigger-elor (Trigger Cleanup)
-- Eliminăm trigger-ele care ar putea căuta public.profiles sau public.users
DROP TRIGGER IF EXISTS tr_sync_user_profile ON auth.users;
DROP TRIGGER IF EXISTS tr_create_profile ON auth.users;

-- 3. Verificarea și repararea Sportivilor Orfani (fără rol)
-- Activăm inserarea automată a rolului de 'SPORTIV' pentru sportivii care nu au rol
INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, sportiv_id, club_id)
SELECT 
    s.user_id, 
    'SPORTIV', 
    s.id, 
    s.club_id
FROM public.sportivi s
WHERE s.user_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont ur 
    WHERE ur.user_id = s.user_id
);

-- 4. Notificare pentru sportivii orfani (fără user_id)
-- Aceștia trebuie asociați manual de Alexandra
SELECT 'Sportiv orfan (fără user_id): ' || nume || ' ' || prenume AS mesaj
FROM public.sportivi 
WHERE user_id IS NULL;
-- 1. Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    );
$$;

-- 2. Update process_exam_row_v3 to SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.process_exam_row_v3(
    p_nume text,
    p_prenume text,
    p_cnp text,
    p_cod_sportiv text,
    p_existing_sportiv_id uuid,
    p_club_id uuid,
    p_ordine_grad integer,
    p_rezultat text,
    p_contributie numeric,
    p_data_examen date,
    p_sesiune_id uuid,
    p_data_nasterii date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sportiv_id uuid;
    v_grad_id uuid;
BEGIN
    -- Get Grade ID
    SELECT id INTO v_grad_id FROM public.grade WHERE ordine = p_ordine_grad LIMIT 1;
    IF v_grad_id IS NULL THEN
        RAISE EXCEPTION 'Grad invalid: %', p_ordine_grad;
    END IF;

    -- Determine Sportiv ID
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
    ELSE
        -- Create new sportiv
        INSERT INTO public.sportivi (
            nume, prenume, cnp, cod_sportiv, club_id, grad_actual_id, status, data_inscrierii, data_nasterii
        ) VALUES (
            p_nume, p_prenume, p_cnp, p_cod_sportiv, p_club_id, v_grad_id, 'Activ', CURRENT_DATE, p_data_nasterii
        ) RETURNING id INTO v_sportiv_id;
    END IF;

    -- Insert Exam Result
    INSERT INTO public.istoric_examene (
        sportiv_id, sesiune_id, grad_id, rezultat, data_examen, contributie_achitata
    ) VALUES (
        v_sportiv_id, p_sesiune_id, v_grad_id, p_rezultat, p_data_examen, p_contributie
    );
END;
$$;
-- Migration: Fix RLS and Functions for Club Phi Hau
-- 1. SQL Function get_my_club_ids()
-- Adăugat SECURITY DEFINER pentru a evita problemele de permisiuni RLS la citirea rolurilor
CREATE OR REPLACE FUNCTION public.get_my_club_ids()
RETURNS uuid[] 
LANGUAGE sql 
SECURITY DEFINER 
STABLE 
SET search_path = public -- Securizează funcția
AS $$
    SELECT COALESCE(array_agg(club_id), '{}'::uuid[])
    FROM public.utilizator_roluri_multicont
    WHERE user_id = auth.uid()
    AND rol_denumire IN ('INSTRUCTOR', 'ADMIN_CLUB');
$$;

-- 2. RLS Policies for PLATI
ALTER TABLE public.plati ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Plati" ON public.plati;

CREATE POLICY "Staff - Full Access Plati" ON public.plati
FOR ALL 
TO authenticated
USING (
    club_id = ANY (public.get_my_club_ids()) -- Mult mai rapid decât EXISTS
    OR 
    public.is_super_admin() -- Folosim funcția helper existentă
);

-- 3. RLS Policies for GRUPE
ALTER TABLE public.grupe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Grupe" ON public.grupe;

CREATE POLICY "Staff - Full Access Grupe" ON public.grupe
FOR ALL 
TO authenticated
USING (
    club_id = ANY(public.get_my_club_ids())
    OR 
    public.is_super_admin()
);

-- 4. RLS Policies for EVENIMENTE
ALTER TABLE public.evenimente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;

CREATE POLICY "Staff - Full Access Evenimente" ON public.evenimente
FOR ALL 
TO authenticated
USING (
    club_id = ANY(public.get_my_club_ids())
    OR 
    public.is_super_admin()
);

-- 5. IMPORTANT: Permisiuni pentru tabelul de roluri (Sursa erorii 42501)
-- Dacă acest tabel are RLS activ și politicile sunt greșite, restul pică.
ALTER TABLE public.utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Utilizatorii isi vad propriile roluri" ON public.utilizator_roluri_multicont;

CREATE POLICY "Utilizatorii isi vad propriile roluri" 
ON public.utilizator_roluri_multicont
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());-- Migration to sync club_id in utilizator_roluri_multicont with sportivi table
-- This fixes cases where admins/instructors were incorrectly linked to the wrong club (e.g. Phi Hau)
-- but their sportiv profile correctly points to their actual club.

DO $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Sincronizare club_id în utilizator_roluri_multicont...';

    -- 1. Update club_id based on sportiv_id link
    UPDATE public.utilizator_roluri_multicont urm
    SET club_id = s.club_id
    FROM public.sportivi s
    WHERE urm.sportiv_id = s.id 
    AND urm.club_id != s.club_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'S-au actualizat % înregistrări în utilizator_roluri_multicont bazat pe sportiv_id.', v_count;

    -- 2. Update club_id based on user_id link (for cases where sportiv_id might be null but user_id is linked to a sportiv)
    UPDATE public.utilizator_roluri_multicont urm
    SET club_id = s.club_id
    FROM public.sportivi s
    WHERE urm.user_id = s.user_id 
    AND urm.sportiv_id IS NULL
    AND urm.club_id != s.club_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'S-au actualizat % înregistrări în utilizator_roluri_multicont bazat pe user_id.', v_count;

END $$;
-- Pasul 1: Ștergem funcția veche
DROP FUNCTION IF EXISTS public.get_user_auth_context();

-- Pasul 2: Creăm funcția cu noua logică (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_auth_context()
RETURNS TABLE(
    id uuid, 
    email text, 
    is_admin boolean, 
    roluri text[], 
    club_id uuid, 
    sportiv_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Permite citirea din auth.users fără erori de permisiuni
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont 
            WHERE utilizator_roluri_multicont.user_id = au.id 
            AND UPPER(utilizator_roluri_multicont.rol_denumire) IN ('ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
        ) as is_admin,
        ARRAY(
            SELECT UPPER(urm.rol_denumire) 
            FROM public.utilizator_roluri_multicont urm 
            WHERE urm.user_id = au.id
        ) as roluri,
        (SELECT urm.club_id FROM public.utilizator_roluri_multicont urm WHERE urm.user_id = au.id AND urm.is_primary = true LIMIT 1),
        (SELECT urm.sportiv_id FROM public.utilizator_roluri_multicont urm WHERE urm.user_id = au.id AND urm.is_primary = true LIMIT 1)
    FROM auth.users au
    WHERE au.id = auth.uid();
END;
$$;

-- Pasul 3: Functia get_user_login_data_v2
CREATE OR REPLACE FUNCTION public.get_user_login_data_v2()
RETURNS TABLE(user_id uuid, email varchar, sportiv_id uuid, nume text, prenume text, club_id uuid, rol_activ_context text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::varchar,
        s.id as sportiv_id,
        s.nume::text,
        s.prenume::text,
        s.club_id,
        urm.rol_denumire::text as rol_activ_context,
        urm.is_primary
    FROM auth.users au
    JOIN public.sportivi s ON au.id = s.user_id
    JOIN public.utilizator_roluri_multicont urm ON au.id = urm.user_id
    WHERE au.id = auth.uid()
    ORDER BY urm.is_primary DESC
    LIMIT 1;
END;
$$;

-- Pasul 4: Recreare politici RLS pentru program_antrenamente si prezenta_antrenament
-- Stergem politicile vechi (inclusiv variantele cu denumiri similare)
DROP POLICY IF EXISTS "Admin Club Full Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Instructor Read Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Sportiv Read Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Admin - Vizualizare Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Management Antrenamente Club" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Staff - Full Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Admin Club - Full Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Instructor - Read Access Antrenamente" ON public.program_antrenamente;
DROP POLICY IF EXISTS "Sportiv - Read Access Antrenamente" ON public.program_antrenamente;

DROP POLICY IF EXISTS "Admin - Vizualizare Prezenta Club" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Staff - Management Prezenta Club" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Staff - Full Access Prezenta" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Sportiv - View Own Prezenta" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Admin Club - Full Access Prezenta" ON public.prezenta_antrenament;
DROP POLICY IF EXISTS "Instructor - Management Prezenta" ON public.prezenta_antrenament;

-- Recream politicile pentru program_antrenamente
CREATE POLICY "Admin Club - Full Access Antrenamente" ON public.program_antrenamente
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

CREATE POLICY "Instructor - Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

CREATE POLICY "Sportiv - Read Access Antrenamente" ON public.program_antrenamente
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.rol_denumire = 'SPORTIV'
        AND urm.club_id = public.program_antrenamente.club_id
    )
);

-- Recream politicile pentru prezenta_antrenament
CREATE POLICY "Admin Club - Full Access Prezenta" ON public.prezenta_antrenament
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.program_antrenamente a
        JOIN public.utilizator_roluri_multicont urm ON urm.club_id = a.club_id
        WHERE a.id = public.prezenta_antrenament.antrenament_id
        AND urm.user_id = auth.uid()
        AND urm.rol_denumire = 'ADMIN_CLUB'
    )
);

CREATE POLICY "Instructor - Management Prezenta" ON public.prezenta_antrenament
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.program_antrenamente a
        JOIN public.utilizator_roluri_multicont urm ON urm.club_id = a.club_id
        WHERE a.id = public.prezenta_antrenament.antrenament_id
        AND urm.user_id = auth.uid()
        AND urm.rol_denumire = 'INSTRUCTOR'
    )
);

CREATE POLICY "Sportiv - View Own Prezenta" ON public.prezenta_antrenament
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont urm
        WHERE urm.user_id = auth.uid()
        AND urm.sportiv_id = public.prezenta_antrenament.sportiv_id
    )
);-- 1. Robust function to link User to Sportiv Profile
CREATE OR REPLACE FUNCTION public.link_user_to_sportiv_profile(p_email TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_sportiv_id UUID;
    v_club_id UUID;
    v_rol_sportiv_id UUID;
    v_existing_link_id UUID;
BEGIN
    -- Find User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found in auth.users');
    END IF;

    -- Find Sportiv ID
    SELECT id, club_id INTO v_sportiv_id, v_club_id FROM public.sportivi WHERE email = p_email LIMIT 1;
    IF v_sportiv_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sportiv profile not found');
    END IF;

    -- Get Role ID
    SELECT id INTO v_rol_sportiv_id FROM public.roluri WHERE nume = 'SPORTIV' LIMIT 1;
    IF v_rol_sportiv_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role SPORTIV not found');
    END IF;

    -- Link User ID to Sportiv Profile
    UPDATE public.sportivi 
    SET user_id = v_user_id 
    WHERE id = v_sportiv_id AND (user_id IS NULL OR user_id != v_user_id);

    -- Create or Update Link in utilizator_roluri_multicont
    SELECT id INTO v_existing_link_id 
    FROM public.utilizator_roluri_multicont 
    WHERE user_id = v_user_id AND rol_id = v_rol_sportiv_id AND sportiv_id = v_sportiv_id;

    IF v_existing_link_id IS NOT NULL THEN
        -- Update existing link
        UPDATE public.utilizator_roluri_multicont
        SET club_id = v_club_id,
            rol_denumire = 'SPORTIV',
            nume_utilizator_cache = (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = v_sportiv_id)
        WHERE id = v_existing_link_id;
    ELSE
        -- Insert new link
        -- Ensure is_primary is handled correctly (false if other roles exist)
        INSERT INTO public.utilizator_roluri_multicont (
            user_id, rol_id, sportiv_id, club_id, is_primary, rol_denumire, nume_utilizator_cache
        ) VALUES (
            v_user_id, 
            v_rol_sportiv_id, 
            v_sportiv_id, 
            v_club_id, 
            NOT EXISTS (SELECT 1 FROM public.utilizator_roluri_multicont WHERE user_id = v_user_id AND is_primary = true), 
            'SPORTIV', 
            (SELECT nume || ' ' || prenume FROM public.sportivi WHERE id = v_sportiv_id)
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Link created successfully', 'user_id', v_user_id, 'sportiv_id', v_sportiv_id);
END;
$$;

-- 2. Improve actualizeaza_nume_sportiv with better validation
CREATE OR REPLACE FUNCTION public.actualizeaza_nume_sportiv(
    p_sportiv_id uuid,
    p_nume_nou text,
    p_prenume_nou text
) RETURNS json AS $$
DECLARE
    v_rol_user text;
    v_club_id_sportiv uuid;
    v_club_id_user uuid;
    v_has_permission boolean := false;
BEGIN
    -- Get sportiv's club
    SELECT club_id INTO v_club_id_sportiv FROM public.sportivi WHERE id = p_sportiv_id;
    IF v_club_id_sportiv IS NULL THEN
        RAISE EXCEPTION 'Sportiv not found';
    END IF;

    -- Check permissions using has_access_to_club or direct role check
    -- We check if the user has ANY role that allows this
    SELECT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont ur
        WHERE ur.user_id = auth.uid()
        AND (
            ur.rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN') OR
            (ur.rol_denumire = 'ADMIN_CLUB' AND ur.club_id = v_club_id_sportiv)
        )
    ) INTO v_has_permission;

    IF v_has_permission THEN
        -- Admin can update directly
        UPDATE public.sportivi 
        SET nume = UPPER(p_nume_nou), 
            prenume = UPPER(p_prenume_nou),
            propunere_modificare = NULL,
            status_aprobare = 'confirmat'
        WHERE id = p_sportiv_id;
        
        RETURN json_build_object('success', true, 'message', 'Modificare aplicată direct');
    END IF;

    -- Check for Instructor permission
    SELECT EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont ur
        WHERE ur.user_id = auth.uid()
        AND ur.rol_denumire = 'INSTRUCTOR' AND ur.club_id = v_club_id_sportiv
    ) INTO v_has_permission;

    IF v_has_permission THEN
        -- Instructor submits for approval
        UPDATE public.sportivi 
        SET propunere_modificare = jsonb_build_object('nume', UPPER(p_nume_nou), 'prenume', UPPER(p_prenume_nou)),
            status_aprobare = 'asteptare'
        WHERE id = p_sportiv_id;
        
        RETURN json_build_object('success', true, 'message', 'Modificarea a fost trimisă spre aprobare Adminului de Club');
    END IF;

    RAISE EXCEPTION 'Nu aveți permisiunea de a modifica acest sportiv.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS Policy for Sportivi
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sportiv Own Profile Access" ON public.sportivi;

CREATE POLICY "Sportiv Own Profile Access" ON public.sportivi
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Ensure other policies exist (Staff access)
DROP POLICY IF EXISTS "Staff - Full Access Sportivi" ON public.sportivi;
CREATE POLICY "Staff - Full Access Sportivi" ON public.sportivi
FOR ALL TO authenticated
USING (
    public.has_access_to_club(club_id)
);
-- Script pentru curățarea trigger-elor invalide și verificarea consistenței datelor
-- Creat prin redenumirea/copierea cleanup_script.sql conform solicitării utilizatorului

-- 1. Curățare Trigger-e pe schema auth care referă tabele inexistente
DO $$
DECLARE
    r RECORD;
    v_func_src TEXT;
    v_table_name TEXT;
    v_table_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Verificare trigger-e pe auth.users...';
    
    FOR r IN (
        SELECT 
            t.trigger_name, 
            t.event_object_table, 
            p.proname as func_name,
            p.prosrc as func_src
        FROM information_schema.triggers t
        JOIN pg_proc p ON t.action_statement LIKE '%' || p.proname || '%'
        WHERE t.trigger_schema = 'auth' AND t.event_object_table = 'users'
    ) LOOP
        v_func_src := r.func_src;
        
        -- Verificăm referințe comune către tabele care s-ar putea să nu existe
        -- Exemplu: public.profiles, public.users (dacă au fost redenumite sau șterse)
        
        FOREACH v_table_name IN ARRAY ARRAY['profiles', 'users', 'user_profiles'] LOOP
            IF v_func_src LIKE '%public.' || v_table_name || '%' THEN
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = v_table_name
                ) INTO v_table_exists;
                
                IF NOT v_table_exists THEN
                    RAISE NOTICE 'Trigger-ul % apelează funcția % care referă tabelul inexistent public.%. Se șterge trigger-ul.', r.trigger_name, r.func_name, v_table_name;
                    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Verificare completă.';
END $$;

-- 2. Verificare sportivi cu user_id setat dar fără roluri în utilizator_roluri_multicont
DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Verificare sportivi orfani de roluri...';
    
    FOR r IN (
        SELECT s.id, s.nume, s.prenume, s.user_id, s.club_id
        FROM public.sportivi s
        LEFT JOIN public.utilizator_roluri_multicont urm ON s.user_id = urm.user_id
        WHERE s.user_id IS NOT NULL AND urm.id IS NULL
    ) LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'Sportiv ID: %, Nume: % %, User ID: % nu are roluri asociate.', r.id, r.nume, r.prenume, r.user_id;
        
        -- Opțional: Putem insera automat un rol de SPORTIV dacă dorim să reparăm
        -- INSERT INTO public.utilizator_roluri_multicont (user_id, sportiv_id, club_id, rol_denumire, is_primary)
        -- VALUES (r.user_id, r.id, r.club_id, 'SPORTIV', true);
    END LOOP;
    
    IF v_count = 0 THEN
        RAISE NOTICE 'Nu s-au găsit sportivi fără roluri.';
    ELSE
        RAISE NOTICE 'S-au găsit % sportivi fără roluri. Verificați logurile de mai sus.', v_count;
    END IF;
END $$;
CREATE OR REPLACE FUNCTION public.proceseaza_incasare_normalizata(
    p_tranzactie JSONB,
    p_plati JSONB[] -- Array of {plata_id: UUID, suma_alocata: NUMERIC}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tranzactie_id UUID;
    v_plata JSONB;
BEGIN
    -- 1. Insert tranzactie
    INSERT INTO public.tranzactii (
        sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id
    ) VALUES (
        (p_tranzactie->>'sportiv_id')::UUID,
        (p_tranzactie->>'familie_id')::UUID,
        (p_tranzactie->>'suma')::NUMERIC,
        (p_tranzactie->>'data_platii')::DATE,
        (p_tranzactie->>'metoda_plata'),
        (p_tranzactie->>'club_id')::UUID
    ) RETURNING id INTO v_tranzactie_id;

    -- 2. Insert tranzactie_plata
    FOREACH v_plata IN ARRAY p_plati LOOP
        INSERT INTO public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
        VALUES (
            v_tranzactie_id,
            (v_plata->>'plata_id')::UUID,
            (v_plata->>'suma_alocata')::NUMERIC
        );
    END LOOP;

    RETURN v_tranzactie_id;
END;
$$;
-- Migration: RLS for Federation Sportivi View
-- Ensure the view is accessible only to ADMIN_FEDERATIE or PRESEDINTE

-- Assuming the view exists and is SECURITY INVOKER
-- We apply policies to the underlying tables if necessary, 
-- or if it's a view, we ensure the policies on the underlying tables are restrictive.

-- Example policy for the underlying table 'sportivi' (if it's not already restricted)
-- This is a generic example, as the exact table structure is unknown.
-- The RLS policy should be on the base table.

CREATE OR REPLACE FUNCTION public.is_federation_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont ur
    JOIN public.roluri r ON ur.rol_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.nume IN ('ADMIN_FEDERATIE', 'PRESEDINTE')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply policy to the base table (assuming 'sportivi' is the base table for the view)
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Federation Admin Access" ON public.sportivi;
CREATE POLICY "Federation Admin Access" ON public.sportivi
FOR SELECT
USING (public.is_federation_admin());
-- Migration: Final Protocol Account Management
-- 1. Ensure is_primary is NOT NULL and DEFAULT false
ALTER TABLE public.utilizator_roluri_multicont 
ALTER COLUMN is_primary SET DEFAULT false,
ALTER COLUMN is_primary SET NOT NULL;

-- 2. Update trigger function to handle club validation and primary role cleanup
CREATE OR REPLACE FUNCTION public.handle_user_sanitization()
RETURNS TRIGGER AS $$
DECLARE
    v_sportiv_club_id UUID;
BEGIN
    -- Club Validation: Ensure club_id matches sportiv.club_id
    IF NEW.sportiv_id IS NOT NULL THEN
        SELECT club_id INTO v_sportiv_club_id FROM public.sportivi WHERE id = NEW.sportiv_id;
        
        IF v_sportiv_club_id IS NOT NULL AND v_sportiv_club_id != NEW.club_id THEN
            -- Force sync: update club_id from sportiv profile
            NEW.club_id := v_sportiv_club_id;
        END IF;
    END IF;

    -- Primary Role Cleanup
    IF NEW.is_primary = true THEN
        UPDATE public.utilizator_roluri_multicont
        SET is_primary = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate trigger
DROP TRIGGER IF EXISTS trg_user_sanitization ON public.utilizator_roluri_multicont;
CREATE TRIGGER trg_user_sanitization
BEFORE INSERT OR UPDATE ON public.utilizator_roluri_multicont
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_sanitization();
-- RLS for REZULTATE
ALTER TABLE public.rezultate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Full Access Rezultate" ON public.rezultate;
DROP POLICY IF EXISTS "Sportiv - View Own Rezultate" ON public.rezultate;

-- Everyone can see results for federation events or their own athletes
CREATE POLICY "View Rezultate" ON public.rezultate
FOR SELECT TO authenticated USING (
    -- Own record (if sportiv)
    sportiv_id IN (SELECT sportiv_id FROM public.utilizator_roluri_multicont WHERE user_id = auth.uid())
    OR
    -- Staff of the club
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = rezultate.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
    OR
    -- Federation event results are public to all authenticated users
    EXISTS (
        SELECT 1 FROM public.evenimente e
        WHERE e.id = rezultate.eveniment_id
        AND e.club_id IS NULL
    )
);

-- Only staff can manage results for their club's athletes
CREATE POLICY "Manage Rezultate" ON public.rezultate
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = rezultate.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- Ensure sportivi RLS allows viewing participants in federation events
DROP POLICY IF EXISTS "Admin Club Full Access Sportivi" ON public.sportivi;
DROP POLICY IF EXISTS "Instructor Read Access Sportivi" ON public.sportivi;
DROP POLICY IF EXISTS "Sportiv Own Profile Access" ON public.sportivi;

CREATE POLICY "View Sportivi" ON public.sportivi
FOR SELECT TO authenticated USING (
    -- Own record
    user_id = auth.uid()
    OR
    -- Staff of the club
    public.has_access_to_club(club_id)
    OR
    -- Participants in federation events (only basic info should be visible, but RLS is table-level)
    -- This allows seeing names in the results list
    EXISTS (
        SELECT 1 FROM public.rezultate r
        JOIN public.evenimente e ON r.eveniment_id = e.id
        WHERE r.sportiv_id = public.sportivi.id
        AND e.club_id IS NULL
    )
);

CREATE POLICY "Manage Sportivi" ON public.sportivi
FOR ALL TO authenticated USING (
    -- Own record (limited)
    user_id = auth.uid()
    OR
    -- Staff of the club
    public.has_access_to_club(club_id)
);

-- Everyone can see federation events and events from their own club
DROP POLICY IF EXISTS "Staff - Full Access Evenimente" ON public.evenimente;
DROP POLICY IF EXISTS "Sportiv - View Evenimente" ON public.evenimente;
DROP POLICY IF EXISTS "View Evenimente" ON public.evenimente;
DROP POLICY IF EXISTS "Manage Evenimente" ON public.evenimente;

CREATE POLICY "View Evenimente" ON public.evenimente
FOR SELECT TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

-- Only authorized staff can manage events
CREATE POLICY "Manage Evenimente" ON public.evenimente
FOR ALL TO authenticated USING (
    (club_id IS NULL AND (public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
    )))
    OR 
    (club_id IS NOT NULL AND public.has_access_to_club(club_id))
);

-- Similar logic for sesiuni_examene
DROP POLICY IF EXISTS "Staff - Full Access Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "View Sesiuni" ON public.sesiuni_examene;
DROP POLICY IF EXISTS "Manage Sesiuni" ON public.sesiuni_examene;

CREATE POLICY "View Sesiuni" ON public.sesiuni_examene
FOR SELECT TO authenticated USING (
    club_id IS NULL OR public.has_access_to_club(club_id)
);

CREATE POLICY "Manage Sesiuni" ON public.sesiuni_examene
FOR ALL TO authenticated USING (
    (club_id IS NULL AND (public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
    )))
    OR 
    (club_id IS NOT NULL AND public.has_access_to_club(club_id))
);
-- Migration: Implement Automatic User Sanitization
-- 1. Create function to handle primary role cleanup
CREATE OR REPLACE FUNCTION public.handle_primary_role_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated role is primary, set all other roles for this user to non-primary
    IF NEW.is_primary = true THEN
        UPDATE public.utilizator_roluri_multicont
        SET is_primary = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to enforce the rule
DROP TRIGGER IF EXISTS trg_one_primary_role ON public.utilizator_roluri_multicont;
CREATE TRIGGER trg_one_primary_role
BEFORE INSERT OR UPDATE ON public.utilizator_roluri_multicont
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.handle_primary_role_cleanup();

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_primary_role_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_primary_role_cleanup() TO service_role;
-- Migration: Implement Protocol "VEDERE CLUBURI"
-- This migration creates the get_active_club_id function and the corresponding views

-- 1. Function to get the active club ID from the user's primary context
CREATE OR REPLACE FUNCTION public.get_active_club_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT club_id 
    FROM public.utilizator_roluri_multicont 
    WHERE user_id = auth.uid() 
    AND is_primary = true 
    LIMIT 1;
$$;

-- 2. Views for automatic filtering by club_id

-- Sportivi
CREATE OR REPLACE VIEW public.vedere_cluburi_sportivi AS
SELECT * FROM public.sportivi
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Grupe
CREATE OR REPLACE VIEW public.vedere_cluburi_grupe AS
SELECT * FROM public.grupe
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Plati
CREATE OR REPLACE VIEW public.vedere_cluburi_plati AS
SELECT * FROM public.plati
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Tranzactii
CREATE OR REPLACE VIEW public.vedere_cluburi_tranzactii AS
SELECT * FROM public.tranzactii
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Evenimente (including federation events)
CREATE OR REPLACE VIEW public.vedere_cluburi_evenimente AS
SELECT * FROM public.evenimente
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Rezultate (linked to evenimente or sportivi)
CREATE OR REPLACE VIEW public.vedere_cluburi_rezultate AS
SELECT r.* FROM public.rezultate r
JOIN public.sportivi s ON r.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Sesiuni Examene
CREATE OR REPLACE VIEW public.vedere_cluburi_sesiuni_examene AS
SELECT 
    s.*,
    (SELECT count(*) FROM public.inscrieri_examene i WHERE i.sesiune_id = s.id) as nr_inscrisi
FROM public.sesiuni_examene s
WHERE s.club_id = public.get_active_club_id() OR s.club_id IS NULL OR public.is_super_admin();

-- Inscrieri Examene
CREATE OR REPLACE VIEW public.vedere_cluburi_inscrieri_examene AS
SELECT i.* FROM public.inscrieri_examene i
JOIN public.sportivi s ON i.sportiv_id = s.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Familii
CREATE OR REPLACE VIEW public.vedere_cluburi_familii AS
SELECT DISTINCT f.* FROM public.familii f
JOIN public.sportivi s ON s.familie_id = f.id
WHERE s.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Tipuri Abonament
CREATE OR REPLACE VIEW public.vedere_cluburi_tipuri_abonament AS
SELECT * FROM public.tipuri_abonament
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Locatii
CREATE OR REPLACE VIEW public.vedere_cluburi_locatii AS
SELECT * FROM public.nom_locatii
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Preturi Config
CREATE OR REPLACE VIEW public.vedere_cluburi_preturi_config AS
SELECT * FROM public.preturi_config
WHERE club_id = public.get_active_club_id() OR club_id IS NULL OR public.is_super_admin();

-- Deconturi Federatie
CREATE OR REPLACE VIEW public.vedere_cluburi_deconturi_federatie AS
SELECT * FROM public.deconturi_federatie
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Program Antrenamente
-- 1. Add tip_antrenament column to the base table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='program_antrenamente' AND column_name='tip_antrenament') THEN
        ALTER TABLE public.program_antrenamente ADD COLUMN tip_antrenament TEXT DEFAULT 'regular' CHECK (tip_antrenament IN ('regular', 'stagiu', 'examen'));
    END IF;
END $$;

-- 2. Create the enhanced view for the new component
CREATE OR REPLACE VIEW public.vedere_cluburi_program_antrenamente AS
SELECT 
    pa.*,
    g.denumire as nume_grupa,
    g.sala as sala,
    (SELECT count(*) FROM public.sportivi s WHERE s.grupa_id = g.id) as sportivi_count,
    EXTRACT(EPOCH FROM (pa.ora_sfarsit::time - pa.ora_start::time))/60 as durata_minute,
    CASE EXTRACT(DOW FROM pa.data)
        WHEN 0 THEN 'Duminică'
        WHEN 1 THEN 'Luni'
        WHEN 2 THEN 'Marți'
        WHEN 3 THEN 'Miercuri'
        WHEN 4 THEN 'Joi'
        WHEN 5 THEN 'Vineri'
        WHEN 6 THEN 'Sâmbătă'
    END as ziua_saptamanii
FROM public.program_antrenamente pa
LEFT JOIN public.grupe g ON pa.grupa_id = g.id
WHERE pa.club_id = public.get_active_club_id() OR public.is_super_admin();

-- Anunturi Prezenta
CREATE OR REPLACE VIEW public.vedere_cluburi_anunturi_prezenta AS
SELECT * FROM public.anunturi_prezenta
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Vizualizare Plati (based on view_plata_sportiv)
CREATE OR REPLACE VIEW public.vedere_cluburi_vizualizare_plati AS
SELECT * FROM public.view_plata_sportiv
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Istoric Plati Detaliat (based on view_istoric_plati_detaliat)
CREATE OR REPLACE VIEW public.vedere_cluburi_istoric_plati_detaliat AS
SELECT * FROM public.view_istoric_plati_detaliat
WHERE club_id = public.get_active_club_id() OR public.is_super_admin();

-- Balanta Club (if exists)
-- CREATE OR REPLACE VIEW public.vedere_cluburi_balanta_club AS
-- SELECT * FROM public.balanta_club
-- WHERE club_id = public.get_active_club_id() OR public.is_super_admin();
-- Verificăm dacă tabelul există și adăugăm doar ce lipsește fără a șterge datele vechi
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'titluri_sportive') THEN
        CREATE TABLE public.titluri_sportive (
            id uuid not null default gen_random_uuid (),
            sportiv_id uuid null,
            tip_titlu text not null,
            nr_legitimatie text null,
            data_acordarii date null,
            created_at timestamp with time zone null default now(),
            constraint titluri_sportive_pkey primary key (id),
            constraint unique_sportiv_titlu unique (sportiv_id),
            constraint titluri_sportive_sportiv_id_fkey foreign KEY (sportiv_id) references sportivi (id) on delete CASCADE
        );
    END IF;
END $$;

-- RLS pentru titluri (Să poată scrie și instructorul)
ALTER TABLE public.titluri_sportive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff_Manage_Titluri" ON public.titluri_sportive;
CREATE POLICY "Staff_Manage_Titluri" ON public.titluri_sportive
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM sportivi WHERE id = sportiv_id AND club_id IN (SELECT club_id FROM utilizator_roluri_multicont WHERE user_id = auth.uid())));alter table public.sportivi add column if not exists locul_nasterii text;
alter table public.sportivi add column if not exists cetatenia text;
alter table public.sportivi add column if not exists departament text;
-- nr_legitimatie already exists in sportivi table based on previous interactions
-- 1. ASIGURĂM RLS PENTRU SPORTIVI
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Manage Own Club Sportivi" ON public.sportivi;
CREATE POLICY "Staff - Manage Own Club Sportivi" ON public.sportivi
FOR ALL TO authenticated
USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS "Sportiv - View Own Profile" ON public.sportivi;
CREATE POLICY "Sportiv - View Own Profile" ON public.sportivi
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2. ASIGURĂM RLS PENTRU TITLURI SPORTIVE
ALTER TABLE public.titluri_sportive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff - Manage Titluri" ON public.titluri_sportive;
CREATE POLICY "Staff - Manage Titluri" ON public.titluri_sportive
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sportivi s
        WHERE s.id = titluri_sportive.sportiv_id
        AND public.has_access_to_club(s.club_id)
    )
);

-- 3. ASIGURĂM RLS PENTRU NOM_CATEGORII_COMPETITIE
ALTER TABLE public.nom_categorii_competitie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone - View Categorii" ON public.nom_categorii_competitie;
CREATE POLICY "Anyone - View Categorii" ON public.nom_categorii_competitie
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin - Manage Categorii" ON public.nom_categorii_competitie;
CREATE POLICY "Admin - Manage Categorii" ON public.nom_categorii_competitie
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
    )
);

-- 4. RE-CREARE VIEW-URI DACĂ ESTE NECESAR (Exemplu: vedere_sportivi_detaliat)
-- Aceasta depinde de ce erori de view-uri au fost raportate, dar de obicei vizează accesul la datele sportivilor.

CREATE OR REPLACE VIEW public.vedere_sportivi_detaliat AS
SELECT 
    s.*,
    c.nume as club_nume,
    g.nume as grad_nume,
    gr.denumire as grupa_nume  -- Corectat din gr.nume în gr.denumire
FROM public.sportivi s
LEFT JOIN public.cluburi c ON s.club_id = c.id
LEFT JOIN public.grade g ON s.grad_actual_id = g.id
LEFT JOIN public.grupe gr ON s.grupa_id = gr.id;

GRANT SELECT ON public.vedere_sportivi_detaliat TO authenticated;
INSERT INTO public.nom_categorii_competitie (id, denumire, varsta_min, varsta_max, ordine_afisare)
VALUES 
('0c2f53fa-214f-4dbd-8140-ffdd205e7452', 'Seniori', 18, 39, 5),
('5755d68a-0d22-438e-a042-dbbe80969469', 'Juniori 1', 16, 17, 4),
('6308a975-be0d-4be2-bca2-03b84a5f27fb', 'Juniori mici', 9, 12, 2),
('7c57eb19-46f0-4989-8424-f419c7392592', 'Juniori 2', 13, 15, 3),
('922a014a-c483-4536-9416-393cb21dd356', 'Veterani', 40, 120, 6),
('af434694-3bb7-479c-80dc-14541e7322e1', 'Copii', 4, 8, 1)
ON CONFLICT (id) DO UPDATE SET
    denumire = EXCLUDED.denumire,
    varsta_min = EXCLUDED.varsta_min,
    varsta_max = EXCLUDED.varsta_max,
    ordine_afisare = EXCLUDED.ordine_afisare;
-- Migration: Update get_active_club_id to use active-role-context-id header
-- This makes the club context dynamic based on the UI selection without requiring DB writes

CREATE OR REPLACE FUNCTION public.get_active_club_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_context_id UUID;
    v_club_id UUID;
    v_header_val TEXT;
BEGIN
    -- 1. Try to get context from header
    -- We use a safe way to access the setting which might not exist
    BEGIN
        v_header_val := current_setting('request.headers', true);
        IF v_header_val IS NOT NULL THEN
            v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_context_id := NULL;
    END;

    -- 2. If we have a context ID from header, find its club_id
    IF v_context_id IS NOT NULL THEN
        SELECT club_id INTO v_club_id
        FROM public.utilizator_roluri_multicont
        WHERE id = v_context_id AND user_id = auth.uid();
        
        IF v_club_id IS NOT NULL THEN
            RETURN v_club_id;
        END IF;
    END IF;

    -- 3. Fallback to primary role in DB
    SELECT club_id INTO v_club_id
    FROM public.utilizator_roluri_multicont 
    WHERE user_id = auth.uid() 
    AND is_primary = true 
    LIMIT 1;
    
    RETURN v_club_id;
END;
$$;

-- Re-apply views that depend on get_active_club_id to ensure they use the new logic
-- (Though views usually pick up function changes automatically if the signature is the same)

-- Ensure is_super_admin is also robust
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_context_id UUID;
    v_rol_nume TEXT;
    v_header_val TEXT;
BEGIN
    -- 1. Check header first
    BEGIN
        v_header_val := current_setting('request.headers', true);
        IF v_header_val IS NOT NULL THEN
            v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_context_id := NULL;
    END;

    IF v_context_id IS NOT NULL THEN
        SELECT rol_denumire INTO v_rol_nume
        FROM public.utilizator_roluri_multicont
        WHERE id = v_context_id AND user_id = auth.uid();
        
        IF v_rol_nume = 'SUPER_ADMIN_FEDERATIE' THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- 2. Fallback to any super admin role
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    );
END;
$$;
-- Tabel pentru gestiunea vizelor medicale
CREATE TABLE IF NOT EXISTS public.vize_medicale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    data_emitere DATE NOT NULL,
    data_expirare DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Valid', 'Expirat', 'În așteptare')),
    document_url TEXT, -- Link către fișierul încărcat (PDF/Imagine)
    observatii TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru viteză la filtrarea vizelor expirate
CREATE INDEX IF NOT EXISTS idx_vize_medicale_expirare ON public.vize_medicale(data_expirare);
CREATE INDEX IF NOT EXISTS idx_vize_medicale_sportiv ON public.vize_medicale(sportiv_id);

-- Politici RLS (Securitate)
ALTER TABLE public.vize_medicale ENABLE ROW LEVEL SECURITY;

-- Sportivii își pot vedea propriile vize
CREATE POLICY "Sportivii își văd propriile vize" ON public.vize_medicale
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.sportivi WHERE id = sportiv_id));

-- Adminii și Instructorii pot vedea și gestiona tot
CREATE POLICY "Adminii și Instructorii gestionează vizele" ON public.vize_medicale
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roluri r ON ur.rol_id = r.id
            WHERE ur.user_id = auth.uid() AND r.nume IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
        )
    );
-- Migration: Add 'nume' column to sesiuni_examene with CHECK constraint
DO $$
BEGIN
    -- 1. Add column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sesiuni_examene' AND column_name = 'nume') THEN
        ALTER TABLE public.sesiuni_examene ADD COLUMN nume TEXT;
    END IF;

    -- 2. Update existing rows (if any) to a default value
    UPDATE public.sesiuni_examene SET nume = 'Vara' WHERE nume IS NULL;

    -- 3. Make it NOT NULL
    ALTER TABLE public.sesiuni_examene ALTER COLUMN nume SET NOT NULL;

    -- 4. Add CHECK constraint
    ALTER TABLE public.sesiuni_examene DROP CONSTRAINT IF EXISTS check_sesiune_nume;
    ALTER TABLE public.sesiuni_examene ADD CONSTRAINT check_sesiune_nume CHECK (nume IN ('Vara', 'Iarna'));
END $$;
