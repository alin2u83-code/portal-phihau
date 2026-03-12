create table public.categorii (
  id uuid not null default gen_random_uuid (),
  denumire text not null,
  varsta_min integer not null,
  varsta_max integer not null,
  ordine_afisare integer not null,
  constraint categorii_pkey primary key (id)
) TABLESPACE pg_default;
