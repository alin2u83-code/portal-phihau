-- =====================================================================
-- Quick 261120-d77 — TEST pentru supabase/migrations/20261120a_tranzactii_bancare.sql
--
-- !!! NU RULA PE LIVE. Doar pe CLONA, DUPA aplicarea migrarii. Totul ruleaza in BEGIN ... ROLLBACK (nu ramane nimic). !!!
-- Nu e in supabase/migrations/ ca Supabase CLI sa nu il trateze drept migrare.
--
-- CUM SE RULEAZA (id-uri de pe CLONA, niciun id/date reale in fisier):
--   psql "$CLONE_URL" -v club=<uuid club> \
--        -v admin_uid=<uuid user ADMIN_CLUB al clubului> -v admin_ctx=<uuid utilizator_roluri_multicont ADMIN_CLUB> \
--        -v instr_uid=<uuid user INSTRUCTOR din acelasi club> -v instr_ctx=<uuid context INSTRUCTOR> \
--        -v sportiv=<uuid sportiv din club cu factura deschisa> -v plata=<uuid factura deschisa a sportivului, rest >= 200> \
--        -f tests/tranzactii_bancare_20261120a.sql
--
-- Mecanism: variabilele psql -> set_config('test.*'); contextul se simuleaza cu request.jwt.claims + request.headers
-- (header active-role-context-id) + SET LOCAL ROLE authenticated. Un ASSERT esuat opreste scriptul si arata cazul.
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

SELECT set_config('test.club', :'club', true),
       set_config('test.sportiv', :'sportiv', true),
       set_config('test.plata', :'plata', true);

CREATE FUNCTION pg_temp.ctx(p_uid text, p_ctx text) RETURNS void LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true),
           set_config('request.headers', json_build_object('active-role-context-id', p_ctx)::text, true);
$$;

-- T1 setup (postgres): trei randuri bancare de test (100, 500, 100000), IBAN inventat
DO $t1$
DECLARE v100 uuid; v500 uuid; vmare uuid;
BEGIN
    INSERT INTO public.tranzactii_bancare (club_id, ref_banca, data_tranzactie, suma, platitor_nume, platitor_iban, detalii)
    VALUES (current_setting('test.club')::uuid, 'test-d77-1', current_date, 100, 'TEST PLATITOR', 'RO00TEST0000000000000001', 'test')
    RETURNING id INTO v100;
    INSERT INTO public.tranzactii_bancare (club_id, ref_banca, data_tranzactie, suma, platitor_nume, platitor_iban, detalii)
    VALUES (current_setting('test.club')::uuid, 'test-d77-2', current_date, 500, 'TEST PLATITOR', 'RO00TEST0000000000000002', 'test')
    RETURNING id INTO v500;
    INSERT INTO public.tranzactii_bancare (club_id, ref_banca, data_tranzactie, suma, platitor_nume, platitor_iban, detalii)
    VALUES (current_setting('test.club')::uuid, 'test-d77-3', current_date, 100000, 'TEST PLATITOR', 'RO00TEST0000000000000003', 'test')
    RETURNING id INTO vmare;
    PERFORM set_config('test.b100', v100::text, true);
    PERFORM set_config('test.b500', v500::text, true);
    PERFORM set_config('test.bmare', vmare::text, true);
    -- dedup: acelasi (club, sursa, ref_banca) respins
    BEGIN
        INSERT INTO public.tranzactii_bancare (club_id, ref_banca, data_tranzactie, suma)
        VALUES (current_setting('test.club')::uuid, 'test-d77-1', current_date, 1);
        ASSERT false, 'T1: dublura (club,sursa,ref_banca) trebuia respinsa';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
END $t1$;

-- T2 dubla confirmare (ADMIN_CLUB)
SELECT pg_temp.ctx(:'admin_uid', :'admin_ctx');
SET LOCAL ROLE authenticated;
DO $t2$
DECLARE
    v_tx1 uuid; v_tx2 uuid; v_n integer;
    v_alocari jsonb[] := ARRAY[jsonb_build_object('plata_id', current_setting('test.plata'), 'suma_alocata', 100)];
BEGIN
    v_tx1 := public.confirma_tranzactie_bancara(current_setting('test.b100')::uuid,
        jsonb_build_object('sportiv_id', current_setting('test.sportiv')), v_alocari);
    v_tx2 := public.confirma_tranzactie_bancara(current_setting('test.b100')::uuid,
        jsonb_build_object('sportiv_id', current_setting('test.sportiv')), v_alocari);
    ASSERT v_tx1 IS NOT NULL, 'T2: tranzactia nu a fost creata';
    ASSERT v_tx1 = v_tx2, 'T2: a doua confirmare trebuia sa intoarca ACEEASI tranzactie';
    SELECT count(*) INTO v_n FROM public.tranzactii WHERE id = v_tx1;
    ASSERT v_n = 1, 'T2: trebuia exact o tranzactie';
    SELECT count(*) INTO v_n FROM public.tranzactii_bancare WHERE tranzactie_id = v_tx1;
    ASSERT v_n = 1, 'T2: exact un rand bancar legat de tranzactie';
    SELECT count(*) INTO v_n FROM public.tranzactie_plata WHERE tranzactie_id = v_tx1;
    ASSERT v_n = 1, 'T2: o singura alocare (nu dubla)';
    PERFORM set_config('test.tx2', v_tx1::text, true);
END $t2$;

-- T3 respingeri (randurile 500 si 100000 sunt inca 'noua')
DO $t3$
DECLARE v_rest numeric; v_msg text;
BEGIN
    BEGIN
        PERFORM public.confirma_tranzactie_bancara(current_setting('test.b500')::uuid,
            jsonb_build_object('sportiv_id', current_setting('test.sportiv')),
            ARRAY[jsonb_build_object('plata_id', current_setting('test.plata'), 'suma_alocata', 10),
                  jsonb_build_object('plata_id', current_setting('test.plata'), 'suma_alocata', 10)]);
        ASSERT false, 'T3: plata_id duplicat trebuia respins';
    EXCEPTION WHEN SQLSTATE '22023' THEN
        GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
        ASSERT v_msg = 'plata_duplicata', 'T3: mesaj asteptat plata_duplicata, primit ' || v_msg;
    END;

    SELECT COALESCE(suma_ramasa, suma) INTO v_rest FROM public.plati WHERE id = current_setting('test.plata')::uuid;
    BEGIN
        PERFORM public.confirma_tranzactie_bancara(current_setting('test.bmare')::uuid,
            jsonb_build_object('sportiv_id', current_setting('test.sportiv')),
            ARRAY[jsonb_build_object('plata_id', current_setting('test.plata'), 'suma_alocata', v_rest + 1)]);
        ASSERT false, 'T3: alocare peste restul facturii trebuia respinsa';
    EXCEPTION WHEN SQLSTATE '22023' THEN
        GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
        ASSERT v_msg = 'alocare_depaseste_rest_factura', 'T3: mesaj asteptat alocare_depaseste_rest_factura, primit ' || v_msg;
    END;

    BEGIN
        PERFORM public.confirma_tranzactie_bancara(current_setting('test.b500')::uuid,
            jsonb_build_object('sportiv_id', current_setting('test.sportiv')),
            ARRAY[jsonb_build_object('plata_id', current_setting('test.plata'), 'suma_alocata', 501)]);
        ASSERT false, 'T3: total alocat peste suma bancara trebuia respins';
    EXCEPTION WHEN SQLSTATE '22023' THEN
        GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
        ASSERT v_msg = 'suma_alocata_depaseste', 'T3: mesaj asteptat suma_alocata_depaseste, primit ' || v_msg;
    END;
END $t3$;

-- T4 avans: 500 platit, doar 100 alocat; avansul se numara o singura data
DO $t4$
DECLARE
    v_rest_inainte numeric; v_rest_dupa numeric; v_tx uuid; v_suma_tx numeric; v_suma_aloc numeric;
    v_sold_inainte numeric; v_sold_dupa numeric;
    v_sp uuid := current_setting('test.sportiv')::uuid;
BEGIN
    SELECT COALESCE(suma_ramasa, suma) INTO v_rest_inainte FROM public.plati WHERE id = current_setting('test.plata')::uuid;
    SELECT COALESCE((SELECT sum(suma) FROM public.tranzactii WHERE sportiv_id = v_sp), 0)
         - COALESCE((SELECT sum(suma) FROM public.plati WHERE sportiv_id = v_sp AND status <> 'Anulat'), 0)
      INTO v_sold_inainte;

    v_tx := public.confirma_tranzactie_bancara(current_setting('test.b500')::uuid,
        jsonb_build_object('sportiv_id', current_setting('test.sportiv')),
        ARRAY[jsonb_build_object('plata_id', current_setting('test.plata'), 'suma_alocata', 100)]);

    SELECT suma INTO v_suma_tx FROM public.tranzactii WHERE id = v_tx;
    SELECT COALESCE(sum(suma_alocata), 0) INTO v_suma_aloc FROM public.tranzactie_plata WHERE tranzactie_id = v_tx;
    ASSERT v_suma_tx = 500, 'T4: tranzactii.suma trebuia sa fie 500, este ' || v_suma_tx;
    ASSERT v_suma_aloc = 100, 'T4: suma alocarilor trebuia sa fie 100, este ' || v_suma_aloc;

    SELECT COALESCE(suma_ramasa, suma) INTO v_rest_dupa FROM public.plati WHERE id = current_setting('test.plata')::uuid;
    ASSERT v_rest_inainte - v_rest_dupa = 100,
        'T4: restul facturii trebuia sa scada cu EXACT 100 (trigger-ul numara doar alocarea), a scazut cu ' || (v_rest_inainte - v_rest_dupa);

    SELECT COALESCE((SELECT sum(suma) FROM public.tranzactii WHERE sportiv_id = v_sp), 0)
         - COALESCE((SELECT sum(suma) FROM public.plati WHERE sportiv_id = v_sp AND status <> 'Anulat'), 0)
      INTO v_sold_dupa;
    ASSERT v_sold_dupa - v_sold_inainte = 500, 'T4: soldul trebuia sa creasca cu 500 (avans numarat o data), a crescut cu ' || (v_sold_dupa - v_sold_inainte);
END $t4$;

-- T5 RLS: INSTRUCTORUL nu vede nimic (nici tabel, nici view)
RESET ROLE;
SELECT pg_temp.ctx(:'instr_uid', :'instr_ctx');
SET LOCAL ROLE authenticated;
DO $t5a$
DECLARE v_n integer;
BEGIN
    SELECT count(*) INTO v_n FROM public.tranzactii_bancare_memorie_iban;
    ASSERT v_n = 0, 'T5: instructorul nu trebuie sa vada view-ul de memorie IBAN';
    SELECT count(*) INTO v_n FROM public.tranzactii_bancare;
    ASSERT v_n = 0, 'T5: instructorul nu trebuie sa vada tranzactii_bancare';
END $t5a$;

RESET ROLE;
SELECT pg_temp.ctx(:'admin_uid', :'admin_ctx');
SET LOCAL ROLE authenticated;
DO $t5b$
DECLARE v_n integer;
BEGIN
    SELECT count(*) INTO v_n FROM public.tranzactii_bancare_memorie_iban;
    ASSERT v_n >= 1, 'T5: adminul clubului trebuie sa vada memoria IBAN';
END $t5b$;
RESET ROLE;

-- T6 stergere tranzactie (postgres): randul bancar revine la 'noua'
DO $t6$
DECLARE v_stare text; v_tx uuid;
BEGIN
    DELETE FROM public.tranzactie_plata WHERE tranzactie_id = current_setting('test.tx2')::uuid;
    DELETE FROM public.tranzactii WHERE id = current_setting('test.tx2')::uuid;
    SELECT stare, tranzactie_id INTO v_stare, v_tx FROM public.tranzactii_bancare WHERE id = current_setting('test.b100')::uuid;
    ASSERT v_stare = 'noua' AND v_tx IS NULL, 'T6: dupa stergerea tranzactiei randul bancar trebuia sa devina noua/NULL, este ' || v_stare;
END $t6$;

\echo toate testele trecute
ROLLBACK;
