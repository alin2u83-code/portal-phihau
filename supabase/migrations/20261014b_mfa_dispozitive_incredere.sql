-- Dispozitiv de incredere pentru MFA (cod email): dupa un cod reusit, dispozitivul nu mai cere cod 7 zile.
-- Tokenul e generat pe server si returnat O SINGURA DATA; in DB se pastreaza doar hash-ul sha256.
-- Tabela nu are politici RLS => accesibila doar prin RPC-urile SECURITY DEFINER de mai jos.

create table if not exists public.mfa_dispozitive_incredere (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    token_hash text not null,
    expira_la timestamptz not null,
    creat_la timestamptz not null default now(),
    ultima_folosire timestamptz
);
create unique index if not exists mfa_dispozitive_incredere_hash_uq on public.mfa_dispozitive_incredere (token_hash);
create index if not exists mfa_dispozitive_incredere_user_idx on public.mfa_dispozitive_incredere (user_id);

alter table public.mfa_dispozitive_incredere enable row level security;
revoke all on public.mfa_dispozitive_incredere from anon, authenticated;

-- Inregistreaza dispozitivul curent; cere un cod MFA valid (verificat_pana in viitor). Max 5 dispozitive/utilizator.
create or replace function public.inregistreaza_dispozitiv_incredere()
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
    v_user uuid := auth.uid();
    v_token text;
begin
    if v_user is null then
        raise exception 'Neautentificat' using errcode = '42501';
    end if;
    if not exists (select 1 from public.mfa_email_verificari where user_id = v_user and verificat_pana > now()) then
        raise exception 'Verificare MFA necesara' using errcode = '42501';
    end if;

    delete from public.mfa_dispozitive_incredere where user_id = v_user and expira_la <= now();
    delete from public.mfa_dispozitive_incredere
    where id in (select id from public.mfa_dispozitive_incredere where user_id = v_user order by creat_la desc offset 4);

    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.mfa_dispozitive_incredere (user_id, token_hash, expira_la)
    values (v_user, encode(sha256(convert_to(v_token, 'utf8')), 'hex'), now() + interval '7 days');
    return v_token;
end;
$function$;

-- Verifica tokenul dispozitivului; daca e valid, reinnoieste fereastra MFA (12h) ca verificarile urmatoare sa fie ieftine.
create or replace function public.verifica_dispozitiv_incredere(p_token text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
    v_user uuid := auth.uid();
    v_id uuid;
begin
    if v_user is null or p_token is null or length(p_token) < 32 then
        return false;
    end if;
    select id into v_id from public.mfa_dispozitive_incredere
    where user_id = v_user
      and token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')
      and expira_la > now();
    if v_id is null then
        return false;
    end if;
    update public.mfa_dispozitive_incredere set ultima_folosire = now() where id = v_id;
    insert into public.mfa_email_verificari (user_id, verificat_pana)
    values (v_user, now() + interval '12 hours')
    on conflict (user_id) do update set verificat_pana = excluded.verificat_pana;
    return true;
end;
$function$;

-- Revoca toate dispozitivele de incredere ale utilizatorului (ex. dupa schimbarea parolei).
create or replace function public.revoca_dispozitive_incredere()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
    if auth.uid() is null then
        return;
    end if;
    delete from public.mfa_dispozitive_incredere where user_id = auth.uid();
end;
$function$;

revoke all on function public.inregistreaza_dispozitiv_incredere() from public, anon;
revoke all on function public.verifica_dispozitiv_incredere(text) from public, anon;
revoke all on function public.revoca_dispozitive_incredere() from public, anon;
grant execute on function public.inregistreaza_dispozitiv_incredere() to authenticated;
grant execute on function public.verifica_dispozitiv_incredere(text) to authenticated;
grant execute on function public.revoca_dispozitive_incredere() to authenticated;
