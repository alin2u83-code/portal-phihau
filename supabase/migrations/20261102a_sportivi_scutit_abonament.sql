-- 20261102a — sportiv scutit de abonament (personal club: admin/instructor care conduce antrenamentele).
-- Nu i se genereaza factura de abonament lunara; ramane sportiv cu fisa, deci costurile catre federatie
-- (decont_sportivi / taxe anuale, legate de sportiv_id) raman neschimbate.
-- Default false: nu schimba comportamentul existent.
alter table public.sportivi
    add column if not exists scutit_abonament boolean not null default false;
