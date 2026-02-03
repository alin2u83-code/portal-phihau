-- =================================================================
-- Funcții pentru Import Examen v2 - Bazat pe Cod Unic
-- =================================================================

-- Funcția 1: Generator de Cod Unic pentru Sportivi
-- Scop: Generează un cod unic și incremental pentru un sportiv nou,
-- într-un mod atomic pentru a preveni race conditions.
-- Format: YYYYPH[Inițiale][NumărSecvențial]
-- =================================================================
CREATE OR REPLACE FUNCTION public.generate_sportiv_code(
    p_nume TEXT,
    p_prenume TEXT,
    p_an INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    initiale TEXT;
    prefix TEXT;
    last_code TEXT;
    next_seq INT;
BEGIN
    -- Asigură-te că inițialele sunt valide chiar dacă numele/prenumele sunt goale sau conțin caractere speciale
    initiale := (SUBSTRING(unaccent(p_nume) FROM 1 FOR 1) || SUBSTRING(unaccent(p_prenume) FROM 1 FOR 1));
    initiale := UPPER(regexp_replace(initiale, '[^a-zA-Z]', '', 'g'));
    IF LENGTH(initiale) < 2 THEN
        initiale := LPAD(initiale, 2, 'X'); -- Folosește 'X' dacă inițialele sunt incomplete
    END IF;

    prefix := p_an || 'PH' || initiale;

    -- Previne race conditions prin blocarea rândurilor relevante pentru calcul
    SELECT cod_sportiv INTO last_code
    FROM public.sportivi
    WHERE cod_sportiv LIKE prefix || '%'
    ORDER BY cod_sportiv DESC
    LIMIT 1
    FOR UPDATE;

    IF last_code IS NULL THEN
        next_seq := 1;
    ELSE
        -- Extrage ultimele 3 caractere și le convertește la număr
        next_seq := CAST(SUBSTRING(last_code FROM -3) AS INT) + 1;
    END IF;

    RETURN prefix || LPAD(next_seq::text, 3, '0');
END;
$$;


-- =================================================================
-- Funcția 2: RPC pentru Procesare Rând Examen (v2)
-- Scop: Înlocuiește funcția bazată pe CNP. Acum primește fie un
-- ID de sportiv existent, fie datele pentru a crea unul nou (cu codul pre-generat).
-- Toate operațiunile se execută într-o singură tranzacție.
-- =================================================================
DROP FUNCTION IF EXISTS public.process_exam_row_with_upsert(text,text,text,uuid,int,text,numeric,date,uuid);

CREATE OR REPLACE FUNCTION public.process_exam_row_v2(
    p_nume TEXT,
    p_prenume TEXT,
    p_cod_sportiv TEXT, -- Codul pre-generat pentru sportivii noi
    p_existing_sportiv_id UUID, -- ID-ul dacă sportivul a fost deja identificat
    p_club_id UUID,
    p_ordine_grad INT,
    p_rezultat TEXT,
    p_contributie NUMERIC,
    p_data_examen DATE,
    p_sesiune_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sportiv_id UUID;
    v_sportiv RECORD;
    v_grad RECORD;
    v_plata_id UUID;
    v_inscriere_id UUID;
    v_is_duplicate BOOLEAN;
    v_age INT;
BEGIN
    -- Pas 1: Determină ID-ul sportivului (existent sau nou)
    IF p_existing_sportiv_id IS NOT NULL THEN
        v_sportiv_id := p_existing_sportiv_id;
    ELSE
        INSERT INTO public.sportivi(nume, prenume, cod_sportiv, data_inscrierii, club_id, status, data_nasterii)
        VALUES (p_nume, p_prenume, p_cod_sportiv, p_data_examen, p_club_id, 'Activ', '1900-01-01')
        ON CONFLICT (cod_sportiv) DO NOTHING -- Ignoră dacă un cod duplicat este trimis accidental
        RETURNING id INTO v_sportiv_id;

        IF v_sportiv_id IS NULL THEN
            SELECT id INTO v_sportiv_id FROM public.sportivi WHERE cod_sportiv = p_cod_sportiv;
        END IF;
    END IF;

    SELECT * INTO v_sportiv FROM public.sportivi WHERE id = v_sportiv_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SPORTIV_NOT_FOUND: Sportivul cu ID-ul % nu a putut fi găsit sau creat.', v_sportiv_id;
    END IF;
    
    -- Restul logicii este identică cu versiunea anterioară, dar fără CNP.
    SELECT * INTO v_grad FROM public.grade WHERE ordine = p_ordine_grad;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GRADE_NOT_FOUND: Gradul cu ordinul % nu a fost găsit în nomenclator.', p_ordine_grad;
    END IF;

    IF v_sportiv.data_nasterii = '1900-01-01' THEN v_age := 99;
    ELSE v_age := date_part('year', age(p_data_examen, v_sportiv.data_nasterii)); END IF;

    INSERT INTO public.inscrieri_examene(sportiv_id, sesiune_id, grad_vizat_id, grad_actual_id, rezultat, varsta_la_examen)
    VALUES (v_sportiv.id, p_sesiune_id, v_grad.id, v_sportiv.grad_actual_id, p_rezultat, v_age)
    RETURNING id INTO v_inscriere_id;

    IF p_rezultat = 'Admis' THEN
        IF v_age < v_grad.varsta_minima THEN
            RAISE WARNING 'ELIGIBILITY_WARN: Vârsta minimă nu este îndeplinită pentru gradul %.', v_grad.nume;
        END IF;

        SELECT EXISTS (SELECT 1 FROM public.istoric_grade WHERE sportiv_id = v_sportiv.id AND grad_id = v_grad.id) INTO v_is_duplicate;
        IF v_is_duplicate THEN
            RETURN 'DUPLICATE_IGNORED: Sportivul are deja acest grad. S-a înregistrat doar participarea.';
        END IF;

        UPDATE public.sportivi SET grad_actual_id = v_grad.id WHERE id = v_sportiv.id;
        INSERT INTO public.istoric_grade(sportiv_id, grad_id, data_obtinere, sesiune_examen_id)
        VALUES (v_sportiv.id, v_grad.id, p_data_examen, p_sesiune_id);

        IF p_contributie > 0 THEN
            INSERT INTO public.plati(sportiv_id, familie_id, suma, status, tip, descriere, data)
            VALUES (v_sportiv.id, v_sportiv.familie_id, p_contributie, 'Achitat', 'Taxa Examen', 'Taxa examen ' || v_grad.nume, p_data_examen)
            RETURNING id INTO v_plata_id;
            
            UPDATE public.inscrieri_examene SET plata_id = v_plata_id WHERE id = v_inscriere_id;

            INSERT INTO public.tranzactii(plata_ids, sportiv_id, familie_id, suma, metoda_plata, data_platii, descriere)
            VALUES (ARRAY[v_plata_id], v_sportiv.id, v_sportiv.familie_id, p_contributie, 'Cash', p_data_examen, 'Încasare taxă examen via import CSV');
        END IF;
    END IF;

    RETURN 'PROCESAT: ' || v_sportiv.nume || ' ' || v_sportiv.prenume || ' - ' || p_rezultat;
END;
$$;
