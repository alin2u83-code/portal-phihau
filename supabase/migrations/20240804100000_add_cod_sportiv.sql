-- Adaugă coloana `cod_sportiv` dacă nu există deja
ALTER TABLE public.sportivi
ADD COLUMN IF NOT EXISTS cod_sportiv TEXT;

-- Creează un index unic pentru a asigura unicitatea codurilor
CREATE UNIQUE INDEX IF NOT EXISTS sportivi_cod_sportiv_unique_idx ON public.sportivi (cod_sportiv);

-- Adaugă un comentariu pentru a documenta scopul coloanei
COMMENT ON COLUMN public.sportivi.cod_sportiv IS 'Cod Unic de Identificare Sportiv, generat automat (ex: 2024PHVP001).';
