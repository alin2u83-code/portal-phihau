-- Echipă fără denumire la INSERT => numele clubului (indiferent de calea de înscriere)
create or replace function public.trg_echipe_denumire_implicita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.denumire_echipa is null or btrim(new.denumire_echipa) = '' then
    select btrim(c.nume) into new.denumire_echipa from public.cluburi c where c.id = new.club_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_echipe_denumire_implicita on public.echipe_competitie;
create trigger trg_echipe_denumire_implicita
  before insert on public.echipe_competitie
  for each row execute function public.trg_echipe_denumire_implicita();
