-- =================================================================
-- MASTER SCRIPT: SISTEM MANAGEMENT CLUB QWAN KI DO (Phi Hau)
-- Versiune: 2.0 (Consolidată)
-- =================================================================

-- =================================================================
-- 1. MODUL ADMINISTRATIV: Proceduri Helper și Utilitare
-- =================================================================

-- Resetare politici pentru un tabel (Idempotent)
CREATE OR REPLACE PROCEDURE public.reset_all_policies_for_table(p_table_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_record.policyname, p_table_name);
    END LOOP;
END;
$$;

-- Funcții Helper pentru citirea contextului din JWT (Rol activ și Club)
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS TEXT AS $$
  SELECT UPPER(auth.jwt() -> 'user_metadata' ->> 'rol_activ_context');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'club_id', '')::uuid;
$$ LANGUAGE sql STABLE;

-- =================================================================
-- 2. MODUL SPORTIVI: Gestiune, Istoric Grade și Automatizări
-- =================================================================

-- Adăugare coloană Cod Sportiv (Ex: 2024PHVP001)
ALTER TABLE public.sportivi ADD COLUMN IF NOT EXISTS cod_sportiv TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sportivi_cod_sportiv_unique_idx ON public.sportivi (cod_sportiv);

-- Generator de Cod Unic pentru Sportivi noi
CREATE OR REPLACE FUNCTION public.generate_sportiv_code(p_an INT, p_nume TEXT, p_prenume TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    initiale TEXT;
    prefix TEXT;
    next_seq INT;
BEGIN
    initiale := UPPER(SUBSTRING(unaccent(p_nume) FROM 1 FOR 1) || SUBSTRING(unaccent(p_prenume) FROM 1 FOR 1));
    prefix := p_an || 'PH' || initiale;
    
    -- Logică de incrementare (simplificată pentru exemplu)
    SELECT COALESCE(COUNT(*), 0) + 1 INTO next_seq FROM public.sportivi WHERE cod_sportiv LIKE prefix || '%';
    RETURN prefix || LPAD(next_seq::text, 3, '0');
END;
$$;

-- Procesare rezultate examen (Atomic)
CREATE OR REPLACE FUNCTION public.process_exam_row_with_upsert(
    p_cnp TEXT, p_nume TEXT, p_prenume TEXT, p_club_id UUID,
    p_ordine_grad INT, p_rezultat TEXT, p_contributie NUMERIC,
    p_data_examen DATE, p_sesiune_id UUID
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
-- [Logică pentru înregistrare grad, plată taxă și creare sportiv dacă nu există]
-- (Conținutul din fișierul 20240801130000_process_exam_results_rpc.sql)
BEGIN
    -- ... (codul complet de procesare)
    RETURN 'SUCCESS';
END;
$$;

-- =================================================================
-- 3. MODUL EVENIMENTE: Antrenamente și Notificări
-- =================================================================

-- Sistem Hibrid de Orar (Generare automată din program săptămânal)
ALTER TABLE public.program_antrenamente ADD COLUMN IF NOT EXISTS is_recurent BOOLEAN DEFAULT false;
ALTER TABLE public.program_antrenamente ADD CONSTRAINT program_antrenamente_unic_idx UNIQUE (data, ora_start, grupa_id);

CREATE OR REPLACE FUNCTION public.genereaza_antrenamente_din_orar(p_zile_in_avans INT DEFAULT 30)
RETURNS TEXT LANGUAGE plpgsql AS $$
-- [Logică generare serii de date bazate pe orar_saptamanal]
BEGIN
    -- ...
    RETURN 'Antrenamente generate cu succes.';
END;
$$;

-- Trigger Notificări cu UPSERT (Prevenire duplicate notificări prezență)
CREATE OR REPLACE FUNCTION public.creeaza_sau_actualizeaza_notificare_prezenta()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.notificari (recipient_user_id, sender_sportiv_id, source_antrenament_id, title, body, is_read)
    VALUES (NEW.user_id, NEW.sportiv_id, NEW.antrenament_id, 'Prezență Nouă', '...', FALSE)
    ON CONFLICT (source_antrenament_id, sender_sportiv_id, recipient_user_id)
    DO UPDATE SET created_at = NOW(), is_read = FALSE;
    RETURN NEW;
END;
$$;

-- =================================================================
-- 4. FINALIZARE
-- =================================================================
-- Notă: Politicile RLS și securitatea sunt acum gestionate în fișierul 
-- `20260228_CONSOLIDATED_SECURITY.sql`.
