-- CN Co Vo Dao Roman 2026 (Anexa 1): inlocuieste placeholder-urile "Forma Bong/Dao/Guom N"
-- cu formele reale din programa tehnica si le leaga de grade (ordine DB: 15=1 CAP ... 19=C.N. ... 24=5 Dang).
-- Armele (categorie arma_cvd) NU se leaga de grade: Pas2Quyen nu filtreaza dupa categorie si ar afisa numele armelor ca forme.

delete from public.inlantuiri i
where i.categorie in ('thao_lo_bong', 'thao_lo_dao', 'thao_lo_guom')
  and i.denumire ~ '^Forma (Bong|Dao|Guom) [1-5]$'
  and not exists (select 1 from public.inlantuiri_grade g where g.inlantuire_id = i.id)
  and not exists (select 1 from public.inscrieri_competitie s where s.inlantuire_id = i.id or s.inlantuire_id_2 = i.id)
  and not exists (select 1 from public.echipe_competitie e where e.inlantuire_id = i.id);

create temp table _forme_cvd (denumire text, categorie text, tip_proba text, omin int, omax int, ord int) on commit drop;

insert into _forme_cvd (denumire, categorie, tip_proba, omin, omax, ord)
select v.d, v.c, v.t, v.a, v.b, 700 + row_number() over () * 10
from (values
  -- Quyen / Doc Luyen (tip_proba thao_lo_individual)
  ('Bong Doc Luyen Mot', 'thao_lo_bong', 'thao_lo_individual', 15, 17),
  ('Bong Doc Luyen Hai', 'thao_lo_bong', 'thao_lo_individual', 16, 17),
  ('Bong Doc Luyen Ba', 'thao_lo_bong', 'thao_lo_individual', 18, 18),
  ('Bong Phap Quyen Mot', 'thao_lo_bong', 'thao_lo_individual', 17, 20),
  ('Bong Phap Quyen Hai', 'thao_lo_bong', 'thao_lo_individual', 18, 24),
  ('Hau Bong Quyen Mot', 'thao_lo_bong', 'thao_lo_individual', 19, 24),
  ('Hau Bong Quyen Hai', 'thao_lo_bong', 'thao_lo_individual', 21, 24),
  ('Long Gian Doc Luyen Mot', 'thao_lo_alte', 'thao_lo_individual', 15, 16),
  ('Long Gian Doc Luyen', 'thao_lo_alte', 'thao_lo_individual', 17, 18),
  ('Long Gian Quyen Mot', 'thao_lo_alte', 'thao_lo_individual', 15, 24),
  ('Long Gian Quyen Hai', 'thao_lo_alte', 'thao_lo_individual', 17, 24),
  ('Long Gian Quyen Ba', 'thao_lo_alte', 'thao_lo_individual', 19, 24),
  ('Song Cot Doc Luyen Mot', 'thao_lo_alte', 'thao_lo_individual', 15, 24),
  ('Song Cot Quyen Mot', 'thao_lo_alte', 'thao_lo_individual', 17, 24),
  ('Moc Can Doc Luyen Mot', 'thao_lo_alte', 'thao_lo_individual', 17, 24),
  ('Moc Can Quan Ky Mot', 'thao_lo_alte', 'thao_lo_individual', 17, 24),
  ('Moc Can Quyen Mot', 'thao_lo_alte', 'thao_lo_individual', 19, 24),
  ('Viet Moc Guom Doc Luyen Mot', 'thao_lo_guom', 'thao_lo_individual', 19, 24),
  ('Viet Moc Guom Doc Luyen Hai', 'thao_lo_guom', 'thao_lo_individual', 19, 24),
  ('Viet Moc Guom Quyen Mot', 'thao_lo_guom', 'thao_lo_individual', 19, 24),
  ('Ma Dao Doc Luyen Mot', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Phuc Su Dao Quyen Mot', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Ma Dao Ung Quyen Mot', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Song Ma Dao Doc Luyen Mot', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Song Diep Dao Doc Luyen Mot', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Song Diep Dao Doc Luyen Trung Cap', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Yen Dao Quyen Mot', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Yen Dao Quyen Hai', 'thao_lo_dao', 'thao_lo_individual', 19, 24),
  ('Dai Dao Quyen Mot', 'thao_lo_dao', 'thao_lo_individual', 21, 24),
  ('Tam Thiet Gian Doc Luyen Mot', 'thao_lo_alte', 'thao_lo_individual', 20, 24),
  ('Tam Thiet Gian Doc Luyen Hai', 'thao_lo_alte', 'thao_lo_individual', 20, 24),
  ('Cuu Khuc Doc Luyen Mot', 'thao_lo_alte', 'thao_lo_individual', 20, 24),
  ('Cuu Khuc Quyen Mot', 'thao_lo_alte', 'thao_lo_individual', 20, 24),
  -- Song Luyen (tip_proba song_luyen)
  ('Bong Song Luyen Mot', 'song_luyen', 'song_luyen', 15, 17),
  ('Bong Song Luyen Hai', 'song_luyen', 'song_luyen', 16, 18),
  ('Bong Song Luyen Ba', 'song_luyen', 'song_luyen', 18, 24),
  ('Aplicatia pentru Bong Phap Quyen Mot', 'song_luyen', 'song_luyen', 17, 24),
  ('Aplicatia pentru Bong Phap Quyen Hai', 'song_luyen', 'song_luyen', 19, 24),
  ('Long Gian Doc Luyen Mot Song Luyen', 'song_luyen', 'song_luyen', 15, 18),
  ('Long Gian Quyen Mot Song Luyen', 'song_luyen', 'song_luyen', 19, 24),
  ('Song Cot Song Luyen Mot', 'song_luyen', 'song_luyen', 15, 24),
  ('Aplicatia pentru Song Cot Quyen Mot', 'song_luyen', 'song_luyen', 19, 24),
  ('Moc Can Song Luyen Mot', 'song_luyen', 'song_luyen', 17, 24),
  ('Moc Can Song Luyen Hai', 'song_luyen', 'song_luyen', 19, 24),
  ('Aplicatia la Moc Can Doc Luyen Mot', 'song_luyen', 'song_luyen', 19, 24),
  ('Viet Moc Guom Doc Luyen Mot Song Luyen', 'song_luyen', 'song_luyen', 19, 24),
  ('Viet Moc Guom Quyen Mot Song Luyen', 'song_luyen', 'song_luyen', 19, 24),
  ('Ma Dao Song Luyen Mot', 'song_luyen', 'song_luyen', 19, 24),
  ('Song Diep Dao Song Luyen Mot', 'song_luyen', 'song_luyen', 19, 24),
  ('Yen Dao Song Luyen Mot', 'song_luyen', 'song_luyen', 19, 24)
) v(d, c, t, a, b);

insert into public.inlantuiri (denumire, categorie, ordine)
select denumire, categorie, ord from _forme_cvd
on conflict (denumire) do nothing;

insert into public.inlantuiri_grade (inlantuire_id, grade_id, tip_proba)
select i.id, g.id, f.tip_proba
from _forme_cvd f
join public.inlantuiri i on i.denumire = f.denumire
join public.grade g on g.ordine between f.omin and f.omax
on conflict (inlantuire_id, grade_id, tip_proba) do nothing;
