-- =============================================================================
-- Migration: taxa_anuala_federatie_schema_260912.sql
-- Subiect: Repara schema orfana deconturi_federatie (adauga club_id/an_fiscal),
--          adauga constrangeri de unicitate idempotenta pe decont_sportivi si
--          vize_sportivi, creeaza taxa_anuala_config (pretul sezonului).
-- Vezi: .planning/phases/29-taxa-anuala-federatie-frqkd-activare-automata-club-federatie/29-SCHEMA-AUDIT.md
--       (verdicte B1-B6 care fundamenteaza deciziile de mai jos)
-- Rulare: aplicata live prin MCP Supabase apply_migration pe wuhidifzsutwgdfkwhmd
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sectiunea 1 — ALTER public.deconturi_federatie (D-02), exclusiv aditiv
-- -----------------------------------------------------------------------------

ALTER TABLE public.deconturi_federatie
    ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS an_fiscal INTEGER,
    ADD COLUMN IF NOT EXISTS tip_activitate TEXT DEFAULT 'FRQKD',
    ADD COLUMN IF NOT EXISTS nr_participanti INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status_plata TEXT DEFAULT 'In asteptare',
    ADD COLUMN IF NOT EXISTS metoda_plata TEXT,
    ADD COLUMN IF NOT EXISTS data_generare TIMESTAMPTZ DEFAULT now();

-- data_generare nu e in D-02, dar types.ts (DecontFederatie.data_generare),
-- components/FederationInvoices.tsx (liniile 241-243, 341) si AdminMasterMap.tsx
-- il citesc deja. Adaugare descoperita in planificare, nu decizie de utilizator.
-- Populare retroactiva (tabela e goala azi conform audit sectiunea 7, dar
-- instructia ramane corecta si re-rulabila pentru orice rand viitor cu NULL).
UPDATE public.deconturi_federatie
SET data_generare = COALESCE(data_decont::timestamptz, created_at)
WHERE data_generare IS NULL;

-- Constrangeri idempotente (blocuri DO conditionate de pg_constraint)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deconturi_federatie_status_plata_check'
    ) THEN
        ALTER TABLE public.deconturi_federatie
            ADD CONSTRAINT deconturi_federatie_status_plata_check
            CHECK (status_plata IN ('In asteptare', 'Platit'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'deconturi_federatie_metoda_plata_check'
    ) THEN
        ALTER TABLE public.deconturi_federatie
            ADD CONSTRAINT deconturi_federatie_metoda_plata_check
            CHECK (metoda_plata IS NULL OR metoda_plata IN ('Cash', 'Transfer Bancar', 'Revolut'));
    END IF;
END $$;

-- Index unic obligatoriu inainte de orice ON CONFLICT (club_id, an_fiscal)
-- folosit in 29-02 (functia de activare) si in migratia de backfill (Task 3).
CREATE UNIQUE INDEX IF NOT EXISTS deconturi_federatie_club_an_fiscal_key
    ON public.deconturi_federatie (club_id, an_fiscal);

CREATE INDEX IF NOT EXISTS deconturi_federatie_club_id_idx ON public.deconturi_federatie (club_id);
CREATE INDEX IF NOT EXISTS deconturi_federatie_status_idx ON public.deconturi_federatie (status_plata);
CREATE INDEX IF NOT EXISTS deconturi_federatie_data_generare_idx ON public.deconturi_federatie (data_generare DESC);

-- SET NOT NULL doar daca tabela e goala azi (audit sectiunea 7: count=0).
-- Conditionat explicit ca sa nu esueze niciodata daca ruleaza dupa ce au
-- aparut deja randuri (de ex. re-rulare partiala dupa un backfill).
DO $$
BEGIN
    IF (SELECT count(*) FROM public.deconturi_federatie) = 0 THEN
        ALTER TABLE public.deconturi_federatie ALTER COLUMN club_id SET NOT NULL;
        ALTER TABLE public.deconturi_federatie ALTER COLUMN an_fiscal SET NOT NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Sectiunea 2 — constrangeri de idempotenta (D-03, D-04)
-- -----------------------------------------------------------------------------

-- decont_sportivi: UNIQUE(sportiv_id, an) NU exista live (audit sectiunea 3,
-- doar UNIQUE(decont_id, sportiv_id) si un index neunic pe sportiv_id+an).
-- Se adauga PE LANGA cea existenta, care ramane neatinsa (folosita ca
-- onConflict in components/FederationInvoices.tsx linia 288).
CREATE UNIQUE INDEX IF NOT EXISTS decont_sportivi_sportiv_an_key
    ON public.decont_sportivi (sportiv_id, an);

-- vize_sportivi: audit sectiunea 2 confirma ca UNIQUE(sportiv_id, an) EXISTA
-- deja sub numele uq_viza_sportiv_an. Nu se creeaza un al doilea index identic.
-- 29-02 si migratia de backfill trebuie sa foloseasca "ON CONFLICT (sportiv_id, an)"
-- care se leaga automat de uq_viza_sportiv_an — nicio actiune necesara aici.

-- -----------------------------------------------------------------------------
-- Sectiunea 3 — public.taxa_anuala_config (D-05)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.taxa_anuala_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    an_fiscal INTEGER NOT NULL UNIQUE,
    suma NUMERIC(10,2) NOT NULL CHECK (suma >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.taxa_anuala_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "taxa_anuala_config_select" ON public.taxa_anuala_config;
CREATE POLICY "taxa_anuala_config_select"
    ON public.taxa_anuala_config
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "taxa_anuala_config_insert" ON public.taxa_anuala_config;
CREATE POLICY "taxa_anuala_config_insert"
    ON public.taxa_anuala_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid() AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
        )
    );

DROP POLICY IF EXISTS "taxa_anuala_config_update" ON public.taxa_anuala_config;
CREATE POLICY "taxa_anuala_config_update"
    ON public.taxa_anuala_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid() AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont
            WHERE user_id = auth.uid() AND rol_denumire = 'SUPER_ADMIN_FEDERATIE'
        )
    );

-- Fara politica DELETE — deny-by-default protejeaza pretul unui sezon deja facturat.

-- -----------------------------------------------------------------------------
-- Sectiunea 4 — seed (D-05)
-- -----------------------------------------------------------------------------

INSERT INTO public.taxa_anuala_config (an_fiscal, suma)
VALUES (2026, 170)
ON CONFLICT (an_fiscal) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Sectiunea 5 — verificari post-aplicare (rulate manual prin execute_sql)
-- -----------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns WHERE table_name='deconturi_federatie'; -- asteptat 13 randuri
-- SELECT indexname FROM pg_indexes WHERE tablename='deconturi_federatie'; -- include deconturi_federatie_club_an_fiscal_key
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('decont_sportivi','vize_sportivi'); -- unique pe (sportiv_id, an) pt fiecare
-- SELECT an_fiscal, suma FROM public.taxa_anuala_config; -- (2026, 170.00)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename='taxa_anuala_config'; -- 3 randuri, fara DELETE
