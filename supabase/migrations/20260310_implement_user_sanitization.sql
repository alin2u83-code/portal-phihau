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
