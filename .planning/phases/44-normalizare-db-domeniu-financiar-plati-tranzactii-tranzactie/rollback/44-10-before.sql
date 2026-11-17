-- Faza 44 (44-10): definitiile LIVE inainte de migrarea 20261118f (capturate 18.11.2026).
-- Folosire la rollback: (1) re-adauga coloanele din backup (vezi blocul Rollback din migrarea f),
-- (2) ruleaza acest fisier. View-urile recreate de f se sterg intai (fara CASCADE), apoi se recreeaza de aici.
-- Ordinea: coloane -> view_istoric_plati_detaliat (create or replace) -> restul view-urilor -> functii.

-- ===== Coloane (vezi migrarea f, blocul Rollback) =====

-- ===== View-uri (toate security_invoker = true; ACL: vezi comentariul fiecaruia) =====
drop view if exists public.rbv_plati_club;
create view public.rbv_plati_club with (security_invoker = true) as
 SELECT p.id, p.sportiv_id, p.familie_id, p.suma, p.data, p.status, p.descriere, p.tip, p.observatii, p.created_at,
    p.tip_plata, p.examen_id, p.reducere_id, p.valoare_reducere, p.suma_initiala, p."descriereDetaliata", p."reducereDetalii",
    p.club_id, p.suma_ramasa, p.tip_plata_id, p.tip_abonament_id, p.sesiune_id, p.luna, p.an,
    s.nume AS sportiv_nume, s.prenume AS sportiv_prenume, c.nume AS club_nume, f.nume AS familie_denumire
   FROM plati p
     LEFT JOIN sportivi s ON p.sportiv_id = s.id
     LEFT JOIN cluburi c ON COALESCE(p.club_id, s.club_id) = c.id
     LEFT JOIN familii f ON p.familie_id = f.id
  WHERE has_access_to_club(COALESCE(p.club_id, s.club_id)) OR p.sportiv_id = (( SELECT get_own_sportiv_id() AS get_own_sportiv_id));
-- ACL live: postgres, authenticated, service_role (all)
revoke all on public.rbv_plati_club from public, anon, authenticated, service_role;
grant all on public.rbv_plati_club to authenticated, service_role;

drop view if exists public.vedere_cluburi_plati;
create view public.vedere_cluburi_plati with (security_invoker = true) as
 SELECT id, sportiv_id, familie_id, suma, data, status, descriere, tip, observatii, created_at, tip_plata, examen_id,
    reducere_id, valoare_reducere, suma_initiala, "descriereDetaliata", "reducereDetalii", club_id, suma_ramasa,
    tip_plata_id, tip_abonament_id
   FROM plati
  WHERE club_id = get_active_club_id() OR is_super_admin();
revoke all on public.vedere_cluburi_plati from public, anon, authenticated, service_role;
grant all on public.vedere_cluburi_plati to authenticated, service_role;

drop view if exists public.vedere_cluburi_tranzactii;
create view public.vedere_cluburi_tranzactii with (security_invoker = true) as
 SELECT id, plata_ids, sportiv_id, familie_id, suma, data_platii, metoda_plata, created_at, club_id, suma_totala, suma_incasata
   FROM tranzactii
  WHERE club_id = get_active_club_id() OR is_super_admin();
revoke all on public.vedere_cluburi_tranzactii from public, anon, authenticated, service_role;
grant all on public.vedere_cluburi_tranzactii to authenticated, service_role;

drop view if exists public.vedere_cluburi_financiar;
create view public.vedere_cluburi_financiar with (security_invoker = true) as
 SELECT p.id AS plata_id, p.suma, p.suma_ramasa, p.suma - p.suma_ramasa AS suma_incasata, p.data AS data_plata,
    EXTRACT(day FROM p.data) AS zi, EXTRACT(month FROM p.data) AS luna, p.status, s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume, p.club_id, p.tip_plata AS categorie_detaliu
   FROM plati p
     LEFT JOIN sportivi s ON p.sportiv_id = s.id
  WHERE p.club_id = get_active_club_id();
-- ACL live: postgres, anon, authenticated, service_role (all)
revoke all on public.vedere_cluburi_financiar from public, anon, authenticated, service_role;
grant all on public.vedere_cluburi_financiar to anon, authenticated, service_role;

drop view if exists public.view_plata_sportiv;
create view public.view_plata_sportiv with (security_invoker = true) as
 SELECT p.id AS plata_id, p.sportiv_id, p.club_id, p.familie_id, p.data AS data_emitere, p.data AS data_plata, p.descriere,
    COALESCE(p.suma_initiala, 0::numeric) AS suma_datorata, COALESCE(p.suma, 0::numeric) AS suma_incasata, p.status,
    NULL::uuid AS tranzactie_id, (s.nume || ' '::text) || s.prenume AS nume_complet, p.tip_plata,
    COALESCE(p.valoare_reducere, 0::numeric) AS valoare_reducere
   FROM plati p
     LEFT JOIN sportivi s ON p.sportiv_id = s.id;
revoke all on public.view_plata_sportiv from public, anon, authenticated, service_role;
grant all on public.view_plata_sportiv to anon, authenticated, service_role;

-- view_istoric_plati_detaliat (create or replace, aceleasi coloane): varianta cu fallback pe plata_ids
create or replace view public.view_istoric_plati_detaliat with (security_invoker = true) as
 SELECT p.id AS plata_id, p.sportiv_id, p.familie_id,
        CASE WHEN s.id IS NOT NULL THEN (s.nume || ' '::text) || s.prenume WHEN f.id IS NOT NULL THEN f.nume ELSE NULL::text END AS nume_complet_sportiv,
    p.descriere, COALESCE(p.suma, 0::numeric) AS suma_datorata, p.status, p.data::text AS data_emitere,
    COALESCE(( SELECT sum(tp.suma_alocata) FROM tranzactie_plata tp WHERE tp.plata_id = p.id), ( SELECT sum(LEAST(t.suma / cardinality(t.plata_ids)::numeric, COALESCE(p.suma, 0::numeric))) FROM tranzactii t WHERE p.id = ANY (t.plata_ids)), 0::numeric) AS total_incasat,
    GREATEST(COALESCE(p.suma, 0::numeric) - COALESCE(( SELECT sum(tp.suma_alocata) FROM tranzactie_plata tp WHERE tp.plata_id = p.id), ( SELECT sum(LEAST(t.suma / cardinality(t.plata_ids)::numeric, COALESCE(p.suma, 0::numeric))) FROM tranzactii t WHERE p.id = ANY (t.plata_ids)), 0::numeric), 0::numeric) AS rest_de_plata,
    COALESCE(( SELECT t.id FROM tranzactii t JOIN tranzactie_plata tp ON tp.tranzactie_id = t.id WHERE tp.plata_id = p.id ORDER BY t.data_platii DESC LIMIT 1), ( SELECT t.id FROM tranzactii t WHERE p.id = ANY (t.plata_ids) ORDER BY t.data_platii DESC LIMIT 1)) AS tranzactie_id,
    COALESCE(( SELECT t.data_platii::text FROM tranzactii t JOIN tranzactie_plata tp ON tp.tranzactie_id = t.id WHERE tp.plata_id = p.id ORDER BY t.data_platii DESC LIMIT 1), ( SELECT t.data_platii::text FROM tranzactii t WHERE p.id = ANY (t.plata_ids) ORDER BY t.data_platii DESC LIMIT 1)) AS data_plata_string,
    COALESCE(( SELECT sum(tp.suma_alocata) FROM tranzactie_plata tp WHERE tp.plata_id = p.id), ( SELECT sum(LEAST(t.suma / cardinality(t.plata_ids)::numeric, COALESCE(p.suma, 0::numeric))) FROM tranzactii t WHERE p.id = ANY (t.plata_ids)), 0::numeric) AS suma_incasata,
    COALESCE(( SELECT t.metoda_plata FROM tranzactii t JOIN tranzactie_plata tp ON tp.tranzactie_id = t.id WHERE tp.plata_id = p.id ORDER BY t.data_platii DESC LIMIT 1), ( SELECT t.metoda_plata FROM tranzactii t WHERE p.id = ANY (t.plata_ids) ORDER BY t.data_platii DESC LIMIT 1)) AS metoda_plata,
    COALESCE(p.club_id, s.club_id) AS club_id
   FROM plati p LEFT JOIN sportivi s ON p.sportiv_id = s.id LEFT JOIN familii f ON p.familie_id = f.id
  WHERE COALESCE(p.club_id, s.club_id) = get_active_club_id() OR is_super_admin();
-- text copiat din pg_get_viewdef LIVE 18.11.2026 (compactat pe linii; semantica identica)

-- ===== Functii orfane sterse de f (fara trigger/apelant) =====
CREATE OR REPLACE FUNCTION public.on_tranzactie_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_plata_id UUID;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        FOREACH v_plata_id IN ARRAY NEW.plata_ids LOOP
            PERFORM public.recalculare_stare_plata(v_plata_id);
        END LOOP;
    END IF;
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        FOREACH v_plata_id IN ARRAY OLD.plata_ids LOOP
            PERFORM public.recalculare_stare_plata(v_plata_id);
        END LOOP;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_transaction_status()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NEW.suma_incasata >= NEW.suma_totala THEN
    NEW.status = 'ACHITAT';
  ELSIF NEW.suma_incasata > 0 THEN
    NEW.status = 'PARTIAL';
  ELSE
    NEW.status = 'NEACHITAT';
  END IF;
  RETURN NEW;
END;
$function$;

-- ===== Functii rescrise: definitiile live complete raman in transcriptul sesiunii si se re-captureaza cu
-- pg_get_functiondef in Task 3 inainte de apply (delete_exam_registration, proceseaza_plata_factura,
-- seteaza_scutire_taxa). Diferenta fata de live in f: doar scoaterea referintelor la tranzactii.plata_ids.
