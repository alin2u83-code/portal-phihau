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
