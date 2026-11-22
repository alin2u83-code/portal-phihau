-- 20261122c — RPC atomic pentru setarea reducerii unui sportiv
-- Inainte: clientul facea DELETE apoi INSERT (2 apeluri); daca INSERT-ul pica (ex. reducere din alt club), sportivul pierdea reducerea veche.
-- Acum: o singura functie = o singura tranzactie. SECURITY INVOKER (implicit) => RLS-ul apelantului se aplica
-- (reduceri_sportiv_club cere acelasi club pentru sportiv si reducere + has_access_to_club).
--
-- ROLLBACK: drop function public.seteaza_reducere_sportiv(uuid, uuid);

create or replace function public.seteaza_reducere_sportiv(p_sportiv_id uuid, p_reducere_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  delete from public.reduceri_sportiv where sportiv_id = p_sportiv_id;
  if p_reducere_id is not null then
    insert into public.reduceri_sportiv (sportiv_id, reducere_id) values (p_sportiv_id, p_reducere_id);
  end if;
end $$;

revoke all on function public.seteaza_reducere_sportiv(uuid, uuid) from public, anon;
grant execute on function public.seteaza_reducere_sportiv(uuid, uuid) to authenticated;
