-- Textul LIVE al public.audit_trigger_fn() inainte de 20261111d (11.11.2026), pentru rollback.
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
    role_ctx_id UUID;
BEGIN
    BEGIN
        role_ctx_id := (current_setting('request.headers', true)::json->>'active-role-context-id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        role_ctx_id := NULL;
    END;
    INSERT INTO public.audit_log (user_id, role_context_id, tabel, operatie, rand_id, date_vechi, date_noi)
    VALUES (auth.uid(), role_ctx_id, TG_TABLE_NAME, TG_OP,
        COALESCE(CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN (NEW.id)::uuid ELSE NULL END,
                 CASE WHEN TG_OP = 'DELETE' THEN (OLD.id)::uuid ELSE NULL END),
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END);
    RETURN COALESCE(NEW, OLD);
END;
$function$;
