-- Faza 41 (audit securitate, SEC-41-02/03/04 + T-41-07): intarire categorii_competitie.
--  (1) trigger BEFORE DELETE: o categorie cu inscrieri/echipe/cereri_coechipier nu se mai sterge (FK-urile sunt ON DELETE CASCADE).
--      Nu blocheaza: service_role/migrari (auth.uid() NULL) si stergerea in cascada a unei competitii intregi.
--  (3) search_path = pg_catalog, public pe RPC si is_super_admin (pg_catalog primul).
--  (4) trigger BEFORE INSERT / UPDATE OF categorie_id pe inscrieri/echipe: participantul nu poate intra intr-o categorie neactiva.
--      Nu blocheaza UPDATE-uri care nu schimba categoria (randurile ramase pe o categorie anulata raman editabile).
--  (5) audit_trigger_fn pe categorii_competitie (inainte nu exista niciun audit pe tabel).
-- Rollback:
--   DROP TRIGGER trg_categorie_blocheaza_stergere ON public.categorii_competitie;
--   DROP TRIGGER trg_inscrieri_categorie_activa ON public.inscrieri_competitie;
--   DROP TRIGGER trg_echipe_categorie_activa ON public.echipe_competitie;
--   DROP TRIGGER audit_categorii_competitie ON public.categorii_competitie;
--   DROP FUNCTION public.trg_categorie_blocheaza_stergere(); DROP FUNCTION public.trg_participant_categorie_activa();
--   ALTER FUNCTION public.categorii_aplica_operatie(text,uuid,uuid[],jsonb,jsonb,integer) SET search_path = public, pg_catalog;
--   ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_catalog;

-- (3)
ALTER FUNCTION public.categorii_aplica_operatie(text, uuid, uuid[], jsonb, jsonb, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_super_admin() SET search_path = pg_catalog, public;

-- (1)
CREATE OR REPLACE FUNCTION public.trg_categorie_blocheaza_stergere()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_n integer;
BEGIN
  -- service_role / migrari / mentenanta: fara utilizator autentificat
  IF auth.uid() IS NULL THEN
    RETURN OLD;
  END IF;
  -- stergere in cascada din competitie: parintele a disparut deja
  IF NOT EXISTS (SELECT 1 FROM public.competitii c WHERE c.id = OLD.competitie_id) THEN
    RETURN OLD;
  END IF;

  SELECT (SELECT count(*) FROM public.inscrieri_competitie i WHERE i.categorie_id = OLD.id)
       + (SELECT count(*) FROM public.echipe_competitie e WHERE e.categorie_id = OLD.id)
       + (SELECT count(*) FROM public.cereri_coechipier r WHERE r.categorie_id = OLD.id)
    INTO v_n;

  IF v_n > 0 THEN
    RAISE EXCEPTION 'Categoria are % rânduri legate (înscrieri, echipe sau cereri); nu se poate șterge. Folosește anularea sau mutarea.', v_n
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_categorie_blocheaza_stergere() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_categorie_blocheaza_stergere ON public.categorii_competitie;
CREATE TRIGGER trg_categorie_blocheaza_stergere
  BEFORE DELETE ON public.categorii_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_categorie_blocheaza_stergere();

-- (4)
CREATE OR REPLACE FUNCTION public.trg_participant_categorie_activa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.categorie_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.categorie_id IS NOT DISTINCT FROM OLD.categorie_id THEN
    RETURN NEW;
  END IF;

  -- FOR SHARE: o anulare concurenta (RPC, FOR UPDATE) asteapta/este vazuta corect
  SELECT k.status_categorie INTO v_status
    FROM public.categorii_competitie k
   WHERE k.id = NEW.categorie_id
     FOR SHARE;

  IF FOUND AND COALESCE(v_status, 'activa') <> 'activa' THEN
    RAISE EXCEPTION 'Categoria nu mai este activă (%); alege o categorie activă.', v_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_participant_categorie_activa() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_inscrieri_categorie_activa ON public.inscrieri_competitie;
CREATE TRIGGER trg_inscrieri_categorie_activa
  BEFORE INSERT OR UPDATE OF categorie_id ON public.inscrieri_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_categorie_activa();

DROP TRIGGER IF EXISTS trg_echipe_categorie_activa ON public.echipe_competitie;
CREATE TRIGGER trg_echipe_categorie_activa
  BEFORE INSERT OR UPDATE OF categorie_id ON public.echipe_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_categorie_activa();

-- (5)
DROP TRIGGER IF EXISTS audit_categorii_competitie ON public.categorii_competitie;
CREATE TRIGGER audit_categorii_competitie
  AFTER INSERT OR UPDATE OR DELETE ON public.categorii_competitie
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
