-- =================================================================
-- Trigger Notificare Prezență v2.0 - Cu UPSERT
-- =================================================================
-- Scop: Îmbunătățește trigger-ul de notificare pentru anunțurile
-- de prezență. Acum, la o modificare a statusului (UPDATE),
-- notificarea existentă este actualizată, în loc să se creeze una nouă.
-- Rezolvă și eroarea de Foreign Key pe `sent_by` prin folosirea
-- corectă a `auth.uid()` în contextul trigger-ului.
-- =================================================================

-- Pas 1: Modificarea tabelului `notificari` pentru a permite UPSERT
-- Adăugăm o coloană pentru a lega notificarea direct de antrenament.
ALTER TABLE public.notificari
ADD COLUMN IF NOT EXISTS source_antrenament_id uuid REFERENCES public.program_antrenamente(id) ON DELETE CASCADE;

-- Adăugăm o constrângere de unicitate. O notificare este unică pentru
-- un destinatar, de la un anumit sportiv, despre un anumit antrenament.
-- Prima dată ștergem constrângerea veche dacă există, pentru a evita erori la rulări multiple.
ALTER TABLE public.notificari
DROP CONSTRAINT IF EXISTS notificari_unique_per_sender_event_recipient;

ALTER TABLE public.notificari
ADD CONSTRAINT notificari_unique_per_sender_event_recipient UNIQUE (source_antrenament_id, sender_sportiv_id, recipient_user_id);


-- Pas 2: Crearea/Înlocuirea funcției trigger
CREATE OR REPLACE FUNCTION public.creeaza_sau_actualizeaza_notificare_prezenta()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_user_id uuid;
    v_sportiv_record record;
    v_antrenament_record record;
    v_instructor_record record;
    v_notification_title text;
    v_notification_body text;
BEGIN
    -- Obține ID-ul de autentificare al utilizatorului care a declanșat operațiunea.
    -- Aceasta este cheia pentru a rezolva eroarea de `sent_by`.
    v_sender_user_id := auth.uid();
    IF v_sender_user_id IS NULL THEN
        RAISE EXCEPTION 'Eroare de permisiuni: Nu s-a putut identifica utilizatorul autentificat (auth.uid() este NULL).';
    END IF;

    -- Obține detaliile sportivului și ale antrenamentului
    SELECT nume, prenume, club_id INTO v_sportiv_record FROM public.sportivi WHERE id = NEW.sportiv_id;
    SELECT ora_start INTO v_antrenament_record FROM public.program_antrenamente WHERE id = NEW.antrenament_id;

    -- Construiește mesajul notificării
    v_notification_title := 'Anunț Prezență: ' || v_sportiv_record.nume || ' ' || v_sportiv_record.prenume;
    v_notification_body := 'Status: ' || NEW.status || ' la antrenamentul de la ora ' || v_antrenament_record.ora_start || '.';

    -- Iterează prin toți instructorii și adminii de club din clubul respectiv
    FOR v_instructor_record IN
        SELECT s.user_id
        FROM public.utilizator_roluri_multicont ur
        JOIN public.sportivi s ON ur.sportiv_id = s.id
        WHERE ur.club_id = v_sportiv_record.club_id
        AND ur.rol_denumire IN ('Instructor', 'Admin Club', 'Admin', 'SUPER_ADMIN_FEDERATIE')
        AND s.user_id IS NOT NULL
    LOOP
        -- Folosește INSERT ... ON CONFLICT (UPSERT)
        INSERT INTO public.notificari (recipient_user_id, sent_by, sender_sportiv_id, source_antrenament_id, title, body, link_to, is_read)
        VALUES (
            v_instructor_record.user_id,
            v_sender_user_id,
            NEW.sportiv_id,
            NEW.antrenament_id,
            v_notification_title,
            v_notification_body,
            'prezenta',
            FALSE -- Marchează ca necitit la fiecare update
        )
        ON CONFLICT (source_antrenament_id, sender_sportiv_id, recipient_user_id)
        DO UPDATE SET
            body = EXCLUDED.body,
            created_at = NOW(),
            is_read = FALSE;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Pas 3: Șterge trigger-ul vechi și atașează-l pe cel nou
DROP TRIGGER IF EXISTS creeaza_notificare_anunt_prezenta ON public.anunturi_prezenta;

CREATE TRIGGER on_anunt_prezenta_change_notify_staff
    AFTER INSERT OR UPDATE ON public.anunturi_prezenta
    FOR EACH ROW
    EXECUTE FUNCTION public.creeaza_sau_actualizeaza_notificare_prezenta();
