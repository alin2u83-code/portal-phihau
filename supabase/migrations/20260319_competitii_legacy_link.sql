-- =====================================================
-- MIGRATION: competitii_legacy_link
-- Adaugă legătură către evenimentul legacy pentru a
-- păstra rezultatele sportivilor după migrare
-- =====================================================

ALTER TABLE public.competitii
    ADD COLUMN IF NOT EXISTS legacy_eveniment_id UUID REFERENCES public.evenimente(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_competitii_legacy_eveniment_id
    ON public.competitii(legacy_eveniment_id)
    WHERE legacy_eveniment_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'competitii_legacy_link applied successfully.';
END $$;
