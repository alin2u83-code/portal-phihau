-- Fișier de Migrare: Ajustarea Politicilor RLS pentru Instructori
-- Descriere: Acest script implementează reguli de Row Level Security pentru a se asigura că instructorii
-- pot accesa și modifica doar datele de prezență pentru cluburile lor.

-- Pasul 1: Crearea unei funcții helper pentru a obține ID-urile cluburilor unui instructor.
-- Această funcție returnează o listă de club_id pentru utilizatorul autentificat care are rolul de instructor.
CREATE OR REPLACE FUNCTION public.get_instructor_club_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Se execută cu privilegiile definitorului (de obicei, postgres)
SET search_path = public
AS $$
BEGIN
  -- Verifică dacă utilizatorul este autentificat
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Returnează ID-urile cluburilor unde utilizatorul este instructor
  -- Presupunem că există un tabel `club_instructori` care leagă `user_id` de `club_id`
  RETURN QUERY
  SELECT club_id
  FROM public.club_instructori
  WHERE user_id = auth.uid();
END;
$$;

-- Pasul 2: Aplicarea politicilor RLS pe tabelul `prezenta`

-- Mai întâi, ne asigurăm că RLS este activat pe tabel
ALTER TABLE public.prezenta ENABLE ROW LEVEL SECURITY;

-- Ștergem politicile vechi pentru a evita conflictele (dacă există)
DROP POLICY IF EXISTS "Instructors can view their club's attendance" ON public.prezenta;
DROP POLICY IF EXISTS "Instructors can insert attendance for their club" ON public.prezenta;

-- Politica pentru VIZUALIZARE (SELECT)
-- Permite unui instructor să vadă înregistrările de prezență doar dacă antrenamentul respectiv
-- aparține unuia dintre cluburile sale.
CREATE POLICY "Instructors can view their club's attendance"
ON public.prezenta
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.antrenamente
    WHERE antrenamente.id = prezenta.antrenament_id
      AND antrenamente.club_id IN (SELECT * FROM public.get_instructor_club_ids())
  )
);

-- Politica pentru ÎNREGISTRARE (INSERT)
-- Permite unui instructor să adauge o înregistrare de prezență doar dacă antrenamentul
-- pentru care se face înregistrarea aparține unuia dintre cluburile sale.
CREATE POLICY "Instructors can insert attendance for their club"
ON public.prezenta
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.antrenamente
    WHERE antrenamente.id = prezenta.antrenament_id
      AND antrenamente.club_id IN (SELECT * FROM public.get_instructor_club_ids())
  )
);

-- Notă: Acest script nu definește politici pentru alte roluri (ex: SUPER_ADMIN_FEDERATIE ar putea avea nevoie de acces total).
-- Se recomandă adăugarea unor politici separate pentru alte roluri, de exemplu:
-- CREATE POLICY "Super Admins have full access" ON public.prezenta FOR ALL USING (is_super_admin());

