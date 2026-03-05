-- Inspect policies on plati
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'plati';

-- Inspect policies on utilizator_roluri_multicont
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'utilizator_roluri_multicont';

-- Check definition of check_club_access again
SELECT pg_get_functiondef('public.check_club_access'::regproc);
