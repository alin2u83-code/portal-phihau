-- 20261023b — plati.suma_ramasa mentinut si la INSERT / editare manuala a facturii
-- recalculare_stare_plata() ruleaza doar la modificari in tranzactie_plata; o factura noua (Neachitat)
-- ramanea cu suma_ramasa = 0 (DEFAULT). Trigger BEFORE: Neachitat => rest = suma, Achitat => 0.
-- 'Achitat Parțial' si 'Anulat' raman in grija recalcularii din tranzactie_plata.
create or replace function public.plati_sync_suma_ramasa()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
begin
    if new.status = 'Neachitat' then
        new.suma_ramasa := new.suma;
    elsif new.status = 'Achitat' then
        new.suma_ramasa := 0;
    end if;
    return new;
end;
$function$;

drop trigger if exists plati_sync_suma_ramasa_trg on public.plati;
create trigger plati_sync_suma_ramasa_trg
    before insert or update of suma, status on public.plati
    for each row execute function public.plati_sync_suma_ramasa();
