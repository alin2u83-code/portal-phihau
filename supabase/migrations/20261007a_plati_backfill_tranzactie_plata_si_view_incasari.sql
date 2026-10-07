-- Debug plati/incasari 2026-10-07 — pasii 2 si 3
--
-- 3b) club_id lipsa pe tranzactiile scrise de Portofel (fara alocari in tranzactie_plata):
--     derivat din sportiv/familie. Facut INAINTE de backfill ca sa nu atinga alte tranzactii.
-- 3)  Backfill `tranzactie_plata` pentru tranzactiile vechi care au doar `plata_ids`.
--     Trigger-ul on_tranzactie_plata_change recalculeaza status/suma_ramasa din suma_initiala si ar rescrie
--     starea facturilor existente => il suspendam in tranzactie; statusurile NU se modifica.
--     Idempotent: ruleaza doar pe tranzactii fara alocari.
-- 2)  view_istoric_plati_detaliat: fallback-ul pe plata_ids nu mai numara suma INTREAGA a tranzactiei
--     pentru fiecare factura; imparte egal pe numarul de facturi si plafoneaza la suma facturii.

begin;

-- 3b) club_id
update public.tranzactii t
set club_id = coalesce(
      (select s.club_id from public.sportivi s where s.id = t.sportiv_id),
      (select s.club_id from public.sportivi s where s.familie_id = t.familie_id and s.club_id is not null limit 1))
where t.club_id is null
  and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
  and (t.sportiv_id is not null or t.familie_id is not null);

-- 3) backfill (trigger suspendat doar in aceasta tranzactie)
alter table public.tranzactie_plata disable trigger tranzactie_plata_change_trigger;

do $$
declare
  r record;
  pid uuid;
  rem numeric;
  cap numeric;
  a numeric;
begin
  for r in
    select t.id, t.suma, t.plata_ids
    from public.tranzactii t
    where coalesce(array_length(t.plata_ids, 1), 0) > 0
      and not exists (select 1 from public.tranzactie_plata tp where tp.tranzactie_id = t.id)
    order by t.created_at, t.id
  loop
    rem := r.suma;
    foreach pid in array r.plata_ids loop
      exit when rem <= 0;
      select case when p.status = 'Anulat' then 0
                  else greatest(p.suma - coalesce((select sum(tp.suma_alocata) from public.tranzactie_plata tp where tp.plata_id = p.id), 0), 0) end
        into cap
      from public.plati p where p.id = pid;
      a := least(rem, coalesce(cap, 0));
      if a > 0 then
        insert into public.tranzactie_plata (tranzactie_id, plata_id, suma_alocata) values (r.id, pid, a);
        rem := rem - a;
      end if;
    end loop;
  end loop;
end $$;

alter table public.tranzactie_plata enable trigger tranzactie_plata_change_trigger;

-- 2) view_istoric_plati_detaliat — fallback corectat (pastram security_invoker)
create or replace view public.view_istoric_plati_detaliat as
 SELECT p.id AS plata_id,
    p.sportiv_id,
    p.familie_id,
        CASE
            WHEN (s.id IS NOT NULL) THEN ((s.nume || ' '::text) || s.prenume)
            WHEN (f.id IS NOT NULL) THEN f.nume
            ELSE NULL::text
        END AS nume_complet_sportiv,
    p.descriere,
    COALESCE(p.suma, (0)::numeric) AS suma_datorata,
    p.status,
    (p.data)::text AS data_emitere,
    COALESCE(( SELECT sum(tp.suma_alocata) AS sum
           FROM tranzactie_plata tp
          WHERE (tp.plata_id = p.id)), ( SELECT sum(LEAST(t.suma / cardinality(t.plata_ids), COALESCE(p.suma, (0)::numeric))) AS sum
           FROM tranzactii t
          WHERE (p.id = ANY (t.plata_ids))), (0)::numeric) AS total_incasat,
    GREATEST((COALESCE(p.suma, (0)::numeric) - COALESCE(( SELECT sum(tp.suma_alocata) AS sum
           FROM tranzactie_plata tp
          WHERE (tp.plata_id = p.id)), ( SELECT sum(LEAST(t.suma / cardinality(t.plata_ids), COALESCE(p.suma, (0)::numeric))) AS sum
           FROM tranzactii t
          WHERE (p.id = ANY (t.plata_ids))), (0)::numeric)), (0)::numeric) AS rest_de_plata,
    COALESCE(( SELECT t.id
           FROM (tranzactii t
             JOIN tranzactie_plata tp ON ((tp.tranzactie_id = t.id)))
          WHERE (tp.plata_id = p.id)
          ORDER BY t.data_platii DESC
         LIMIT 1), ( SELECT t.id
           FROM tranzactii t
          WHERE (p.id = ANY (t.plata_ids))
          ORDER BY t.data_platii DESC
         LIMIT 1)) AS tranzactie_id,
    COALESCE(( SELECT (t.data_platii)::text AS data_platii
           FROM (tranzactii t
             JOIN tranzactie_plata tp ON ((tp.tranzactie_id = t.id)))
          WHERE (tp.plata_id = p.id)
          ORDER BY t.data_platii DESC
         LIMIT 1), ( SELECT (t.data_platii)::text AS data_platii
           FROM tranzactii t
          WHERE (p.id = ANY (t.plata_ids))
          ORDER BY t.data_platii DESC
         LIMIT 1)) AS data_plata_string,
    COALESCE(( SELECT sum(tp.suma_alocata) AS sum
           FROM tranzactie_plata tp
          WHERE (tp.plata_id = p.id)), ( SELECT sum(LEAST(t.suma / cardinality(t.plata_ids), COALESCE(p.suma, (0)::numeric))) AS sum
           FROM tranzactii t
          WHERE (p.id = ANY (t.plata_ids))), (0)::numeric) AS suma_incasata,
    COALESCE(( SELECT t.metoda_plata
           FROM (tranzactii t
             JOIN tranzactie_plata tp ON ((tp.tranzactie_id = t.id)))
          WHERE (tp.plata_id = p.id)
          ORDER BY t.data_platii DESC
         LIMIT 1), ( SELECT t.metoda_plata
           FROM tranzactii t
          WHERE (p.id = ANY (t.plata_ids))
          ORDER BY t.data_platii DESC
         LIMIT 1)) AS metoda_plata,
    COALESCE(p.club_id, s.club_id) AS club_id
   FROM ((plati p
     LEFT JOIN sportivi s ON ((p.sportiv_id = s.id)))
     LEFT JOIN familii f ON ((p.familie_id = f.id)))
  WHERE ((COALESCE(p.club_id, s.club_id) = get_active_club_id()) OR is_super_admin());

alter view public.view_istoric_plati_detaliat set (security_invoker = true);

commit;
