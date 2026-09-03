-- ============================================================
-- Conformitate GDPR — consimtamant parinte minori + cereri_gdpr
-- Creat: 2026-09-03
-- Faza: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s (28-01)
-- Scop: (1) doua coloane nullable pe public.sportivi pentru consimtamant
--   parinte/tutore la sportivii minori <16 ani (REQ-5, D-01, D-04);
--   (2) tabelul public.cereri_gdpr pentru fluxul de export/stergere
--   date personale, cu RLS scopat pe club (REQ-9, D-06, D-07, D-09, D-12).
-- Migratie 100% aditiva — nicio coloana existenta nu este atinsa,
-- niciun rand existent nu este modificat.
-- ============================================================

-- ============================================================
-- SECTIUNEA 1 — consimtamant parinte (REQ-5, D-01, D-04)
-- ============================================================
-- Ambele coloane sunt NULLABLE: aditive, nu ating randurile existente
-- (constrangerea SPEC "Zero migratii distructive").
-- Validarea varstei <16 ani se face in aplicatie (utils/validation.ts),
-- NU printr-un CHECK constraint — varsta se schimba in timp si un
-- CHECK bazat pe varsta curenta ar bloca retroactiv randuri care erau
-- valide la data crearii lor.
ALTER TABLE public.sportivi
    ADD COLUMN IF NOT EXISTS consimtamant_parinte_nume text,
    ADD COLUMN IF NOT EXISTS consimtamant_parinte_data timestamptz;

-- ============================================================
-- SECTIUNEA 2 — tabelul public.cereri_gdpr (REQ-9, D-06, D-07)
-- ============================================================
-- Statusurile sunt in romana, identic cu pattern-ul existent din
-- cereri_inregistrare (D-06) — NU 'pending'/'approved' cum apare
-- generic in textul SPEC.
CREATE TABLE IF NOT EXISTS public.cereri_gdpr (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sportiv_id      uuid NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    tip_cerere      text NOT NULL CHECK (tip_cerere IN ('export', 'stergere')),
    status          text NOT NULL DEFAULT 'in_asteptare' CHECK (status IN ('in_asteptare', 'aprobata', 'respinsa')),
    data_cerere     timestamptz NOT NULL DEFAULT now(),
    procesat_la     timestamptz,
    procesat_de     uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS cereri_gdpr_sportiv_idx ON public.cereri_gdpr(sportiv_id);
CREATE INDEX IF NOT EXISTS cereri_gdpr_status_idx ON public.cereri_gdpr(status);

-- ============================================================
-- SECTIUNEA 3 — functii helper SECURITY DEFINER
-- (precedent Faza 16: fisa_practicant_club_id, vezi
-- 16-01-SUMMARY.md — join catre club_id fara denormalizare)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cerere_gdpr_sportiv_club_id(p_sportiv_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT club_id FROM public.sportivi WHERE id = p_sportiv_id;
$$;

-- Dubla cale de legatura user -> sportiv (vezi Gotcha 3 din 28-01-PLAN.md):
-- sportivi.user_id poate fi nepopulat pentru o parte din randuri, deci
-- verificam si legatura alternativa prin utilizator_roluri_multicont.sportiv_id,
-- altfel sportivii reali fara sportivi.user_id populat raman fara acces
-- la propriile cereri GDPR.
CREATE OR REPLACE FUNCTION public.este_sportivul_meu(p_sportiv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sportivi
    WHERE id = p_sportiv_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.utilizator_roluri_multicont
    WHERE sportiv_id = p_sportiv_id AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- SECTIUNEA 4 — trigger de audit procesare (vezi Gotcha 1 din 28-01-PLAN.md)
-- ============================================================
-- currentUser.id din client NU este auth.uid() (hooks/useDataProvider.ts
-- face spread peste activeCtx.sportiv cand userul are profil de sportiv).
-- De aceea procesat_de NU se scrie din client, ci exclusiv server-side
-- prin acest trigger, folosind auth.uid().
CREATE OR REPLACE FUNCTION public.set_cerere_gdpr_procesare()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.procesat_la := now();
    NEW.procesat_de := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cereri_gdpr_procesare ON public.cereri_gdpr;
CREATE TRIGGER tr_cereri_gdpr_procesare
    BEFORE UPDATE ON public.cereri_gdpr
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cerere_gdpr_procesare();

-- ============================================================
-- SECTIUNEA 5 — RLS (D-12)
-- ============================================================
ALTER TABLE public.cereri_gdpr ENABLE ROW LEVEL SECURITY;

-- Sportivul vede DOAR cererile legate de propriul sportiv_id (D-09).
DROP POLICY IF EXISTS "Sportiv_Select_Propriile_Cereri_GDPR" ON public.cereri_gdpr;
CREATE POLICY "Sportiv_Select_Propriile_Cereri_GDPR"
    ON public.cereri_gdpr FOR SELECT TO authenticated
    USING (public.este_sportivul_meu(sportiv_id));

-- Sportivul poate crea DOAR cereri pentru propriul sportiv_id, in stare
-- initiala neprocesata — nu poate insera direct o cerere deja aprobata
-- si nu poate seta procesat_de/procesat_la (T-28-05).
DROP POLICY IF EXISTS "Sportiv_Insert_Propriile_Cereri_GDPR" ON public.cereri_gdpr;
CREATE POLICY "Sportiv_Insert_Propriile_Cereri_GDPR"
    ON public.cereri_gdpr FOR INSERT TO authenticated
    WITH CHECK (
        public.este_sportivul_meu(sportiv_id)
        AND status = 'in_asteptare'
        AND procesat_de IS NULL
        AND procesat_la IS NULL
    );

-- ADMIN_CLUB vede DOAR cererile sportivilor din clubul activ (D-12).
-- Predicatul contine OBLIGATORIU si get_active_club_id() SI verificarea
-- explicita de rol prin utilizator_roluri_multicont — o politica ce ar
-- verifica DOAR clubul activ, fara verificarea de rol, ar da acces si
-- INSTRUCTORULUI din acelasi club (politicile RLS permisive se combina
-- cu OR), incalcand D-12. NU simplifica acest predicat intr-un viitor
-- refactor — asta a produs deja gap-uri cross-club in Fazele 15/16/25.
DROP POLICY IF EXISTS "Admin_Club_Select_Cereri_GDPR" ON public.cereri_gdpr;
CREATE POLICY "Admin_Club_Select_Cereri_GDPR"
    ON public.cereri_gdpr FOR SELECT TO authenticated
    USING (
        public.cerere_gdpr_sportiv_club_id(sportiv_id) = public.get_active_club_id()
        AND EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            WHERE urm.user_id = auth.uid()
              AND urm.rol_denumire IN ('ADMIN_CLUB', 'ADMIN')
        )
    );

-- ADMIN_CLUB proceseaza (aproba/respinge) DOAR cererile clubului activ.
-- Acelasi predicat si in USING si in WITH CHECK — vezi comentariul de mai sus.
DROP POLICY IF EXISTS "Admin_Club_Update_Cereri_GDPR" ON public.cereri_gdpr;
CREATE POLICY "Admin_Club_Update_Cereri_GDPR"
    ON public.cereri_gdpr FOR UPDATE TO authenticated
    USING (
        public.cerere_gdpr_sportiv_club_id(sportiv_id) = public.get_active_club_id()
        AND EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            WHERE urm.user_id = auth.uid()
              AND urm.rol_denumire IN ('ADMIN_CLUB', 'ADMIN')
        )
    )
    WITH CHECK (
        public.cerere_gdpr_sportiv_club_id(sportiv_id) = public.get_active_club_id()
        AND EXISTS (
            SELECT 1 FROM public.utilizator_roluri_multicont urm
            WHERE urm.user_id = auth.uid()
              AND urm.rol_denumire IN ('ADMIN_CLUB', 'ADMIN')
        )
    );

-- SUPER_ADMIN_FEDERATIE are bypass total (precedent Bypass_Super_Admin
-- din fisa_inscriere, Faza 16).
DROP POLICY IF EXISTS "Bypass_Super_Admin_Cereri_GDPR" ON public.cereri_gdpr;
CREATE POLICY "Bypass_Super_Admin_Cereri_GDPR"
    ON public.cereri_gdpr FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- NICIO politica nu acorda acces rolului de instructor pe cereri_gdpr —
-- deny implicit (D-12). Predicatele admin de mai sus verifica explicit
-- rol_denumire, deci acel rol de instructor NU se poate strecura prin
-- politicile de mai sus. Nu adauga o politica separata pentru acel rol.
--
-- NICIO politica de DELETE — cererile GDPR nu se sterg din UI
-- (D-11: aprobarea/respingerea schimba doar statusul, nicio actiune
-- automata pe date).

DO $$
BEGIN
    RAISE NOTICE 'add_gdpr_consimtamant_si_cereri applied successfully.';
END $$;
