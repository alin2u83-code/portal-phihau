-- Verificăm dacă tabelul există și adăugăm doar ce lipsește fără a șterge datele vechi
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'titluri_sportive') THEN
        CREATE TABLE public.titluri_sportive (
            id uuid not null default gen_random_uuid (),
            sportiv_id uuid null,
            tip_titlu text not null,
            nr_legitimatie text null,
            data_acordarii date null,
            created_at timestamp with time zone null default now(),
            constraint titluri_sportive_pkey primary key (id),
            constraint unique_sportiv_titlu unique (sportiv_id),
            constraint titluri_sportive_sportiv_id_fkey foreign KEY (sportiv_id) references sportivi (id) on delete CASCADE
        );
    END IF;
END $$;

-- RLS pentru titluri (Să poată scrie și instructorul)
ALTER TABLE public.titluri_sportive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff_Manage_Titluri" ON public.titluri_sportive;
CREATE POLICY "Staff_Manage_Titluri" ON public.titluri_sportive
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM sportivi WHERE id = sportiv_id AND club_id IN (SELECT club_id FROM utilizator_roluri_multicont WHERE user_id = auth.uid())));