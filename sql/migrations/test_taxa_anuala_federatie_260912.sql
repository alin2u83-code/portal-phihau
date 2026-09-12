-- =============================================================================
-- Script de TEST (NU migratie) — taxa anuala federatie FRQKD
-- Subiect: dovedeste cele 4 scenarii din spec (idempotenta, agregare per club,
--          separare intre cluburi, esec pe lipsa pret fara randuri orfane).
-- Depinde de: taxa_anuala_federatie_trigger_260912.sql
-- Rulare: prin MCP Supabase execute_sql (NU apply_migration) pe wuhidifzsutwgdfkwhmd.
-- ATENTIE: NU transforma niciodata acest script intr-o migratie — ruleaza integral
--          intre BEGIN si ROLLBACK, foloseste date de test create si distruse
--          in aceeasi tranzactie, nu lasa niciodata urme in productie.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE test_ids (key text PRIMARY KEY, val uuid) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- Pregatire: 2 cluburi de test, 4 sportivi de test (2 in club1, 1 in club2,
-- 1 rezervat pentru scenariul T4), o competitie + categorie de test.
-- ---------------------------------------------------------------------------

WITH ins AS (
    INSERT INTO public.cluburi (nume) VALUES ('test FRQKD club 1') RETURNING id
) INSERT INTO test_ids SELECT 'club1', id FROM ins;

WITH ins AS (
    INSERT INTO public.cluburi (nume) VALUES ('test FRQKD club 2') RETURNING id
) INSERT INTO test_ids SELECT 'club2', id FROM ins;

WITH ins AS (
    INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id)
    VALUES ('TestFRQKD', 'Unu', '2000-01-01', (SELECT val FROM test_ids WHERE key = 'club1'))
    RETURNING id
) INSERT INTO test_ids SELECT 'sportiv1', id FROM ins;

WITH ins AS (
    INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id)
    VALUES ('TestFRQKD', 'Doi', '2000-01-01', (SELECT val FROM test_ids WHERE key = 'club1'))
    RETURNING id
) INSERT INTO test_ids SELECT 'sportiv2', id FROM ins;

WITH ins AS (
    INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id)
    VALUES ('TestFRQKD', 'Trei', '2000-01-01', (SELECT val FROM test_ids WHERE key = 'club2'))
    RETURNING id
) INSERT INTO test_ids SELECT 'sportiv3', id FROM ins;

WITH ins AS (
    INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id)
    VALUES ('TestFRQKD', 'Patru', '2000-01-01', (SELECT val FROM test_ids WHERE key = 'club1'))
    RETURNING id
) INSERT INTO test_ids SELECT 'sportiv4', id FROM ins;

WITH ins AS (
    INSERT INTO public.competitii (denumire, tip, data_inceput, data_sfarsit)
    VALUES ('Test FRQKD Competitie', 'tehnica', CURRENT_DATE, CURRENT_DATE)
    RETURNING id
) INSERT INTO test_ids SELECT 'competitie1', id FROM ins;

WITH ins AS (
    INSERT INTO public.categorii_competitie (competitie_id, varsta_min, gen)
    VALUES ((SELECT val FROM test_ids WHERE key = 'competitie1'), 0, 'Masculin')
    RETURNING id
) INSERT INTO test_ids SELECT 'categorie1', id FROM ins;

-- Asigura existenta pretului pentru anul fiscal curent (seed-uit deja in 29-01
-- pentru 2026; instructia e idempotenta si nu strica nimic daca exista deja).
INSERT INTO public.taxa_anuala_config (an_fiscal, suma)
VALUES (public.an_fiscal_federatie(CURRENT_DATE), 170)
ON CONFLICT (an_fiscal) DO NOTHING;

-- ---------------------------------------------------------------------------
-- T1 — idempotenta pe toate cele 4 cai, pentru sportiv1
-- ---------------------------------------------------------------------------

INSERT INTO public.inscrieri_examene (sportiv_id) VALUES ((SELECT val FROM test_ids WHERE key = 'sportiv1'));
INSERT INTO public.stagii_cvd_participare (sportiv_id, data, arma) VALUES ((SELECT val FROM test_ids WHERE key = 'sportiv1'), CURRENT_DATE, 'Baston');
INSERT INTO public.participare_stagiu (practicant_id) VALUES ((SELECT val FROM test_ids WHERE key = 'sportiv1'));
INSERT INTO public.inscrieri_competitie (competitie_id, categorie_id, club_id, sportiv_id)
VALUES ((SELECT val FROM test_ids WHERE key = 'competitie1'), (SELECT val FROM test_ids WHERE key = 'categorie1'), (SELECT val FROM test_ids WHERE key = 'club1'), (SELECT val FROM test_ids WHERE key = 'sportiv1'));

DO $$
DECLARE
    v_sportiv1 uuid := (SELECT val FROM test_ids WHERE key = 'sportiv1');
    v_an integer := public.an_fiscal_federatie(CURRENT_DATE);
    v_n_plati integer;
    v_n_vize integer;
    v_n_decont_sportivi integer;
    v_nr_part integer;
    v_club1 uuid := (SELECT val FROM test_ids WHERE key = 'club1');
BEGIN
    SELECT count(*) INTO v_n_plati FROM public.plati WHERE sportiv_id = v_sportiv1 AND tip = 'FRQKD' AND an = v_an;
    IF v_n_plati != 1 THEN
        RAISE EXCEPTION 'T1 ESUAT: asteptat 1 factura FRQKD pentru sportiv1, gasit %', v_n_plati;
    END IF;

    SELECT count(*) INTO v_n_vize FROM public.vize_sportivi WHERE sportiv_id = v_sportiv1 AND an = v_an;
    IF v_n_vize != 1 THEN
        RAISE EXCEPTION 'T1 ESUAT: asteptat 1 viza pentru sportiv1, gasit %', v_n_vize;
    END IF;

    SELECT count(*) INTO v_n_decont_sportivi FROM public.decont_sportivi WHERE sportiv_id = v_sportiv1 AND an = v_an;
    IF v_n_decont_sportivi != 1 THEN
        RAISE EXCEPTION 'T1 ESUAT: asteptat 1 rand decont_sportivi pentru sportiv1, gasit %', v_n_decont_sportivi;
    END IF;

    SELECT nr_participanti INTO v_nr_part FROM public.deconturi_federatie WHERE club_id = v_club1 AND an_fiscal = v_an;
    IF v_nr_part != 1 THEN
        RAISE EXCEPTION 'T1 ESUAT: asteptat nr_participanti=1 pentru club1, gasit %', v_nr_part;
    END IF;

    RAISE NOTICE 'T1 OK';
END $$;

-- ---------------------------------------------------------------------------
-- T2 — agregare per club: al doilea sportiv din acelasi club (club1)
-- ---------------------------------------------------------------------------

INSERT INTO public.inscrieri_examene (sportiv_id) VALUES ((SELECT val FROM test_ids WHERE key = 'sportiv2'));

DO $$
DECLARE
    v_club1 uuid := (SELECT val FROM test_ids WHERE key = 'club1');
    v_an integer := public.an_fiscal_federatie(CURRENT_DATE);
    v_n_deconturi integer;
    v_nr_part integer;
    v_suma_totala numeric;
    v_suma_config numeric;
BEGIN
    SELECT count(*) INTO v_n_deconturi FROM public.deconturi_federatie WHERE club_id = v_club1 AND an_fiscal = v_an;
    IF v_n_deconturi != 1 THEN
        RAISE EXCEPTION 'T2 ESUAT: asteptat exact 1 decont pentru club1, gasit %', v_n_deconturi;
    END IF;

    SELECT nr_participanti, suma_totala INTO v_nr_part, v_suma_totala
    FROM public.deconturi_federatie WHERE club_id = v_club1 AND an_fiscal = v_an;
    SELECT suma INTO v_suma_config FROM public.taxa_anuala_config WHERE an_fiscal = v_an;

    IF v_nr_part != 2 THEN
        RAISE EXCEPTION 'T2 ESUAT: asteptat nr_participanti=2 pentru club1, gasit %', v_nr_part;
    END IF;
    IF v_suma_totala != 2 * v_suma_config THEN
        RAISE EXCEPTION 'T2 ESUAT: asteptat suma_totala=% pentru club1, gasit %', 2 * v_suma_config, v_suma_totala;
    END IF;

    RAISE NOTICE 'T2 OK';
END $$;

-- ---------------------------------------------------------------------------
-- T3 — separare intre cluburi: sportiv din club2
-- ---------------------------------------------------------------------------

INSERT INTO public.inscrieri_examene (sportiv_id) VALUES ((SELECT val FROM test_ids WHERE key = 'sportiv3'));

DO $$
DECLARE
    v_club1 uuid := (SELECT val FROM test_ids WHERE key = 'club1');
    v_club2 uuid := (SELECT val FROM test_ids WHERE key = 'club2');
    v_an integer := public.an_fiscal_federatie(CURRENT_DATE);
    v_n_deconturi integer;
    v_nr_part1 integer;
    v_nr_part2 integer;
BEGIN
    SELECT count(*) INTO v_n_deconturi FROM public.deconturi_federatie WHERE an_fiscal = v_an AND club_id IN (v_club1, v_club2);
    IF v_n_deconturi != 2 THEN
        RAISE EXCEPTION 'T3 ESUAT: asteptat 2 deconturi (club1+club2), gasit %', v_n_deconturi;
    END IF;

    SELECT nr_participanti INTO v_nr_part1 FROM public.deconturi_federatie WHERE club_id = v_club1 AND an_fiscal = v_an;
    SELECT nr_participanti INTO v_nr_part2 FROM public.deconturi_federatie WHERE club_id = v_club2 AND an_fiscal = v_an;

    IF v_nr_part1 != 2 THEN
        RAISE EXCEPTION 'T3 ESUAT: asteptat nr_participanti=2 pentru club1, gasit %', v_nr_part1;
    END IF;
    IF v_nr_part2 != 1 THEN
        RAISE EXCEPTION 'T3 ESUAT: asteptat nr_participanti=1 pentru club2, gasit %', v_nr_part2;
    END IF;

    RAISE NOTICE 'T3 OK';
END $$;

-- ---------------------------------------------------------------------------
-- T4 — esec pe lipsa pret, fara randuri orfane (SAVEPOINT + ROLLBACK TO)
-- ---------------------------------------------------------------------------

SAVEPOINT sp_fara_pret;

DELETE FROM public.taxa_anuala_config WHERE an_fiscal = public.an_fiscal_federatie(CURRENT_DATE);

DO $$
DECLARE
    v_sportiv4 uuid := (SELECT val FROM test_ids WHERE key = 'sportiv4');
    v_msg text;
    v_exceptie_ridicata boolean := false;
BEGIN
    BEGIN
        INSERT INTO public.inscrieri_examene (sportiv_id) VALUES (v_sportiv4);
    EXCEPTION WHEN others THEN
        v_exceptie_ridicata := true;
        v_msg := SQLERRM;
    END;

    IF NOT v_exceptie_ridicata THEN
        RAISE EXCEPTION 'T4 ESUAT: nu s-a ridicat nicio exceptie la lipsa pretului sezonului';
    END IF;

    IF v_msg NOT ILIKE '%FRQKD%' AND v_msg NOT ILIKE '%pret%' THEN
        RAISE EXCEPTION 'T4 ESUAT: mesajul exceptiei nu mentioneaza FRQKD/pretul sezonului: %', v_msg;
    END IF;

    RAISE NOTICE 'T4 mesaj exceptie: %', v_msg;
END $$;

ROLLBACK TO SAVEPOINT sp_fara_pret;

DO $$
DECLARE
    v_sportiv4 uuid := (SELECT val FROM test_ids WHERE key = 'sportiv4');
    v_n_vize integer;
    v_n_plati integer;
BEGIN
    SELECT count(*) INTO v_n_vize FROM public.vize_sportivi WHERE sportiv_id = v_sportiv4;
    SELECT count(*) INTO v_n_plati FROM public.plati WHERE sportiv_id = v_sportiv4;

    IF v_n_vize != 0 THEN
        RAISE EXCEPTION 'T4 ESUAT: asteptat 0 vize orfane pentru sportiv4 dupa ROLLBACK TO SAVEPOINT, gasit %', v_n_vize;
    END IF;
    IF v_n_plati != 0 THEN
        RAISE EXCEPTION 'T4 ESUAT: asteptat 0 plati orfane pentru sportiv4 dupa ROLLBACK TO SAVEPOINT, gasit %', v_n_plati;
    END IF;

    RAISE NOTICE 'T4 OK';
END $$;

-- ---------------------------------------------------------------------------
-- Curatare finala: baza de date trebuie sa ramana bit-identica dupa rulare.
-- ---------------------------------------------------------------------------

DO $$ BEGIN RAISE NOTICE 'TOATE TESTELE AU TRECUT'; END $$;

ROLLBACK;
