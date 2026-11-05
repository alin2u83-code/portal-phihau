-- Faza 36 follow-up (261105-gax): un SPORTIV isi putea seta singur familie_id (politica ALL pe sportivi:
-- user_id = auth.uid()) si apoi vedea sportivii si prezentele altei familii ("Sportiv - vede membrii familiei",
-- prezenta_familie_sel). Doar staff-ul clubului sau federatia poate lega un sportiv de o familie.
-- Acopera si INSERT (rand propriu cu familie_id strain). Scrierile existente sunt toate din UI de staff
-- (services/familieService.ts, hooks/useFamilyManager.ts); nicio functie DB nu seteaza familie_id.
-- auth.uid() NULL (service_role / SQL administrativ) nu e blocat. Desprinderea (familie_id NULL) ramane permisa.
CREATE OR REPLACE FUNCTION public.trg_sportivi_familie_id_protejat()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
    IF auth.uid() IS NULL OR NEW.familie_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.familie_id IS NOT DISTINCT FROM OLD.familie_id THEN
        RETURN NEW;
    END IF;
    IF (SELECT public.is_super_admin()) OR public.este_staff_club(NEW.club_id) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'familie_id poate fi setat doar de staff' USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS trg_sportivi_familie_id_protejat ON public.sportivi;
CREATE TRIGGER trg_sportivi_familie_id_protejat
    BEFORE INSERT OR UPDATE OF familie_id ON public.sportivi
    FOR EACH ROW EXECUTE FUNCTION public.trg_sportivi_familie_id_protejat();
