-- Categorii împărțite în categorii noi: status 'impartita' (alături de activa/fuzionata/anulata)
alter table public.categorii_competitie drop constraint if exists categorii_competitie_status_categorie_check;
alter table public.categorii_competitie
  add constraint categorii_competitie_status_categorie_check
  check (status_categorie = any (array['activa'::text, 'fuzionata'::text, 'anulata'::text, 'impartita'::text]));
