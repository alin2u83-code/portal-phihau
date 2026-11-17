-- Faza 44 (44-03): tranzactie_plata devine sursa unica
-- APLICATA LIVE 18.11.2026 (44-05, dupa OK explicit); 0 randuri inserate (C1 efectiv = 0). supabase/ e in .gitignore, deci git add -f.
--
-- D-02: tranzactie_plata e singura sursa pentru legatura tranzactie <-> factura; tranzactii.plata_ids
-- se elimina mai tarziu (44-10) si ramane in backup_faza44.
-- Clase (vezi 44-RAPOARTE.md R0): se modifica DOAR C1 (plata_ids nevid si zero randuri in tranzactie_plata,
-- cu cel putin o factura existenta). C2/C3 nu necesita nimic. C4 (seturi diferite) si flagurile M/O se
-- raporteaza si NU se ating (tranzactie_plata castiga, D-02). Randurile C1 ale caror toate id-uri
-- indica facturi sterse (orfane, C1o) nu au ce aloca si raman neatinse.
-- Nicio coloana din plati si nicio coloana din tranzactii nu se modifica; triggerul de recalculare e
-- suspendat pe durata blocului, deci plati.status si suma_ramasa nu se schimba la aplicare. Efect latent:
-- la prima modificare ulterioara a unei plati afectate, recalculare_stare_plata poate recalcula statusul
-- (si trg_plata_sms poate reactiona); diferentele apar in raportul R2 (44-07).
--
-- Regula de alocare (revizuita 18.11.2026 dupa review): se iau doar id-urile care EXISTA in plati, in
-- ordinea din array; fiecare primeste least(restul tranzactiei, ramas pe factura = suma - alocat deja).
-- Fara "ultimul primeste restul" (ar putea depasi plati.suma): ce ramane nealocat se logheaza in
-- backup_faza44.faza44_b_nealocat. Idempotenta: a doua rulare nu gaseste nimic.
--
-- Atomicitate: tot (suspendare trigger, alocari, reactivare) ruleaza intr-un singur bloc DO, deci
-- indiferent cum ruleaza wrapperul apply_migration, o eroare anuleaza tot, inclusiv suspendarea
-- triggerului. Verificarea tgenabled = 'O' ramane obligatorie in 44-05.
-- Schema backup_faza44 se creeaza daca lipseste (alte medii: branch, clona).
--
-- Dry-run 18.11.2026 (rollback fortat, baza reala): C1 brut 5 (toate orfane), C1 efectiv 0, 0 inserari.
-- Test sintetic 18.11.2026 (rollback fortat): vezi rezultatul in 44-RAPOARTE.md "R0b".

do $$
declare
  r record;
  ids uuid[];
  i int;
  pid uuid;
  rem numeric;
  cap numeric;
  a numeric;
  v_id uuid;
begin
  create schema if not exists backup_faza44;
  revoke all on schema backup_faza44 from public, anon, authenticated;

  create table if not exists backup_faza44.faza44_b_inserate (
    tp_key text,
    tranzactie_id uuid,
    plata_id uuid,
    suma_alocata numeric,
    inserat_la timestamptz default now()
  );
  alter table backup_faza44.faza44_b_inserate enable row level security;
  revoke all on backup_faza44.faza44_b_inserate from public, anon, authenticated;

  create table if not exists backup_faza44.faza44_b_nealocat (
    tranzactie_id uuid,
    suma_nealocata numeric,
    inserat_la timestamptz default now()
  );
  alter table backup_faza44.faza44_b_nealocat enable row level security;
  revoke all on backup_faza44.faza44_b_nealocat from public, anon, authenticated;

  alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;

  for r in
    select t.id, t.suma, t.plata_ids
    from public.tranzactii t
    where coalesce(array_length(t.plata_ids, 1), 0) > 0
      and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
    order by t.created_at, t.id
  loop
    ids := array(
      select u.e
      from unnest(r.plata_ids) with ordinality as u(e, o)
      where exists (select 1 from public.plati p where p.id = u.e)
      order by u.o
    );
    rem := r.suma;
    for i in 1..coalesce(array_length(ids, 1), 0) loop
      exit when rem <= 0;
      pid := ids[i];
      select greatest(p.suma - coalesce((select sum(tp.suma_alocata) from public.tranzactie_plata tp where tp.plata_id = p.id), 0), 0)
        into cap from public.plati p where p.id = pid;
      a := least(rem, coalesce(cap, 0));
      if a > 0 then
        insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
        values (r.id, pid, a)
        returning id into v_id;
        insert into backup_faza44.faza44_b_inserate (tp_key, tranzactie_id, plata_id, suma_alocata)
        values (v_id::text, r.id, pid, a);
        rem := rem - a;
      end if;
    end loop;
    if coalesce(array_length(ids, 1), 0) > 0 and rem > 0.005 then
      insert into backup_faza44.faza44_b_nealocat (tranzactie_id, suma_nealocata) values (r.id, rem);
    end if;
  end loop;

  alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;
end $$;

-- Rollback: sterge DOAR randurile inserate de aceasta migrare (niciodata "tot ce nu e in backup").
--   do $$ begin
--     alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;
--     delete from public.tranzactie_plata where id in (select tp_key::uuid from backup_faza44.faza44_b_inserate);
--     alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;
--   end $$;
--   -- dupa rollback: tgenabled trebuie sa fie 'O' pentru tranzactie_plata_change_trigger.
--   -- Lista exacta de id-uri e scrisa in 44-05 in acest antet ("Id-uri inserate la aplicare <data>: ...").
-- Id-uri inserate la aplicare 18.11.2026: (niciunul, 0 randuri)
