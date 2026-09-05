-- =============================================================================
-- Faza 18 — Consolidare trigger-e grad_actual_id (sursa unica de adevar)
-- Data: 2026-09-06
-- Proiect Supabase: wuhidifzsutwgdfkwhmd
--
-- PROBLEMA (mecanism confirmat live, vezi 18-RESEARCH.md "Live Verification"):
--   Nu e o suprascriere literala, ci un RACE CONDITION intre doua scrieri
--   concurente pe aceeasi cheie unica (sportiv_id, grad_id), ambele cu
--   ON CONFLICT ... DO NOTHING:
--     (a) frontend-ul insereaza in istoric_grade cu data REALA a examenului;
--     (b) acelasi frontend face UPDATE sportivi.grad_actual_id, care declanseaza
--         tr_sync_grad_history -> fn_sync_grad_to_history, care insereaza in
--         istoric_grade cu data_obtinere = CURRENT_DATE.
--   Cine ajunge primul la Postgres castiga slotul unic; celalalt e no-op tacut.
--   In ManagementInscrieri.tsx cele doua scrieri sunt in acelasi Promise.all
--   => corupere reala de date (data examenului inlocuita cu data rularii).
--
-- SOLUTIA: grad_actual_id devine STRICT derivat dintr-un singur trigger pe
--   istoric_grade, cu regula MAX(grade.ordine) (D-01), activ si pe DELETE (D-02).
--   Frontend-ul nu mai scrie niciodata direct grad_actual_id (D-03/D-04, planurile
--   18-02 si 18-03) => scriitorul (b) dispare => race-ul dispare.
--
-- ORDINE: CREATE noul trigger INAINTE de DROP-urile vechi, ca sa nu existe
--   fereastra fara niciun mecanism de sincronizare (18-RESEARCH.md, Pitfall 4).
-- =============================================================================

BEGIN;

-- 1. Functia canonica unica (D-01, D-02, D-06).
--    SECURITY DEFINER obligatoriu: scrie pe public.sportivi indiferent de RLS-ul
--    apelantului, la fel ca functiile pe care le inlocuieste (vezi si bug-ul
--    tr_automatizeaza_roluri fixat in Faza 25-04: trigger fara SECURITY DEFINER
--    -> "permission denied for table users").
CREATE OR REPLACE FUNCTION public.sync_grad_actual_canonical()
RETURNS TRIGGER AS $$
DECLARE
  v_sportiv_id uuid;
  v_max_grad_id uuid;
BEGIN
  v_sportiv_id := COALESCE(NEW.sportiv_id, OLD.sportiv_id);

  IF v_sportiv_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Cel mai mare grad obtinut VREODATA (NU cel mai recent cronologic) — D-01.
  -- Tiebreak determinist daca doua grade ar avea acelasi "ordine".
  SELECT ig.grad_id
    INTO v_max_grad_id
  FROM public.istoric_grade ig
  JOIN public.grade g ON g.id = ig.grad_id
  WHERE ig.sportiv_id = v_sportiv_id
  ORDER BY g.ordine DESC, ig.data_obtinere DESC, ig.id DESC
  LIMIT 1;

  -- Daca istoricul a ramas gol (toate randurile sterse), grad_actual_id devine NULL
  -- — consecinta deliberata a regulii "strict derivat" (D-04).
  UPDATE public.sportivi
     SET grad_actual_id = v_max_grad_id,
         metoda_selectie_grad = 'automat'
   WHERE id = v_sportiv_id
     AND grad_actual_id IS DISTINCT FROM v_max_grad_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger-ul canonic unic — creat INAINTE de DROP-uri.
DROP TRIGGER IF EXISTS trg_sync_grad_actual_canonical ON public.istoric_grade;
CREATE TRIGGER trg_sync_grad_actual_canonical
AFTER INSERT OR UPDATE OR DELETE ON public.istoric_grade
FOR EACH ROW EXECUTE FUNCTION public.sync_grad_actual_canonical();

-- 3. Elimina cele 4 trigger-e redundante de pe istoric_grade (D-05, D-06).
DROP TRIGGER IF EXISTS trg_after_history_change ON public.istoric_grade;
DROP TRIGGER IF EXISTS trg_sync_grad_actual_from_istoric ON public.istoric_grade;
DROP TRIGGER IF EXISTS trg_sync_grade_on_history_change ON public.istoric_grade;
DROP TRIGGER IF EXISTS trg_sync_grad_actual_manual ON public.istoric_grade;

-- 4. Elimina trigger-ul cu data gresita de pe sportivi (D-07).
DROP TRIGGER IF EXISTS tr_sync_grad_history ON public.sportivi;

-- 5. NU se atinge trigger_ajusteaza_debutant_la_import (D-08) si nu se sterge
--    constraint-ul istoric_grade_sportiv_grad_unique (D-09).
--    Functiile vechi raman definite, inerte (pattern Faza 25-04).

COMMIT;
