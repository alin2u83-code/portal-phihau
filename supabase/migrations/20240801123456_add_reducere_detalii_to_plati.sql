-- Adaugă coloana `reducere_detalii` la tabelul `plati` pentru a stoca motivul reducerii.
ALTER TABLE public.plati
ADD COLUMN IF NOT EXISTS reducere_detalii TEXT;

COMMENT ON COLUMN public.plati.reducere_detalii IS 'Stochează numele/motivul reducerii aplicate (ex: ''Reducere frate/soră''), denormalizat pentru integritate istorică.';
