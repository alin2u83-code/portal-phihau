-- Migration: Update get_active_club_id to use active-role-context-id header
-- This makes the club context dynamic based on the UI selection without requiring DB writes

CREATE OR REPLACE FUNCTION public.get_active_club_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_context_id UUID;
    v_club_id UUID;
    v_header_val TEXT;
BEGIN
    -- 1. Try to get context from header
    -- We use a safe way to access the setting which might not exist
    BEGIN
        v_header_val := current_setting('request.headers', true);
        IF v_header_val IS NOT NULL THEN
            v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_context_id := NULL;
    END;

    -- 2. If we have a context ID from header, find its club_id
    IF v_context_id IS NOT NULL THEN
        SELECT club_id INTO v_club_id
        FROM public.utilizator_roluri_multicont
        WHERE id = v_context_id AND user_id = auth.uid();
        
        IF v_club_id IS NOT NULL THEN
            RETURN v_club_id;
        END IF;
    END IF;

    -- 3. Fallback to primary role in DB
    SELECT club_id INTO v_club_id
    FROM public.utilizator_roluri_multicont 
    WHERE user_id = auth.uid() 
    AND is_primary = true 
    LIMIT 1;
    
    RETURN v_club_id;
END;
$$;

-- Re-apply views that depend on get_active_club_id to ensure they use the new logic
-- (Though views usually pick up function changes automatically if the signature is the same)

-- Ensure is_super_admin is also robust
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_context_id UUID;
    v_rol_nume TEXT;
    v_header_val TEXT;
BEGIN
    -- 1. Check header first
    BEGIN
        v_header_val := current_setting('request.headers', true);
        IF v_header_val IS NOT NULL THEN
            v_context_id := (v_header_val::json->>'active-role-context-id')::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_context_id := NULL;
    END;

    IF v_context_id IS NOT NULL THEN
        SELECT rol_denumire INTO v_rol_nume
        FROM public.utilizator_roluri_multicont
        WHERE id = v_context_id AND user_id = auth.uid();
        
        IF v_rol_nume = 'SUPER_ADMIN_FEDERATIE' THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- 2. Fallback to any super admin role
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    );
END;
$$;
