-- Curatare facturi inconsistente (plati) — 23.10.2026
-- Sursa: videouri feedback 21.10 (ACHITAT cu incasat 0.00). Verificat pe DB live phi-hau-db.
--
-- CONSTATARE (corectata): plati.suma = TOTAL facturat dupa reducere (soldService scade p.suma; datele confirma:
-- incasat = suma la ~90% din facturile achitate). suma_initiala = pret lista. suma_ramasa = rest (trigger).
-- UI calculeaza gresit "Incasat" = suma_initiala - suma (= reducerea). NU se rescrie plati.suma.
-- Fix real: migrarea supabase/migrations/20261023a_plati_suma_ramasa_corect.sql (trigger + backfill suma_ramasa),
-- apoi UI: Rest = suma_ramasa, Incasat = suma - suma_ramasa.
-- ATENTIE: PASUL 2 de mai jos ruleaza recalculare_stare_plata — aplicati-l DOAR dupa migrarea 20261023a
-- (functia veche folosea suma_initiala) si tinand cont ca update de status declanseaza trg_plata_sms (SMS confirmare).

-- ============================================================
-- PASUL 1 — DIAGNOSTIC (read-only). Rulati intai.
-- ============================================================
with inc as (select plata_id, sum(suma_alocata) incasat from tranzactie_plata group by plata_id)
select
  case
    when p.status = 'Achitat' and coalesce(i.incasat,0) = 0 and coalesce(p.suma_initiala,p.suma) > 0.01 then '1_achitat_fara_incasare'
    when p.status = 'Achitat' and coalesce(i.incasat,0) + 0.01 < coalesce(p.suma_initiala,p.suma)       then '2_achitat_incasat_sub_total'
    when p.status = 'Neachitat' and coalesce(i.incasat,0) > 0.01                                          then '4_neachitat_cu_incasari'
    when p.status <> 'Anulat' and p.suma_initiala > p.suma + 0.01 and coalesce(i.incasat,0) = 0           then '3_reducere_afisata_ca_incasat'
  end as problema,
  p.club_id, p.id, p.sportiv_id, p.descriere, p.data, p.status,
  p.suma_initiala, p.suma, p.suma_ramasa, coalesce(i.incasat,0) as incasat_real
from plati p left join inc i on i.plata_id = p.id
where p.status <> 'Anulat'
order by problema nulls last, p.club_id, p.data;

-- ============================================================
-- PASUL 2 — FIX SIGUR (nu atinge plati.suma): reface status + suma_ramasa din tranzactie_plata
-- pentru facturile cu incasari reale al caror status nu se potriveste (ex: 4 "Neachitat cu incasari").
-- ============================================================
begin;

select recalculare_stare_plata(p.id)
from plati p
join (select plata_id, sum(suma_alocata) incasat from tranzactie_plata group by plata_id) i on i.plata_id = p.id
where p.status <> 'Anulat'
  and (
    (p.status = 'Neachitat' and i.incasat > 0.01)
    or (p.status = 'Achitat' and i.incasat + 0.01 < coalesce(p.suma_initiala, p.suma))
  );
-- NOTA: a doua conditie (Achitat cu incasat sub total) trece in 'Achitat Partial' — verificati
-- cu clubul ca nu erau facturi stinse manual/din credit inainte sa dati COMMIT.

-- Verificare inainte de commit:
select status, count(*) from plati group by 1 order by 1;

rollback;  -- schimbati in COMMIT dupa ce ati verificat rezultatul

-- ============================================================
-- PASUL 3 — DECIZII (NU se aplica automat)
-- ============================================================
-- (a) Achitat fara nicio incasare in tranzactie_plata (categoria 1, ~71 facturi, ~8000 RON):
--     pot fi legitime (stinse din credit/portofel, marcate manual) sau orfane din bug-ul
--     "Incaseaza pe loc" (INSERT cu status Achitat inainte de RPC). Verificare per club:
--     lista din PASUL 1 + exista tranzactie cu plata_ids @> array[id]? Query:
--       select p.id from plati p where p.status='Achitat'
--         and not exists (select 1 from tranzactie_plata tp where tp.plata_id=p.id)
--         and not exists (select 1 from tranzactii t where p.id = any(t.plata_ids));
--     Cele fara nicio tranzactie => alegeti: status 'Neachitat' (datorie reala) sau lasati.
-- (b) REZOLVAT: conventia ramane suma = total (vezi migrarea 20261023a). NU setati suma = suma_ramasa.
