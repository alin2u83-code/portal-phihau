-- =====================================================
-- MIGRATION: competitii_schema
-- Sistem complet de gestionare competiții Qwan Ki Do
-- Tipuri suportate:
--   1. tehnica   - CN Copii/Juniori: Thao Quyen, Sincron, Song Luyen
--   2. giao_dau  - CN Giao Dau: lupte pe echipe (perechi)
--   3. cvd       - CN Co Vo Dao: arme tradiționale (Thao Lo, Song Luyen, Giao Dau)
-- =====================================================

-- -----------------------------------------------
-- TABELA PRINCIPALĂ: competitii
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitii (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denumire            TEXT NOT NULL,
    tip                 TEXT NOT NULL CHECK (tip IN ('tehnica', 'giao_dau', 'cvd')),
    data_inceput        DATE NOT NULL,
    data_sfarsit        DATE NOT NULL,
    locatie             TEXT,
    organizator         TEXT,
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'inscrieri_deschise', 'inscrieri_inchise', 'finalizata')),
    deadline_inscrieri  DATE,
    club_id             UUID REFERENCES public.cluburi(id) ON DELETE SET NULL,
    taxa_individual     NUMERIC(10,2) DEFAULT 0,
    taxa_echipa         NUMERIC(10,2) DEFAULT 0,
    observatii          TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- PROBE (sub-competiții)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.probe_competitie (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitie_id   UUID NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    tip_proba       TEXT NOT NULL CHECK (tip_proba IN (
                        'thao_quyen_individual',  -- kata individual (tehnica)
                        'sincron',                -- 2 sportivi sincron (tehnica)
                        'song_luyen',             -- perechi (tehnica/cvd)
                        'giao_dau',               -- lupte (giao_dau/cvd)
                        'thao_lo_individual'      -- kata arme individual (cvd)
                    )),
    denumire        TEXT NOT NULL,
    ordine_afisare  INTEGER DEFAULT 0
);

-- -----------------------------------------------
-- CATEGORII (definiții eligibilitate)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorii_competitie (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitie_id           UUID NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    proba_id                UUID REFERENCES public.probe_competitie(id) ON DELETE CASCADE,
    numar_categorie         INTEGER,
    denumire                TEXT,                   -- ex: "13-15 ani / Feminin / 1-2 CAP / Bong"
    varsta_min              INTEGER NOT NULL,
    varsta_max              INTEGER,                -- NULL = fără limită superioară
    gen                     TEXT NOT NULL CHECK (gen IN ('Feminin', 'Masculin', 'Mixt')),
    grad_min_ordine         INTEGER,                -- NULL = orice grad
    grad_max_ordine         INTEGER,                -- NULL = fără limită superioară
    arma                    TEXT,                   -- pentru CVD: "Bong", "1 Long Gian", etc.
    tip_participare         TEXT NOT NULL DEFAULT 'individual'
                            CHECK (tip_participare IN ('individual', 'pereche', 'echipa')),
    sportivi_per_echipa_min INTEGER DEFAULT 1,
    sportivi_per_echipa_max INTEGER DEFAULT 1,
    rezerve_max             INTEGER DEFAULT 0,
    max_echipe_per_club     INTEGER DEFAULT 1,
    min_participanti_start  INTEGER DEFAULT 3,      -- min inscrieri pentru ca proba să se desfășoare
    ordine_afisare          INTEGER DEFAULT 0
);

-- -----------------------------------------------
-- ÎNREGISTRĂRI INDIVIDUALE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.inscrieri_competitie (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitie_id   UUID NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    categorie_id    UUID NOT NULL REFERENCES public.categorii_competitie(id) ON DELETE CASCADE,
    club_id         UUID NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    sportiv_id      UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'inscris'
                    CHECK (status IN ('inscris', 'confirmat', 'retras', 'descalificat')),
    taxa_achitata   BOOLEAN DEFAULT FALSE,
    observatii      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (categorie_id, sportiv_id)
);

-- -----------------------------------------------
-- ECHIPE (Song Luyen, Sincron, Giao Dau echipe)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.echipe_competitie (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitie_id   UUID NOT NULL REFERENCES public.competitii(id) ON DELETE CASCADE,
    categorie_id    UUID NOT NULL REFERENCES public.categorii_competitie(id) ON DELETE CASCADE,
    club_id         UUID NOT NULL REFERENCES public.cluburi(id) ON DELETE CASCADE,
    denumire_echipa TEXT,
    status          TEXT NOT NULL DEFAULT 'inscrisa'
                    CHECK (status IN ('inscrisa', 'confirmata', 'retrasa', 'descalificata')),
    taxa_achitata   BOOLEAN DEFAULT FALSE,
    observatii      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.echipa_sportivi (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    echipa_id   UUID NOT NULL REFERENCES public.echipe_competitie(id) ON DELETE CASCADE,
    sportiv_id  UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    rol         TEXT NOT NULL DEFAULT 'titular'
                CHECK (rol IN ('titular', 'rezerva')),
    UNIQUE (echipa_id, sportiv_id)
);

-- -----------------------------------------------
-- INDEXURI
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_probe_competitie_competitie_id ON public.probe_competitie(competitie_id);
CREATE INDEX IF NOT EXISTS idx_categorii_competitie_id ON public.categorii_competitie(competitie_id);
CREATE INDEX IF NOT EXISTS idx_categorii_proba_id ON public.categorii_competitie(proba_id);
CREATE INDEX IF NOT EXISTS idx_inscrieri_competitie_id ON public.inscrieri_competitie(competitie_id);
CREATE INDEX IF NOT EXISTS idx_inscrieri_club_id ON public.inscrieri_competitie(club_id);
CREATE INDEX IF NOT EXISTS idx_inscrieri_sportiv_id ON public.inscrieri_competitie(sportiv_id);
CREATE INDEX IF NOT EXISTS idx_echipe_competitie_id ON public.echipe_competitie(competitie_id);
CREATE INDEX IF NOT EXISTS idx_echipe_club_id ON public.echipe_competitie(club_id);
CREATE INDEX IF NOT EXISTS idx_echipa_sportivi_echipa_id ON public.echipa_sportivi(echipa_id);

-- -----------------------------------------------
-- RLS POLICIES
-- -----------------------------------------------
ALTER TABLE public.competitii ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.probe_competitie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorii_competitie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscrieri_competitie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echipe_competitie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echipa_sportivi ENABLE ROW LEVEL SECURITY;

-- competitii: toți autentificații pot vedea competițiile deschise
CREATE POLICY "competitii_select_all" ON public.competitii
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "competitii_insert_admin" ON public.competitii
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin')
        )
    );

CREATE POLICY "competitii_update_admin" ON public.competitii
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin')
        )
    );

CREATE POLICY "competitii_delete_admin" ON public.competitii
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin')
        )
    );

-- probe_competitie: toți pot vedea
CREATE POLICY "probe_select_all" ON public.probe_competitie
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "probe_manage_admin" ON public.probe_competitie
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin')
        )
    );

-- categorii_competitie: toți pot vedea
CREATE POLICY "categorii_select_all" ON public.categorii_competitie
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "categorii_manage_admin" ON public.categorii_competitie
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin')
        )
    );

-- inscrieri: admin vede toate, club vede propriile
CREATE POLICY "inscrieri_select" ON public.inscrieri_competitie
    FOR SELECT USING (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "inscrieri_insert_club" ON public.inscrieri_competitie
    FOR INSERT WITH CHECK (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "inscrieri_update_club" ON public.inscrieri_competitie
    FOR UPDATE USING (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "inscrieri_delete_club" ON public.inscrieri_competitie
    FOR DELETE USING (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

-- echipe: similar cu inscrieri
CREATE POLICY "echipe_select" ON public.echipe_competitie
    FOR SELECT USING (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "echipe_insert_club" ON public.echipe_competitie
    FOR INSERT WITH CHECK (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "echipe_update_club" ON public.echipe_competitie
    FOR UPDATE USING (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "echipe_delete_club" ON public.echipe_competitie
    FOR DELETE USING (
        club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
        )
    );

CREATE POLICY "echipa_sportivi_select" ON public.echipa_sportivi
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.echipe_competitie e
            WHERE e.id = echipa_id
            AND (
                e.club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                    AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
                )
            )
        )
    );

CREATE POLICY "echipa_sportivi_manage" ON public.echipa_sportivi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.echipe_competitie e
            WHERE e.id = echipa_id
            AND (
                e.club_id = (SELECT club_id FROM public.sportivi WHERE user_id = auth.uid() LIMIT 1)
                OR EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = auth.uid()
                    AND ur.rol IN ('super_admin', 'federation_admin', 'admin')
                )
            )
        )
    );

-- -----------------------------------------------
-- UPDATED_AT TRIGGER
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.update_competitii_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_competitii_updated_at
    BEFORE UPDATE ON public.competitii
    FOR EACH ROW EXECUTE FUNCTION public.update_competitii_updated_at();

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'competitii_schema created successfully.';
END $$;
