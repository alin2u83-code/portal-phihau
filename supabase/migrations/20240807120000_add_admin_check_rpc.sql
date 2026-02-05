-- =================================================================
-- Funcție RPC pentru Verificarea Rolului de Administrator
-- v1.1 - Adăugat rolul 'Admin' pentru consistență
-- =================================================================
-- Scop: Returnează `true` dacă utilizatorul curent are cel puțin
-- unul dintre rolurile administrative specificate. Rulează cu
-- permisiunile apelantului (SECURITY INVOKER), deci interoghează
-- tabela `utilizator_roluri_multicont` în contextul utilizatorului autentificat.
-- =================================================================

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE -- Marcat ca STABLE deoarece nu modifică baza de date și depinde doar de auth.uid()
SECURITY INVOKER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.utilizator_roluri_multicont
        WHERE user_id = auth.uid()
        AND rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE', 'Admin')
    );
$$;