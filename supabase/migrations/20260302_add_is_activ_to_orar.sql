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
