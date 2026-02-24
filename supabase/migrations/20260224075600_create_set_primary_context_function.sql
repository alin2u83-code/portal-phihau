CREATE OR REPLACE FUNCTION public.set_primary_context(
    p_user_id uuid,
    p_rol_denumire text,
    p_club_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Set all existing roles for the user to not primary
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = FALSE
    WHERE user_id = p_user_id;

    -- Set the specified role as primary
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = TRUE
    WHERE user_id = p_user_id
      AND rol_denumire = p_rol_denumire
      AND (p_club_id IS NULL OR club_id = p_club_id);
END;
$function$;
