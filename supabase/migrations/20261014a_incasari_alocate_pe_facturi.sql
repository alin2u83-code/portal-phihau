-- Debug 14.10.2026: suma incasarilor (tranzactii) != lista facturi achitate.
--
-- Cauza: RPC proceseaza_plata_factura (butonul "Incaseaza" din Plati Scadente / Detaliu factura /
--        Gestiune facturi) insera in `tranzactii` cu plata_ids, dar NU scria `tranzactie_plata`.
--        Sumar Incasari citeste tranzactii; listele de facturi citesc tranzactie_plata => nu coincid.
--
-- 1) RPC scrie si alocarea in tranzactie_plata (statusul ramane cel calculat de RPC, aplicat DUPA insert,
--    pentru ca trigger-ul recalculeaza din suma_initiala si ar putea diferi la facturile cu reducere).
-- 2) Backfill alocari pentru tranzactiile fara tranzactie_plata (trigger suspendat in tranzactie; statusurile
--    facturilor NU se modifica). Idempotent. Alocare integrala (suma tranzactiei), ultima factura primeste restul.
-- 3) club_id lipsa pe tranzactii care au alocari: derivat din factura alocata.

begin;

create or replace function public.proceseaza_plata_factura(
    p_plata_id uuid, p_suma_incasata numeric, p_metoda_plata text,
    p_data_plata date default current_date, p_descriere_aditionala text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
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

    insert into public.tranzactii (plata_ids, sportiv_id, familie_id, suma, data_platii, metoda_plata, club_id)
    values (array[p_plata_id], v_plata.sportiv_id, v_plata.familie_id, p_suma_incasata, p_data_plata, p_metoda_plata, v_club_id)
    returning id into v_tranzactie_id;

    insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
    values (v_tranzactie_id, p_plata_id, p_suma_incasata);

    update public.plati set status = v_status_nou where id = p_plata_id;

    return jsonb_build_object('success', true, 'status_nou', v_status_nou, 'tranzactie_id', v_tranzactie_id);
end;
$function$;

-- 2) backfill
alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;

do $$
declare
  r record;
  i int;
  n int;
  pid uuid;
  rem numeric;
  cap numeric;
  a numeric;
begin
  for r in
    select t.id, t.suma, t.plata_ids
    from public.tranzactii t
    where coalesce(array_length(t.plata_ids, 1), 0) > 0
      and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
    order by t.created_at, t.id
  loop
    rem := r.suma;
    n := array_length(r.plata_ids, 1);
    for i in 1..n loop
      exit when rem <= 0;
      pid := r.plata_ids[i];
      if not exists (select 1 from public.plati where id = pid) then
        continue;
      end if;
      if i = n then
        a := rem;
      else
        select greatest(p.suma - coalesce((select sum(tp.suma_alocata) from public.tranzactie_plata tp where tp.plata_id = p.id), 0), 0)
          into cap from public.plati p where p.id = pid;
        a := least(rem, coalesce(cap, 0));
      end if;
      if a > 0 then
        insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata) values (r.id, pid, a);
        rem := rem - a;
      end if;
    end loop;
  end loop;
end $$;

alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;

-- 3) club_id din factura alocata
update public.tranzactii t
set club_id = x.club_id
from (
  select tp.tranzactie_id, min(coalesce(p.club_id, s.club_id)::text)::uuid as club_id
  from public.tranzactie_plata tp
  join public.plati p on p.id = tp.plata_id
  left join public.sportivi s on s.id = p.sportiv_id
  group by tp.tranzactie_id
  having count(distinct coalesce(p.club_id, s.club_id)) = 1
) x
where t.id = x.tranzactie_id and t.club_id is null and x.club_id is not null;

commit;
