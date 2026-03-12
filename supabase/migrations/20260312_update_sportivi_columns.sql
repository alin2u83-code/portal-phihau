alter table public.sportivi add column if not exists locul_nasterii text;
alter table public.sportivi add column if not exists cetatenia text;
alter table public.sportivi add column if not exists departament text;
-- nr_legitimatie already exists in sportivi table based on previous interactions
