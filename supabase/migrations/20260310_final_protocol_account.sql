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
