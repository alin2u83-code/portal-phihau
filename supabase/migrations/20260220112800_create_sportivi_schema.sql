-- Fișier de Migrare: Schema pentru Managementul Sportivilor
-- Descriere: Creează tabelele pentru grade, sportivi și istoricul gradelor.

-- Pasul 1: Crearea tabelului nomenclator pentru grade (centuri)
CREATE TABLE IF NOT EXISTS public.grade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nume TEXT NOT NULL UNIQUE,
  ordine INT NOT NULL, -- Pentru sortarea gradelor (ex: 1 pentru albă, 2 pentru galbenă etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.grade IS 'Nomenclator pentru centurile și gradele din Qwan Ki Do.';
COMMENT ON COLUMN public.grade.ordine IS 'Stabilește ierarhia gradelor pentru sortare.';

-- Pasul 2: Crearea tabelului pentru sportivi (membri)
CREATE TABLE IF NOT EXISTS public.sportivi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nume TEXT NOT NULL,
  prenume TEXT NOT NULL,
  data_nasterii DATE,
  email TEXT UNIQUE,
  telefon TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Legătura cu contul de autentificare
  club_id UUID REFERENCES public.cluburi(id) ON DELETE SET NULL, -- Legătura cu clubul de care aparține
  centura_curenta_id UUID REFERENCES public.grade(id) ON DELETE SET NULL, -- Centura actuală
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sportivi IS 'Stochează datele despre membrii clubului.';
COMMENT ON COLUMN public.sportivi.user_id IS 'ID-ul utilizatorului din sistemul de autentificare Supabase.';
COMMENT ON COLUMN public.sportivi.centura_curenta_id IS 'ID-ul gradului curent al sportivului.';

-- Pasul 3: Crearea tabelului pentru istoricul gradelor
CREATE TABLE IF NOT EXISTS public.istoric_grade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
  grad_id UUID NOT NULL REFERENCES public.grade(id) ON DELETE RESTRICT,
  data_obtinere DATE NOT NULL,
  examinator TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.istoric_grade IS 'Înregistrează istoricul evoluției în grade pentru fiecare sportiv.';
COMMENT ON COLUMN public.istoric_grade.sportiv_id IS 'Sportivul care a obținut gradul.';
COMMENT ON COLUMN public.istoric_grade.grad_id IS 'Gradul obținut.';
COMMENT ON COLUMN public.istoric_grade.data_obtinere IS 'Data la care a fost obținut gradul.';

-- Pasul 4: Activarea RLS pentru noile tabele (politicile vor fi adăugate separat)
ALTER TABLE public.grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sportivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.istoric_grade ENABLE ROW LEVEL SECURITY;

-- Politici de bază pentru a permite citirea datelor de către utilizatorii autentificați
-- Acestea pot fi rafinate ulterior
CREATE POLICY "Allow authenticated read access to grades" ON public.grade FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access to sportivi" ON public.sportivi FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access to grade history" ON public.istoric_grade FOR SELECT USING (auth.role() = 'authenticated');

