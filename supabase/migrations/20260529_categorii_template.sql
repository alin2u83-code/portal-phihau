-- =====================================================
-- MIGRATION: categorii_template
-- Biblioteca globala de template-uri categorii competitie
-- Gestionata exclusiv de SUPER_ADMIN_FEDERATIE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categorii_template (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  denumire                TEXT NOT NULL,
  tip_proba               TEXT NOT NULL CHECK (tip_proba IN (
                              'thao_quyen_individual',
                              'sincron',
                              'song_luyen',
                              'giao_dau',
                              'thao_lo_individual'
                          )),
  varsta_min              INTEGER NOT NULL DEFAULT 0,
  varsta_max              INTEGER,
  gen                     TEXT NOT NULL CHECK (gen IN ('Feminin', 'Masculin', 'Mixt')),
  grad_min_ordine         INTEGER,
  grad_max_ordine         INTEGER,
  arma                    TEXT,
  tip_participare         TEXT NOT NULL CHECK (tip_participare IN ('individual', 'pereche', 'echipa')),
  sportivi_per_echipa_min INTEGER NOT NULL DEFAULT 1,
  sportivi_per_echipa_max INTEGER NOT NULL DEFAULT 1,
  rezerve_max             INTEGER NOT NULL DEFAULT 0,
  max_echipe_per_club     INTEGER NOT NULL DEFAULT 1,
  activ                   BOOLEAN NOT NULL DEFAULT true,
  ordine_afisare          INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (denumire)
);

ALTER TABLE public.categorii_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorii_template_select" ON public.categorii_template
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categorii_template_insert" ON public.categorii_template
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.utilizator_roluri_multicont
      WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
  );

CREATE POLICY "categorii_template_update" ON public.categorii_template
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.utilizator_roluri_multicont
      WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.utilizator_roluri_multicont
      WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
  );

CREATE POLICY "categorii_template_delete" ON public.categorii_template
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.utilizator_roluri_multicont
      WHERE user_id = auth.uid()
        AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
    )
  );

CREATE INDEX IF NOT EXISTS idx_categorii_template_tip_proba ON public.categorii_template(tip_proba);
CREATE INDEX IF NOT EXISTS idx_categorii_template_varsta    ON public.categorii_template(varsta_min, varsta_max);
CREATE INDEX IF NOT EXISTS idx_categorii_template_gen       ON public.categorii_template(gen);
CREATE INDEX IF NOT EXISTS idx_categorii_template_ordine    ON public.categorii_template(ordine_afisare);

-- THAO QUYEN INDIVIDUAL (76)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('7 ani / Feminin / 1 Cap Rosu', 'thao_quyen_individual', 7, 7, 'Feminin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 1),
('7 ani / Masculin / 1 Cap Rosu', 'thao_quyen_individual', 7, 7, 'Masculin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 2),
('7 ani / Feminin / 2-3 Cap Rosu', 'thao_quyen_individual', 7, 7, 'Feminin', 7, 8, NULL, 'individual', 1, 1, 0, 1, 3),
('7 ani / Masculin / 2-3 Cap Rosu', 'thao_quyen_individual', 7, 7, 'Masculin', 7, 8, NULL, 'individual', 1, 1, 0, 1, 4),
('8 ani / Feminin / 1 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Feminin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 5),
('8 ani / Masculin / 1 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Masculin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 6),
('8 ani / Feminin / 2 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Feminin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 7),
('8 ani / Masculin / 2 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Masculin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 8),
('8 ani / Feminin / 3 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Feminin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 9),
('8 ani / Masculin / 3 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Masculin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 10),
('8 ani / Feminin / 4 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Feminin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 11),
('8 ani / Masculin / 4 Cap Rosu', 'thao_quyen_individual', 8, 8, 'Masculin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 12),
('9 ani / Feminin / 1 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Feminin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 19),
('9 ani / Masculin / 1 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Masculin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 20),
('9 ani / Feminin / 2 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Feminin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 21),
('9 ani / Masculin / 2 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Masculin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 22),
('9 ani / Feminin / 3 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Feminin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 23),
('9 ani / Masculin / 3 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Masculin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 24),
('9 ani / Feminin / 4 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Feminin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 25),
('9 ani / Masculin / 4 Cap Rosu', 'thao_quyen_individual', 9, 9, 'Masculin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 26),
('9 ani / Feminin / Centura Violet - CV 1 Cap Alb', 'thao_quyen_individual', 9, 9, 'Feminin', 10, 11, NULL, 'individual', 1, 1, 0, 1, 27),
('9 ani / Masculin / Centura Violet - CV 1 Cap Alb', 'thao_quyen_individual', 9, 9, 'Masculin', 10, 11, NULL, 'individual', 1, 1, 0, 1, 28),
('10 ani / Feminin / 1 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Feminin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 29),
('10 ani / Masculin / 1 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Masculin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 30),
('10 ani / Feminin / 2 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Feminin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 31),
('10 ani / Masculin / 2 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Masculin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 32),
('10 ani / Feminin / 3 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Feminin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 33),
('10 ani / Masculin / 3 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Masculin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 34),
('10 ani / Feminin / 4 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Feminin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 35),
('10 ani / Masculin / 4 Cap Rosu', 'thao_quyen_individual', 10, 10, 'Masculin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 36),
('10 ani / Feminin / Centura Violet', 'thao_quyen_individual', 10, 10, 'Feminin', 10, 10, NULL, 'individual', 1, 1, 0, 1, 37),
('10 ani / Masculin / Centura Violet', 'thao_quyen_individual', 10, 10, 'Masculin', 10, 10, NULL, 'individual', 1, 1, 0, 1, 38),
('10 ani / Feminin / CV 1-2 Cap Alb', 'thao_quyen_individual', 10, 10, 'Feminin', 11, 12, NULL, 'individual', 1, 1, 0, 1, 39),
('10 ani / Masculin / CV 1-2 Cap Alb', 'thao_quyen_individual', 10, 10, 'Masculin', 11, 12, NULL, 'individual', 1, 1, 0, 1, 40),
('11 ani / Feminin / 1 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Feminin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 41),
('11 ani / Masculin / 1 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Masculin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 42),
('11 ani / Feminin / 2 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Feminin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 43),
('11 ani / Masculin / 2 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Masculin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 44),
('11 ani / Feminin / 3 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Feminin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 45),
('11 ani / Masculin / 3 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Masculin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 46),
('11 ani / Feminin / 4 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Feminin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 47),
('11 ani / Masculin / 4 Cap Rosu', 'thao_quyen_individual', 11, 11, 'Masculin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 48),
('11 ani / Feminin / Centura Violet', 'thao_quyen_individual', 11, 11, 'Feminin', 10, 10, NULL, 'individual', 1, 1, 0, 1, 49),
('11 ani / Masculin / Centura Violet', 'thao_quyen_individual', 11, 11, 'Masculin', 10, 10, NULL, 'individual', 1, 1, 0, 1, 50),
('11 ani / Feminin / CV 1 Cap Alb', 'thao_quyen_individual', 11, 11, 'Feminin', 11, 11, NULL, 'individual', 1, 1, 0, 1, 51),
('11 ani / Masculin / CV 1 Cap Alb', 'thao_quyen_individual', 11, 11, 'Masculin', 11, 11, NULL, 'individual', 1, 1, 0, 1, 52),
('11 ani / Feminin / CV 2-3 Cap Alb', 'thao_quyen_individual', 11, 11, 'Feminin', 12, 13, NULL, 'individual', 1, 1, 0, 1, 53),
('11 ani / Masculin / CV 2-3 Cap Alb', 'thao_quyen_individual', 11, 11, 'Masculin', 12, 13, NULL, 'individual', 1, 1, 0, 1, 54),
('12 ani / Feminin / 1 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Feminin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 55),
('12 ani / Masculin / 1 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Masculin', 6, 6, NULL, 'individual', 1, 1, 0, 1, 56),
('12 ani / Feminin / 2 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Feminin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 57),
('12 ani / Masculin / 2 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Masculin', 7, 7, NULL, 'individual', 1, 1, 0, 1, 58),
('12 ani / Feminin / 3 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Feminin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 59),
('12 ani / Masculin / 3 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Masculin', 8, 8, NULL, 'individual', 1, 1, 0, 1, 60),
('12 ani / Feminin / 4 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Feminin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 61),
('12 ani / Masculin / 4 Cap Rosu', 'thao_quyen_individual', 12, 12, 'Masculin', 9, 9, NULL, 'individual', 1, 1, 0, 1, 62),
('12 ani / Feminin / Centura Violet', 'thao_quyen_individual', 12, 12, 'Feminin', 10, 10, NULL, 'individual', 1, 1, 0, 1, 63),
('12 ani / Masculin / Centura Violet', 'thao_quyen_individual', 12, 12, 'Masculin', 10, 10, NULL, 'individual', 1, 1, 0, 1, 64),
('12 ani / Feminin / CV 1 Cap Alb', 'thao_quyen_individual', 12, 12, 'Feminin', 11, 11, NULL, 'individual', 1, 1, 0, 1, 65),
('12 ani / Masculin / CV 1 Cap Alb', 'thao_quyen_individual', 12, 12, 'Masculin', 11, 11, NULL, 'individual', 1, 1, 0, 1, 66),
('12 ani / Feminin / CV 2 Cap Alb', 'thao_quyen_individual', 12, 12, 'Feminin', 12, 12, NULL, 'individual', 1, 1, 0, 1, 67),
('12 ani / Masculin / CV 2 Cap Alb', 'thao_quyen_individual', 12, 12, 'Masculin', 12, 12, NULL, 'individual', 1, 1, 0, 1, 68),
('12 ani / Feminin / CV 3-4 Cap Alb', 'thao_quyen_individual', 12, 12, 'Feminin', 13, 14, NULL, 'individual', 1, 1, 0, 1, 69),
('12 ani / Masculin / CV 3-4 Cap Alb', 'thao_quyen_individual', 12, 12, 'Masculin', 13, 14, NULL, 'individual', 1, 1, 0, 1, 70),
('13 ani / Feminin / 1-2 Cap Albastru', 'thao_quyen_individual', 13, 13, 'Feminin', 15, 16, NULL, 'individual', 1, 1, 0, 1, 101),
('13 ani / Masculin / 1-2 Cap Albastru', 'thao_quyen_individual', 13, 13, 'Masculin', 15, 16, NULL, 'individual', 1, 1, 0, 1, 102),
('14 ani / Feminin / 1 Cap Albastru', 'thao_quyen_individual', 14, 14, 'Feminin', 15, 15, NULL, 'individual', 1, 1, 0, 1, 103),
('14 ani / Masculin / 1 Cap Albastru', 'thao_quyen_individual', 14, 14, 'Masculin', 15, 15, NULL, 'individual', 1, 1, 0, 1, 104),
('14 ani / Feminin / 2-3 Cap Albastru', 'thao_quyen_individual', 14, 14, 'Feminin', 16, 17, NULL, 'individual', 1, 1, 0, 1, 105),
('14 ani / Masculin / 2-3 Cap Albastru', 'thao_quyen_individual', 14, 14, 'Masculin', 16, 17, NULL, 'individual', 1, 1, 0, 1, 106),
('15 ani / Feminin / 1 Cap Albastru', 'thao_quyen_individual', 15, 15, 'Feminin', 15, 15, NULL, 'individual', 1, 1, 0, 1, 107),
('15 ani / Masculin / 1 Cap Albastru', 'thao_quyen_individual', 15, 15, 'Masculin', 15, 15, NULL, 'individual', 1, 1, 0, 1, 108),
('15 ani / Feminin / 2 Cap Albastru', 'thao_quyen_individual', 15, 15, 'Feminin', 16, 16, NULL, 'individual', 1, 1, 0, 1, 109),
('15 ani / Masculin / 2 Cap Albastru', 'thao_quyen_individual', 15, 15, 'Masculin', 16, 16, NULL, 'individual', 1, 1, 0, 1, 110),
('15 ani / Feminin / 3-4 Cap Albastru', 'thao_quyen_individual', 15, 15, 'Feminin', 17, 18, NULL, 'individual', 1, 1, 0, 1, 111),
('15 ani / Masculin / 3-4 Cap Albastru', 'thao_quyen_individual', 15, 15, 'Masculin', 17, 18, NULL, 'individual', 1, 1, 0, 1, 112)
ON CONFLICT (denumire) DO NOTHING;

-- SINCRON (18)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('7-10 ani / Feminin / Sincron', 'sincron', 7, 10, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 113),
('7-10 ani / Masculin / Sincron', 'sincron', 7, 10, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 114),
('7-10 ani / Mixt / Sincron', 'sincron', 7, 10, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 115),
('11-12 ani / Feminin / Sincron', 'sincron', 11, 12, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 116),
('11-12 ani / Masculin / Sincron', 'sincron', 11, 12, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 117),
('11-12 ani / Mixt / Sincron', 'sincron', 11, 12, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 118),
('13-15 ani / Feminin / Sincron', 'sincron', 13, 15, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 119),
('13-15 ani / Masculin / Sincron', 'sincron', 13, 15, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 120),
('13-15 ani / Mixt / Sincron', 'sincron', 13, 15, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 121),
('16-17 ani / Feminin / Sincron', 'sincron', 16, 17, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 122),
('16-17 ani / Masculin / Sincron', 'sincron', 16, 17, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 123),
('16-17 ani / Mixt / Sincron', 'sincron', 16, 17, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 124),
('18-39 ani / Feminin / Sincron', 'sincron', 18, 39, 'Feminin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 125),
('18-39 ani / Masculin / Sincron', 'sincron', 18, 39, 'Masculin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 126),
('18-39 ani / Mixt / Sincron', 'sincron', 18, 39, 'Mixt', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 127),
('Peste 40 ani / Feminin / Sincron', 'sincron', 40, NULL, 'Feminin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 128),
('Peste 40 ani / Masculin / Sincron', 'sincron', 40, NULL, 'Masculin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 129),
('Peste 40 ani / Mixt / Sincron', 'sincron', 40, NULL, 'Mixt', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 130)
ON CONFLICT (denumire) DO NOTHING;

-- SONG LUYEN Tehnica (18)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('7-10 ani / Feminin / Song Luyen', 'song_luyen', 7, 10, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 131),
('7-10 ani / Masculin / Song Luyen', 'song_luyen', 7, 10, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 132),
('7-10 ani / Mixt / Song Luyen', 'song_luyen', 7, 10, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 133),
('11-12 ani / Feminin / Song Luyen', 'song_luyen', 11, 12, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 134),
('11-12 ani / Masculin / Song Luyen', 'song_luyen', 11, 12, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 135),
('11-12 ani / Mixt / Song Luyen', 'song_luyen', 11, 12, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 136),
('13-15 ani / Feminin / Song Luyen', 'song_luyen', 13, 15, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 137),
('13-15 ani / Masculin / Song Luyen', 'song_luyen', 13, 15, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 138),
('13-15 ani / Mixt / Song Luyen', 'song_luyen', 13, 15, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 139),
('16-17 ani / Feminin / Song Luyen', 'song_luyen', 16, 17, 'Feminin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 140),
('16-17 ani / Masculin / Song Luyen', 'song_luyen', 16, 17, 'Masculin', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 141),
('16-17 ani / Mixt / Song Luyen', 'song_luyen', 16, 17, 'Mixt', 1, 4, NULL, 'pereche', 2, 2, 0, 1, 142),
('18-39 ani / Feminin / Song Luyen', 'song_luyen', 18, 39, 'Feminin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 143),
('18-39 ani / Masculin / Song Luyen', 'song_luyen', 18, 39, 'Masculin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 144),
('18-39 ani / Mixt / Song Luyen', 'song_luyen', 18, 39, 'Mixt', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 145),
('Peste 40 ani / Feminin / Song Luyen', 'song_luyen', 40, NULL, 'Feminin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 146),
('Peste 40 ani / Masculin / Song Luyen', 'song_luyen', 40, NULL, 'Masculin', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 147),
('Peste 40 ani / Mixt / Song Luyen', 'song_luyen', 40, NULL, 'Mixt', 1, NULL, NULL, 'pereche', 2, 2, 0, 1, 148)
ON CONFLICT (denumire) DO NOTHING;

-- GIAO DAU CN Copii si Juniori (20)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('7-8 ani / Feminin / grad 1-2 / Giao Dau', 'giao_dau', 7, 8, 'Feminin', 1, 2, NULL, 'pereche', 2, 2, 2, 1, 200),
('7-8 ani / Masculin / grad 1-2 / Giao Dau', 'giao_dau', 7, 8, 'Masculin', 1, 2, NULL, 'pereche', 2, 2, 2, 1, 201),
('7-8 ani / Feminin / grad 3-4 / Giao Dau', 'giao_dau', 7, 8, 'Feminin', 3, 4, NULL, 'pereche', 2, 2, 2, 1, 202),
('7-8 ani / Masculin / grad 3-4 / Giao Dau', 'giao_dau', 7, 8, 'Masculin', 3, 4, NULL, 'pereche', 2, 2, 2, 1, 203),
('9-10 ani / Feminin / grad 1-2 / Giao Dau', 'giao_dau', 9, 10, 'Feminin', 1, 2, NULL, 'pereche', 2, 2, 2, 1, 204),
('9-10 ani / Masculin / grad 1-2 / Giao Dau', 'giao_dau', 9, 10, 'Masculin', 1, 2, NULL, 'pereche', 2, 2, 2, 1, 205),
('9-10 ani / Feminin / grad 3-4 / Giao Dau', 'giao_dau', 9, 10, 'Feminin', 3, 4, NULL, 'pereche', 2, 2, 2, 1, 206),
('9-10 ani / Masculin / grad 3-4 / Giao Dau', 'giao_dau', 9, 10, 'Masculin', 3, 4, NULL, 'pereche', 2, 2, 2, 1, 207),
('9-10 ani / Feminin / min grad 5 / Giao Dau', 'giao_dau', 9, 10, 'Feminin', 5, NULL, NULL, 'pereche', 2, 2, 2, 1, 208),
('9-10 ani / Masculin / min grad 5 / Giao Dau', 'giao_dau', 9, 10, 'Masculin', 5, NULL, NULL, 'pereche', 2, 2, 2, 1, 209),
('11-12 ani / Feminin / grad 1-2 / Giao Dau', 'giao_dau', 11, 12, 'Feminin', 1, 2, NULL, 'pereche', 2, 2, 2, 1, 210),
('11-12 ani / Masculin / grad 1-2 / Giao Dau', 'giao_dau', 11, 12, 'Masculin', 1, 2, NULL, 'pereche', 2, 2, 2, 1, 211),
('11-12 ani / Feminin / grad 3-4 / Giao Dau', 'giao_dau', 11, 12, 'Feminin', 3, 4, NULL, 'pereche', 2, 2, 2, 1, 212),
('11-12 ani / Masculin / grad 3-4 / Giao Dau', 'giao_dau', 11, 12, 'Masculin', 3, 4, NULL, 'pereche', 2, 2, 2, 1, 213),
('11-12 ani / Feminin / min grad 5 / Giao Dau', 'giao_dau', 11, 12, 'Feminin', 5, NULL, NULL, 'pereche', 2, 2, 2, 1, 214),
('11-12 ani / Masculin / min grad 5 / Giao Dau', 'giao_dau', 11, 12, 'Masculin', 5, NULL, NULL, 'pereche', 2, 2, 2, 1, 215),
('13-15 ani / Feminin / grad 1 / Giao Dau', 'giao_dau', 13, 15, 'Feminin', 1, 1, NULL, 'pereche', 2, 2, 2, 1, 216),
('13-15 ani / Masculin / grad 1 / Giao Dau', 'giao_dau', 13, 15, 'Masculin', 1, 1, NULL, 'pereche', 2, 2, 2, 1, 217),
('13-15 ani / Feminin / grad 2-4 / Giao Dau', 'giao_dau', 13, 15, 'Feminin', 2, 4, NULL, 'pereche', 2, 2, 2, 1, 218),
('13-15 ani / Masculin / grad 2-4 / Giao Dau', 'giao_dau', 13, 15, 'Masculin', 2, 4, NULL, 'pereche', 2, 2, 2, 1, 219)
ON CONFLICT (denumire) DO NOTHING;

-- THAO LO INDIVIDUAL Grade (18)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('13-15 ani / Feminin / grad 1 / Bong', 'thao_lo_individual', 13, 15, 'Feminin', 1, 1, 'Bong', 'individual', 1, 1, 0, 99, 300),
('13-15 ani / Masculin / grad 1 / Bong', 'thao_lo_individual', 13, 15, 'Masculin', 1, 1, 'Bong', 'individual', 1, 1, 0, 99, 301),
('13-15 ani / Feminin / grad 2-4 / Bong', 'thao_lo_individual', 13, 15, 'Feminin', 2, 4, 'Bong', 'individual', 1, 1, 0, 99, 302),
('13-15 ani / Masculin / grad 2-4 / Bong', 'thao_lo_individual', 13, 15, 'Masculin', 2, 4, 'Bong', 'individual', 1, 1, 0, 99, 303),
('13-15 ani / Feminin / grad 1-4 / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 13, 15, 'Feminin', 1, 4, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 304),
('13-15 ani / Masculin / grad 1-4 / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 13, 15, 'Masculin', 1, 4, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 305),
('16-17 ani / Feminin / grad 1-2 / Bong', 'thao_lo_individual', 16, 17, 'Feminin', 1, 2, 'Bong', 'individual', 1, 1, 0, 99, 306),
('16-17 ani / Masculin / grad 1-2 / Bong', 'thao_lo_individual', 16, 17, 'Masculin', 1, 2, 'Bong', 'individual', 1, 1, 0, 99, 307),
('16-17 ani / Feminin / grad 3-4 / Bong', 'thao_lo_individual', 16, 17, 'Feminin', 3, 4, 'Bong', 'individual', 1, 1, 0, 99, 308),
('16-17 ani / Masculin / grad 3-4 / Bong', 'thao_lo_individual', 16, 17, 'Masculin', 3, 4, 'Bong', 'individual', 1, 1, 0, 99, 309),
('16-17 ani / Feminin / grad 1-4 / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 16, 17, 'Feminin', 1, 4, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 310),
('16-17 ani / Masculin / grad 1-4 / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 16, 17, 'Masculin', 1, 4, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 311),
('18-39 ani / Feminin / grad 1-4 / Bong', 'thao_lo_individual', 18, 39, 'Feminin', 1, 4, 'Bong', 'individual', 1, 1, 0, 99, 312),
('18-39 ani / Masculin / grad 1-4 / Bong', 'thao_lo_individual', 18, 39, 'Masculin', 1, 4, 'Bong', 'individual', 1, 1, 0, 99, 313),
('18-39 ani / Feminin / grad 1-4 / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 18, 39, 'Feminin', 1, 4, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 314),
('18-39 ani / Masculin / grad 1-4 / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 18, 39, 'Masculin', 1, 4, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 315),
('Peste 40 ani / Feminin / grad 1-4 / Bong / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 40, NULL, 'Feminin', 1, 4, 'Bong / Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 316),
('Peste 40 ani / Masculin / grad 1-4 / Bong / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 40, NULL, 'Masculin', 1, 4, 'Bong / Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 317)
ON CONFLICT (denumire) DO NOTHING;

-- SONG LUYEN CVD Grade (12)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('13-15 ani / Feminin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 13, 15, 'Feminin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 320),
('13-15 ani / Masculin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 13, 15, 'Masculin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 321),
('13-15 ani / Mixt / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 13, 15, 'Mixt', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 322),
('16-17 ani / Feminin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 16, 17, 'Feminin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 323),
('16-17 ani / Masculin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 16, 17, 'Masculin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 324),
('16-17 ani / Mixt / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 16, 17, 'Mixt', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 325),
('18-39 ani / Feminin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 18, 39, 'Feminin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 326),
('18-39 ani / Masculin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 18, 39, 'Masculin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 327),
('18-39 ani / Mixt / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 18, 39, 'Mixt', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 328),
('Peste 40 ani / Feminin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 40, NULL, 'Feminin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 329),
('Peste 40 ani / Masculin / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 40, NULL, 'Masculin', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 330),
('Peste 40 ani / Mixt / grad 1-4 / Bong-Song Cot-Moc Can / Song Luyen CVD', 'song_luyen', 40, NULL, 'Mixt', 1, 4, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 331)
ON CONFLICT (denumire) DO NOTHING;

-- THAO LO INDIVIDUAL CN (26)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('18-39 ani / Feminin / CN 5 Dang / Bong', 'thao_lo_individual', 18, 39, 'Feminin', 5, 5, 'Bong', 'individual', 1, 1, 0, 99, 340),
('18-39 ani / Masculin / CN 5 Dang / Bong', 'thao_lo_individual', 18, 39, 'Masculin', 5, 5, 'Bong', 'individual', 1, 1, 0, 99, 341),
('18-39 ani / Feminin / CN 6-9 Dang / Bong', 'thao_lo_individual', 18, 39, 'Feminin', 6, 9, 'Bong', 'individual', 1, 1, 0, 99, 342),
('18-39 ani / Masculin / CN 6-9 Dang / Bong', 'thao_lo_individual', 18, 39, 'Masculin', 6, 9, 'Bong', 'individual', 1, 1, 0, 99, 343),
('18-39 ani / Feminin / CN 5-9 Dang / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 18, 39, 'Feminin', 5, 9, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 344),
('18-39 ani / Masculin / CN 5-9 Dang / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 18, 39, 'Masculin', 5, 9, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 345),
('18-39 ani / Feminin / CN 5-9 Dang / Moc Guom', 'thao_lo_individual', 18, 39, 'Feminin', 5, 9, 'Moc Guom', 'individual', 1, 1, 0, 99, 346),
('18-39 ani / Masculin / CN 5-9 Dang / Moc Guom', 'thao_lo_individual', 18, 39, 'Masculin', 5, 9, 'Moc Guom', 'individual', 1, 1, 0, 99, 347),
('18-39 ani / Feminin / CN 5-9 Dang / Song Diep Dao / Yen Dao / Ma Dao / Dai Dao', 'thao_lo_individual', 18, 39, 'Feminin', 5, 9, 'Song Diep Dao / Yen Dao / Ma Dao / Dai Dao', 'individual', 1, 1, 0, 99, 348),
('18-39 ani / Masculin / CN 5-9 Dang / Song Diep Dao / Yen Dao / Ma Dao / Dai Dao', 'thao_lo_individual', 18, 39, 'Masculin', 5, 9, 'Song Diep Dao / Yen Dao / Ma Dao / Dai Dao', 'individual', 1, 1, 0, 99, 349),
('18-39 ani / Feminin / CN 5-9 Dang / 2 Long Gian / Tam Thiet Gian / Nhuyen Tien', 'thao_lo_individual', 18, 39, 'Feminin', 5, 9, '2 Long Gian / Tam Thiet Gian / Nhuyen Tien', 'individual', 1, 1, 0, 99, 350),
('18-39 ani / Masculin / CN 5-9 Dang / 2 Long Gian / Tam Thiet Gian / Nhuyen Tien', 'thao_lo_individual', 18, 39, 'Masculin', 5, 9, '2 Long Gian / Tam Thiet Gian / Nhuyen Tien', 'individual', 1, 1, 0, 99, 351),
('40-49 ani / Feminin / CN 5 Dang / Bong', 'thao_lo_individual', 40, 49, 'Feminin', 5, 5, 'Bong', 'individual', 1, 1, 0, 99, 352),
('40-49 ani / Masculin / CN 5-6 Dang / Bong', 'thao_lo_individual', 40, 49, 'Masculin', 5, 6, 'Bong', 'individual', 1, 1, 0, 99, 353),
('40-49 ani / Feminin / CN 6-10 Dang / Bong', 'thao_lo_individual', 40, 49, 'Feminin', 6, 10, 'Bong', 'individual', 1, 1, 0, 99, 354),
('40-49 ani / Masculin / CN 7-10 Dang / Bong', 'thao_lo_individual', 40, 49, 'Masculin', 7, 10, 'Bong', 'individual', 1, 1, 0, 99, 355),
('40-49 ani / Feminin / CN 5-10 Dang / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 40, 49, 'Feminin', 5, 10, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 356),
('40-49 ani / Masculin / CN 5-10 Dang / Long Gian / Song Cot / Moc Can', 'thao_lo_individual', 40, 49, 'Masculin', 5, 10, 'Long Gian / Song Cot / Moc Can', 'individual', 1, 1, 0, 99, 357),
('40-49 ani / Feminin / CN 5-10 Dang / Moc Guom', 'thao_lo_individual', 40, 49, 'Feminin', 5, 10, 'Moc Guom', 'individual', 1, 1, 0, 99, 358),
('40-49 ani / Masculin / CN 5-10 Dang / Moc Guom', 'thao_lo_individual', 40, 49, 'Masculin', 5, 10, 'Moc Guom', 'individual', 1, 1, 0, 99, 359),
('40-49 ani / Feminin / CN 5-10 Dang / Arme cu lama si articulate', 'thao_lo_individual', 40, 49, 'Feminin', 5, 10, 'Arme cu lama si articulate', 'individual', 1, 1, 0, 99, 360),
('40-49 ani / Masculin / CN 5-10 Dang / Arme cu lama si articulate', 'thao_lo_individual', 40, 49, 'Masculin', 5, 10, 'Arme cu lama si articulate', 'individual', 1, 1, 0, 99, 361),
('Peste 50 ani / Feminin / CN 5-10 Dang / Bong / Long Gian / Song Cot / Moc Guom', 'thao_lo_individual', 50, NULL, 'Feminin', 5, 10, 'Bong / Long Gian / Song Cot / Moc Guom', 'individual', 1, 1, 0, 99, 362),
('Peste 50 ani / Masculin / CN 5-10 Dang / Bong / Long Gian / Song Cot / Moc Guom', 'thao_lo_individual', 50, NULL, 'Masculin', 5, 10, 'Bong / Long Gian / Song Cot / Moc Guom', 'individual', 1, 1, 0, 99, 363),
('Peste 50 ani / Feminin / CN 5-10 Dang / Arme cu lama si articulate', 'thao_lo_individual', 50, NULL, 'Feminin', 5, 10, 'Arme cu lama si articulate', 'individual', 1, 1, 0, 99, 364),
('Peste 50 ani / Masculin / CN 5-10 Dang / Arme cu lama si articulate', 'thao_lo_individual', 50, NULL, 'Masculin', 5, 10, 'Arme cu lama si articulate', 'individual', 1, 1, 0, 99, 365)
ON CONFLICT (denumire) DO NOTHING;

-- SONG LUYEN CVD CN (12)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('18-39 ani / Feminin / CN 5-9 Dang / Bong / Song Cot / Moc Can / Song Luyen CVD', 'song_luyen', 18, 39, 'Feminin', 5, 9, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 370),
('18-39 ani / Masculin / CN 5-9 Dang / Bong / Song Cot / Moc Can / Song Luyen CVD', 'song_luyen', 18, 39, 'Masculin', 5, 9, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 371),
('18-39 ani / Mixt / CN 5-9 Dang / Bong / Song Cot / Moc Can / Song Luyen CVD', 'song_luyen', 18, 39, 'Mixt', 5, 9, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 372),
('18-39 ani / Feminin / CN 5-9 Dang / Arme cu lama si articulate / Song Luyen CVD', 'song_luyen', 18, 39, 'Feminin', 5, 9, 'Arme cu lama si articulate', 'pereche', 2, 2, 0, 1, 373),
('18-39 ani / Masculin / CN 5-9 Dang / Arme cu lama si articulate / Song Luyen CVD', 'song_luyen', 18, 39, 'Masculin', 5, 9, 'Arme cu lama si articulate', 'pereche', 2, 2, 0, 1, 374),
('18-39 ani / Mixt / CN 5-9 Dang / Arme cu lama si articulate / Song Luyen CVD', 'song_luyen', 18, 39, 'Mixt', 5, 9, 'Arme cu lama si articulate', 'pereche', 2, 2, 0, 1, 375),
('Peste 40 ani / Feminin / CN 5-10 Dang / Bong / Song Cot / Moc Can / Song Luyen CVD', 'song_luyen', 40, NULL, 'Feminin', 5, 10, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 376),
('Peste 40 ani / Masculin / CN 5-10 Dang / Bong / Song Cot / Moc Can / Song Luyen CVD', 'song_luyen', 40, NULL, 'Masculin', 5, 10, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 377),
('Peste 40 ani / Mixt / CN 5-10 Dang / Bong / Song Cot / Moc Can / Song Luyen CVD', 'song_luyen', 40, NULL, 'Mixt', 5, 10, 'Bong / Song Cot / Moc Can', 'pereche', 2, 2, 0, 1, 378),
('Peste 40 ani / Feminin / CN 5-10 Dang / Arme cu lama si articulate / Song Luyen CVD', 'song_luyen', 40, NULL, 'Feminin', 5, 10, 'Arme cu lama si articulate', 'pereche', 2, 2, 0, 1, 379),
('Peste 40 ani / Masculin / CN 5-10 Dang / Arme cu lama si articulate / Song Luyen CVD', 'song_luyen', 40, NULL, 'Masculin', 5, 10, 'Arme cu lama si articulate', 'pereche', 2, 2, 0, 1, 380),
('Peste 40 ani / Mixt / CN 5-10 Dang / Arme cu lama si articulate / Song Luyen CVD', 'song_luyen', 40, NULL, 'Mixt', 5, 10, 'Arme cu lama si articulate', 'pereche', 2, 2, 0, 1, 381)
ON CONFLICT (denumire) DO NOTHING;

-- GIAO DAU CVD Grade (12)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('13-14 ani / Feminin / grad 2-4 / Giao Dau CVD', 'giao_dau', 13, 14, 'Feminin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 400),
('13-14 ani / Masculin / grad 2-4 / Giao Dau CVD', 'giao_dau', 13, 14, 'Masculin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 401),
('15 ani / Feminin / grad 2-4 / Giao Dau CVD', 'giao_dau', 15, 15, 'Feminin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 402),
('15 ani / Masculin / grad 2-4 / Giao Dau CVD', 'giao_dau', 15, 15, 'Masculin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 403),
('16 ani / Feminin / grad 2-4 / Giao Dau CVD', 'giao_dau', 16, 16, 'Feminin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 404),
('16 ani / Masculin / grad 2-4 / Giao Dau CVD', 'giao_dau', 16, 16, 'Masculin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 405),
('17 ani / Feminin / grad 2-4 / Giao Dau CVD', 'giao_dau', 17, 17, 'Feminin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 406),
('17 ani / Masculin / grad 2-4 / Giao Dau CVD', 'giao_dau', 17, 17, 'Masculin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 407),
('18-39 ani / Feminin / grad 2-4 / Giao Dau CVD', 'giao_dau', 18, 39, 'Feminin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 408),
('18-39 ani / Masculin / grad 2-4 / Giao Dau CVD', 'giao_dau', 18, 39, 'Masculin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 409),
('40-49 ani / Feminin / grad 2-4 / Giao Dau CVD', 'giao_dau', 40, 49, 'Feminin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 410),
('40-49 ani / Masculin / grad 2-4 / Giao Dau CVD', 'giao_dau', 40, 49, 'Masculin', 2, 4, NULL, 'individual', 1, 1, 0, 99, 411)
ON CONFLICT (denumire) DO NOTHING;

-- GIAO DAU CVD CN (8)
INSERT INTO public.categorii_template (denumire, tip_proba, varsta_min, varsta_max, gen, grad_min_ordine, grad_max_ordine, arma, tip_participare, sportivi_per_echipa_min, sportivi_per_echipa_max, rezerve_max, max_echipe_per_club, ordine_afisare) VALUES
('18-24 ani / Feminin / CN 5-7 Dang / Giao Dau CVD', 'giao_dau', 18, 24, 'Feminin', 5, 7, NULL, 'individual', 1, 1, 0, 99, 420),
('18-24 ani / Masculin / CN 5-7 Dang / Giao Dau CVD', 'giao_dau', 18, 24, 'Masculin', 5, 7, NULL, 'individual', 1, 1, 0, 99, 421),
('25-39 ani / Feminin / CN 5-9 Dang / Giao Dau CVD', 'giao_dau', 25, 39, 'Feminin', 5, 9, NULL, 'individual', 1, 1, 0, 99, 422),
('25-39 ani / Masculin / CN 5-9 Dang / Giao Dau CVD', 'giao_dau', 25, 39, 'Masculin', 5, 9, NULL, 'individual', 1, 1, 0, 99, 423),
('40-49 ani / Feminin / CN 5-10 Dang / Giao Dau CVD', 'giao_dau', 40, 49, 'Feminin', 5, 10, NULL, 'individual', 1, 1, 0, 99, 424),
('40-49 ani / Masculin / CN 5-10 Dang / Giao Dau CVD', 'giao_dau', 40, 49, 'Masculin', 5, 10, NULL, 'individual', 1, 1, 0, 99, 425),
('50-59 ani / Feminin / CN 5-10 Dang / Giao Dau CVD', 'giao_dau', 50, 59, 'Feminin', 5, 10, NULL, 'individual', 1, 1, 0, 99, 426),
('50-59 ani / Masculin / CN 5-10 Dang / Giao Dau CVD', 'giao_dau', 50, 59, 'Masculin', 5, 10, NULL, 'individual', 1, 1, 0, 99, 427)
ON CONFLICT (denumire) DO NOTHING;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'categorii_template: 220 rows (76 tq_individual, 18 sincron, 42 song_luyen, 40 giao_dau, 44 thao_lo_individual)';
END $$;
