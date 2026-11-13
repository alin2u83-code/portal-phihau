-- Faza 40 (40-01, D-14): deadline_inscrieri obligatoriu si <= data_inceput.
-- NEAPLICATA inca (se aplica in 40-02, dupa OK explicit). supabase/ e gitignored -> `git add -f`.
-- Live (12-13.11.2026): 2 randuri cu deadline NULL + 1 cu deadline > data_inceput (clona 1551ef52: 2026-12-31 > 2026-10-31).

-- 1. Backfill: deadline = ziua inceperii competitiei
UPDATE public.competitii
   SET deadline_inscrieri = data_inceput
 WHERE deadline_inscrieri IS NULL OR deadline_inscrieri > data_inceput;

-- 2. Pre-conditie: nimic ramas invalid (ex. data_inceput NULL)
DO $mig$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.competitii
   WHERE deadline_inscrieri IS NULL OR data_inceput IS NULL OR deadline_inscrieri > data_inceput;
  IF n > 0 THEN
    RAISE EXCEPTION 'Faza 40: % competitii raman cu deadline/data_inceput invalide dupa backfill', n;
  END IF;
END
$mig$;

-- 3. NOT NULL + CHECK
ALTER TABLE public.competitii ALTER COLUMN deadline_inscrieri SET NOT NULL;

ALTER TABLE public.competitii DROP CONSTRAINT IF EXISTS competitii_deadline_inainte_de_start;
ALTER TABLE public.competitii ADD CONSTRAINT competitii_deadline_inainte_de_start
    CHECK (deadline_inscrieri <= data_inceput);

NOTIFY pgrst, 'reload schema';

-- Rollback:
--   ALTER TABLE public.competitii DROP CONSTRAINT IF EXISTS competitii_deadline_inainte_de_start;
--   ALTER TABLE public.competitii ALTER COLUMN deadline_inscrieri DROP NOT NULL;
--   (backfill-ul nu se reverteaza)
