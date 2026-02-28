-- Adăugare suport pentru SUPER_ADMIN_FEDERATIE în politicile financiare

-- 1. Actualizare politică PLATI pentru Staff Club + Super Admin
DROP POLICY IF EXISTS "Staff Club - Management plati" ON public.plati;
CREATE POLICY "Staff Club - Management plati" ON public.plati
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE'
            OR (
                rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
                AND club_id = plati.club_id
            )
        )
    )
);

-- 2. Actualizare politică TRANZACTII pentru Staff Club + Super Admin
DROP POLICY IF EXISTS "Staff Club - Management tranzactii" ON public.tranzactii;
CREATE POLICY "Staff Club - Management tranzactii" ON public.tranzactii
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.utilizator_roluri_multicont 
        WHERE user_id = auth.uid() 
        AND (
            rol_denumire = 'SUPER_ADMIN_FEDERATIE'
            OR (
                rol_denumire IN ('ADMIN_CLUB', 'INSTRUCTOR', 'ADMIN')
                AND club_id = tranzactii.club_id
            )
        )
    )
);
