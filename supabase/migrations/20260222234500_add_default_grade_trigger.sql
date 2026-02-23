-- Add default grade trigger for new sportivi

CREATE OR REPLACE FUNCTION public.handle_new_sportiv_default_grade()
RETURNS TRIGGER AS $$
DECLARE
    debutant_grade_id UUID;
BEGIN
    -- Find the ID of the 'Debutant' grade (or order 1)
    SELECT id INTO debutant_grade_id
    FROM public.grade
    WHERE nume = 'Debutant' OR ordine = 1
    LIMIT 1;

    IF debutant_grade_id IS NOT NULL THEN
        -- Insert into istoric_grade for the new sportiv
        INSERT INTO public.istoric_grade (sportiv_id, grad_id, data_acordarii, observatii)
        VALUES (NEW.id, debutant_grade_id, CURRENT_DATE, 'Alocat automat la înscriere');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists to avoid conflicts during re-migration
DROP TRIGGER IF EXISTS set_default_grade_for_new_sportiv_trigger ON public.sportivi;

-- Create the trigger
CREATE TRIGGER set_default_grade_for_new_sportiv_trigger
AFTER INSERT ON public.sportivi
FOR EACH ROW EXECUTE FUNCTION public.handle_new_sportiv_default_grade();

-- Set the initial grad_actual_id for existing sportivi if not already set
-- This part is for existing data, ensuring consistency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.istoric_grade WHERE observatii = 'Alocat automat la înscriere') THEN
        INSERT INTO public.istoric_grade (sportiv_id, grad_id, data_acordarii, observatii)
        SELECT
            s.id AS sportiv_id,
            (SELECT id FROM public.grade WHERE nume = 'Debutant' OR ordine = 1 LIMIT 1) AS grad_id,
            s.data_inscrierii AS data_acordarii,
            'Alocat automat la înscriere'
        FROM public.sportivi s
        WHERE s.grad_actual_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM public.istoric_grade ig WHERE ig.sportiv_id = s.id AND ig.observatii = 'Alocat automat la înscriere');
    END IF;
END $$;
