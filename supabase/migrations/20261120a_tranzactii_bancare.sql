-- Quick 261120-d77: import extras de cont BT (CSV) cu potrivire semi-automata a incasarilor.
-- STARE: NEAPLICATA (scrisa, nerulata pe live; userul da OK separat dupa audit + dry-run pe clona).
-- Test dry-run: tests/tranzactii_bancare_20261120a.sql (pe clona, in BEGIN...ROLLBACK).
--
-- 3NF: UN singur tabel nou (tranzactii_bancare = fapt brut din extras + starea lui). Memoria "IBAN -> sportiv/familie"
-- este VIEW derivat din ultima confirmare (nu tabel iban_platitor). DEVIATIE justificata fata de lista initiala:
-- coloanele sportiv_id/familie_id NU se pun pe tranzactii_bancare; sunt determinate integral de tranzactie_id ->
-- tranzactii.sportiv_id/familie_id (dependenta tranzitiva = a doua sursa de adevar). View-ul le citeste prin JOIN.
-- 'potrivita' e in domeniul starii dar UI-ul NU o scrie: candidatii se calculeaza live (a-i stoca ar fi date derivate).
--
-- GDPR: date bancare personale (nume platitor, IBAN, detalii). NU se trimit niciodata la AI/RAG.
-- TODO retentie/anonimizare randuri 'ignorata' (platitor_nume/iban/detalii) — NU se implementeaza aici.
--
-- PASI MANUALI DE AUDIT LIVE inainte de apply (cu OK user):
--  1. information_schema.columns pentru tranzactii, familii, cluburi_detalii, plati (sportiv_id, familie_id, suma,
--     suma_ramasa, status, data_platii, metoda_plata, club_id; absenta coloanei iban).
--  2. SELECT count(*) FROM tranzactii WHERE club_id IS NULL (istoric ~52) — randurile noi primesc club_id din randul bancar.
--  3. pg_policies pe tranzactii, tranzactie_plata, cluburi_detalii + corpul live al poate_gestiona_taxe_club,
--     proceseaza_incasare_normalizata, este_doar_extern (politicile live pot diferi de migrari).
--  4. Triggerele live pe tranzactii / tranzactie_plata / plati: numele real al trigger-ului de sincronizare a restului
--     si orice verificare suma vs alocari care ar respinge un avans nealocat.
--  5. AVANS: ruleaza T4 din scriptul de test; confirma ca avansul (tranzactii.suma > Σ tranzactie_plata) e numarat O
--     SINGURA DATA (trigger-ul scade restul doar cu alocarea; calculeazaSold creste cu suma bancara intreaga).
--     RISC: (a) daca trigger-ul recalculeaza plati.suma_ramasa din tranzactii.suma, avansul ar fi dublu; (b)
--     editeazaIncasare (services/tranzactiiService.ts) resincronizeaza tranzactii.suma = Σ alocari => editarea din Jurnal
--     a unei incasari bancare cu avans ar STERGE avansul. Oricare se confirma => STOP, raporteaza inainte de apply.
--  6. Dry-run pe CLONA: aplica migrarea, apoi psql -f tests/tranzactii_bancare_20261120a.sql (toate ASSERT-urile trec).
--  7. npx tsx tests/acl_definer_faza37.ts dupa apply.
--  8. NU face push la UI inainte de apply (sectiunea ar afisa eroarea de tabel lipsa).
--
-- ROLLBACK:
--   DROP FUNCTION public.confirma_tranzactie_bancara(uuid, jsonb, jsonb[]);
--   DROP VIEW public.tranzactii_bancare_memorie_iban;
--   DROP TABLE public.tranzactii_bancare;
--   DROP FUNCTION public.tranzactii_bancare_reset_stare();
--   ALTER TABLE public.cluburi_detalii DROP COLUMN iban;

-- 1) IBAN-ul clubului (A-04); politica existenta cluburi_detalii_admin o acopera
ALTER TABLE public.cluburi_detalii ADD COLUMN IF NOT EXISTS iban text;

-- 2) Tabelul (doar credite: suma > 0)
CREATE TABLE public.tranzactii_bancare (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id uuid NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    sursa text NOT NULL DEFAULT 'extras' CHECK (sursa IN ('extras', 'sms', 'api')),
    ref_banca text NOT NULL,
    data_tranzactie date NOT NULL,
    suma numeric(12,2) NOT NULL CHECK (suma > 0),
    platitor_nume text,
    platitor_iban text,
    detalii text,
    stare text NOT NULL DEFAULT 'noua' CHECK (stare IN ('noua', 'potrivita', 'confirmata', 'ignorata')),
    motiv_ignorare text,
    tranzactie_id uuid REFERENCES public.tranzactii(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tranzactii_bancare_dedup UNIQUE (club_id, sursa, ref_banca),
    CONSTRAINT tranzactii_bancare_confirmata_are_tranzactie CHECK ((stare = 'confirmata') = (tranzactie_id IS NOT NULL)),
    CONSTRAINT tranzactii_bancare_motiv_doar_ignorata CHECK (motiv_ignorare IS NULL OR stare = 'ignorata')
);
CREATE INDEX tranzactii_bancare_club_stare_idx ON public.tranzactii_bancare (club_id, stare);
CREATE INDEX tranzactii_bancare_club_iban_idx ON public.tranzactii_bancare (club_id, platitor_iban) WHERE platitor_iban IS NOT NULL;
CREATE INDEX tranzactii_bancare_tranzactie_idx ON public.tranzactii_bancare (tranzactie_id);

-- 3) Stergerea tranzactiei din Jurnal Incasari face SET NULL pe tranzactie_id; fara trigger CHECK-ul ar bloca stergerea
--    (regresie in Jurnal), cu trigger randul revine la potrivire ('noua').
CREATE OR REPLACE FUNCTION public.tranzactii_bancare_reset_stare() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tranzactie_id IS NULL AND NEW.stare = 'confirmata' THEN
        NEW.stare := 'noua';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tranzactii_bancare_reset_stare() FROM PUBLIC;

CREATE TRIGGER trg_tranzactii_bancare_reset_stare
BEFORE UPDATE OF tranzactie_id ON public.tranzactii_bancare
FOR EACH ROW EXECUTE FUNCTION public.tranzactii_bancare_reset_stare();

-- 4) RLS + grant-uri pe coloane (A-05). Clientul nu poate seta tranzactie_id => 'confirmata' e imposibila fara RPC.
ALTER TABLE public.tranzactii_bancare ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tranzactii_bancare FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER, DELETE, INSERT, UPDATE ON public.tranzactii_bancare FROM authenticated;
GRANT INSERT (club_id, sursa, ref_banca, data_tranzactie, suma, platitor_nume, platitor_iban, detalii)
    ON public.tranzactii_bancare TO authenticated;
GRANT UPDATE (stare, motiv_ignorare) ON public.tranzactii_bancare TO authenticated;

CREATE POLICY tranzactii_bancare_admin ON public.tranzactii_bancare
    FOR ALL TO authenticated
    USING (public.poate_gestiona_taxe_club(club_id))
    WITH CHECK (public.poate_gestiona_taxe_club(club_id));

-- 5) Memoria IBAN -> sportiv/familie: ultima confirmare per (club, IBAN). security_invoker obligatoriu (altfel ocoleste RLS).
CREATE VIEW public.tranzactii_bancare_memorie_iban WITH (security_invoker = true) AS
SELECT DISTINCT ON (b.club_id, b.platitor_iban)
       b.club_id, b.platitor_iban, t.sportiv_id, t.familie_id, b.data_tranzactie
  FROM public.tranzactii_bancare b
  JOIN public.tranzactii t ON t.id = b.tranzactie_id
 WHERE b.stare = 'confirmata' AND b.platitor_iban IS NOT NULL
 ORDER BY b.club_id, b.platitor_iban, b.data_tranzactie DESC, b.created_at DESC;
REVOKE ALL ON public.tranzactii_bancare_memorie_iban FROM anon;
GRANT SELECT ON public.tranzactii_bancare_memorie_iban TO authenticated;

-- 6) Confirmarea: O tranzactie + alocarile alese, atomic. Suma/data/metoda/club vin din RANDUL BANCAR, nu din client.
CREATE OR REPLACE FUNCTION public.confirma_tranzactie_bancara(p_id uuid, p_tranzactie jsonb, p_plati jsonb[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_b public.tranzactii_bancare%ROWTYPE;
    v_plati jsonb[] := COALESCE(p_plati, '{}'::jsonb[]);
    v_tinta jsonb := COALESCE(p_tranzactie, '{}'::jsonb);
    v_sp uuid := NULLIF(v_tinta->>'sportiv_id', '')::uuid;
    v_fam uuid := NULLIF(v_tinta->>'familie_id', '')::uuid;
    v_alocari jsonb := to_jsonb(COALESCE(p_plati, '{}'::jsonb[]));
    v_n integer := cardinality(COALESCE(p_plati, '{}'::jsonb[]));
    v_total numeric;
    v_ids uuid[];
    v_gasite integer := 0;
    v_r record;
    v_tx uuid;
BEGIN
    SELECT * INTO v_b FROM public.tranzactii_bancare WHERE id = p_id FOR UPDATE;

    -- gardă: acelasi mesaj pentru inexistent si pentru interzis
    IF NOT FOUND OR auth.uid() IS NULL OR public.este_doar_extern()
       OR NOT public.poate_gestiona_taxe_club(v_b.club_id) THEN
        RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
    END IF;

    -- idempotent: reincercarea / dublu-clic intoarce aceeasi tranzactie
    IF v_b.stare = 'confirmata' THEN
        RETURN v_b.tranzactie_id;
    END IF;

    -- tinta: exact unul dintre sportiv / familie, din clubul randului bancar
    IF (v_sp IS NULL) = (v_fam IS NULL) THEN
        RAISE EXCEPTION 'tinta_invalida' USING ERRCODE = '22023';
    END IF;
    IF v_sp IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = v_sp AND s.club_id = v_b.club_id) THEN
        RAISE EXCEPTION 'tinta_invalida' USING ERRCODE = '22023';
    END IF;
    IF v_fam IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sportivi s WHERE s.familie_id = v_fam AND s.club_id = v_b.club_id) THEN
        RAISE EXCEPTION 'tinta_invalida' USING ERRCODE = '22023';
    END IF;

    -- alocari (toate verificarile inainte de orice INSERT)
    IF v_n > 0 THEN
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_alocari) e
             WHERE CASE WHEN jsonb_typeof(e->'suma_alocata') = 'number'
                        THEN (e->>'suma_alocata')::numeric <= 0 ELSE true END
                OR COALESCE(e->>'plata_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) THEN
            RAISE EXCEPTION 'alocare_invalida' USING ERRCODE = '22023';
        END IF;

        SELECT array_agg(DISTINCT (e->>'plata_id')::uuid), sum((e->>'suma_alocata')::numeric)
          INTO v_ids, v_total
          FROM jsonb_array_elements(v_alocari) e;

        IF cardinality(v_ids) <> v_n THEN
            RAISE EXCEPTION 'plata_duplicata' USING ERRCODE = '22023';
        END IF;
        IF v_total > v_b.suma + 0.005 THEN
            RAISE EXCEPTION 'suma_alocata_depaseste' USING ERRCODE = '22023';
        END IF;

        -- blocare facturi in ordine stabila de id (fara deadlock intre doua confirmari concurente);
        -- clubul se verifica INAINTEA restului, ca sa nu dezvaluie starea facturilor altui club
        FOR v_r IN
            SELECT pl.id,
                   COALESCE(pl.club_id, sp.club_id,
                            (SELECT sf.club_id FROM public.sportivi sf WHERE sf.familie_id = pl.familie_id ORDER BY sf.id LIMIT 1)) AS club
              FROM public.plati pl LEFT JOIN public.sportivi sp ON sp.id = pl.sportiv_id
             WHERE pl.id = ANY(v_ids)
             ORDER BY pl.id
               FOR UPDATE OF pl
        LOOP
            v_gasite := v_gasite + 1;
            IF v_r.club IS DISTINCT FROM v_b.club_id THEN
                RAISE EXCEPTION 'acces_interzis' USING ERRCODE = '42501';
            END IF;
        END LOOP;
        IF v_gasite <> v_n THEN
            RAISE EXCEPTION 'factura_inexistenta' USING ERRCODE = '22023';
        END IF;

        -- restul facturii (oglinda restDePlata din utils/paymentStatus.ts)
        FOR v_r IN
            SELECT pl.id,
                   CASE WHEN pl.status IN ('Achitat', 'Anulat') THEN 0
                        WHEN pl.status = 'Neachitat' THEN pl.suma
                        ELSE COALESCE(pl.suma_ramasa, pl.suma) END AS rest,
                   (e->>'suma_alocata')::numeric AS alocat
              FROM jsonb_array_elements(v_alocari) e
              JOIN public.plati pl ON pl.id = (e->>'plata_id')::uuid
        LOOP
            IF v_r.alocat > v_r.rest + 0.005 THEN
                RAISE EXCEPTION 'alocare_depaseste_rest_factura' USING ERRCODE = '22023', DETAIL = v_r.id::text;
            END IF;
        END LOOP;
    END IF;

    v_tx := public.proceseaza_incasare_normalizata(
        jsonb_build_object(
            'sportiv_id', v_sp,
            'familie_id', v_fam,
            'suma', v_b.suma,
            'data_platii', v_b.data_tranzactie,
            'metoda_plata', 'Transfer Bancar',
            'club_id', v_b.club_id),
        v_plati);

    UPDATE public.tranzactii_bancare
       SET stare = 'confirmata', tranzactie_id = v_tx, motiv_ignorare = NULL
     WHERE id = p_id;

    RETURN v_tx;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirma_tranzactie_bancara(uuid, jsonb, jsonb[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirma_tranzactie_bancara(uuid, jsonb, jsonb[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
