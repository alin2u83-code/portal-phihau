-- =============================================================================
-- Migration: taxa_anuala_federatie_trigger_260912.sql
-- Subiect: Activare automata taxa anuala FRQKD la prima participare a unui
--          sportiv intr-un sezon (examen / stagiu CVD / stagiu obisnuit / competitie)
-- Depinde de: taxa_anuala_federatie_schema_260912.sql (indecsii unici + taxa_anuala_config)
-- B2 (FORCE RLS): plati/deconturi_federatie/decont_sportivi/vize_sportivi au toate
--   relforcerowsecurity=true. Verificat live: rolul "postgres" are rolbypassrls=true
--   (SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname='postgres' -> true).
--   BYPASSRLS are prioritate asupra FORCE ROW LEVEL SECURITY — o functie SECURITY
--   DEFINER creata/detinuta de "postgres" (rolul care ruleaza apply_migration)
--   ocoleste RLS integral pe aceste tabele, indiferent de FORCE. Nu s-au adaugat
--   politici RLS suplimentare si NU s-a folosit "NO FORCE ROW LEVEL SECURITY" —
--   izolarea cross-club din Faza 25 ramane intacta pentru toti ceilalti apelanti.
-- ATENTIE: nu reutiliza RPC-ul "finalizeaza_examen" din sql/fixes/fix_finalize_exam_function.sql
--   (cod mort, foloseste coloane care nu exista: activitate, data_activitate, numar_sportivi, status).
-- Rulare: aplicata live prin MCP Supabase apply_migration pe wuhidifzsutwgdfkwhmd
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Obiect 1 — an fiscal federatie (D-01): fix 1 septembrie, independent de "sezoane"
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.an_fiscal_federatie(p_data date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM p_data) >= 9 THEN EXTRACT(YEAR FROM p_data)::int
        ELSE EXTRACT(YEAR FROM p_data)::int - 1
    END;
$$;

-- -----------------------------------------------------------------------------
-- Obiect 2 — activeaza_taxa_anuala (D-06, D-07, D-08): idempotenta in 6 pasi
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activeaza_taxa_anuala(p_sportiv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_an_fiscal integer;
    v_viza_id uuid;
    v_club_id uuid;
    v_suma numeric;
    v_plata_id uuid;
    v_decont_id uuid;
BEGIN
    IF p_sportiv_id IS NULL THEN
        RETURN;
    END IF;

    v_an_fiscal := public.an_fiscal_federatie(CURRENT_DATE);

    -- Pasul 3 (D-07): gate de idempotenta pe (sportiv_id, an fiscal).
    -- status_viza = 'Activ' este valoarea reala acceptata de CHECK-ul live
    -- (verdict B3 in 29-SCHEMA-AUDIT.md; spec-ul scrie gresit 'Activa').
    -- data_platii se completeaza aici pentru ca e NOT NULL (B4) — reprezinta
    -- data activarii vizei, nu data incasarii efective a taxei.
    INSERT INTO public.vize_sportivi (sportiv_id, an, status_viza, data_platii)
    VALUES (p_sportiv_id, v_an_fiscal, 'Activ', CURRENT_DATE)
    ON CONFLICT (sportiv_id, an) DO NOTHING
    RETURNING id INTO v_viza_id;

    IF v_viza_id IS NULL THEN
        -- Sportivul are deja viza pe acest sezon — nimic de facut.
        RETURN;
    END IF;

    SELECT club_id INTO v_club_id FROM public.sportivi WHERE id = p_sportiv_id;

    IF v_club_id IS NULL THEN
        RAISE EXCEPTION 'Sportivul % nu are club asociat — taxa federala FRQKD nu poate fi atribuita niciunui decont. Sportivul trebuie repartizat la un club inainte de inscriere.', p_sportiv_id;
    END IF;

    SELECT suma INTO v_suma FROM public.taxa_anuala_config WHERE an_fiscal = v_an_fiscal;

    IF v_suma IS NULL THEN
        RAISE EXCEPTION 'Pretul taxei anuale FRQKD pentru sezonul %-% nu este configurat. SUPER_ADMIN_FEDERATIE trebuie sa il seteze in Taxe Anuale, tabul Taxa Federatie (FRQKD).', v_an_fiscal, v_an_fiscal + 1;
    END IF;

    INSERT INTO public.plati (sportiv_id, club_id, suma, descriere, data, tip, status, an)
    VALUES (
        p_sportiv_id,
        v_club_id,
        v_suma,
        'FRQKD Sezonul ' || v_an_fiscal || '-' || (v_an_fiscal + 1),
        CURRENT_DATE,
        'FRQKD',
        'Neachitat',
        v_an_fiscal
    )
    RETURNING id INTO v_plata_id;

    UPDATE public.vize_sportivi
    SET plata_id = v_plata_id, data_platii = CURRENT_DATE
    WHERE id = v_viza_id;

    -- Get-or-create decont club/sezon — sigur la inserari concurente pentru cluburi diferite.
    INSERT INTO public.deconturi_federatie (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata, data_generare)
    VALUES (v_club_id, v_an_fiscal, 'FRQKD', 0, 0, 'In asteptare', now())
    ON CONFLICT (club_id, an_fiscal) DO NOTHING;

    -- Increment pe UPDATE (nu recalculare prin agregare) — ia lock pe rand,
    -- serializeaza corect doi sportivi din acelasi club inserati simultan.
    UPDATE public.deconturi_federatie
    SET suma_totala = coalesce(suma_totala, 0) + v_suma,
        nr_participanti = coalesce(nr_participanti, 0) + 1
    WHERE club_id = v_club_id AND an_fiscal = v_an_fiscal
    RETURNING id INTO v_decont_id;

    INSERT INTO public.decont_sportivi (decont_id, sportiv_id, an)
    VALUES (v_decont_id, p_sportiv_id, v_an_fiscal)
    ON CONFLICT DO NOTHING;
END;
$$;

-- -----------------------------------------------------------------------------
-- Obiect 3 — trigger generic, citeste coloana ID-ului sportivului din TG_ARGV[0]
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_activeaza_taxa_anuala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sportiv_id uuid;
BEGIN
    v_sportiv_id := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
    PERFORM public.activeaza_taxa_anuala(v_sportiv_id);
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Obiect 4 — cele 4 triggere AFTER INSERT (D-06)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_taxa_anuala_inscrieri_examene ON public.inscrieri_examene;
CREATE TRIGGER trg_taxa_anuala_inscrieri_examene
    AFTER INSERT ON public.inscrieri_examene
    FOR EACH ROW EXECUTE FUNCTION public.trg_activeaza_taxa_anuala('sportiv_id');

DROP TRIGGER IF EXISTS trg_taxa_anuala_stagii_cvd ON public.stagii_cvd_participare;
CREATE TRIGGER trg_taxa_anuala_stagii_cvd
    AFTER INSERT ON public.stagii_cvd_participare
    FOR EACH ROW EXECUTE FUNCTION public.trg_activeaza_taxa_anuala('sportiv_id');

DROP TRIGGER IF EXISTS trg_taxa_anuala_participare_stagiu ON public.participare_stagiu;
CREATE TRIGGER trg_taxa_anuala_participare_stagiu
    AFTER INSERT ON public.participare_stagiu
    FOR EACH ROW EXECUTE FUNCTION public.trg_activeaza_taxa_anuala('practicant_id');

DROP TRIGGER IF EXISTS trg_taxa_anuala_inscrieri_competitie ON public.inscrieri_competitie;
CREATE TRIGGER trg_taxa_anuala_inscrieri_competitie
    AFTER INSERT ON public.inscrieri_competitie
    FOR EACH ROW EXECUTE FUNCTION public.trg_activeaza_taxa_anuala('sportiv_id');

-- -----------------------------------------------------------------------------
-- Verificari post-aplicare (rulate manual prin execute_sql)
-- -----------------------------------------------------------------------------
-- SELECT tgname, tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'trg_taxa_anuala_%'; -- 4 randuri
-- SELECT public.an_fiscal_federatie('2026-09-01'), public.an_fiscal_federatie('2026-08-31'); -- 2026, 2025
-- SELECT prosecdef, proconfig FROM pg_proc WHERE proname IN ('activeaza_taxa_anuala','trg_activeaza_taxa_anuala'); -- t, search_path=public, pg_temp
