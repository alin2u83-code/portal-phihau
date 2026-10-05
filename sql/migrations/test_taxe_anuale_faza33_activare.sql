-- Test Faza 33 / 33-01: activare taxe FRQKD + FRAM. NU este migratie.
-- Ruleaza prin MCP execute_sql (sau SQL Editor). Se anuleaza singur: blocul se incheie cu RAISE EXCEPTION
-- (rollback complet), mesajul 'REZULTAT: ...' contine raportul. Nu lasa urme in productie.
-- Fixtures: foloseste sportivi existenti fara viza; toate modificarile (inclusiv transfer club si preturi) sunt anulate.
DO $$
DECLARE
  s1 uuid; s2 uuid; s3 uuid; c1 uuid; c2 uuid;
  an_q int := public.perioada_taxa('FRQKD', CURRENT_DATE);
  an_a int := public.perioada_taxa('FRAM', CURRENT_DATE);
  d_before int; ds_before int; n int; r text := ''; rec record;
BEGIN
  SELECT id, club_id INTO s1, c1 FROM public.sportivi s WHERE club_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vize_sportivi v WHERE v.sportiv_id = s.id) ORDER BY id LIMIT 1;
  SELECT id, club_id INTO s2, c2 FROM public.sportivi s WHERE club_id IS NOT NULL AND club_id <> c1
     AND NOT EXISTS (SELECT 1 FROM public.vize_sportivi v WHERE v.sportiv_id = s.id) ORDER BY id LIMIT 1;
  SELECT id INTO s3 FROM public.sportivi s WHERE club_id IS NOT NULL AND id NOT IN (s1, s2)
     AND NOT EXISTS (SELECT 1 FROM public.vize_sportivi v WHERE v.sportiv_id = s.id) ORDER BY id LIMIT 1;
  IF s1 IS NULL OR s2 IS NULL OR s3 IS NULL THEN RAISE EXCEPTION 'fixtures insuficiente'; END IF;
  UPDATE public.sportivi SET club_id = NULL WHERE id = s3;  -- T6: sportiv fara club (anulat la rollback)

  -- pret FRQKD asigurat, pret FRAM sters (stare "in asteptare")
  INSERT INTO public.taxa_anuala_config (tip, an_fiscal, suma) VALUES ('FRQKD', an_q, 170) ON CONFLICT (tip, an_fiscal) DO NOTHING;
  DELETE FROM public.taxa_anuala_config WHERE tip = 'FRAM' AND an_fiscal = an_a;
  SELECT count(*) INTO d_before FROM public.deconturi_federatie;
  SELECT count(*) INTO ds_before FROM public.decont_sportivi;

  -- T1: idempotenta (apel dublu)
  PERFORM public.activeaza_taxa_anuala(s1); PERFORM public.activeaza_taxa_anuala(s1);
  SELECT count(*) INTO n FROM public.vize_sportivi WHERE sportiv_id = s1 AND tip = 'FRQKD' AND an = an_q AND plata_id IS NOT NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'T1 ESUAT: viza FRQKD facturata = %', n; END IF;
  SELECT count(*) INTO n FROM public.vize_sportivi WHERE sportiv_id = s1 AND tip = 'FRAM' AND an = an_a AND plata_id IS NULL AND NOT scutit;
  IF n <> 1 THEN RAISE EXCEPTION 'T1 ESUAT: viza FRAM in asteptare = %', n; END IF;
  SELECT count(*) AS c, max(suma) AS s, max(status) AS st, max(descriere) AS d INTO rec FROM public.plati WHERE sportiv_id = s1 AND tip = 'FRQKD' AND an = an_q;
  IF rec.c <> 1 OR rec.s <> 170 OR rec.st <> 'Neachitat' OR rec.d <> 'FRQKD Sezonul ' || an_q || '-' || (an_q + 1) THEN RAISE EXCEPTION 'T1 ESUAT: factura FRQKD %', rec; END IF;
  r := r || 'T1 OK; ';

  -- T2: fara efecte pe deconturi
  IF (SELECT count(*) FROM public.deconturi_federatie) <> d_before OR (SELECT count(*) FROM public.decont_sportivi) <> ds_before THEN
    RAISE EXCEPTION 'T2 ESUAT: deconturi modificate'; END IF;
  r := r || 'T2 OK; ';

  -- T3: facturare la setarea pretului FRAM
  INSERT INTO public.taxa_anuala_config (tip, an_fiscal, suma) VALUES ('FRAM', an_a, 100);
  SELECT p.suma, p.status, p.descriere, p.tip INTO rec FROM public.vize_sportivi v JOIN public.plati p ON p.id = v.plata_id
   WHERE v.sportiv_id = s1 AND v.tip = 'FRAM' AND v.an = an_a;
  IF rec.suma IS DISTINCT FROM 100 OR rec.status <> 'Neachitat' OR rec.descriere <> 'FRAM Anul ' || an_a OR rec.tip <> 'FRAM' THEN
    RAISE EXCEPTION 'T3 ESUAT: %', rec; END IF;
  r := r || 'T3 OK; ';

  -- T4: schimbarea pretului nu refactureaza
  UPDATE public.taxa_anuala_config SET suma = 120 WHERE tip = 'FRAM' AND an_fiscal = an_a;
  SELECT count(*) AS c, max(suma) AS s INTO rec FROM public.plati WHERE sportiv_id = s1 AND tip = 'FRAM' AND an = an_a;
  IF rec.c <> 1 OR rec.s <> 100 THEN RAISE EXCEPTION 'T4 ESUAT: %', rec; END IF;
  r := r || 'T4 OK; ';

  -- T5: transfer -> taxa ramane la primul club
  UPDATE public.sportivi SET club_id = c2 WHERE id = s1;
  PERFORM public.activeaza_taxa_anuala(s1);
  SELECT count(*) INTO n FROM public.vize_sportivi WHERE sportiv_id = s1 AND an IN (an_q, an_a);
  IF n <> 2 OR EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = s1 AND club_id <> c1) THEN RAISE EXCEPTION 'T5 ESUAT'; END IF;
  r := r || 'T5 OK; ';

  -- T6: sportiv fara club nu produce exceptie si nici viza
  PERFORM public.activeaza_taxa_anuala(s3);
  IF EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = s3) THEN RAISE EXCEPTION 'T6 ESUAT'; END IF;
  r := r || 'T6 OK; ';

  -- T7: baseline FRQKD 2025 neatins
  SELECT suma_totala, nr_participanti, status_plata, metoda_plata, confirmata_federatie INTO rec
    FROM public.deconturi_federatie WHERE id = 'e71edebc-1ee1-4b96-b469-4adbb220b67e';
  IF rec.suma_totala <> 2720 OR rec.nr_participanti <> 17 OR rec.status_plata <> 'Platit' OR rec.metoda_plata <> 'Cash' OR NOT rec.confirmata_federatie
     OR (SELECT count(*) FROM public.decont_sportivi WHERE decont_id = 'e71edebc-1ee1-4b96-b469-4adbb220b67e') <> 17 THEN
    RAISE EXCEPTION 'T7 ESUAT: baseline modificat'; END IF;
  r := r || 'T7 OK; ';

  -- T8: privilegii
  IF has_function_privilege('authenticated', 'public.activeaza_taxa_sportiv(uuid,text,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.activeaza_taxa_anuala(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.factureaza_viza_taxa(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.proceseaza_taxe_in_asteptare(text,integer)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.poate_gestiona_taxe_club(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'T8 ESUAT: privilegii'; END IF;
  r := r || 'T8 OK; ';

  RAISE EXCEPTION 'REZULTAT: % TOATE TESTELE AU TRECUT (rollback intentionat)', r;
END $$;
