-- =====================================================
-- MIGRATION: Corectare grad_actual_id pe sportivi
-- Problema: cand se adauga examene istorice (din urma),
-- gradul actual al sportivului se seta la ultimul introdus,
-- nu la cel mai inalt grad obtinut.
-- =====================================================

-- Pasul 1: Actualizeaza grad_actual_id pentru toti sportivii
-- la cel mai inalt grad obtinut (ordine maxima) din inscrieri_examene
-- unde rezultat = 'Admis'
UPDATE public.sportivi s
SET grad_actual_id = (
    SELECT ie.grad_sustinut_id
    FROM public.inscrieri_examene ie
    JOIN public.grade g ON g.id = ie.grad_sustinut_id
    WHERE ie.sportiv_id = s.id
      AND ie.rezultat = 'Admis'
    ORDER BY g.ordine DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM public.inscrieri_examene ie
    JOIN public.grade g ON g.id = ie.grad_sustinut_id
    WHERE ie.sportiv_id = s.id
      AND ie.rezultat = 'Admis'
);

-- Pasul 2: Creeaza/inlocuieste functia trigger care
-- actualizeaza grad_actual_id doar daca noul grad are ordine mai mare
CREATE OR REPLACE FUNCTION public.sync_grad_actual_on_exam_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grad_ordine INTEGER;
    v_current_grad_ordine INTEGER;
BEGIN
    -- Actiunea se face doar la examen admis
    IF NEW.rezultat != 'Admis' THEN
        RETURN NEW;
    END IF;

    -- Obtine ordinea gradului sustinut
    SELECT ordine INTO v_grad_ordine
    FROM public.grade WHERE id = NEW.grad_sustinut_id;

    -- Obtine ordinea gradului actual al sportivului
    SELECT COALESCE(g.ordine, 0) INTO v_current_grad_ordine
    FROM public.sportivi s
    LEFT JOIN public.grade g ON g.id = s.grad_actual_id
    WHERE s.id = NEW.sportiv_id;

    -- Actualizeaza doar daca noul grad este superior
    IF v_grad_ordine > v_current_grad_ordine THEN
        UPDATE public.sportivi
        SET grad_actual_id = NEW.grad_sustinut_id
        WHERE id = NEW.sportiv_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Pasul 3: Ataseaza triggerul la inscrieri_examene
DROP TRIGGER IF EXISTS trg_sync_grad_actual ON public.inscrieri_examene;
CREATE TRIGGER trg_sync_grad_actual
    AFTER INSERT OR UPDATE OF rezultat, grad_sustinut_id
    ON public.inscrieri_examene
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_grad_actual_on_exam_result();

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260319_fix_grad_actual_id applied successfully.';
    RAISE NOTICE 'grad_actual_id updated for all sportivi to their highest achieved grade.';
END $$;
