-- Faza 30 Feature 3 (fundatie): loialitate automata pe politici_reducere.
-- Ambele tabele (politici_reducere, aplicare_reduceri) EXISTA deja live, cu
-- schema diferita de presupunerea initiala (verificat Task 1, 20.09.2026):
--   - politici_reducere: id, club_id, nume_reducere, procentaj (INTEGER),
--     valoare_fixa, activ. RLS ACTIV dar cu O SINGURA politica
--     "Bypass_Super_Admin" — doar SUPER_ADMIN_FEDERATIE are acces, ADMIN_CLUB
--     nu are NICIO politica (deci 0 randuri vizibile). NU se atinge RLS aici
--     (tabel preexistent) — risc deschis documentat in SUMMARY pt planul 30-05.
--   - aplicare_reduceri: id, obligatie_id (FK -> obligatii_plata), reducere_id
--     (FK -> reduceri, NU politici_reducere), valoare_calculata, created_at.
--     Fara sportiv_id, fara plata_id, fara (luna, an). Se adauga plata_id.
--   - plati.reducere_id: coloana UUID, FARA constrangere FK catre nimic.
--     Deci bonusul de loialitate NU poate popula plati.reducere_id (nu se
--     stie sigur spre ce tabel ar trebui sa pointeze) — planul 30-05 va
--     folosi doar plati.suma_initiala + plati.reducereDetalii.

ALTER TABLE public.politici_reducere
  ADD COLUMN IF NOT EXISTS reinnoiri_necesare INTEGER;

ALTER TABLE public.politici_reducere
  ADD COLUMN IF NOT EXISTS tip_bonus TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'politici_reducere_tip_bonus_check'
  ) THEN
    ALTER TABLE public.politici_reducere
      ADD CONSTRAINT politici_reducere_tip_bonus_check
      CHECK (tip_bonus IS NULL OR tip_bonus IN ('zile_gratis','discount'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'politici_reducere_reinnoiri_necesare_check'
  ) THEN
    ALTER TABLE public.politici_reducere
      ADD CONSTRAINT politici_reducere_reinnoiri_necesare_check
      CHECK (reinnoiri_necesare IS NULL OR reinnoiri_necesare > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.politici_reducere.tip_bonus IS
  'Faza 30. discount = reducere pe factura urmatoare (procentaj sau valoare_fixa). zile_gratis = luna urmatoare de abonament e gratuita (suma facturata 0). Denumirea zile_gratis vine din 30-CONTEXT.md; Portal PhiHau factureaza pe luna calendaristica, nu pe zile, deci echivalentul corect al bonusului este o luna gratuita.';

COMMENT ON COLUMN public.politici_reducere.reinnoiri_necesare IS
  'Faza 30: numarul de luni consecutive cu factura Abonament achitata, necesar pentru a declansa bonusul.';

-- aplicare_reduceri exista, dar fara legatura directa catre o plata individuala
-- (doar obligatie_id -> obligatii_plata). Adaugam plata_id pentru jurnalul
-- de loialitate din planul 30-05, fara sa atingem coloanele existente.
ALTER TABLE public.aplicare_reduceri
  ADD COLUMN IF NOT EXISTS plata_id UUID REFERENCES public.plati(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_aplicare_reduceri_plata
  ON public.aplicare_reduceri(plata_id) WHERE plata_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
