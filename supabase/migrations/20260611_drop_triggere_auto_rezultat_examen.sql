-- =====================================================
-- DROP triggere care blocau salvarea manuala a rezultatului
--
-- Bug: fn_aplica_promovare_grad folosea
--   ON CONFLICT ON CONSTRAINT unique_sportiv_grad
-- dar constraint-ul real se numeste historic_grade_sportiv_grad_unique.
-- Asta facea PATCH-ul pe inscrieri_examene sa returneze 400,
-- rollback complet, rezultat nesalvat in DB.
--
-- fn_calcul_rezultat_examen suprascria selectia manuala
-- a utilizatorului cand metoda_selectie_grad = 'automat'.
--
-- Dupa drop: doar dropdown-ul/butonul din UI salveaza rezultatul.
-- Safety net ramas: trg_sync_istoric_grade_on_exam (ON CONFLICT pe coloane).
-- =====================================================

DROP TRIGGER IF EXISTS tr_promovare_automata_grad ON public.inscrieri_examene;
DROP FUNCTION IF EXISTS fn_aplica_promovare_grad() CASCADE;

DROP TRIGGER IF EXISTS tr_calcul_automat_rezultat ON public.inscrieri_examene;
DROP FUNCTION IF EXISTS fn_calcul_rezultat_examen() CASCADE;
