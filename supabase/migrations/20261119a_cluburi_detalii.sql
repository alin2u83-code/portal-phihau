-- Quick 261119-ihl, VAL 1 (aditiv): detalii club vizibile doar pentru super admin si admin club.
-- STARE: NEAPLICAT pe live (dry-run cu rollback facut 19.11.2026; aplicare doar cu OK utilizator).
-- 3NF: setarile/CIF-ul clubului intr-un tabel 1:1 cu cluburi; nicio coloana derivata/duplicata
-- (coloanele vechi din cluburi raman PANA la Val 3, dupa ce frontend-ul citeste din cluburi_detalii).
-- ROLLBACK: DROP FUNCTION public.factura_automata_activa(uuid); DROP TABLE public.cluburi_detalii;

CREATE TABLE public.cluburi_detalii (
    club_id uuid PRIMARY KEY REFERENCES public.cluburi(id) ON DELETE CASCADE,
    cif text,
    perioada_gratie_zile integer NOT NULL DEFAULT 30,
    factura_automata_inscriere boolean NOT NULL DEFAULT false
);

-- Backfill (copiere; sursa ramane neatinsa)
INSERT INTO public.cluburi_detalii (club_id, cif, perioada_gratie_zile, factura_automata_inscriere)
SELECT id, cif, perioada_gratie_zile, COALESCE(factura_automata_inscriere, false)
FROM public.cluburi;

-- Club nou => rand de detalii cu valorile implicite (altfel factura_automata_activa ar da false, iar UPDATE-ul din UI nu ar gasi nimic)
CREATE OR REPLACE FUNCTION public.cluburi_detalii_la_club_nou() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.cluburi_detalii (club_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.cluburi_detalii_la_club_nou() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_cluburi_detalii_la_club_nou
AFTER INSERT ON public.cluburi
FOR EACH ROW EXECUTE FUNCTION public.cluburi_detalii_la_club_nou();

-- Un club commit-at intre backfill si CREATE TRIGGER ar ramane fara rand: repeta backfill-ul (idempotent)
INSERT INTO public.cluburi_detalii (club_id, cif, perioada_gratie_zile, factura_automata_inscriere)
SELECT id, cif, perioada_gratie_zile, COALESCE(factura_automata_inscriere, false)
FROM public.cluburi
ON CONFLICT (club_id) DO NOTHING;

ALTER TABLE public.cluburi_detalii ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cluburi_detalii FROM anon;
-- RLS nu acopera TRUNCATE; default privileges Supabase l-ar da lui authenticated
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.cluburi_detalii FROM authenticated;

-- Doar super admin (orice club) si ADMIN_CLUB (clubul lui); acelasi helper ca la taxe, bazat pe header-ul de context activ
CREATE POLICY cluburi_detalii_admin ON public.cluburi_detalii
    FOR ALL TO authenticated
    USING (public.poate_gestiona_taxe_club(club_id))
    WITH CHECK (public.poate_gestiona_taxe_club(club_id));

-- Instructorul care inscrie un sportiv are nevoie doar de da/nu, nu de restul detaliilor
CREATE OR REPLACE FUNCTION public.factura_automata_activa(p_club_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE WHEN public.has_access_to_club(p_club_id)
                THEN COALESCE((SELECT d.factura_automata_inscriere FROM public.cluburi_detalii d WHERE d.club_id = p_club_id), false)
                ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.factura_automata_activa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factura_automata_activa(uuid) TO authenticated;
