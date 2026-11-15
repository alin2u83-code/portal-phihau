-- Faza 42 (42-01): regula FRAM pe competitie, blocare FRAM la inscriere/membri, compatibilitate la schimbarea categoriei,
-- inghetare editare dupa finalizata.
-- NEAPLICATA, se aplica in 42-04 dupa OK explicit; supabase/ e in .gitignore, deci git add -f.
--
-- Decizii acoperite:
--   D-01  competitii.fram_obligatoriu boolean NOT NULL DEFAULT false (opt-in per competitie).
--   D-02  doar super adminul poate schimba flagul, doar cat competitia e 'draft' (trg_competitii_fram_imutabil).
--   D-03  flagul nu se mai schimba daca exista participanti activi (fara reevaluare retroactiva).
--   D-04  INSERT / reactivare inscriere / adaugare membru fara FRAM achitat sau scutit pe anul calendaristic al data_inceput
--         este refuzat de DB (trg_participant_fram), indiferent de UI.
--   D-05  exceptia super adminului scrie propriul rand in audit_log (marker exceptie_fram in date_noi).
--   D-06  exceptia exista doar pentru super admin; ceilalti primesc 23514.
--   D-07  reprezentantul editeaza doar cat inscrierile sunt deschise = gate-urile RLS live ic_r_gate_*, ec_r_gate_*, es_r_gate_*
--         (migrarea 20261106e; de verificat live). Super adminul editeaza "pana la finalizata": trg_participant_competitie_finalizata.
--   D-08  schimbarea categorie_id doar spre o categorie compatibila (aceeasi competitie, proba, tip_participare, arma),
--         in trg_participant_categorie_activa.
--   D-10  audit cu autor = audit_trigger_fn pe inscrieri/echipe/echipa_sportivi (20261111d, 20261111g; de verificat live).
--
-- Verificat live 15.11.2026: (read-only, phi-hau-db, rulat de orchestrator via Supabase MCP; doar nume obiecte si numaratori)
--   (1) postgres.rolbypassrls = true => OK, triggerul DEFINER poate scrie in audit_log sub FORCE RLS.
--   (2) FORCE RLS = true pe competitii, inscrieri_competitie, echipe_competitie, echipa_sportivi, audit_log, vize_sportivi, plati.
--   (3) competitii.fram_obligatoriu: nu exista (0 coloane). Nu exista functiile trg_participant_fram / trg_competitii_fram_imutabil / trg_participant_competitie_finalizata (0).
--   (4) CHECK audit_log.operatie permite doar INSERT, UPDATE, DELETE, SELECT_SENSIBIL, LOGIN, LOGOUT, ROL_SCHIMBAT => 'EXCEPTIE_FRAM' ar fi respins; se foloseste 'INSERT' + marker exceptie_fram in date_noi.
--   (5) Triggere live: audit_inscrieri_competitie, audit_echipe_competitie, audit_echipa_sportivi (D-10 existent); trg_taxa_anuala_inscrieri_competitie pe inscrieri_competitie;
--       trg_inscrieri_categorie_activa, trg_echipe_categorie_activa; fara trigger '%fram%'; pe competitii doar trg_competitii_updated_at.
--   (6) trg_participant_categorie_activa live = doar verificare status_categorie (fara compatibilitate) => CREATE OR REPLACE din aceasta migrare il extinde; baza identica cu 20261115a.
--       has_access_to_club(club) acorda SUPER_ADMIN_FEDERATIE/ADMIN oricarui club si ADMIN_CLUB + INSTRUCTOR propriului club.
--   (7) RESTRICTIVE existente: ic_r_gate_upd, ic_r_gate_del, ic_r_gate_ins, ec_r_gate_ins/upd/del, es_r_gate_ins/upd/del, cu exceptie is_super_admin() si competitie_deschisa_inscrieri() (D-07 aplicat in DB).
--       Fara STOP. Politici permissive ext_p_* / rbv_ic_* / *_w_* sunt cele din migrarile cunoscute (necomparate individual).
--   (8) competitii: 2 inscrieri_deschise, 3 finalizata. vize_sportivi FRAM: doar an 2026, 889 randuri, 0 scutiti; niciun rand pt 2027. Max 182 vize / club (sub plafonul de 1000 PostgREST).
--   (9) Event triggers: doar cele Supabase standard + ensure_rls_on_create.
--   (11) Pe competitii finalizata: 953 inscrieri si 468 echipe cu taxa_achitata=false => marcarea taxei dupa finalizata ramane folosita si trebuie sa ramana scriibila.

-- ============================================================================================================
-- 1. D-01: coloana
-- ============================================================================================================
ALTER TABLE public.competitii ADD COLUMN IF NOT EXISTS fram_obligatoriu boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.competitii.fram_obligatoriu IS 'Faza 42 D-01: doar sportivii cu FRAM achitat sau scutit pe anul calendaristic al data_inceput se pot inscrie; se seteaza doar cat competitia e draft (D-02).';

-- ============================================================================================================
-- 2. D-02 / D-03: flagul se schimba doar de super admin, doar in draft, doar fara participanti activi
-- ============================================================================================================
CREATE OR REPLACE FUNCTION public.trg_competitii_fram_imutabil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- service_role / migrari / mentenanta: fara utilizator autentificat
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.fram_obligatoriu AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Doar super adminul federației poate activa regula FRAM.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.fram_obligatoriu IS NOT DISTINCT FROM OLD.fram_obligatoriu THEN
    RETURN NEW;
  END IF;
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Doar super adminul federației poate modifica regula FRAM.' USING ERRCODE = '42501';
  END IF;
  IF OLD.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Regula FRAM se stabilește cât competiția este în schiță; după deschiderea înscrierilor nu se mai modifică.' USING ERRCODE = '23514';
  END IF;
  -- D-03: fara reevaluare retroactiva; ramane inghetat si dupa "Redeschide" (finalizata -> draft)
  IF EXISTS (SELECT 1 FROM public.inscrieri_competitie i
              WHERE i.competitie_id = OLD.id AND lower(coalesce(i.status, '')) <> 'retras')
     OR EXISTS (SELECT 1 FROM public.echipe_competitie e
                 WHERE e.competitie_id = OLD.id AND lower(coalesce(e.status, '')) <> 'retrasa') THEN
    RAISE EXCEPTION 'Competiția are deja participanți; regula FRAM nu se mai modifică.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_competitii_fram_imutabil() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_competitii_fram_imutabil ON public.competitii;
CREATE TRIGGER trg_competitii_fram_imutabil
  BEFORE INSERT OR UPDATE OF fram_obligatoriu ON public.competitii
  FOR EACH ROW EXECUTE FUNCTION public.trg_competitii_fram_imutabil();

-- ============================================================================================================
-- 3. D-04 / D-05 / D-06: FRAM obligatoriu la inscriere, reactivare si adaugare membru
-- ============================================================================================================
CREATE OR REPLACE FUNCTION public.trg_participant_fram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_comp  uuid;
  v_club  uuid;
  v_flag  boolean;
  v_start date;
  v_an    integer;
  v_ctx   uuid;
  v_nume  text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'inscrieri_competitie' THEN
    IF lower(coalesce(NEW.status, '')) = 'retras' THEN
      RETURN NEW;
    END IF;
    -- se verifica doar participare noua sau reactivare; alte UPDATE-uri nu reevalueaza (D-03)
    IF TG_OP = 'UPDATE'
       AND NEW.sportiv_id IS NOT DISTINCT FROM OLD.sportiv_id
       AND lower(coalesce(OLD.status, '')) <> 'retras' THEN
      RETURN NEW;
    END IF;
    v_comp := NEW.competitie_id;
    v_club := NEW.club_id;
  ELSE
    IF TG_OP = 'UPDATE' AND NEW.sportiv_id IS NOT DISTINCT FROM OLD.sportiv_id THEN
      RETURN NEW;
    END IF;
    SELECT e.competitie_id, e.club_id INTO v_comp, v_club
      FROM public.echipe_competitie e WHERE e.id = NEW.echipa_id;
    IF NOT FOUND THEN
      RETURN NEW;  -- FK-ul respinge oricum
    END IF;
  END IF;

  SELECT c.fram_obligatoriu, c.data_inceput INTO v_flag, v_start
    FROM public.competitii c WHERE c.id = v_comp;
  IF NOT FOUND OR NOT coalesce(v_flag, false) THEN
    RETURN NEW;
  END IF;

  -- Anul FRAM = anul calendaristic al data_inceput; la fel ca public.perioada_taxa('FRAM', ...)
  -- si utils/editareCompetitie.ts anFramCompetitie; se schimba impreuna.
  v_an := EXTRACT(YEAR FROM v_start)::integer;

  -- Oglinda a utils/taxeAnuale.ts areTaxaAchitata si a public.vize_club_competitie: scutit sau factura Achitat.
  IF EXISTS (SELECT 1
               FROM public.vize_sportivi v
               LEFT JOIN public.plati p ON p.id = v.plata_id
              WHERE v.sportiv_id = NEW.sportiv_id
                AND v.tip = 'FRAM'
                AND v.an = v_an
                AND (COALESCE(v.scutit, false) OR p.status = 'Achitat')) THEN
    RETURN NEW;
  END IF;

  IF public.is_super_admin() THEN
    BEGIN
      v_ctx := (current_setting('request.headers', true)::json->>'active-role-context-id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_ctx := NULL;
    END;
    -- operatie = 'INSERT': CHECK-ul audit_log.operatie (create_audit_log.sql / extend_audit_log_260705.sql) nu accepta
    -- 'EXCEPTIE_FRAM' (de reconfirmat live); marker-ul exceptie_fram din date_noi identifica randul.
    INSERT INTO public.audit_log (user_id, role_context_id, tabel, operatie, rand_id, date_noi, club_id, competitie_id)
    VALUES (auth.uid(), v_ctx, TG_TABLE_NAME, 'INSERT', NEW.id,
            jsonb_build_object('sportiv_id', NEW.sportiv_id, 'an_fram', v_an, 'exceptie_fram', true,
                               'motiv', 'Super admin: inscriere fara FRAM confirmata (D-05)'),
            v_club, v_comp);
    RETURN NEW;
  END IF;

  SELECT s.nume || ' ' || s.prenume INTO v_nume FROM public.sportivi s WHERE s.id = NEW.sportiv_id;
  RAISE EXCEPTION 'Sportivul % nu are viza FRAM % achitată sau scutită; competiția acceptă doar sportivi cu FRAM.', coalesce(v_nume, '?'), v_an
    USING ERRCODE = '23514';
END;
$$;

REVOKE ALL ON FUNCTION public.trg_participant_fram() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_inscrieri_fram ON public.inscrieri_competitie;
CREATE TRIGGER trg_inscrieri_fram
  BEFORE INSERT OR UPDATE OF status, sportiv_id ON public.inscrieri_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_fram();

DROP TRIGGER IF EXISTS trg_echipa_sportivi_fram ON public.echipa_sportivi;
CREATE TRIGGER trg_echipa_sportivi_fram
  BEFORE INSERT OR UPDATE OF sportiv_id ON public.echipa_sportivi
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_fram();

-- ============================================================================================================
-- 4. D-08: schimbarea categoriei doar spre o categorie compatibila (extinde functia din 20261115a)
-- ============================================================================================================
CREATE OR REPLACE FUNCTION public.trg_participant_categorie_activa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_nou   record;
  v_vechi record;
BEGIN
  IF NEW.categorie_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.categorie_id IS NOT DISTINCT FROM OLD.categorie_id THEN
    RETURN NEW;
  END IF;

  -- FOR SHARE: o anulare concurenta (RPC, FOR UPDATE) asteapta/este vazuta corect
  SELECT k.status_categorie, k.competitie_id, k.proba_id, k.tip_participare, k.arma INTO v_nou
    FROM public.categorii_competitie k
   WHERE k.id = NEW.categorie_id
     FOR SHARE;

  IF FOUND AND COALESCE(v_nou.status_categorie, 'activa') <> 'activa' THEN
    RAISE EXCEPTION 'Categoria nu mai este activă (%); alege o categorie activă.', v_nou.status_categorie
      USING ERRCODE = '23514';
  END IF;

  -- D-08: aceeasi regula ca utils/categoriiAdmin.ts compatibile() si ramura mutare din categorii_aplica_operatie
  -- (fuziune/impartire copiaza proba/tip/arma, deci RPC-ul Faza 41 trece).
  IF FOUND AND TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND OLD.categorie_id IS NOT NULL THEN
    SELECT k.competitie_id, k.proba_id, k.tip_participare, k.arma INTO v_vechi
      FROM public.categorii_competitie k WHERE k.id = OLD.categorie_id;
    IF FOUND AND (v_vechi.competitie_id IS DISTINCT FROM v_nou.competitie_id
               OR v_vechi.proba_id IS DISTINCT FROM v_nou.proba_id
               OR v_vechi.tip_participare IS DISTINCT FROM v_nou.tip_participare
               OR v_vechi.arma IS DISTINCT FROM v_nou.arma) THEN
      RAISE EXCEPTION 'Categoria nouă nu este compatibilă cu cea actuală (aceeași competiție, probă, tip de participare și armă).'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_participant_categorie_activa() FROM PUBLIC, anon, authenticated;
-- triggerele trg_inscrieri_categorie_activa / trg_echipe_categorie_activa raman legate (20261115a)

-- ============================================================================================================
-- 4b. D-07 limita superioara: dupa 'finalizata' nu se mai editeaza inscrieri/echipe/membri (nici super adminul)
-- ============================================================================================================
CREATE OR REPLACE FUNCTION public.trg_participant_competitie_finalizata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_comp   uuid;
  v_status text;
BEGIN
  -- service_role / mentenanta: fara utilizator autentificat
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'echipa_sportivi' THEN
    SELECT e.competitie_id INTO v_comp
      FROM public.echipe_competitie e WHERE e.id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.echipa_id ELSE NEW.echipa_id END);
  ELSE
    v_comp := CASE WHEN TG_OP = 'DELETE' THEN OLD.competitie_id ELSE NEW.competitie_id END;
  END IF;

  -- parintele a disparut (stergere in cascada a echipei/competitiei, vezi 20261115a): trece
  SELECT c.status INTO v_status FROM public.competitii c WHERE c.id = v_comp;
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- fara exceptie is_super_admin(): D-07 "pana la finalizata". "Redeschide" (status -> draft) ridica inghetarea.
  IF v_status = 'finalizata' THEN
    RAISE EXCEPTION 'Competiția este finalizată; înscrierile, echipele și membrii nu se mai modifică.' USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.trg_participant_competitie_finalizata() FROM PUBLIC, anon, authenticated;

-- taxa_achitata, status, observatii nu sunt listate intentionat: FinanciarView marcheaza taxele dupa eveniment.
DROP TRIGGER IF EXISTS trg_inscrieri_finalizata ON public.inscrieri_competitie;
CREATE TRIGGER trg_inscrieri_finalizata
  BEFORE INSERT OR DELETE OR UPDATE OF sportiv_id, categorie_id, inlantuire_id, inlantuire_id_2, arma_id ON public.inscrieri_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_competitie_finalizata();

DROP TRIGGER IF EXISTS trg_echipe_finalizata ON public.echipe_competitie;
CREATE TRIGGER trg_echipe_finalizata
  BEFORE INSERT OR DELETE OR UPDATE OF categorie_id, arma_id, inlantuire_id ON public.echipe_competitie
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_competitie_finalizata();

DROP TRIGGER IF EXISTS trg_echipa_sportivi_finalizata ON public.echipa_sportivi;
CREATE TRIGGER trg_echipa_sportivi_finalizata
  BEFORE INSERT OR DELETE OR UPDATE OF sportiv_id, rol ON public.echipa_sportivi
  FOR EACH ROW EXECUTE FUNCTION public.trg_participant_competitie_finalizata();

-- ============================================================================================================
-- 5. D-10: audit_inscrieri_competitie / audit_echipe_competitie / audit_echipa_sportivi exista conform migrarilor
--    (20261111d); nu se recreeaza aici. Daca verificarea live arata ca lipsesc, se adauga ca in 20261111d liniile 218-226.
-- ============================================================================================================

-- 6.
NOTIFY pgrst, 'reload schema';

-- Rollback:
--   DROP TRIGGER trg_competitii_fram_imutabil ON public.competitii;
--   DROP TRIGGER trg_inscrieri_fram ON public.inscrieri_competitie;
--   DROP TRIGGER trg_echipa_sportivi_fram ON public.echipa_sportivi;
--   DROP TRIGGER trg_inscrieri_finalizata ON public.inscrieri_competitie;
--   DROP TRIGGER trg_echipe_finalizata ON public.echipe_competitie;
--   DROP TRIGGER trg_echipa_sportivi_finalizata ON public.echipa_sportivi;
--   DROP FUNCTION public.trg_competitii_fram_imutabil(); DROP FUNCTION public.trg_participant_fram();
--   DROP FUNCTION public.trg_participant_competitie_finalizata();
--   Restaureaza trg_participant_categorie_activa din 20261115a liniile 61-89 (fara verificarea de compatibilitate).
--   ALTER TABLE public.competitii DROP COLUMN fram_obligatoriu;  -- doar daca niciun rand nu il are true
