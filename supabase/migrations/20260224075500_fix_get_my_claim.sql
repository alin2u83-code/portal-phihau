CREATE OR REPLACE FUNCTION public.get_my_claim(claim_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
  BEGIN
    RETURN coalesce(current_setting('request.jwt.claims', true)::jsonb -> claim_name, '{}'::jsonb);
  END;
$function$;
