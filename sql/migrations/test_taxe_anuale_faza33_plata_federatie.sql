-- Test Faza 33 / 33-03: inregistreaza_plata_federatie, raport_taxe_anuale_cluburi, RLS. NU este migratie.
-- Ruleaza prin MCP execute_sql. Se anuleaza singur (RAISE EXCEPTION final => rollback). Perioada de test: 2099.
-- P8 ruleaza sub rolul authenticated (SET LOCAL ROLE), ca RLS sa se aplice efectiv.
DO $$
DECLARE
  u uuid; c1 uuid; c2 uuid; a uuid; b uuid; c uuid; d uuid; e uuid; f uuid;
  x_admin1 uuid; x_instr1 uuid; x_admin2 uuid; x_super uuid;
  res jsonb; rec record; n int; r text := ''; ok boolean; msg text; dec1 uuid;
BEGIN
  SELECT user_id INTO u FROM public.utilizator_roluri_multicont LIMIT 1;
  INSERT INTO public.cluburi (nume) VALUES ('test FAZA33 p1') RETURNING id INTO c1;
  INSERT INTO public.cluburi (nume) VALUES ('test FAZA33 p2') RETURNING id INTO c2;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id) VALUES ('TestFAZA33','A','2010-01-01', c1) RETURNING id INTO a;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id) VALUES ('TestFAZA33','B','2010-01-01', c1) RETURNING id INTO b;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id) VALUES ('TestFAZA33','C','2010-01-01', c1) RETURNING id INTO c;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id) VALUES ('TestFAZA33','D','2010-01-01', c1) RETURNING id INTO d;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id) VALUES ('TestFAZA33','E','2010-01-01', c1) RETURNING id INTO e;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id) VALUES ('TestFAZA33','F','2010-01-01', c2) RETURNING id INTO f;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'ADMIN_CLUB', c1) RETURNING id INTO x_admin1;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'INSTRUCTOR', c1) RETURNING id INTO x_instr1;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'ADMIN_CLUB', c2) RETURNING id INTO x_admin2;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'SUPER_ADMIN_FEDERATIE', NULL) RETURNING id INTO x_super;
  INSERT INTO public.taxa_anuala_config (tip, an_fiscal, suma) VALUES ('FRQKD', 2099, 170);
  PERFORM public.activeaza_taxa_sportiv(a, 'FRQKD', 2099);
  PERFORM public.activeaza_taxa_sportiv(b, 'FRQKD', 2099);
  PERFORM public.activeaza_taxa_sportiv(c, 'FRQKD', 2099);
  PERFORM public.activeaza_taxa_sportiv(e, 'FRQKD', 2099);
  PERFORM public.activeaza_taxa_sportiv(f, 'FRQKD', 2099);
  INSERT INTO public.vize_sportivi (sportiv_id, an, tip, club_id, status_viza, data_platii) VALUES (d, 2099, 'FRQKD', c1, 'Activ', CURRENT_DATE);
  UPDATE public.vize_sportivi SET scutit = true, motiv_scutire = 'test' WHERE sportiv_id = c AND an = 2099 AND tip = 'FRQKD';
  UPDATE public.plati SET status = 'Achitat' WHERE sportiv_id = a AND tip = 'FRQKD' AND an = 2099;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', u::text, true);

  -- P1
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_admin1)::text, true);
  res := public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[a, b], 'Cash');
  dec1 := (res->>'decont_id')::uuid;
  SELECT status_plata, confirmata_federatie, metoda_plata, nr_participanti, suma_totala, creat_de INTO rec FROM public.deconturi_federatie WHERE id = dec1;
  SELECT count(*) INTO n FROM public.decont_sportivi WHERE decont_id = dec1 AND tip = 'FRQKD' AND plata_id IS NOT NULL AND suma = 170;
  IF rec.status_plata <> 'Platit' OR NOT rec.confirmata_federatie OR rec.metoda_plata <> 'Cash' OR rec.nr_participanti <> 2 OR rec.suma_totala <> 340 OR rec.creat_de IS DISTINCT FROM u OR n <> 2 THEN
    RAISE EXCEPTION 'P1 ESUAT: % % %', res, rec, n; END IF;
  r := r || 'P1 OK; ';
  -- P2 dublare
  ok := false; msg := '';
  BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[a], 'Cash'); EXCEPTION WHEN OTHERS THEN ok := true; msg := SQLERRM; END;
  SELECT count(*) INTO n FROM public.deconturi_federatie WHERE club_id = c1 AND an_fiscal = 2099;
  IF NOT ok OR msg NOT LIKE '%nu pot fi incluși%' OR n <> 1 THEN RAISE EXCEPTION 'P2 ESUAT: ok=% msg=% n=%', ok, msg, n; END IF;
  r := r || 'P2 OK; ';
  -- P3 scutit / in asteptare / alt club
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e, c], 'Cash'); EXCEPTION WHEN OTHERS THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P3 ESUAT: scutit acceptat'; END IF;
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e, d], 'Cash'); EXCEPTION WHEN OTHERS THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P3 ESUAT: in asteptare acceptat'; END IF;
  ok := false; msg := '';
  BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e, f], 'Cash'); EXCEPTION WHEN OTHERS THEN ok := true; msg := SQLERRM; END;
  IF NOT ok OR msg LIKE '%TestFAZA33 F%' THEN RAISE EXCEPTION 'P3 ESUAT: alt club ok=% msg=%', ok, msg; END IF;
  IF EXISTS (SELECT 1 FROM public.decont_sportivi WHERE sportiv_id = e) THEN RAISE EXCEPTION 'P3 ESUAT: E virat partial'; END IF;
  r := r || 'P3 OK; ';
  -- P4 validari
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e], 'Card'); EXCEPTION WHEN SQLSTATE '22023' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P4 ESUAT: metoda'; END IF;
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[]::uuid[], 'Cash'); EXCEPTION WHEN SQLSTATE '22023' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P4 ESUAT: array gol'; END IF;
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e], 'Cash', CURRENT_DATE, 'public/' || c2::text || '/x/y.pdf'); EXCEPTION WHEN SQLSTATE '22023' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P4 ESUAT: dovada alt club'; END IF;
  r := r || 'P4 OK; ';
  -- P5 refuzuri de rol
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_instr1)::text, true);
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e], 'Cash'); EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P5 ESUAT: instructor'; END IF;
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_admin2)::text, true);
  ok := false; BEGIN PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e], 'Cash'); EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'P5 ESUAT: alt club'; END IF;
  r := r || 'P5 OK; ';
  -- P6 a doua plata pe aceeasi perioada
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_admin1)::text, true);
  PERFORM public.inregistreaza_plata_federatie(c1, 'FRQKD', 2099, ARRAY[e], 'Transfer Bancar');
  SELECT count(*) INTO n FROM public.deconturi_federatie WHERE club_id = c1 AND tip_activitate = 'FRQKD' AND an_fiscal = 2099;
  IF n <> 2 THEN RAISE EXCEPTION 'P6 ESUAT: n=%', n; END IF;
  r := r || 'P6 OK; ';
  -- P7 raport
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_super)::text, true);
  SELECT count(*) INTO n FROM public.raport_taxe_anuale_cluburi('FRQKD', 2099) WHERE club_id IN (c1, c2);
  SELECT * INTO rec FROM public.raport_taxe_anuale_cluburi('FRQKD', 2099) WHERE club_id = c1;
  IF n <> 2 OR rec.nr_scutiti <> 1 OR rec.nr_virati <> 3 OR rec.suma_virata <> 510 OR rec.suma_achitata_club <> 170 THEN RAISE EXCEPTION 'P7 ESUAT: n=% %', n, rec; END IF;
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_admin1)::text, true);
  SELECT count(*) INTO n FROM public.raport_taxe_anuale_cluburi('FRQKD', 2099);
  IF n <> 1 THEN RAISE EXCEPTION 'P7 ESUAT: admin club vede % randuri', n; END IF;
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_instr1)::text, true);
  SELECT count(*) INTO n FROM public.raport_taxe_anuale_cluburi('FRQKD', 2099);
  IF n <> 0 THEN RAISE EXCEPTION 'P7 ESUAT: instructor vede % randuri', n; END IF;
  r := r || 'P7 OK; ';
  -- P8 RLS sub rolul authenticated, context ADMIN_CLUB@club2
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', x_admin2)::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.vize_sportivi WHERE club_id = c1;
  IF n <> 0 THEN RESET ROLE; RAISE EXCEPTION 'P8 ESUAT: vize club1 vizibile (%)', n; END IF;
  SELECT count(*) INTO n FROM public.deconturi_federatie WHERE club_id = c1;
  IF n <> 0 THEN RESET ROLE; RAISE EXCEPTION 'P8 ESUAT: deconturi club1 vizibile (%)', n; END IF;
  SELECT count(*) INTO n FROM public.decont_sportivi WHERE decont_id = dec1;
  IF n <> 0 THEN RESET ROLE; RAISE EXCEPTION 'P8 ESUAT: decont_sportivi club1 vizibile (%)', n; END IF;
  ok := false;
  BEGIN
    INSERT INTO public.deconturi_federatie (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata) VALUES (c2, 2099, 'FRQKD', 1, 1, 'In asteptare');
  EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RESET ROLE; RAISE EXCEPTION 'P8 ESUAT: insert direct in deconturi_federatie permis'; END IF;
  UPDATE public.vize_sportivi SET scutit = true, motiv_scutire = 'x' WHERE club_id = c2;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RESET ROLE; RAISE EXCEPTION 'P8 ESUAT: update direct pe vize (%)', n; END IF;
  ok := false;
  BEGIN
    INSERT INTO public.taxa_anuala_config (tip, an_fiscal, suma) VALUES ('FRAM', 2098, 1);
  EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RESET ROLE; RAISE EXCEPTION 'P8 ESUAT: insert pret de non-super-admin permis'; END IF;
  RESET ROLE;
  r := r || 'P8 OK; ';

  RAISE EXCEPTION 'REZULTAT: % TOATE TESTELE AU TRECUT (rollback intentionat)', r;
END $$;
