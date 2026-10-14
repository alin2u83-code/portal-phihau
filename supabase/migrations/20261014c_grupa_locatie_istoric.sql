-- Istoric locatie grupa (cu data "de la") + cereri instructor aprobate de admin club.
-- Locatia curenta a grupei ramane grupe.locatie_id (-> nom_locatii); istoricul decide sala la o anumita data.

-- 1) Istoric
CREATE TABLE IF NOT EXISTS public.grupa_locatie_istoric (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grupa_id uuid NOT NULL REFERENCES public.grupe(id) ON DELETE CASCADE,
    club_id uuid,
    locatie_id uuid REFERENCES public.nom_locatii(id) ON DELETE SET NULL,
    data_de_la date NOT NULL,
    creat_de uuid DEFAULT auth.uid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT grupa_locatie_istoric_uq UNIQUE (grupa_id, data_de_la)
);
CREATE INDEX IF NOT EXISTS idx_grupa_locatie_istoric_grupa ON public.grupa_locatie_istoric (grupa_id, data_de_la DESC);

-- 2) Cereri (instructor -> admin club)
CREATE TABLE IF NOT EXISTS public.grupa_locatie_cereri (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grupa_id uuid NOT NULL REFERENCES public.grupe(id) ON DELETE CASCADE,
    club_id uuid,
    locatie_id uuid NOT NULL REFERENCES public.nom_locatii(id) ON DELETE CASCADE,
    data_de_la date NOT NULL,
    status text NOT NULL DEFAULT 'in_asteptare' CHECK (status IN ('in_asteptare','aprobata','respinsa')),
    cerut_de uuid DEFAULT auth.uid(),
    decis_de uuid,
    decis_la timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grupa_locatie_cereri_grupa ON public.grupa_locatie_cereri (grupa_id, status);

ALTER TABLE public.grupa_locatie_istoric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupa_locatie_cereri ENABLE ROW LEVEL SECURITY;

-- Citire pentru cine are acces la club; scrierea doar prin RPC (SECURITY DEFINER).
DROP POLICY IF EXISTS gli_select ON public.grupa_locatie_istoric;
CREATE POLICY gli_select ON public.grupa_locatie_istoric FOR SELECT
    USING (public.has_access_to_club(club_id) OR public.is_super_admin());
DROP POLICY IF EXISTS glc_select ON public.grupa_locatie_cereri;
CREATE POLICY glc_select ON public.grupa_locatie_cereri FOR SELECT
    USING (public.has_access_to_club(club_id) OR public.is_super_admin());

GRANT SELECT ON public.grupa_locatie_istoric, public.grupa_locatie_cereri TO authenticated;

-- 3) Locatia grupei la o data: ultimul rand din istoric cu data_de_la <= data, altfel grupe.locatie_id
CREATE OR REPLACE FUNCTION public.locatie_grupa_la_data(p_grupa uuid, p_data date)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT i.locatie_id FROM public.grupa_locatie_istoric i
          WHERE i.grupa_id = p_grupa AND i.data_de_la <= COALESCE(p_data, CURRENT_DATE)
          ORDER BY i.data_de_la DESC LIMIT 1),
        (SELECT g.locatie_id FROM public.grupe g WHERE g.id = p_grupa)
    );
$$;

-- 4) Aplica o schimbare (intern). Prima schimbare salveaza si situatia veche ca baza (1900-01-01).
CREATE OR REPLACE FUNCTION public._aplica_locatie_grupa(p_grupa uuid, p_locatie uuid, p_data date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_club uuid;
    v_veche uuid;
BEGIN
    SELECT club_id, locatie_id INTO v_club, v_veche FROM public.grupe WHERE id = p_grupa;
    IF v_club IS NULL AND NOT FOUND THEN RAISE EXCEPTION 'Grupa inexistenta'; END IF;

    IF v_veche IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.grupa_locatie_istoric WHERE grupa_id = p_grupa) THEN
        INSERT INTO public.grupa_locatie_istoric (grupa_id, club_id, locatie_id, data_de_la)
        VALUES (p_grupa, v_club, v_veche, DATE '1900-01-01');
    END IF;

    INSERT INTO public.grupa_locatie_istoric (grupa_id, club_id, locatie_id, data_de_la)
    VALUES (p_grupa, v_club, p_locatie, p_data)
    ON CONFLICT (grupa_id, data_de_la) DO UPDATE SET locatie_id = EXCLUDED.locatie_id, creat_de = auth.uid();

    UPDATE public.grupe SET locatie_id = public.locatie_grupa_la_data(p_grupa, CURRENT_DATE) WHERE id = p_grupa;
END;
$$;
REVOKE ALL ON FUNCTION public._aplica_locatie_grupa(uuid, uuid, date) FROM PUBLIC, anon, authenticated;

-- 5) Admin club / super admin: aplica direct
CREATE OR REPLACE FUNCTION public.schimba_locatie_grupa(p_grupa uuid, p_locatie uuid, p_data date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_club uuid;
BEGIN
    SELECT club_id INTO v_club FROM public.grupe WHERE id = p_grupa;
    IF NOT FOUND THEN RAISE EXCEPTION 'Grupa inexistenta'; END IF;
    IF NOT (public.is_super_admin() OR public.is_admin_club(v_club)) THEN
        RAISE EXCEPTION 'Doar adminul clubului poate schimba direct locatia grupei' USING ERRCODE = '42501';
    END IF;
    PERFORM public._aplica_locatie_grupa(p_grupa, p_locatie, COALESCE(p_data, CURRENT_DATE));
END;
$$;

-- 6) Instructor: cerere in asteptare
CREATE OR REPLACE FUNCTION public.cere_schimbare_locatie_grupa(p_grupa uuid, p_locatie uuid, p_data date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_club uuid; v_id uuid;
BEGIN
    SELECT club_id INTO v_club FROM public.grupe WHERE id = p_grupa;
    IF NOT FOUND THEN RAISE EXCEPTION 'Grupa inexistenta'; END IF;
    IF NOT (public.is_super_admin() OR public.is_admin_club(v_club) OR public.is_instructor_in_club(v_club)) THEN
        RAISE EXCEPTION 'Fara drept de cerere pentru aceasta grupa' USING ERRCODE = '42501';
    END IF;
    -- o singura cerere in asteptare pe grupa: o inlocuieste pe cea veche
    DELETE FROM public.grupa_locatie_cereri WHERE grupa_id = p_grupa AND status = 'in_asteptare';
    INSERT INTO public.grupa_locatie_cereri (grupa_id, club_id, locatie_id, data_de_la)
    VALUES (p_grupa, v_club, p_locatie, COALESCE(p_data, CURRENT_DATE))
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- 7) Admin club: aproba / respinge
CREATE OR REPLACE FUNCTION public.decide_cerere_locatie_grupa(p_cerere uuid, p_aproba boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE c public.grupa_locatie_cereri%ROWTYPE;
BEGIN
    SELECT * INTO c FROM public.grupa_locatie_cereri WHERE id = p_cerere FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cerere inexistenta'; END IF;
    IF c.status <> 'in_asteptare' THEN RAISE EXCEPTION 'Cererea a fost deja solutionata'; END IF;
    IF NOT (public.is_super_admin() OR public.is_admin_club(c.club_id)) THEN
        RAISE EXCEPTION 'Doar adminul clubului poate decide' USING ERRCODE = '42501';
    END IF;
    IF p_aproba THEN
        PERFORM public._aplica_locatie_grupa(c.grupa_id, c.locatie_id, c.data_de_la);
    END IF;
    UPDATE public.grupa_locatie_cereri
       SET status = CASE WHEN p_aproba THEN 'aprobata' ELSE 'respinsa' END, decis_de = auth.uid(), decis_la = now()
     WHERE id = p_cerere;
END;
$$;

-- 8) Sincronizeaza grupe.locatie_id cu situatia de azi (schimbari programate in viitor)
CREATE OR REPLACE FUNCTION public.sync_locatii_grupe()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    UPDATE public.grupe g
       SET locatie_id = public.locatie_grupa_la_data(g.id, CURRENT_DATE)
     WHERE EXISTS (SELECT 1 FROM public.grupa_locatie_istoric i WHERE i.grupa_id = g.id)
       AND g.locatie_id IS DISTINCT FROM public.locatie_grupa_la_data(g.id, CURRENT_DATE);
$$;
REVOKE ALL ON FUNCTION public.sync_locatii_grupe() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.schimba_locatie_grupa(uuid, uuid, date),
                         public.cere_schimbare_locatie_grupa(uuid, uuid, date),
                         public.decide_cerere_locatie_grupa(uuid, boolean),
                         public.locatie_grupa_la_data(uuid, date) TO authenticated;

SELECT cron.schedule('sync-locatii-grupe', '5 0 * * *', $$select public.sync_locatii_grupe()$$);

-- 9) Prezenta/program: sala la data antrenamentului (nu la cea curenta). Pastreaza security_invoker.
CREATE OR REPLACE VIEW public.vedere_cluburi_program_antrenamente AS
 SELECT pa.id,
    pa.grupa_id,
    pa.ziua,
    pa.ora_start,
    pa.ora_sfarsit,
    pa.created_at,
    pa.is_recurent,
    pa.recurent_group_id,
    pa.data_sfarsit_recurenta,
    pa.is_activ,
    pa.data,
    pa.tip_antrenament,
    pa.club_id,
    pa.locatie_id,
    g.denumire AS nume_grupa,
    COALESCE(l.nume, g.sala) AS sala,
    COALESCE(sc.sportivi_count, (0)::bigint) AS sportivi_count,
    (EXTRACT(epoch FROM (pa.ora_sfarsit - pa.ora_start)) / (60)::numeric) AS durata_minute,
        CASE EXTRACT(dow FROM pa.data)
            WHEN 0 THEN 'Duminică'::text
            WHEN 1 THEN 'Luni'::text
            WHEN 2 THEN 'Marți'::text
            WHEN 3 THEN 'Miercuri'::text
            WHEN 4 THEN 'Joi'::text
            WHEN 5 THEN 'Vineri'::text
            WHEN 6 THEN 'Sâmbătă'::text
            ELSE NULL::text
        END AS ziua_saptamanii
   FROM (((program_antrenamente pa
     LEFT JOIN grupe g ON ((pa.grupa_id = g.id)))
     LEFT JOIN nom_locatii l ON ((l.id = public.locatie_grupa_la_data(g.id, COALESCE(pa.data, CURRENT_DATE)))))
     LEFT JOIN LATERAL ( SELECT count(*) AS sportivi_count
           FROM sportivi s
          WHERE (s.grupa_id = g.id)) sc ON (true))
  WHERE ((pa.club_id = get_active_club_id()) OR is_super_admin());
ALTER VIEW public.vedere_cluburi_program_antrenamente SET (security_invoker = true);
