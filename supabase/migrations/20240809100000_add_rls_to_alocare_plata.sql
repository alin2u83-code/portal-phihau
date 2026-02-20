-- =================================================================
-- Politici de Securitate (RLS) pentru Tabela `alocare_plata`
-- =================================================================
-- Scop: Limitează accesul la tabela `alocare_plata` astfel încât
-- utilizatorii să poată gestiona doar propriile înregistrări.
-- Această politică presupune că tabela `alocare_plata` conține o coloană
-- `user_id` care este o cheie străină către `auth.users`.
-- =================================================================

-- Pas 1: Activarea Row Level Security pe tabela `alocare_plata`
-- NOTĂ: Acest pas va eșua dacă tabela `alocare_plata` nu există.
-- Se presupune că tabela a fost creată într-o migrare anterioară.
ALTER TABLE public.alocare_plata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alocare_plata FORCE ROW LEVEL SECURITY;

-- Pas 2: Crearea politicii de acces
-- Această politică permite unui utilizator autentificat să efectueze
-- orice operațiune (SELECT, INSERT, UPDATE, DELETE) pe rândurile
-- care îi aparțin (unde `user_id` corespunde cu ID-ul său de autentificare).
CREATE POLICY "Utilizatorii își pot gestiona propriile alocări de plată"
ON public.alocare_plata
FOR ALL
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- Notă: Nicio altă politică nu este adăugată. Conform principiului "deny by default",
-- accesul este interzis pentru oricine altcineva, cu excepția rolurilor
-- care ocolesc RLS (precum `service_role`).
