-- =================================================================
-- Remediere Trigger Notificări de Prezență
-- v1.0
-- =================================================================
-- Scop: Corectează eroarea de `foreign key constraint` (notificari_sent_by_fkey)
-- care apare la inserarea unei noi notificări.
--
-- Problema: Trigger-ul `tr_anunt_prezenta_to_notificare` încerca să insereze
-- `sportiv_id` în coloana `sent_by`, care așteaptă un `user_id` (UUID din `auth.users`).
--
-- Soluția: Funcția `creeaza_notificare_anunt_prezenta` este modificată pentru a
-- prelua `user_id`-ul corect din tabela `sportivi` pe baza `NEW.sportiv_id`
-- și a-l folosi la inserarea în `notificari`. De asemenea, sunt identificați
-- corect destinatarii (instructorii din același club).
-- =================================================================

-- Creează sau înlocuiește funcția trigger cu logica corectată
CREATE OR REPLACE FUNCTION public.creeaza_notificare_anunt_prezenta()
RETURNS TRIGGER AS $$
DECLARE
    v_antrenament RECORD;
    v_sportiv RECORD;
    v_sender_user_id UUID;
    v_instructor RECORD;
    v_message TEXT;
BEGIN
    -- Pas 1: Preluare detalii despre sportivul care a făcut anunțul, inclusiv user_id
    SELECT id, nume, prenume, user_id, club_id INTO v_sportiv
    FROM public.sportivi WHERE id = NEW.sportiv_id;

    -- Verificare critică: Dacă sportivul nu are un cont de utilizator, nu putem continua.
    -- `sent_by` ar fi NULL și ar încălca constrângerea.
    IF v_sportiv.user_id IS NULL THEN
        RAISE WARNING 'Notificare omisă: Sportivul % % (ID: %) nu are un cont de utilizator (user_id) asociat.', v_sportiv.nume, v_sportiv.prenume, v_sportiv.id;
        RETURN NEW;
    END IF;
    v_sender_user_id := v_sportiv.user_id;

    -- Pas 2: Preluare detalii despre antrenament pentru a construi mesajul
    SELECT ora_start INTO v_antrenament FROM public.program_antrenamente WHERE id = NEW.antrenament_id;

    -- Pas 3: Construire mesaj de notificare
    v_message := v_sportiv.nume || ' ' || v_sportiv.prenume || ' a anunțat: "' || NEW.status || '" la antrenamentul de la ora ' || v_antrenament.ora_start || '.';

    -- Pas 4: Găsește toți instructorii din clubul sportivului și inserează notificări pentru fiecare
    FOR v_instructor IN
        SELECT s.user_id
        FROM public.sportivi s
        JOIN public.utilizator_roluri_multicont urm ON s.id = urm.sportiv_id
        WHERE s.club_id = v_sportiv.club_id
          AND urm.rol_denumire = 'Instructor'
          AND s.user_id IS NOT NULL
          AND s.user_id != v_sender_user_id -- Nu trimite notificare către sine însuși
    LOOP
        INSERT INTO public.notificari (recipient_user_id, sent_by, sender_sportiv_id, message, link_to)
        VALUES (v_instructor.user_id, v_sender_user_id, v_sportiv.id, v_message, 'prezenta-instructor');
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Asigură că trigger-ul este (re)creat pentru a folosi noua funcție
DROP TRIGGER IF EXISTS tr_anunt_prezenta_to_notificare ON public.anunturi_prezenta;
CREATE TRIGGER tr_anunt_prezenta_to_notificare
  AFTER INSERT OR UPDATE ON public.anunturi_prezenta
  FOR EACH ROW
  EXECUTE FUNCTION public.creeaza_notificare_anunt_prezenta();

COMMENT ON FUNCTION public.creeaza_notificare_anunt_prezenta IS 'Trigger function to notify instructors when a sportiv announces their attendance status. It correctly looks up the auth.user_id for the sent_by column.';
