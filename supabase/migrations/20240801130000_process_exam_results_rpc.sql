-- =================================================================
-- Funcție RPC pentru Procesarea Atomică a Rezultatelor de Examen
-- v1.1 - Adăugare validare eligibilitate vârstă
-- =================================================================
-- Scop: Procesează un singur rând din importul CSV, executând
-- toate operațiunile necesare (validări, update-uri, insert-uri)
-- într-o singură tranzacție. Dacă orice pas eșuează, întreaga
-- operațiune pentru acel rând este anulată.
--
-- SECURITY DEFINER este folosit pentru a permite funcției să scrie
-- în mai multe tabele în numele unui utilizator care ar putea avea
-- permisiuni limitate, fără a compromite securitatea generală.
-- =================================================================

CREATE OR REPLACE FUNCTION public.process_exam_row(
    p_cnp TEXT,
    p_ordine_grad INT,
    p_rezultat TEXT,
    p_contributie NUMERIC,
    p_data_examen DATE,
    p_sesiune_id UUID
)
RETURNS TEXT -- Returnează un mesaj de succes sau eroare
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sportiv RECORD;
    v_grad RECORD; -- Trecut la RECORD pentru a stoca mai multe câmpuri (id, nume, varsta_minima)
    v_plata_id UUID;
    v_inscriere_id UUID;
    v_is_duplicate BOOLEAN;
    v_age INT; -- Variabilă nouă pentru vârsta la examen
BEGIN
    -- Pas 1: Identifică sportivul după CNP, inclusiv data nașterii
    SELECT * INTO v_sportiv FROM public.sportivi WHERE cnp = p_cnp;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SPORTIV_NOT_FOUND: Sportivul cu CNP % nu a fost găsit.', p_cnp;
    END IF;

    -- Pas 2: Identifică gradul după ordine, inclusiv vârsta minimă
    SELECT * INTO v_grad FROM public.grade WHERE ordine = p_ordine_grad;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GRADE_NOT_FOUND: Gradul cu ordinul % nu a fost găsit în nomenclator.', p_ordine_grad;
    END IF;

    -- Calculează vârsta sportivului la data examenului
    v_age := date_part('year', age(p_data_examen, v_sportiv.data_nasterii));

    -- Pas 3: Inserează înscrierea la examen indiferent de rezultat, pentru istoric
    INSERT INTO public.inscrieri_examene(sportiv_id, sesiune_id, grad_vizat_id, grad_actual_id, rezultat, varsta_la_examen)
    VALUES (v_sportiv.id, p_sesiune_id, v_grad.id, v_sportiv.grad_actual_id, p_rezultat::text, v_age)
    RETURNING id INTO v_inscriere_id;

    -- Pas 4: Logica pentru rezultatul "Admis"
    IF p_rezultat = 'Admis' THEN
        -- NOU: Validare eligibilitate vârstă
        IF v_age < v_grad.varsta_minima THEN
            RAISE EXCEPTION 'ELIGIBILITY_FAIL: Sportivul % % (vârsta % ani) nu îndeplinește vârsta minimă de % ani pentru gradul %.', v_sportiv.nume, v_sportiv.prenume, v_age, v_grad.varsta_minima, v_grad.nume;
        END IF;

        -- Verifică dacă acest grad a fost deja acordat
        SELECT EXISTS (
            SELECT 1 FROM public.istoric_grade WHERE sportiv_id = v_sportiv.id AND grad_id = v_grad.id
        ) INTO v_is_duplicate;

        IF v_is_duplicate THEN
            RETURN 'DUPLICATE_IGNORED: Sportivul ' || v_sportiv.nume || ' ' || v_sportiv.prenume || ' are deja acest grad. S-a înregistrat doar participarea.';
        END IF;

        -- Actualizează gradul curent al sportivului
        UPDATE public.sportivi SET grad_actual_id = v_grad.id WHERE id = v_sportiv.id;

        -- Inserează în istoricul de grade
        INSERT INTO public.istoric_grade(sportiv_id, grad_id, data_obtinere, sesiune_examen_id)
        VALUES (v_sportiv.id, v_grad.id, p_data_examen, p_sesiune_id);

        -- Creează plata (factura)
        INSERT INTO public.plati(sportiv_id, familie_id, suma, status, tip, descriere, data)
        VALUES (v_sportiv.id, v_sportiv.familie_id, p_contributie, 'Achitat', 'Taxa Examen', 'Taxa examen ' || v_grad.nume, p_data_examen)
        RETURNING id INTO v_plata_id;
        
        -- Actualizează înscrierea cu ID-ul plății
        UPDATE public.inscrieri_examene SET plata_id = v_plata_id WHERE id = v_inscriere_id;

        -- Creează tranzacția asociată
        INSERT INTO public.tranzactii(plata_ids, sportiv_id, familie_id, suma, metoda_plata, data_platii, descriere)
        VALUES (ARRAY[v_plata_id], v_sportiv.id, v_sportiv.familie_id, p_contributie, 'CSV Import', p_data_examen, 'Încasare taxă examen via import CSV');
    END IF;

    RETURN 'PROCESAT: ' || v_sportiv.nume || ' ' || v_sportiv.prenume || ' - ' || p_rezultat;
END;
$$;
