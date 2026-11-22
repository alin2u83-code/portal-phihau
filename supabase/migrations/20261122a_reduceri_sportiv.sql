-- 20261122a — Reduceri pe sportiv (3NF) + reduceri izolate pe club
-- Problema: `reduceri` era catalog global (club_id NULL, RLS doar "staff autorizat" fara club) iar
-- formularele aplicau prima reducere activa la ORICE sportiv. Nu exista legatura sportiv<->reducere.
-- Solutie: tabela de legatura `reduceri_sportiv` (o singura reducere ACTIVA pe sportiv), reduceri cu club_id obligatoriu.
-- Club-ul reducerii-sportiv nu se stocheaza (se deduce din sportivi.club_id) -> fara denormalizare.
--
-- ROLLBACK (manual):
--   drop table public.reduceri_sportiv;
--   drop trigger reduceri_completeaza_club_id_trg on public.reduceri; drop function public.reduceri_completeaza_club_id();
--   alter table public.reduceri alter column club_id drop not null;
--   drop policy reduceri_club_select on public.reduceri; drop policy reduceri_club_write on public.reduceri;
--   create policy "Staff_Full_Access" on public.reduceri for all to authenticated using (public.este_staff_autorizat());
--   (randurile originale ANDRICIUC / LUNGU CILIAC raman; club_id poate fi pus inapoi NULL)

-- 1) reduceri: club_id obligatoriu (backfill pe clubul Phi Hau — singurele 2 randuri existente)
update public.reduceri set club_id = 'cbb0b228-b3e0-4735-9658-70999eb256c6' where club_id is null;

create or replace function public.reduceri_completeaza_club_id() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.club_id is null then
    new.club_id := public.get_active_club_id();
  end if;
  if new.club_id is null then
    raise exception 'club_id lipsa: alege clubul pentru reducere' using errcode = '23502';
  end if;
  return new;
end $$;

drop trigger if exists reduceri_completeaza_club_id_trg on public.reduceri;
create trigger reduceri_completeaza_club_id_trg before insert on public.reduceri
  for each row execute function public.reduceri_completeaza_club_id();

alter table public.reduceri alter column club_id set not null;

-- 2) RLS reduceri: izolat pe club (super admin vede tot)
drop policy if exists "Staff_Full_Access" on public.reduceri;
create policy reduceri_club_select on public.reduceri for select to authenticated
  using (public.is_super_admin() or (public.este_staff_autorizat() and club_id = public.get_active_club_id()));
create policy reduceri_club_write on public.reduceri for all to authenticated
  using (public.is_super_admin() or (public.este_staff_autorizat() and club_id = public.get_active_club_id()))
  with check (public.is_super_admin() or (public.este_staff_autorizat() and club_id = public.get_active_club_id()));

revoke all on public.reduceri from anon;

-- 3) reduceri_sportiv: legatura sportiv <-> reducere
create table public.reduceri_sportiv (
  id uuid primary key default gen_random_uuid(),
  sportiv_id uuid not null references public.sportivi(id) on delete cascade,
  reducere_id uuid not null references public.reduceri(id) on delete cascade,
  este_activa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sportiv_id, reducere_id)
);
-- cel mult o reducere activa pe sportiv
create unique index reduceri_sportiv_o_activa_idx on public.reduceri_sportiv (sportiv_id) where este_activa;
create index reduceri_sportiv_reducere_idx on public.reduceri_sportiv (reducere_id);

alter table public.reduceri_sportiv enable row level security;

create policy reduceri_sportiv_club on public.reduceri_sportiv for all to authenticated
  using (
    public.is_super_admin()
    or (public.este_staff_autorizat() and exists (
          select 1 from public.sportivi s where s.id = sportiv_id and s.club_id = public.get_active_club_id()))
  )
  with check (
    -- sportivul si reducerea trebuie sa fie din acelasi club (si din clubul activ, daca nu e super admin)
    exists (select 1 from public.sportivi s join public.reduceri r on r.id = reducere_id
            where s.id = sportiv_id and s.club_id = r.club_id)
    and (public.is_super_admin() or (public.este_staff_autorizat()
         and exists (select 1 from public.sportivi s where s.id = sportiv_id and s.club_id = public.get_active_club_id())))
  );

create policy ext_r_deny_all on public.reduceri_sportiv as restrictive for all to authenticated
  using (not (select public.este_doar_extern()))
  with check (not (select public.este_doar_extern()));

revoke all on public.reduceri_sportiv from anon;

-- 4) Date existente: LUNGU CILIAC (100%) -> Casian ; ANDRICIUC (30 lei) -> Sonia (reducerea se aplica pe abonamentul de familie)
insert into public.reduceri_sportiv (sportiv_id, reducere_id)
select '337c41e3-67d2-4aef-953e-b5fe190b0748'::uuid, r.id from public.reduceri r where r.nume = 'LUNGU CILIAC'
union all
select 'e2c6b267-3cbb-4fbc-9587-327234727c9a'::uuid, r.id from public.reduceri r where r.nume = 'ANDRICIUC';
