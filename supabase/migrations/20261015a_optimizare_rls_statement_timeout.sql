-- Optimizare RLS pentru "canceling statement due to statement timeout" (15.10.2026)
-- Doar optimizari care pastreaza semantica: functii STABLE, politici redundante eliminate,
-- apeluri de functii hoisted in InitPlan prin (select ...).
-- Indexurile necesare exista deja (verificat pe DB live) - nu se adauga altele.

-- 1) Functii de verificare acces: doar citesc => STABLE (erau VOLATILE)
ALTER FUNCTION public.has_access_to_club(uuid) STABLE;
ALTER FUNCTION public.este_staff_club(uuid) STABLE;
ALTER FUNCTION public.este_staff() STABLE;
ALTER FUNCTION public.apartine_familiei(uuid) STABLE;
ALTER FUNCTION public.apartine_familiei(text) STABLE;

-- 2) utilizator_roluri_multicont: 5 politici SELECT echivalente -> 1 (+ SuperAdmin ALL ramane)
DROP POLICY IF EXISTS "Permite vizualizare roluri proprii" ON public.utilizator_roluri_multicont;
DROP POLICY IF EXISTS "Users can read own roles" ON public.utilizator_roluri_multicont;
DROP POLICY IF EXISTS "Utilizatorii isi vad propriile roluri" ON public.utilizator_roluri_multicont;
DROP POLICY IF EXISTS "RLS_ROLE_ACCESS_POLICY" ON public.utilizator_roluri_multicont;
ALTER POLICY "Utilizator_Isi_Vede_Propriile_Roluri" ON public.utilizator_roluri_multicont
  USING ((select auth.uid()) = user_id);

-- 3) sportivi: politici strict incluse in altele (V3 / Staff - Manage Own Club Sportivi)
DROP POLICY IF EXISTS "Sportiv - View Own Profile" ON public.sportivi;        -- user_id = uid  (in V3)
DROP POLICY IF EXISTS "rbv_sportivi_admin_club" ON public.sportivi;           -- has_access_to_club (in Staff - Manage Own Club)
DROP POLICY IF EXISTS "rbv_sportivi_super_admin" ON public.sportivi;          -- is_super_admin (inclus in has_access_to_club)
DROP POLICY IF EXISTS "Staff - Update Sportivi" ON public.sportivi;           -- identic cu Staff - Manage Own Club
DROP POLICY IF EXISTS "Permite_Update_Legitimatie" ON public.sportivi;        -- este_staff_club (inclus in has_access_to_club)

-- 4) program_antrenamente: is_super_admin o singura data pe statement
ALTER POLICY "SuperAdmin_Total_Access" ON public.program_antrenamente
  USING ((select public.is_super_admin()));

-- 5) View-uri: functii fara argumente evaluate o data (InitPlan), nu pe fiecare rand
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
     LEFT JOIN nom_locatii l ON ((l.id = locatie_grupa_la_data(g.id, COALESCE(pa.data, CURRENT_DATE)))))
     LEFT JOIN LATERAL ( SELECT count(*) AS sportivi_count
           FROM sportivi s
          WHERE (s.grupa_id = g.id)) sc ON (true))
  WHERE ((pa.club_id = (SELECT get_active_club_id())) OR (SELECT is_super_admin()));
ALTER VIEW public.vedere_cluburi_program_antrenamente SET (security_invoker = true);

CREATE OR REPLACE VIEW public.vedere_prezenta_detaliata AS
 SELECT pa.id AS antrenament_id,
    pa.id,
    pr.sportiv_id,
    pa.data,
    pa.ora_start,
    pa.club_id,
    pa.grupa_id,
    pr.status_id,
    sp.denumire AS status,
    sp.este_prezent,
    g.denumire AS nume_grupa
   FROM (((prezenta_antrenament pr
     JOIN program_antrenamente pa ON ((pr.antrenament_id = pa.id)))
     LEFT JOIN grupe g ON ((pa.grupa_id = g.id)))
     LEFT JOIN statuse_prezenta sp ON ((pr.status_id = sp.id)))
  WHERE ((pa.club_id = (SELECT get_active_club_id())) OR (EXISTS ( SELECT 1
           FROM sportivi s
          WHERE ((s.id = pr.sportiv_id) AND (s.user_id = (SELECT auth.uid()))))) OR (SELECT is_super_admin()));
ALTER VIEW public.vedere_prezenta_detaliata SET (security_invoker = true);

CREATE OR REPLACE VIEW public.rbv_plati_club AS
 SELECT p.id,
    p.sportiv_id,
    p.familie_id,
    p.suma,
    p.data,
    p.status,
    p.descriere,
    p.tip,
    p.observatii,
    p.created_at,
    p.tip_plata,
    p.examen_id,
    p.reducere_id,
    p.valoare_reducere,
    p.suma_initiala,
    p."descriereDetaliata",
    p."reducereDetalii",
    p.club_id,
    p.suma_ramasa,
    p.tip_plata_id,
    p.tip_abonament_id,
    p.sesiune_id,
    p.luna,
    p.an,
    s.nume AS sportiv_nume,
    s.prenume AS sportiv_prenume,
    c.nume AS club_nume,
    f.nume AS familie_denumire
   FROM (((plati p
     LEFT JOIN sportivi s ON ((p.sportiv_id = s.id)))
     LEFT JOIN cluburi c ON ((COALESCE(p.club_id, s.club_id) = c.id)))
     LEFT JOIN familii f ON ((p.familie_id = f.id)))
  WHERE (has_access_to_club(COALESCE(p.club_id, s.club_id)) OR (p.sportiv_id = (SELECT get_own_sportiv_id())));
ALTER VIEW public.rbv_plati_club SET (security_invoker = true);
