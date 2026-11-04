-- Faza 35: nomenclator arme CVD + legaturi (sportiv_arme, competitie_sportiv_arme) + arma_id pe inlantuiri/inscrieri/echipe.
-- Re-rulabila (if not exists / drop policy if exists / on conflict do nothing).

create table if not exists public.arme (
  id uuid primary key default gen_random_uuid(),
  denumire text not null unique,
  tip text not null check (tip in ('lemn','lama','articulata')),
  ordine int not null default 0,
  activ boolean not null default true
);

insert into public.arme (denumire, tip, ordine) values
  ('Bong','lemn',510), ('Song Cot','lemn',530), ('Moc Can','lemn',540), ('Moc Guom','lemn',550),
  ('Song Diep Dao','lama',560), ('Yen Dao','lama',570), ('Ma Dao','lama',580), ('Dai Dao','lama',590),
  ('Long Gian','articulata',520), ('2 Long Gian','articulata',600), ('Tam Thiet Gian','articulata',610), ('Nhuyen Tien','articulata',620)
on conflict do nothing;

create table if not exists public.sportiv_arme (
  sportiv_id uuid not null references public.sportivi(id) on delete cascade,
  arma_id uuid not null references public.arme(id),
  primary key (sportiv_id, arma_id)
);

create table if not exists public.competitie_sportiv_arme (
  competitie_id uuid not null references public.competitii(id) on delete cascade,
  sportiv_id uuid not null references public.sportivi(id) on delete cascade,
  arma_id uuid not null references public.arme(id),
  primary key (competitie_id, sportiv_id, arma_id)
);

alter table public.inlantuiri add column if not exists arma_id uuid references public.arme(id);
alter table public.inscrieri_competitie add column if not exists arma_id uuid references public.arme(id);
alter table public.echipe_competitie add column if not exists arma_id uuid references public.arme(id);

-- Backfill: arma cu denumirea cea mai lunga continuta (case-insensitive, pe cuvinte) in denumirea formei.
update public.inlantuiri i
set arma_id = (
  select a.id from public.arme a
  where i.denumire ~* ('(^|[^[:alnum:]])' || a.denumire || '([^[:alnum:]]|$)')
  order by length(a.denumire) desc
  limit 1
)
where i.categorie in ('thao_lo_bong','thao_lo_guom','thao_lo_dao','thao_lo_alte','song_luyen')
  and i.arma_id is null
  and i.denumire not ilike 'Phuc Su Dao%'
  and i.denumire not ilike 'Cuu Khuc%';

-- Decis de utilizator (4.11.2026): Phuc Su Dao = Ma Dao; Cuu Khuc = lant (Nhuyen Tien).
update public.inlantuiri i
set arma_id = (select id from public.arme where denumire = case when i.denumire ilike 'Phuc Su Dao%' then 'Ma Dao' else 'Nhuyen Tien' end)
where i.arma_id is null and (i.denumire ilike 'Phuc Su Dao%' or i.denumire ilike 'Cuu Khuc%');

-- Backfill inscrieri CVD existente: arma din forma aleasa (idempotent). echipe_competitie: decizie manuala.
update public.inscrieri_competitie ic
set arma_id = i.arma_id
from public.inlantuiri i
where ic.inlantuire_id = i.id
  and ic.arma_id is null
  and i.arma_id is not null
  and exists (select 1 from public.competitii c where c.id = ic.competitie_id and c.tip = 'cvd');

-- RLS
alter table public.arme enable row level security;
alter table public.sportiv_arme enable row level security;
alter table public.competitie_sportiv_arme enable row level security;

drop policy if exists arme_select on public.arme;
drop policy if exists arme_write_federatie on public.arme;
create policy arme_select on public.arme for select to authenticated using (true);
create policy arme_write_federatie on public.arme for all to authenticated
  using (public.get_active_role() = 'SUPER_ADMIN_FEDERATIE')
  with check (public.get_active_role() = 'SUPER_ADMIN_FEDERATIE');

drop policy if exists sportiv_arme_select on public.sportiv_arme;
drop policy if exists sportiv_arme_insert on public.sportiv_arme;
drop policy if exists sportiv_arme_update on public.sportiv_arme;
drop policy if exists sportiv_arme_delete on public.sportiv_arme;
create policy sportiv_arme_select on public.sportiv_arme for select to authenticated
  using (exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id)));
create policy sportiv_arme_insert on public.sportiv_arme for insert to authenticated
  with check (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'));
create policy sportiv_arme_update on public.sportiv_arme for update to authenticated
  using (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'))
  with check (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'));
create policy sportiv_arme_delete on public.sportiv_arme for delete to authenticated
  using (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB'));

drop policy if exists csa_select on public.competitie_sportiv_arme;
drop policy if exists csa_insert on public.competitie_sportiv_arme;
drop policy if exists csa_update on public.competitie_sportiv_arme;
drop policy if exists csa_delete on public.competitie_sportiv_arme;
create policy csa_select on public.competitie_sportiv_arme for select to authenticated
  using (exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id)));
create policy csa_insert on public.competitie_sportiv_arme for insert to authenticated
  with check (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB')
    and exists (select 1 from public.competitii c where c.id = competitie_id and c.status = 'inscrieri_deschise'));
create policy csa_update on public.competitie_sportiv_arme for update to authenticated
  using (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB')
    and exists (select 1 from public.competitii c where c.id = competitie_id and c.status = 'inscrieri_deschise'))
  with check (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB')
    and exists (select 1 from public.competitii c where c.id = competitie_id and c.status = 'inscrieri_deschise'));
create policy csa_delete on public.competitie_sportiv_arme for delete to authenticated
  using (
    exists (select 1 from public.sportivi s where s.id = sportiv_id and public.has_access_to_club(s.club_id))
    and public.get_active_role() in ('SUPER_ADMIN_FEDERATIE','ADMIN_CLUB')
    and exists (select 1 from public.competitii c where c.id = competitie_id and c.status = 'inscrieri_deschise'));

-- Indexuri pe FK-urile arma_id (PK-urile acopera deja sportiv_id / competitie_id in frunte).
create index if not exists sportiv_arme_arma_id_idx on public.sportiv_arme (arma_id);
create index if not exists competitie_sportiv_arme_arma_id_idx on public.competitie_sportiv_arme (arma_id);
create index if not exists inlantuiri_arma_id_idx on public.inlantuiri (arma_id);
create index if not exists inscrieri_competitie_arma_id_idx on public.inscrieri_competitie (arma_id);
create index if not exists echipe_competitie_arma_id_idx on public.echipe_competitie (arma_id);
