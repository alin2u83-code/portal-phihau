-- Faza 30 Feature 1: perioada de gratie configurabila la reinnoire abonament.
-- Coloana noua pe cluburi, valoare implicita 30 zile, CHECK 0-365.
-- Idempotenta: ADD COLUMN IF NOT EXISTS + verificare pg_constraint inainte de ADD CONSTRAINT.

ALTER TABLE public.cluburi
  ADD COLUMN IF NOT EXISTS perioada_gratie_zile INTEGER NOT NULL DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cluburi_perioada_gratie_zile_check'
  ) THEN
    ALTER TABLE public.cluburi
      ADD CONSTRAINT cluburi_perioada_gratie_zile_check
      CHECK (perioada_gratie_zile >= 0 AND perioada_gratie_zile <= 365);
  END IF;
END $$;

COMMENT ON COLUMN public.cluburi.perioada_gratie_zile IS
  'Faza 30: prag in zile pentru perioada de gratie la reinnoire. Gap de la ultima luna facturata <= prag => data_start_facturare se pastreaza (lunile lipsa raman datorate); gap > prag => data_start_facturare se reseteaza la luna curenta (lunile vechi sunt iertate). Nu are legatura cu un interval continuu de abonament.';

NOTIFY pgrst, 'reload schema';
