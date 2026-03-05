-- 1. Redefinim funcția tr_completeaza_rol_id
-- SECURITY DEFINER îi permite să ruleze cu drepturi de sistem
CREATE OR REPLACE FUNCTION public.tr_completeaza_rol_id()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Completare rol_id dacă lipsește
    IF NEW.rol_id IS NULL AND NEW.rol_denumire IS NOT NULL THEN
        SELECT id INTO NEW.rol_id FROM public.roluri WHERE denumire = NEW.rol_denumire;
    END IF;

    -- 2. Completare nume_utilizator_cache dacă lipsește
    IF NEW.nume_utilizator_cache IS NULL THEN
        -- Încercăm din metadata sesiune (auth.jwt())
        NEW.nume_utilizator_cache := auth.jwt() ->> 'full_name';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefinim funcția de verificare Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    );
END;
$$;

-- 3. Actualizăm politica pentru Sportivi
-- Eliminăm orice condiție care ar putea declanșa un join ascuns cu schema auth
DROP POLICY IF EXISTS "Select_Sportivi_Unified" ON public.sportivi;

CREATE POLICY "Select_Sportivi_Unified" ON public.sportivi
FOR SELECT USING (
    public.is_super_admin() 
    OR club_id = (
        SELECT club_id FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND id = NULLIF(current_setting('request.headers', true)::json->>'active-role-context-id', '')::uuid
    )
);
