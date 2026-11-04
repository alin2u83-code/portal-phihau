-- Dispozitiv de incredere: 30 zile glisante (se reinnoieste la fiecare folosire), eticheta pentru lista din Setari cont,
-- listare + revocare individuala. Max 5 dispozitive/utilizator ramane.

alter table public.mfa_dispozitive_incredere add column if not exists eticheta text;

drop function if exists public.inregistreaza_dispozitiv_incredere();

create or replace function public.inregistreaza_dispozitiv_incredere(p_eticheta text default null)
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
    insert into public.mfa_dispozitive_incredere (user_id, token_hash, expira_la, eticheta)
    values (v_user, encode(sha256(convert_to(v_token, 'utf8')), 'hex'), now() + interval '30 days', left(p_eticheta, 120));
    return v_token;
end;
$function$;

-- Reinnoieste si expirarea dispozitivului (glisant): 30 zile de la ultima folosire.
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
    update public.mfa_dispozitive_incredere
    set ultima_folosire = now(), expira_la = now() + interval '30 days'
    where id = v_id;
    insert into public.mfa_email_verificari (user_id, verificat_pana)
    values (v_user, now() + interval '12 hours')
    on conflict (user_id) do update set verificat_pana = excluded.verificat_pana;
    return true;
end;
$function$;

-- Lista dispozitivelor proprii (fara hash). `curent` se calculeaza in client din token.
create or replace function public.listeaza_dispozitive_incredere(p_token text default null)
returns table (id uuid, eticheta text, creat_la timestamptz, ultima_folosire timestamptz, expira_la timestamptz, curent boolean)
language sql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
    select d.id, d.eticheta, d.creat_la, d.ultima_folosire, d.expira_la,
           (p_token is not null and d.token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')) as curent
    from public.mfa_dispozitive_incredere d
    where d.user_id = auth.uid() and d.expira_la > now()
    order by d.ultima_folosire desc nulls last, d.creat_la desc;
$function$;

create or replace function public.revoca_dispozitiv_incredere(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
    if auth.uid() is null then
        return;
    end if;
    delete from public.mfa_dispozitive_incredere where id = p_id and user_id = auth.uid();
end;
$function$;

revoke all on function public.inregistreaza_dispozitiv_incredere(text) from public, anon;
revoke all on function public.listeaza_dispozitive_incredere(text) from public, anon;
revoke all on function public.revoca_dispozitiv_incredere(uuid) from public, anon;
grant execute on function public.inregistreaza_dispozitiv_incredere(text) to authenticated;
grant execute on function public.listeaza_dispozitive_incredere(text) to authenticated;
grant execute on function public.revoca_dispozitiv_incredere(uuid) to authenticated;
