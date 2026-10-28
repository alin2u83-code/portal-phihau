-- 20261028a — setare per club: genereaza automat factura de abonament (luna curenta) la inscrierea unui sportiv nou.
-- Default false: nu schimba comportamentul existent.
alter table public.cluburi
    add column if not exists factura_automata_inscriere boolean not null default false;
