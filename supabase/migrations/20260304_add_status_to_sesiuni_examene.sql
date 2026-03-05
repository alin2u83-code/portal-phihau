-- Add status column to sesiuni_examene table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sesiuni_examene' AND column_name = 'status') THEN
        ALTER TABLE public.sesiuni_examene ADD COLUMN status TEXT DEFAULT 'Programat';
    END IF;
END $$;
