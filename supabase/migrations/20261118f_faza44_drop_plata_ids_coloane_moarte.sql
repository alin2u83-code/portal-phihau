-- Faza 44 (44-10): eliminare tranzactii.plata_ids (D-02) si coloane moarte (SC-01)
-- NEAPLICATA, se aplica in 44-10 Task 3 dupa OK explicit si dupa ce codul 44-04/06/08 e in productie.
-- supabase/ e in .gitignore, deci git add -f.
--
-- Coloane eliminate:
--   tranzactii.plata_ids      duplicat invechit al tranzactie_plata (D-02; 117 din 400 difereau la audit)
--   tranzactii.suma_totala    toate randurile 0 (re-masurat in dry-run)
--   tranzactii.suma_incasata  toate randurile 0
--   plati.tip_plata           constanta 'Abonament' pe toate randurile, fara FK, zero cod
--   plati.tip_abonament_id    toate NULL, zero cod pe plati (tip_abonament_id din cod apartine sportivi)
-- NU se elimina plati.tip_plata_id (abatere de la SC-01 Y): e SCRISA de cod (services/comenziService.ts:536,
-- services/produseService.ts:221, VanzareModal, PredareModal) la vanzarile de echipamente; dead-column proof din
-- planul 44-10 o exclude cand exista o referinta reala. Decizia ramane la utilizator.
--
-- Obiecte rescrise din definitia LIVE (vezi rollback/44-10-before.sql):
--   functii: delete_exam_registration, proceseaza_plata_factura, seteaza_scutire_taxa (garzi, SECURITY DEFINER,
--            search_path si ACL neschimbate; doar referintele la plata_ids scoase)
--   view-uri: view_istoric_plati_detaliat (ramurile de fallback pe plata_ids scoase, aceleasi coloane),
--            rbv_plati_club, vedere_cluburi_plati (fara tip_plata si tip_abonament_id), vedere_cluburi_tranzactii
--            (fara plata_ids/suma_totala/suma_incasata), vedere_cluburi_financiar (categorie_detaliu din plati.tip,
--            nu din constanta tip_plata), view_plata_sportiv (coloana tip_plata din plati.tip). Toate cu
--            security_invoker = true si ACL identic cu cel live. Un view care pierde coloane nu se poate inlocui cu
--            CREATE OR REPLACE: DROP VIEW (fara CASCADE; fara view-uri dependente, verificat) + CREATE VIEW.
--   functii orfane sterse (fara trigger, fara apelant in cod/cron/edge): on_tranzactie_change(),
--            update_transaction_status(); definitiile raman in rollback/44-10-before.sql.
-- Nicio denormalizare introdusa. Fara CASCADE.
--
-- Atomicitate: tot ruleaza intr-un singur bloc DO (o eroare anuleaza tot, inclusiv suspendarea triggerului).
-- Plasa pentru taburi vechi: la inceput se repeta alocarea migrarii B pentru tranzactii cu plata_ids si fara
-- tranzactie_plata (cu cel putin o factura existenta), apoi se verifica ca nu mai ramane niciuna.
--
-- Dry-run 18.11.2026 (rollback fortat, baza reala): migrarea ruleaza cap-coada fara eroare; dupa ea: 5 coloane disparute,
-- 2 functii orfane sterse, 6 view-uri cu security_invoker=true, trigger tranzactie_plata_change_trigger 'O',
-- numaratori neschimbate (plati 978, tranzactii 400, tranzactie_plata 412), 0 alocari inserate de plasa (a),
-- coloanele view_istoric/vedere_cluburi_istoric identice. NEVERIFICAT: egalitatea continutului view_istoric (0 randuri
-- vizibile rolului MCP, RLS); se verifica in Task 3 cu un rol real. Dupa rollback: 5 coloane inca prezente.

do $mig$
declare
  r record;
  ids uuid[];
  i int;
  pid uuid;
  rem numeric;
  cap numeric;
  a numeric;
  v_id uuid;
  v_n int;
begin
  -- (a) plasa de siguranta: alocari pentru tranzactii array-only aparute dupa migrarea B
  create table if not exists backup_faza44.faza44_b_inserate (
    tp_key text, tranzactie_id uuid, plata_id uuid, suma_alocata numeric, inserat_la timestamptz default now()
  );
  create table if not exists backup_faza44.faza44_b_nealocat (
    tranzactie_id uuid, suma_nealocata numeric, inserat_la timestamptz default now()
  );
  alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;
  for r in
    select t.id, t.suma, t.plata_ids
    from public.tranzactii t
    where coalesce(array_length(t.plata_ids, 1), 0) > 0
      and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
    order by t.created_at, t.id
  loop
    ids := array(
      select u.e from unnest(r.plata_ids) with ordinality as u(e, o)
      where exists (select 1 from public.plati p where p.id = u.e) order by u.o);
    rem := r.suma;
    for i in 1..coalesce(array_length(ids, 1), 0) loop
      exit when rem <= 0;
      pid := ids[i];
      select greatest(p.suma - coalesce((select sum(tp.suma_alocata) from public.tranzactie_plata tp where tp.plata_id = p.id), 0), 0)
        into cap from public.plati p where p.id = pid;
      a := least(rem, coalesce(cap, 0));
      if a > 0 then
        insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata) values (r.id, pid, a) returning id into v_id;
        insert into backup_faza44.faza44_b_inserate (tp_key, tranzactie_id, plata_id, suma_alocata) values (v_id::text, r.id, pid, a);
        rem := rem - a;
      end if;
    end loop;
    if coalesce(array_length(ids, 1), 0) > 0 and rem > 0.005 then
      insert into backup_faza44.faza44_b_nealocat (tranzactie_id, suma_nealocata) values (r.id, rem);
    end if;
  end loop;
  alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;

  select count(*) into v_n from public.tranzactii t
   where coalesce(array_length(t.plata_ids, 1), 0) > 0
     and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
     and exists (select 1 from public.plati p where p.id = any (t.plata_ids))
     and not exists (select 1 from backup_faza44.faza44_b_nealocat n where n.tranzactie_id = t.id);
  if v_n > 0 then
    raise exception 'Faza 44 f: % tranzactii array-only fara alocari ramase', v_n;
  end if;

  -- (b) functii rescrise din definitia live (doar referintele la plata_ids scoase)
  create or replace function public.delete_exam_registration(p_inscriere_id uuid)
   returns json
   language plpgsql
   security definer
   set search_path to 'public'
  as $fn$
  declare
      v_inscriere       record;
      v_plata           record;
      v_deleted_plata   uuid := null;
      v_has_tranzactii  boolean := false;
  begin
      select ie.*, s.club_id as sportiv_club_id
      into v_inscriere
      from public.inscrieri_examene ie
      join public.sportivi s on s.id = ie.sportiv_id
      where ie.id = p_inscriere_id;

      if not found then
          raise exception 'Înscrierea nu a fost găsită (id: %).', p_inscriere_id;
      end if;

      if not (public.has_access_to_club(v_inscriere.sportiv_club_id) or public.is_super_admin()) then
          raise exception 'Nu aveți permisiunea de a șterge această înscriere.';
      end if;

      if v_inscriere.plata_id is not null then
          select * into v_plata
          from public.plati
          where id = v_inscriere.plata_id;

          if found and v_plata.status != 'Achitat' then
              select exists(
                  select 1 from public.tranzactie_plata tp where tp.plata_id = v_plata.id
              ) into v_has_tranzactii;

              if not v_has_tranzactii then
                  v_deleted_plata := v_plata.id;
              end if;
          end if;
      end if;

      if v_deleted_plata is not null then
          update public.inscrieri_examene set plata_id = null where id = p_inscriere_id;
      end if;

      delete from public.inscrieri_examene where id = p_inscriere_id;

      if v_deleted_plata is not null then
          delete from public.plati where id = v_deleted_plata;
      end if;

      return json_build_object(
          'success',          true,
          'deleted_plata_id', v_deleted_plata,
          'message',          case
                                  when v_deleted_plata is not null
                                  then 'Înscrierea și factura asociată au fost șterse cu succes.'
                                  else 'Înscrierea a fost retrasă cu succes.'
                              end
      );
  end;
  $fn$;

  create or replace function public.proceseaza_plata_factura(p_plata_id uuid, p_suma_incasata numeric, p_metoda_plata text, p_data_plata date default current_date, p_descriere_aditionala text default null::text)
   returns jsonb
   language plpgsql
   security definer
   set search_path to 'public', 'pg_catalog'
  as $fn$
  declare
      v_plata record;
      v_club_id uuid;
      v_total_incasat numeric;
      v_status_nou text;
      v_tranzactie_id uuid;
  begin
      if p_suma_incasata is null or p_suma_incasata <= 0 then
          raise exception 'Suma incasata trebuie sa fie pozitiva' using errcode = '22023';
      end if;

      select * into v_plata from public.plati where id = p_plata_id for update;
      if not found then
          raise exception 'Factura inexistenta' using errcode = 'P0002';
      end if;

      v_club_id := coalesce(v_plata.club_id, (select s.club_id from public.sportivi s where s.id = v_plata.sportiv_id));

      if not public.has_access_to_club(v_club_id) then
          raise exception 'Acces refuzat la factura' using errcode = '42501';
      end if;

      select coalesce(sum(suma_alocata), 0) + p_suma_incasata into v_total_incasat
      from public.tranzactie_plata where plata_id = p_plata_id;

      v_status_nou := case
          when v_total_incasat >= v_plata.suma then 'Achitat'
          when v_total_incasat > 0 then 'Achitat Parțial'
          else 'Neachitat'
      end;

      insert into public.tranzactii (sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id)
      values (v_plata.sportiv_id, v_plata.familie_id, p_suma_incasata, p_data_plata, p_metoda_plata, v_club_id)
      returning id into v_tranzactie_id;

      insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
      values (v_tranzactie_id, p_plata_id, p_suma_incasata);

      update public.plati set status = v_status_nou where id = p_plata_id;

      return jsonb_build_object('success', true, 'status_nou', v_status_nou, 'tranzactie_id', v_tranzactie_id);
  end;
  $fn$;

  create or replace function public.seteaza_scutire_taxa(p_sportiv_id uuid, p_tip text, p_an integer, p_scutit boolean, p_motiv text default null::text)
   returns jsonb
   language plpgsql
   security definer
   set search_path to 'public', 'pg_temp'
  as $fn$
  declare
    v record; v_club uuid; v_pl record; v_anulata uuid; v_plata uuid;
  begin
    if p_tip is null or p_tip not in ('FRQKD','FRAM') then
      raise exception 'Tip de taxă invalid' using errcode = '22023';
    end if;
    if p_an is null or p_an < 2020 or p_an > 2100 then
      raise exception 'An invalid' using errcode = '22023';
    end if;
    if coalesce(p_scutit, false) and btrim(coalesce(p_motiv, '')) = '' then
      raise exception 'Motivul scutirii este obligatoriu' using errcode = '22023';
    end if;
    if length(coalesce(p_motiv, '')) > 500 then
      raise exception 'Motivul scutirii este prea lung (maxim 500 de caractere)' using errcode = '22023';
    end if;

    select * into v from public.vize_sportivi where sportiv_id = p_sportiv_id and an = p_an and tip = p_tip for update;
    if found then
      v_club := v.club_id;
    else
      select club_id into v_club from public.sportivi where id = p_sportiv_id;
      if not found then raise exception 'Sportiv inexistent' using errcode = 'P0002'; end if;
    end if;
    if v_club is null or not public.poate_gestiona_taxe_club(v_club) then
      raise exception 'Acces refuzat: taxa aparține altui club' using errcode = '42501';
    end if;

    if coalesce(p_scutit, false) then
      if exists (select 1 from public.decont_sportivi where sportiv_id = p_sportiv_id and an = p_an and tip = p_tip) then
        raise exception 'Taxa a fost deja virată federației — scutirea nu mai este posibilă' using errcode = 'P0001';
      end if;
      if v.id is not null and v.plata_id is not null then
        select id, status into v_pl from public.plati where id = v.plata_id;
        if v_pl.id is not null then
          if v_pl.status in ('Achitat', 'Achitat Parțial')
             or exists (select 1 from public.tranzactie_plata tp where tp.plata_id = v_pl.id) then
            raise exception 'Factura taxei are încasări — anulează întâi încasarea' using errcode = 'P0001';
          end if;
          if v_pl.status <> 'Anulat' then
            update public.plati set status = 'Anulat' where id = v_pl.id;
            v_anulata := v_pl.id;
          end if;
        end if;
      end if;
      if v.id is null then
        insert into public.vize_sportivi (sportiv_id, an, tip, club_id, status_viza, data_platii, scutit, motiv_scutire, scutit_de, scutit_la)
        values (p_sportiv_id, p_an, p_tip, v_club, 'Activ', current_date, true, btrim(p_motiv), auth.uid(), now());
      else
        update public.vize_sportivi
           set scutit = true, motiv_scutire = btrim(p_motiv), scutit_de = auth.uid(), scutit_la = now()
         where id = v.id;
      end if;
      return jsonb_build_object('stare', 'scutit', 'plata_id', null, 'plata_anulata_id', v_anulata);
    end if;

    if v.id is null or not v.scutit then
      return jsonb_build_object('stare', case when v.id is null then 'negenerata' when v.plata_id is null then 'in_asteptare' else 'facturat' end,
                                'plata_id', v.plata_id, 'plata_anulata_id', null);
    end if;
    update public.vize_sportivi
       set scutit = false, motiv_scutire = null, scutit_de = null, scutit_la = null, plata_id = null
     where id = v.id;
    v_plata := public.factureaza_viza_taxa(v.id);
    return jsonb_build_object('stare', case when v_plata is null then 'in_asteptare' else 'facturat' end,
                              'plata_id', v_plata, 'plata_anulata_id', null);
  end;
  $fn$;

  -- functii orfane (fara trigger, fara apelant)
  drop function public.on_tranzactie_change();
  drop function public.update_transaction_status();

  -- (c) view-uri: tot din definitia live, fara coloanele eliminate
  create or replace view public.view_istoric_plati_detaliat with (security_invoker = true) as
   select p.id as plata_id,
      p.sportiv_id,
      p.familie_id,
          case
              when s.id is not null then (s.nume || ' '::text) || s.prenume
              when f.id is not null then f.nume
              else null::text
          end as nume_complet_sportiv,
      p.descriere,
      coalesce(p.suma, 0::numeric) as suma_datorata,
      p.status,
      p.data::text as data_emitere,
      coalesce(( select sum(tp.suma_alocata) as sum
             from tranzactie_plata tp
            where tp.plata_id = p.id), 0::numeric) as total_incasat,
      greatest(coalesce(p.suma, 0::numeric) - coalesce(( select sum(tp.suma_alocata) as sum
             from tranzactie_plata tp
            where tp.plata_id = p.id), 0::numeric), 0::numeric) as rest_de_plata,
      ( select t.id
             from tranzactii t
               join tranzactie_plata tp on tp.tranzactie_id = t.id
            where tp.plata_id = p.id
            order by t.data_platii desc
           limit 1) as tranzactie_id,
      ( select t.data_platii::text as data_platii
             from tranzactii t
               join tranzactie_plata tp on tp.tranzactie_id = t.id
            where tp.plata_id = p.id
            order by t.data_platii desc
           limit 1) as data_plata_string,
      coalesce(( select sum(tp.suma_alocata) as sum
             from tranzactie_plata tp
            where tp.plata_id = p.id), 0::numeric) as suma_incasata,
      ( select t.metoda_plata
             from tranzactii t
               join tranzactie_plata tp on tp.tranzactie_id = t.id
            where tp.plata_id = p.id
            order by t.data_platii desc
           limit 1) as metoda_plata,
      coalesce(p.club_id, s.club_id) as club_id
     from plati p
       left join sportivi s on p.sportiv_id = s.id
       left join familii f on p.familie_id = f.id
    where coalesce(p.club_id, s.club_id) = get_active_club_id() or is_super_admin();

  drop view public.rbv_plati_club;
  create view public.rbv_plati_club with (security_invoker = true) as
   select p.id,
      p.sportiv_id,
      p.familie_id,
      p.suma,
      p.data,
      p.status,
      p.descriere,
      p.tip,
      p.observatii,
      p.created_at,
      p.examen_id,
      p.reducere_id,
      p.valoare_reducere,
      p.suma_initiala,
      p."descriereDetaliata",
      p."reducereDetalii",
      p.club_id,
      p.suma_ramasa,
      p.tip_plata_id,
      p.sesiune_id,
      p.luna,
      p.an,
      s.nume as sportiv_nume,
      s.prenume as sportiv_prenume,
      c.nume as club_nume,
      f.nume as familie_denumire
     from plati p
       left join sportivi s on p.sportiv_id = s.id
       left join cluburi c on coalesce(p.club_id, s.club_id) = c.id
       left join familii f on p.familie_id = f.id
    where has_access_to_club(coalesce(p.club_id, s.club_id)) or p.sportiv_id = (( select get_own_sportiv_id() as get_own_sportiv_id));
  revoke all on public.rbv_plati_club from public, anon, authenticated, service_role;
  grant all on public.rbv_plati_club to authenticated, service_role;

  drop view public.vedere_cluburi_plati;
  create view public.vedere_cluburi_plati with (security_invoker = true) as
   select id,
      sportiv_id,
      familie_id,
      suma,
      data,
      status,
      descriere,
      tip,
      observatii,
      created_at,
      examen_id,
      reducere_id,
      valoare_reducere,
      suma_initiala,
      "descriereDetaliata",
      "reducereDetalii",
      club_id,
      suma_ramasa,
      tip_plata_id
     from plati
    where club_id = get_active_club_id() or is_super_admin();
  revoke all on public.vedere_cluburi_plati from public, anon, authenticated, service_role;
  grant all on public.vedere_cluburi_plati to authenticated, service_role;

  drop view public.vedere_cluburi_tranzactii;
  create view public.vedere_cluburi_tranzactii with (security_invoker = true) as
   select id,
      sportiv_id,
      familie_id,
      suma,
      data_platii,
      metoda_plata,
      created_at,
      club_id
     from tranzactii
    where club_id = get_active_club_id() or is_super_admin();
  revoke all on public.vedere_cluburi_tranzactii from public, anon, authenticated, service_role;
  grant all on public.vedere_cluburi_tranzactii to authenticated, service_role;

  drop view public.vedere_cluburi_financiar;
  create view public.vedere_cluburi_financiar with (security_invoker = true) as
   select p.id as plata_id,
      p.suma,
      p.suma_ramasa,
      p.suma - p.suma_ramasa as suma_incasata,
      p.data as data_plata,
      extract(day from p.data) as zi,
      extract(month from p.data) as luna,
      p.status,
      s.nume as sportiv_nume,
      s.prenume as sportiv_prenume,
      p.club_id,
      p.tip as categorie_detaliu
     from plati p
       left join sportivi s on p.sportiv_id = s.id
    where p.club_id = get_active_club_id();
  revoke all on public.vedere_cluburi_financiar from public, anon, authenticated, service_role;
  grant all on public.vedere_cluburi_financiar to anon, authenticated, service_role;

  drop view public.view_plata_sportiv;
  create view public.view_plata_sportiv with (security_invoker = true) as
   select p.id as plata_id,
      p.sportiv_id,
      p.club_id,
      p.familie_id,
      p.data as data_emitere,
      p.data as data_plata,
      p.descriere,
      coalesce(p.suma_initiala, 0::numeric) as suma_datorata,
      coalesce(p.suma, 0::numeric) as suma_incasata,
      p.status,
      null::uuid as tranzactie_id,
      (s.nume || ' '::text) || s.prenume as nume_complet,
      p.tip as tip_plata,
      coalesce(p.valoare_reducere, 0::numeric) as valoare_reducere
     from plati p
       left join sportivi s on p.sportiv_id = s.id;
  revoke all on public.view_plata_sportiv from public, anon, authenticated, service_role;
  grant all on public.view_plata_sportiv to anon, authenticated, service_role;

  -- (d) garzi inainte de DROP COLUMN: niciun obiect dependent ramas, fara CASCADE
  select count(*) into v_n
    from pg_depend d
    join pg_attribute at on at.attrelid = d.refobjid and at.attnum = d.refobjsubid
   where d.refobjid in ('public.tranzactii'::regclass, 'public.plati'::regclass)
     and at.attname in ('plata_ids','suma_totala','suma_incasata','tip_plata','tip_abonament_id')
     and d.deptype = 'n'
     and d.classid <> 'pg_constraint'::regclass;
  if v_n > 0 then
    raise exception 'Faza 44 f: % dependente neasteptate pe coloanele de eliminat', v_n;
  end if;

  -- (e) coloane
  alter table public.tranzactii drop column plata_ids;
  alter table public.tranzactii drop column suma_totala;
  alter table public.tranzactii drop column suma_incasata;
  alter table public.plati drop column tip_plata;
  alter table public.plati drop column tip_abonament_id;

  notify pgrst, 'reload schema';
end $mig$;

-- Rollback (date): coloanele se re-adauga din backup_faza44.pre_drop_tranzactii / pre_drop_plati_tip (snapshot luat
-- in Task 3 inainte de apply), apoi functiile si view-urile se restaureaza din
-- .planning/phases/44-.../rollback/44-10-before.sql (DROP VIEW pe cele recreate, CREATE VIEW din fisier).
--   alter table public.tranzactii add column plata_ids uuid[], add column suma_totala numeric default 0, add column suma_incasata numeric default 0;
--   update public.tranzactii t set plata_ids = b.plata_ids, suma_totala = b.suma_totala, suma_incasata = b.suma_incasata
--     from backup_faza44.pre_drop_tranzactii b where b.id = t.id;
--   alter table public.plati add column tip_plata text default 'Abonament', add column tip_abonament_id uuid references public.tipuri_abonament(id);
--   update public.plati p set tip_plata = b.tip_plata, tip_abonament_id = b.tip_abonament_id from backup_faza44.pre_drop_plati_tip b where b.id = p.id;
--   (alocarile inserate de plasa (a) se sterg dupa id din backup_faza44.faza44_b_inserate)
