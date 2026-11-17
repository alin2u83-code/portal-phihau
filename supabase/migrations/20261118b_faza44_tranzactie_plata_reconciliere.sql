-- Faza 44 (44-03): tranzactie_plata devine sursa unica
-- NEAPLICATA, se aplica in 44-05 dupa OK explicit; supabase/ e in .gitignore, deci git add -f.
--
-- D-02: tranzactie_plata e singura sursa pentru legatura tranzactie <-> factura; tranzactii.plata_ids
-- se elimina mai tarziu (44-10) si ramane in backup_faza44.
-- Clase (vezi 44-RAPOARTE.md R0): se modifica DOAR C1 (plata_ids nevid si zero randuri in tranzactie_plata,
-- cu cel putin o factura existenta). C2/C3 nu necesita nimic. C4 (seturi diferite) si flagurile M/O se
-- raporteaza si NU se ating (tranzactie_plata castiga, D-02). Randurile C1 ale caror toate id-uri
-- indica facturi sterse (orfane, C1o) nu au ce aloca si raman neatinse.
-- Nicio coloana din plati si nicio coloana din tranzactii nu se modifica; triggerul de recalculare e
-- suspendat in tranzactie, deci plati.status si suma_ramasa nu se schimba. Inserarea in tranzactie_plata
-- nu atinge tranzactii.
-- Regula de alocare: cea din 20261014a (toate id-urile mai putin ultimul primesc least(rest, ramas pe factura);
-- ultimul primeste restul). Idempotenta: a doua rulare nu gaseste nimic.
--
-- Dry-run 18.11.2026 (rollback fortat, baza reala): C1 brut 5 (toate orfane: id-urile din plata_ids
--   indica facturi sterse), C1 efectiv 0; randuri inserate 0 (log faza44_b_inserate 0, crestere
--   tranzactie_plata 0 din 412), tranzactii 400 neschimbat, checksum plati
--   (id,suma,suma_initiala,status,suma_ramasa) egal, trigger tranzactie_plata_change_trigger tgenabled 'O'.
--   Concluzie: pe datele de azi migrarea e no-op (idempotenta, utila doar daca apar C1 noi pana la aplicare).
--   Dupa rollback: 0 tabel log, 0 rand schimbat.

begin;

alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;

create table if not exists backup_faza44.faza44_b_inserate (
  tp_key text,
  tranzactie_id uuid,
  plata_id uuid,
  suma_alocata numeric,
  inserat_la timestamptz default now()
);
alter table backup_faza44.faza44_b_inserate enable row level security;
revoke all on backup_faza44.faza44_b_inserate from anon, authenticated;

do $$
declare
  r record;
  i int;
  n int;
  pid uuid;
  rem numeric;
  cap numeric;
  a numeric;
  v_id uuid;
begin
  for r in
    select t.id, t.suma, t.plata_ids
    from public.tranzactii t
    where coalesce(array_length(t.plata_ids, 1), 0) > 0
      and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
    order by t.created_at, t.id
  loop
    rem := r.suma;
    n := array_length(r.plata_ids, 1);
    for i in 1..n loop
      exit when rem <= 0;
      pid := r.plata_ids[i];
      if not exists (select 1 from public.plati where id = pid) then
        continue;
      end if;
      if i = n then
        a := rem;
      else
        select greatest(p.suma - coalesce((select sum(tp.suma_alocata) from public.tranzactie_plata tp where tp.plata_id = p.id), 0), 0)
          into cap from public.plati p where p.id = pid;
        a := least(rem, coalesce(cap, 0));
      end if;
      if a > 0 then
        insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata)
        values (r.id, pid, a)
        returning id into v_id;
        insert into backup_faza44.faza44_b_inserate (tp_key, tranzactie_id, plata_id, suma_alocata)
        values (v_id::text, r.id, pid, a);
        rem := rem - a;
      end if;
    end loop;
  end loop;
end $$;

alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;

commit;

-- Rollback: sterge DOAR randurile inserate de aceasta migrare (niciodata "tot ce nu e in backup").
--   begin;
--   alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;
--   delete from public.tranzactie_plata where id in (select tp_key::uuid from backup_faza44.faza44_b_inserate);
--   alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;
--   commit;
--   -- dupa rollback: tgenabled trebuie sa fie 'O' pentru tranzactie_plata_change_trigger.
--   -- Lista exacta de id-uri e scrisa in 44-05 in acest antet ("Id-uri inserate la aplicare <data>: ...").
