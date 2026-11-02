-- Stagii nationale Co Vo Dao necesare per grad (Anexa 1, circulara CN CVD Roman 2026).
-- Informativ: nu e folosit la validarea inscrierilor. grade.ordine: 15=1 CAP ... 19=C.N. ... 24=5 Dang.
create table if not exists public.cerinte_stagii_cvd (
  id uuid primary key default gen_random_uuid(),
  grad_min_ordine int not null,
  grad_max_ordine int not null,
  stagii_nationale int not null,
  stagii_thay_chuong_mon int not null default 0,
  created_at timestamptz default now(),
  unique (grad_min_ordine, grad_max_ordine)
);

alter table public.cerinte_stagii_cvd enable row level security;

create policy cerinte_stagii_cvd_select_all on public.cerinte_stagii_cvd for select using (true);
create policy cerinte_stagii_cvd_write_federatie on public.cerinte_stagii_cvd for all
  using (exists (select 1 from public.utilizator_roluri_multicont u where u.user_id = auth.uid() and u.rol_denumire = 'SUPER_ADMIN_FEDERATIE'))
  with check (exists (select 1 from public.utilizator_roluri_multicont u where u.user_id = auth.uid() and u.rol_denumire = 'SUPER_ADMIN_FEDERATIE'));

insert into public.cerinte_stagii_cvd (grad_min_ordine, grad_max_ordine, stagii_nationale, stagii_thay_chuong_mon) values
  (15, 17, 1, 0),  -- 1-3 CAP Albastru
  (18, 18, 2, 0),  -- 4 CAP Albastru
  (19, 20, 3, 1),  -- C.N. - C.N. 1 Dang
  (21, 24, 5, 2)   -- C.N. 2 Dang - C.N. 5 Dang
on conflict do nothing;
