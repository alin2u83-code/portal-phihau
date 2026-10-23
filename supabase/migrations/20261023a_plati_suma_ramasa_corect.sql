-- 20261023a — plati: rest de plata corect in suma_ramasa (NU se schimba plati.suma)
--
-- Conventia REALA din date + soldService (verificat live 23.10.2026, ~1.200 facturi):
--   plati.suma          = total facturat DUPA reducere (nu scade la incasare) -> soldService: sold = Σ tranzactii − Σ suma
--   plati.suma_initiala = pret de lista inainte de reducere (poate fi NULL)
--   plati.suma_ramasa   = rest de plata, mentinut de trigger din tranzactie_plata
-- (docs/facturaDetaliu.ts "suma = rest" e invechit; a muta restul in `suma` ar strica toate soldurile.)
--
-- Probleme corectate:
--  1. recalculare_stare_plata() folosea suma_initiala (pret lista) ca total => o factura cu reducere,
--     incasata integral la `suma`, ar fi iesit 'Achitat Partial' la urmatoarea modificare de tranzactie_plata.
--  2. Rescria status-ul facturilor 'Anulat' la orice schimbare de incasare.
--  3. suma_ramasa are DEFAULT 0 si nu a fost niciodata completata pentru facturile fara incasari
--     (275 facturi Neachitat cu suma_ramasa = 0) => UI nu poate folosi coloana pana la backfill.
--
-- NU modifica status (trg_plata_sms se declanseaza pe UPDATE OF status si ar trimite SMS-uri de confirmare).

create or replace function public.recalculare_stare_plata(p_plata_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
    v_suma_totala   numeric;
    v_status_curent text;
    v_total_incasat numeric;
    v_rest_de_plata numeric;
    v_status_nou    text;
begin
    select suma, status into v_suma_totala, v_status_curent
    from public.plati where id = p_plata_id;

    -- factura inexistenta (stearsa) sau anulata: nu mai recalculam
    if not found or v_status_curent = 'Anulat' then
        return;
    end if;

    select coalesce(sum(suma_alocata), 0) into v_total_incasat
    from public.tranzactie_plata
    where plata_id = p_plata_id;

    v_rest_de_plata := greatest(v_suma_totala - v_total_incasat, 0);

    if v_suma_totala - v_total_incasat <= 0.01 then
        v_status_nou := 'Achitat';
        v_rest_de_plata := 0;
    elsif v_total_incasat > 0 then
        v_status_nou := 'Achitat Parțial';
    else
        v_status_nou := 'Neachitat';
    end if;

    update public.plati
    set suma_ramasa = v_rest_de_plata, status = v_status_nou
    where id = p_plata_id;
end;
$function$;

-- Backfill suma_ramasa (fara a atinge status/suma).
--  * Achitat: 0 (statusul e autoritar; unele facturi vechi sunt achitate prin tranzactii.plata_ids, fara rand in tranzactie_plata)
--  * Neachitat / Achitat Parțial: suma - incasat din tranzactie_plata
--  * Anulat: neschimbat
update public.plati p
set suma_ramasa = case
        when p.status = 'Achitat' then 0
        else greatest(p.suma - coalesce(i.incasat, 0), 0)
    end
from (select p2.id, (select coalesce(sum(tp.suma_alocata), 0) from public.tranzactie_plata tp where tp.plata_id = p2.id) as incasat
      from public.plati p2) i
where i.id = p.id
  and p.status <> 'Anulat'
  and p.suma_ramasa is distinct from case
        when p.status = 'Achitat' then 0
        else greatest(p.suma - coalesce(i.incasat, 0), 0)
    end;

-- Verificare post-migrare (trebuie 0 randuri):
--   select id, status, suma, suma_ramasa from plati
--   where status = 'Neachitat' and suma_ramasa <> suma
--      or status = 'Achitat' and suma_ramasa <> 0;
--
-- Raman de decis manual (nu in migrare): 4 facturi 'Neachitat' cu incasari reale si ~71 'Achitat' fara
-- nicio incasare — vezi sql/fix_facturi_inconsistente_20261023.sql.
