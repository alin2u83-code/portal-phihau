-- Test Faza 33 / 33-02: genereaza_taxe_anuale + seteaza_scutire_taxa cu context de rol simulat. NU este migratie.
-- Ruleaza prin MCP execute_sql. Se anuleaza singur (RAISE EXCEPTION final => rollback); raportul e in mesaj.
-- Contextul de rol: auth.uid() din request.jwt.claims, header active-role-context-id din request.headers
-- (acelasi mecanism ca has_access_to_club / is_super_admin).
DO $$
DECLARE
  u uuid; c1 uuid; c2 uuid; a1 uuid; a2 uuid; ina uuid; b1 uuid;
  ctx_admin1 uuid; ctx_instr1 uuid; ctx_admin2 uuid;
  res jsonb; n int; r text := ''; rec record; dec uuid; ok boolean; msg text; st text;
BEGIN
  SELECT user_id INTO u FROM public.utilizator_roluri_multicont LIMIT 1;
  INSERT INTO public.cluburi (nume) VALUES ('test FAZA33 g1') RETURNING id INTO c1;
  INSERT INTO public.cluburi (nume) VALUES ('test FAZA33 g2') RETURNING id INTO c2;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id, status) VALUES ('TestFAZA33','A1','2010-01-01', c1, 'Activ') RETURNING id INTO a1;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id, status) VALUES ('TestFAZA33','A2','2010-01-01', c1, 'Activ') RETURNING id INTO a2;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id, status) VALUES ('TestFAZA33','IN','2010-01-01', c1, 'Inactiv') RETURNING id INTO ina;
  INSERT INTO public.sportivi (nume, prenume, data_nasterii, club_id, status) VALUES ('TestFAZA33','B1','2010-01-01', c2, 'Activ') RETURNING id INTO b1;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'ADMIN_CLUB', c1) RETURNING id INTO ctx_admin1;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'INSTRUCTOR', c1) RETURNING id INTO ctx_instr1;
  INSERT INTO public.utilizator_roluri_multicont (user_id, rol_denumire, club_id) VALUES (u, 'ADMIN_CLUB', c2) RETURNING id INTO ctx_admin2;
  INSERT INTO public.taxa_anuala_config (tip, an_fiscal, suma) VALUES ('FRQKD', 2099, 170);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', u::text, true);

  -- verificare context: ADMIN_CLUB@c1 poate gestiona c1
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', ctx_admin1)::text, true);
  IF NOT public.poate_gestiona_taxe_club(c1) THEN RAISE EXCEPTION 'context invalid: ADMIN_CLUB@c1 nu poate gestiona c1'; END IF;

  -- G1
  res := public.genereaza_taxe_anuale(c1, 'FRQKD', 2099, NULL);
  SELECT count(*) INTO n FROM public.plati WHERE tip = 'FRQKD' AND an = 2099 AND suma = 170 AND sportiv_id IN (a1, a2, ina, b1);
  IF (res->>'facturat')::int <> 2 OR n <> 2 OR EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = ina) THEN RAISE EXCEPTION 'G1 ESUAT: % / %', res, n; END IF;
  r := r || 'G1 OK; ';
  -- G2
  res := public.genereaza_taxe_anuale(c1, 'FRQKD', 2099, NULL);
  SELECT count(*) INTO n FROM public.plati WHERE tip = 'FRQKD' AND an = 2099 AND sportiv_id IN (a1, a2, ina, b1);
  IF (res->>'facturat')::int <> 0 OR (res->>'exista')::int <> 2 OR n <> 2 THEN RAISE EXCEPTION 'G2 ESUAT: % / %', res, n; END IF;
  r := r || 'G2 OK; ';
  -- G3
  res := public.genereaza_taxe_anuale(c1, 'FRQKD', 2099, ARRAY[b1]);
  IF (res->>'refuzat')::int <> 1 OR EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = b1) THEN RAISE EXCEPTION 'G3 ESUAT: %', res; END IF;
  r := r || 'G3 OK; ';
  -- G4
  res := public.genereaza_taxe_anuale(c1, 'FRAM', 2099, ARRAY[a1]);
  IF (res->>'in_asteptare')::int <> 1 OR NOT EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = a1 AND tip = 'FRAM' AND an = 2099 AND plata_id IS NULL) THEN RAISE EXCEPTION 'G4 ESUAT: %', res; END IF;
  r := r || 'G4 OK; ';
  -- G5 INSTRUCTOR
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', ctx_instr1)::text, true);
  ok := false; BEGIN PERFORM public.genereaza_taxe_anuale(c1, 'FRQKD', 2099, NULL); EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'G5 ESUAT: instructorul a putut genera'; END IF;
  r := r || 'G5 OK; ';
  -- G6 alt club / fara context
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', ctx_admin2)::text, true);
  ok := false; BEGIN PERFORM public.genereaza_taxe_anuale(c1, 'FRQKD', 2099, NULL); EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'G6 ESUAT: alt club a putut genera'; END IF;
  PERFORM set_config('request.headers', '{}', true);
  ok := false; BEGIN PERFORM public.genereaza_taxe_anuale(c1, 'FRQKD', 2099, NULL); EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'G6 ESUAT: fara context a putut genera'; END IF;
  r := r || 'G6 OK; ';

  -- S1 (admin1)
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', ctx_admin1)::text, true);
  res := public.seteaza_scutire_taxa(a2, 'FRAM', 2099, true, 'copil din familie numeroasa');
  IF NOT EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = a2 AND tip = 'FRAM' AND an = 2099 AND scutit AND plata_id IS NULL AND motiv_scutire = 'copil din familie numeroasa')
     OR EXISTS (SELECT 1 FROM public.plati WHERE sportiv_id = a2 AND tip = 'FRAM' AND an = 2099) THEN RAISE EXCEPTION 'S1 ESUAT: %', res; END IF;
  r := r || 'S1 OK; ';
  -- S2
  res := public.seteaza_scutire_taxa(a1, 'FRQKD', 2099, true, 'instructor');
  SELECT status INTO st FROM public.plati WHERE id = (res->>'plata_anulata_id')::uuid;
  IF st <> 'Anulat' OR NOT EXISTS (SELECT 1 FROM public.vize_sportivi WHERE sportiv_id = a1 AND tip = 'FRQKD' AND an = 2099 AND scutit) THEN RAISE EXCEPTION 'S2 ESUAT: %', res; END IF;
  r := r || 'S2 OK; ';
  -- S3 factura cu incasare
  UPDATE public.plati SET status = 'Achitat' WHERE sportiv_id = a2 AND tip = 'FRQKD' AND an = 2099;
  ok := false; msg := '';
  BEGIN PERFORM public.seteaza_scutire_taxa(a2, 'FRQKD', 2099, true, 'x'); EXCEPTION WHEN OTHERS THEN ok := true; msg := SQLERRM; END;
  IF NOT ok OR msg NOT LIKE '%încasări%' THEN RAISE EXCEPTION 'S3 ESUAT: ok=% msg=%', ok, msg; END IF;
  r := r || 'S3 OK; ';
  -- S4 fara motiv
  ok := false; BEGIN PERFORM public.seteaza_scutire_taxa(a1, 'FRAM', 2099, true, ''); EXCEPTION WHEN SQLSTATE '22023' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'S4 ESUAT'; END IF;
  r := r || 'S4 OK; ';
  -- S5 anulare scutire
  res := public.seteaza_scutire_taxa(a1, 'FRQKD', 2099, false, NULL);
  SELECT p.status, p.suma, v.scutit, v.plata_id INTO rec FROM public.vize_sportivi v JOIN public.plati p ON p.id = v.plata_id WHERE v.sportiv_id = a1 AND v.tip = 'FRQKD' AND v.an = 2099;
  IF rec.status <> 'Neachitat' OR rec.suma <> 170 OR rec.scutit OR rec.plata_id <> (res->>'plata_id')::uuid THEN RAISE EXCEPTION 'S5 ESUAT: % %', res, rec; END IF;
  r := r || 'S5 OK; ';
  -- S6 virat federatiei
  INSERT INTO public.deconturi_federatie (club_id, an_fiscal, tip_activitate, suma_totala, nr_participanti, status_plata) VALUES (c1, 2099, 'FRAM', 0, 1, 'Platit') RETURNING id INTO dec;
  INSERT INTO public.decont_sportivi (decont_id, sportiv_id, an, tip) VALUES (dec, a1, 2099, 'FRAM');
  ok := false; msg := '';
  BEGIN PERFORM public.seteaza_scutire_taxa(a1, 'FRAM', 2099, true, 'x'); EXCEPTION WHEN OTHERS THEN ok := true; msg := SQLERRM; END;
  IF NOT ok OR msg NOT LIKE '%virată%' THEN RAISE EXCEPTION 'S6 ESUAT: ok=% msg=%', ok, msg; END IF;
  r := r || 'S6 OK; ';
  -- S7 alt club
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', ctx_admin2)::text, true);
  ok := false; BEGIN PERFORM public.seteaza_scutire_taxa(a1, 'FRQKD', 2099, true, 'x'); EXCEPTION WHEN SQLSTATE '42501' THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'S7 ESUAT'; END IF;
  r := r || 'S7 OK; ';
  -- S8 scutitul nu se factureaza la generare
  PERFORM set_config('request.headers', json_build_object('active-role-context-id', ctx_admin1)::text, true);
  INSERT INTO public.taxa_anuala_config (tip, an_fiscal, suma) VALUES ('FRAM', 2099, 100);
  PERFORM public.genereaza_taxe_anuale(c1, 'FRAM', 2099, NULL);
  IF EXISTS (SELECT 1 FROM public.plati WHERE sportiv_id = a2 AND tip = 'FRAM' AND an = 2099) THEN RAISE EXCEPTION 'S8 ESUAT: scutitul a fost facturat'; END IF;
  r := r || 'S8 OK; ';

  RAISE EXCEPTION 'REZULTAT: % TOATE TESTELE AU TRECUT (rollback intentionat)', r;
END $$;
