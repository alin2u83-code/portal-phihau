-- ============================================================
-- MIGRATION: 20260508b_inlantuiri_categorie
-- Adaugă coloana `categorie` la tabelul `inlantuiri`
-- pentru filtrarea eficientă pe tip armă în modul matrice.
-- ============================================================

ALTER TABLE inlantuiri ADD COLUMN IF NOT EXISTS categorie text;

UPDATE inlantuiri SET categorie = CASE
  WHEN ordine BETWEEN 10  AND 130 THEN 'quyen'
  WHEN ordine BETWEEN 210 AND 270 THEN 'song_luyen'
  WHEN ordine BETWEEN 310 AND 350 THEN 'thao_lo_bong'
  WHEN ordine BETWEEN 360 AND 400 THEN 'thao_lo_dao'
  WHEN ordine BETWEEN 410 AND 450 THEN 'thao_lo_guom'
  WHEN ordine BETWEEN 510 AND 620 THEN 'arma_cvd'
  ELSE 'other'
END
WHERE categorie IS NULL;

CREATE INDEX IF NOT EXISTS idx_inlantuiri_categorie
  ON inlantuiri (categorie);
