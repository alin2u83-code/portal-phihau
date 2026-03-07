# Setup Supabase RLS și Funcții SQL

Pentru a te asigura că totul funcționează perfect după reconectare, te rog să rulezi următorul script SQL în consola Supabase (SQL Editor).

Acest script va:
1. Activa Row Level Security (RLS) pe tabelele cheie.
2. Crea/Actualiza funcția `get_user_roles` necesară pentru a aduce rolurile utilizatorului.
3. Crea/Actualiza funcția `switch_primary_context` (deși contextul este gestionat acum prin headere, e bine să o ai).

### Copiază și rulează acest cod în Supabase SQL Editor:

```sql
-- 1. Activare RLS pe tabelele principale
ALTER TABLE sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE plati ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturi ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizator_roluri_multicont ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_antrenamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE anunturi_prezenta ENABLE ROW LEVEL SECURITY;

-- 2. Funcția pentru obținerea rolurilor utilizatorului
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS TABLE(rol_denumire text, club_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT urm.rol_denumire, urm.club_id
    FROM utilizator_roluri_multicont urm
    WHERE urm.utilizator_id = user_id;
END;
$$;

-- 3. Funcția pentru schimbarea contextului (opțional, pentru compatibilitate)
CREATE OR REPLACE FUNCTION public.switch_primary_context(new_club_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Această funcție poate seta o variabilă de sesiune în Postgres
    -- În aplicația noastră, contextul este trimis prin header-ul 'active-role-context-id'
    PERFORM set_config('app.current_club_id', new_club_id::text, false);
END;
$$;
```

### Notă importantă despre Vercel:
Aplicația este deja configurată să folosească Vercel. Fișierul `supabaseClient.ts` citește variabilele de mediu `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`. Atâta timp cât aceste variabile sunt setate corect în dashboard-ul Vercel, aplicația se va conecta la baza ta de date. Eroarea anterioară a fost rezolvată (nu mai trimitem un UUID gol către baza de date).
