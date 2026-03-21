-- Creare tabel nomenclator pentru statusurile de prezenta
-- Elimina dependenta de string-uri hardcodate ('Prezent'/'Absent')
-- Logica de "e prezent sau nu" este in campul este_prezent (boolean)

-- 1. Tabelul root
CREATE TABLE public.statuse_prezenta (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod  TEXT UNIQUE NOT NULL,       -- identificator intern stabil
  denumire TEXT NOT NULL,           -- text afisat in UI
  este_prezent BOOLEAN NOT NULL DEFAULT FALSE,
  ordine INTEGER NOT NULL DEFAULT 0
);

-- 2. Date initiale
INSERT INTO public.statuse_prezenta (cod, denumire, este_prezent, ordine) VALUES
  ('prezent', 'Prezent', true,  1),
  ('absent',  'Absent',  false, 2);

-- 3. RLS: toti utilizatorii autentificati pot citi (este nomenclator)
ALTER TABLE public.statuse_prezenta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read statuse_prezenta"
  ON public.statuse_prezenta FOR SELECT TO authenticated USING (true);

-- 4. Adauga coloana status_id in prezenta_antrenament
ALTER TABLE public.prezenta_antrenament
  ADD COLUMN status_id UUID REFERENCES public.statuse_prezenta(id);

-- 5. Migreaza datele existente (dupa fix-ul de case din migratia anterioara)
UPDATE public.prezenta_antrenament pa
SET status_id = sp.id
FROM public.statuse_prezenta sp
WHERE LOWER(pa.status) = sp.cod;

-- 6. Sterge coloana text veche
ALTER TABLE public.prezenta_antrenament DROP COLUMN IF EXISTS status;

-- 7. Grant select pe tabel nomenclator
GRANT SELECT ON public.statuse_prezenta TO authenticated;
