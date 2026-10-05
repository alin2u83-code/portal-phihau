-- Faza 33 (33-01): taxe anuale FRQKD + FRAM — schema + rescrierea activarii, intr-o singura migratie.
-- De ce impreuna: functia live activeaza_taxa_anuala foloseste ON CONFLICT (sportiv_id, an) si
-- ON CONFLICT (club_id, an_fiscal); constrangerile respective se inlocuiesc aici, deci functia trebuie
-- rescrisa in aceeasi tranzactie, altfel orice inscriere ar esua intre pasi.
-- V10 (audit): postgres are rolbypassrls=true => functiile SECURITY DEFINER nu au nevoie de politici RLS speciale.
-- Audit: .planning/phases/33-.../33-SCHEMA-AUDIT.md

-- ===== 1. taxa_anuala_config: tip =====
ALTER TABLE public.taxa_anuala_config ADD COLUMN IF NOT EXISTS tip text NOT NULL DEFAULT 'FRQKD';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'taxa_anuala_config_tip_check') THEN
    ALTER TABLE public.taxa_anuala_config ADD CONSTRAINT taxa_anuala_config_tip_check CHECK (tip IN ('FRQKD','FRAM'));
  END IF;
END $$;
ALTER TABLE public.taxa_anuala_config DROP CONSTRAINT IF EXISTS taxa_anuala_config_an_fiscal_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'taxa_anuala_config_tip_an_fiscal_key') THEN
    ALTER TABLE public.taxa_anuala_config ADD CONSTRAINT taxa_anuala_config_tip_an_fiscal_key UNIQUE (tip, an_fiscal);
  END IF;
END $$;

-- ===== 2. vize_sportivi: tip, club, scutiri, FK plata =====
ALTER TABLE public.vize_sportivi
  ADD COLUMN IF NOT EXISTS tip text NOT NULL DEFAULT 'FRQKD',
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.cluburi(id),
  ADD COLUMN IF NOT EXISTS scutit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motiv_scutire text,
  ADD COLUMN IF NOT EXISTS scutit_de uuid,
  ADD COLUMN IF NOT EXISTS scutit_la timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vize_sportivi_tip_check') THEN
    ALTER TABLE public.vize_sportivi ADD CONSTRAINT vize_sportivi_tip_check CHECK (tip IN ('FRQKD','FRAM'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vize_sportivi_scutire_motiv_check') THEN
    ALTER TABLE public.vize_sportivi ADD CONSTRAINT vize_sportivi_scutire_motiv_check
      CHECK (NOT scutit OR length(btrim(coalesce(motiv_scutire, ''))) > 0);
  END IF;
END $$;
UPDATE public.vize_sportivi v
   SET club_id = COALESCE((SELECT p.club_id FROM public.plati p WHERE p.id = v.plata_id),
                          (SELECT s.club_id FROM public.sportivi s WHERE s.id = v.sportiv_id))
 WHERE v.club_id IS NULL;
ALTER TABLE public.vize_sportivi DROP CONSTRAINT IF EXISTS uq_viza_sportiv_an;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_viza_sportiv_an_tip') THEN
    ALTER TABLE public.vize_sportivi ADD CONSTRAINT uq_viza_sportiv_an_tip UNIQUE (sportiv_id, an, tip);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vize_sportivi_plata_id_fkey') THEN
    ALTER TABLE public.vize_sportivi ADD CONSTRAINT vize_sportivi_plata_id_fkey
      FOREIGN KEY (plata_id) REFERENCES public.plati(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS vize_sportivi_club_tip_an_idx ON public.vize_sportivi (club_id, tip, an);
COMMENT ON TABLE public.vize_sportivi IS
  'Taxe anuale FRQKD (sezon fiscal) si FRAM (an calendaristic) activate per sportiv. Rand cu plata_id NULL si scutit=false = taxa in asteptare (pret nesetat).';

-- ===== 3. decont_sportivi: tip, plata, suma =====
ALTER TABLE public.decont_sportivi
  ADD COLUMN IF NOT EXISTS tip text NOT NULL DEFAULT 'FRQKD',
  ADD COLUMN IF NOT EXISTS plata_id uuid,
  ADD COLUMN IF NOT EXISTS suma numeric(10,2);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decont_sportivi_tip_check') THEN
    ALTER TABLE public.decont_sportivi ADD CONSTRAINT decont_sportivi_tip_check CHECK (tip IN ('FRQKD','FRAM'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decont_sportivi_plata_id_fkey') THEN
    ALTER TABLE public.decont_sportivi ADD CONSTRAINT decont_sportivi_plata_id_fkey
      FOREIGN KEY (plata_id) REFERENCES public.plati(id) ON DELETE SET NULL;
  END IF;
END $$;
UPDATE public.decont_sportivi d
   SET plata_id = v.plata_id, suma = p.suma
  FROM public.vize_sportivi v JOIN public.plati p ON p.id = v.plata_id
 WHERE v.sportiv_id = d.sportiv_id AND v.an = d.an AND v.tip = 'FRQKD' AND d.tip = 'FRQKD' AND d.plata_id IS NULL;
DROP INDEX IF EXISTS public.decont_sportivi_sportiv_an_key;
CREATE UNIQUE INDEX IF NOT EXISTS decont_sportivi_sportiv_an_tip_key ON public.decont_sportivi (sportiv_id, an, tip);

-- ===== 4. deconturi_federatie: plati multiple per club/perioada/tip =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.deconturi_federatie
              WHERE status_plata = 'In asteptare'
                AND (dovada_transfer_url IS NOT NULL OR COALESCE(confirmata_federatie, false))) THEN
    RAISE EXCEPTION 'STOP V5: decont In asteptare cu dovada sau confirmat — nu se sterge';
  END IF;
END $$;
DELETE FROM public.deconturi_federatie
 WHERE status_plata = 'In asteptare' AND COALESCE(confirmata_federatie, false) = false AND dovada_transfer_url IS NULL;
DROP INDEX IF EXISTS public.deconturi_federatie_club_an_fiscal_key;
CREATE INDEX IF NOT EXISTS deconturi_federatie_club_tip_an_idx ON public.deconturi_federatie (club_id, tip_activitate, an_fiscal);
ALTER TABLE public.deconturi_federatie
  ADD COLUMN IF NOT EXISTS creat_de uuid,
  ADD COLUMN IF NOT EXISTS observatii text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deconturi_federatie_tip_activitate_check') THEN
    ALTER TABLE public.deconturi_federatie ADD CONSTRAINT deconturi_federatie_tip_activitate_check
      CHECK (tip_activitate IN ('FRQKD','FRAM'));
  END IF;
END $$;
ALTER TABLE public.deconturi_federatie ALTER COLUMN tip_activitate SET NOT NULL;

-- ===== 5. Backfill FRAM 2026 (37 facturi manuale din 2026-01-20; filtru V6) =====
INSERT INTO public.vize_sportivi (sportiv_id, an, tip, club_id, status_viza, data_platii, plata_id)
SELECT DISTINCT ON (p.sportiv_id) p.sportiv_id, 2026, 'FRAM', COALESCE(p.club_id, s.club_id), 'Activ', p.data, p.id
  FROM public.plati p JOIN public.sportivi s ON s.id = p.sportiv_id
 WHERE p.tip = 'FRAM' AND p.descriere = 'FRAM Anul 2026' AND p.status <> 'Anulat' AND p.sportiv_id IS NOT NULL
 ORDER BY p.sportiv_id, (p.status = 'Achitat') DESC, p.created_at
ON CONFLICT (sportiv_id, an, tip) DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.vize_sportivi WHERE club_id IS NULL) THEN
    ALTER TABLE public.vize_sportivi ALTER COLUMN club_id SET NOT NULL;
  END IF;
END $$;

-- ===== 6. Functii =====
CREATE OR REPLACE FUNCTION public.perioada_taxa(p_tip text, p_data date)
RETURNS integer LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE p_tip
    WHEN 'FRQKD' THEN public.an_fiscal_federatie(p_data)
    WHEN 'FRAM' THEN EXTRACT(YEAR FROM p_data)::int
    ELSE NULL END;
$fn$;

CREATE OR REPLACE FUNCTION public.descriere_taxa(p_tip text, p_an integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE p_tip
    WHEN 'FRQKD' THEN 'FRQKD Sezonul ' || p_an || '-' || (p_an + 1)
    WHEN 'FRAM' THEN 'FRAM Anul ' || p_an
    ELSE NULL END;
$fn$;

CREATE OR REPLACE FUNCTION public.poate_gestiona_taxe_club(p_club_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
     WHERE user_id = auth.uid()
       AND id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid
       AND (rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN')
            OR (club_id = p_club_id AND rol_denumire = 'ADMIN_CLUB'))
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.factureaza_viza_taxa(p_viza_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE
  v record; v_suma numeric; v_club uuid; v_plata uuid; v_dest uuid; v_desc text;
BEGIN
  SELECT * INTO v FROM public.vize_sportivi WHERE id = p_viza_id FOR UPDATE;
  IF NOT FOUND OR v.scutit THEN RETURN NULL; END IF;
  IF v.plata_id IS NOT NULL THEN RETURN v.plata_id; END IF;
  SELECT suma INTO v_suma FROM public.taxa_anuala_config WHERE tip = v.tip AND an_fiscal = v.an;
  IF v_suma IS NULL THEN RETURN NULL; END IF;
  v_club := COALESCE(v.club_id, (SELECT s.club_id FROM public.sportivi s WHERE s.id = v.sportiv_id));
  IF v_club IS NULL THEN RETURN NULL; END IF;
  v_desc := public.descriere_taxa(v.tip, v.an);

  INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data, tip, status, an)
  VALUES (v.sportiv_id, v_club, v_suma, v_desc, CURRENT_DATE, v.tip, 'Neachitat', v.an)
  RETURNING id INTO v_plata;

  UPDATE public.vize_sportivi SET plata_id = v_plata, club_id = v_club WHERE id = v.id;

  IF auth.uid() IS NOT NULL THEN
    BEGIN
      SELECT COALESCE(s.user_id,
                      (SELECT r.user_id FROM public.familii f JOIN public.sportivi r ON r.id = f.reprezentant_id WHERE f.id = s.familie_id))
        INTO v_dest FROM public.sportivi s WHERE s.id = v.sportiv_id;
      IF v_dest IS NOT NULL THEN
        INSERT INTO public.notificari (title, titlu, body, sent_by, tip, club_id, recipient_user_id, tip_destinatar)
        VALUES ('Taxă anuală generată', 'Taxă anuală generată',
                v_desc || ': ' || v_suma || ' lei. Plata se face la club; factura apare în secțiunea Financiar.',
                auth.uid(), 'mesaj', v_club, v_dest, 'INDIVIDUAL');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notificare taxa anuala esuata: %', SQLERRM;
    END;
  END IF;
  RETURN v_plata;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.activeaza_taxa_sportiv(p_sportiv_id uuid, p_tip text, p_an integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE v_club uuid; v_viza uuid; v_plata uuid;
BEGIN
  IF p_tip NOT IN ('FRQKD','FRAM') THEN
    RAISE EXCEPTION 'Tip taxa invalid: %', p_tip USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sportivi WHERE id = p_sportiv_id) THEN RETURN 'sportiv_inexistent'; END IF;
  SELECT club_id INTO v_club FROM public.sportivi WHERE id = p_sportiv_id;
  IF v_club IS NULL THEN RETURN 'fara_club'; END IF;
  INSERT INTO public.vize_sportivi (sportiv_id, an, tip, club_id, status_viza, data_platii)
  VALUES (p_sportiv_id, p_an, p_tip, v_club, 'Activ', CURRENT_DATE)
  ON CONFLICT (sportiv_id, an, tip) DO NOTHING
  RETURNING id INTO v_viza;
  IF v_viza IS NULL THEN RETURN 'exista'; END IF;
  v_plata := public.factureaza_viza_taxa(v_viza);
  RETURN CASE WHEN v_plata IS NULL THEN 'in_asteptare' ELSE 'facturat' END;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.activeaza_taxa_anuala(p_sportiv_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
BEGIN
  IF p_sportiv_id IS NULL THEN RETURN; END IF;
  PERFORM public.activeaza_taxa_sportiv(p_sportiv_id, 'FRQKD', public.perioada_taxa('FRQKD', CURRENT_DATE));
  PERFORM public.activeaza_taxa_sportiv(p_sportiv_id, 'FRAM', public.perioada_taxa('FRAM', CURRENT_DATE));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.proceseaza_taxe_in_asteptare(p_tip text, p_an integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.vize_sportivi
            WHERE tip = p_tip AND an = p_an AND plata_id IS NULL AND NOT scutit
            ORDER BY created_at
  LOOP
    IF public.factureaza_viza_taxa(r.id) IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.trg_taxa_config_factureaza_asteptare()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
BEGIN
  PERFORM public.proceseaza_taxe_in_asteptare(NEW.tip, NEW.an_fiscal);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_taxa_config_factureaza_asteptare ON public.taxa_anuala_config;
CREATE TRIGGER trg_taxa_config_factureaza_asteptare
  AFTER INSERT OR UPDATE OF suma, tip, an_fiscal ON public.taxa_anuala_config
  FOR EACH ROW EXECUTE FUNCTION public.trg_taxa_config_factureaza_asteptare();

-- ===== 7. Privilegii =====
REVOKE EXECUTE ON FUNCTION public.factureaza_viza_taxa(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activeaza_taxa_sportiv(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activeaza_taxa_anuala(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proceseaza_taxe_in_asteptare(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_activeaza_taxa_anuala() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_taxa_config_factureaza_asteptare() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.poate_gestiona_taxe_club(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perioada_taxa(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.descriere_taxa(text, integer) TO authenticated;
