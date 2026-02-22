-- ====================================================================
-- Adăugare Constrângere de Unicitate pe Email
-- Scop: Prevenirea duplicării înregistrărilor pentru același membru
-- ====================================================================

-- 1. Gestionare tabela 'utilizatori' (conform cerinței explicite)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'utilizatori') THEN
        -- Notă: Înainte de a rula acest script, asigurați-vă că nu există duplicate.
        -- Dacă există duplicate, ALTER TABLE va eșua.
        BEGIN
            ALTER TABLE public.utilizatori ADD CONSTRAINT utilizatori_email_key UNIQUE (email);
            RAISE NOTICE 'Constrângerea UNIQUE a fost adăugată pe public.utilizatori(email).';
        EXCEPTION WHEN duplicate_table THEN
            RAISE NOTICE 'Constrângerea UNIQUE există deja pe public.utilizatori(email).';
        END;
    END IF;
END $$;

-- 2. Gestionare tabela 'sportivi' (tabela principală de profiluri din aplicație)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sportivi') THEN
        BEGIN
            ALTER TABLE public.sportivi ADD CONSTRAINT sportivi_email_key UNIQUE (email);
            RAISE NOTICE 'Constrângerea UNIQUE a fost adăugată pe public.sportivi(email).';
        EXCEPTION WHEN duplicate_table THEN
            RAISE NOTICE 'Constrângerea UNIQUE există deja pe public.sportivi(email).';
        END;
    END IF;
END $$;
