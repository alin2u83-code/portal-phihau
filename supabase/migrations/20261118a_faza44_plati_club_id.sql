-- Faza 44 (44-03): plati.club_id
-- APLICATA LIVE 18.11.2026 (44-05, dupa OK explicit). supabase/ e in .gitignore, deci git add -f.
--
-- D-03: backfill plati.club_id din sportivi.club_id (rand cu sportiv) si din familii.club_id
-- (rand doar-familie, decizie user 17.11.2026); trigger BEFORE INSERT care completeaza club_id
-- pentru orice cale viitoare de insert (UI, RPC, bulk).
-- Randurile care raman fara club dupa ambele backfill-uri NU se ghicesc: raman NULL si sunt listate
-- pentru user in 44-07. SET NOT NULL NU e in aceasta migrare (plan 44-09, dupa deciziile userului).
--
-- Exceptie 3NF (singura din Faza 44): plati.club_id e derivabil din sportivi.club_id / familii.club_id.
-- Se pastreaza ca "clubul emitent la momentul facturii" (istoric imuabil daca sportivul se transfera)
-- si ca coloana dupa care filtreaza RLS/view-urile (rbv_plati_club, has_access_to_club).
--
-- Nu se modifica suma, status, suma_ramasa: plati_sync_suma_ramasa_trg se declanseaza doar pe
-- UPDATE OF suma, status; trg_plata_sms doar pe UPDATE OF status; audit_plati scrie doar randul de audit.
-- Functia trigger e SECURITY INVOKER intentionat: cautarile ruleaza sub RLS-ul apelantului, deci un apelant
-- nu poate afla/atribui clubul unui sportiv pe care nu-l vede; WITH CHECK-ul RLS pe plati se evalueaza dupa
-- trigger-ele BEFORE si valideaza club_id final.
--
-- Dry-run 18.11.2026 (rollback fortat, o singura tranzactie, baza reala): club_id NULL inainte 96
--   (90 derivabile din sportivi + 6 din familii.club_id), dupa 0; randuri schimbate 96; checksum plati
--   (id,suma,suma_initiala,status,suma_ramasa,tip,data,sportiv_id,familie_id) egal; trigger BEFORE INSERT
--   activ (tgenabled O); politici pe plati 7 inainte/dupa; insert test cu sportiv -> clubul sportivului,
--   insert fara sportiv/familie/club -> NULL, insert doar-familie -> familii.club_id; EXECUTE pe functie
--   false pentru anon si authenticated. Dupa rollback: plati 978, NULL 96, 0 randuri test, 0 trigger/functie.

create or replace function public.plati_completeaza_club_id()
returns trigger
language plpgsql
SET search_path = pg_catalog, public
as $function$
declare
  v_club uuid;
  v_n int;
begin
  if new.club_id is not null then
    return new;
  end if;

  if new.sportiv_id is not null then
    select s.club_id into v_club from public.sportivi s where s.id = new.sportiv_id;
  end if;

  if v_club is null and new.familie_id is not null then
    select f.club_id into v_club from public.familii f where f.id = new.familie_id;
    if v_club is null then
      -- clubul membrilor familiei, doar daca e o singura valoare (niciodata ghicit intre mai multe cluburi)
      select count(distinct s.club_id), min(s.club_id::text)::uuid
        into v_n, v_club
      from public.sportivi s
      where s.familie_id = new.familie_id and s.club_id is not null;
      if v_n <> 1 then
        v_club := null;
      end if;
    end if;
  end if;

  new.club_id := v_club;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.plati_completeaza_club_id() FROM PUBLIC, anon, authenticated;

drop trigger if exists plati_completeaza_club_id_trg on public.plati;
create trigger plati_completeaza_club_id_trg
  BEFORE INSERT ON public.plati
  for each row execute function public.plati_completeaza_club_id();

-- Backfill 1: randuri cu sportiv
UPDATE public.plati p
set club_id = s.club_id
from public.sportivi s
where s.id = p.sportiv_id
  and p.club_id is null
  and s.club_id is not null;

-- Backfill 2: randuri doar-familie (sportiv_id NULL), din familii.club_id
UPDATE public.plati p
set club_id = f.club_id
from public.familii f
where f.id = p.familie_id
  and p.sportiv_id is null
  and p.club_id is null
  and f.club_id is not null;

notify pgrst, 'reload schema';

-- Rollback:
--   drop trigger if exists plati_completeaza_club_id_trg on public.plati;
--   drop function if exists public.plati_completeaza_club_id();
--   -- date: restaureaza doar randurile backfill-uite (snapshot proaspat luat in 44-05 chiar inainte de aplicare)
--   update public.plati p set club_id = null
--   where p.id in (select b.id from backup_faza44.pre_44_05_plati b where b.club_id is null)
--     and p.club_id = (select s.club_id from public.sportivi s where s.id = p.sportiv_id);
--   update public.plati p set club_id = null
--   where p.id in (select b.id from backup_faza44.pre_44_05_plati b where b.club_id is null and b.sportiv_id is null)
--     and p.sportiv_id is null
--     and p.club_id = (select f.club_id from public.familii f where f.id = p.familie_id);
--   -- randurile inserate dupa snapshot si cele cu club atribuit manual raman neatinse.
