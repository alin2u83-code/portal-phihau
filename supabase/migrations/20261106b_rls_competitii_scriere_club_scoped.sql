-- Faza 36 (36-04): repara D-15 — scrierea cross-club pe tabelele de competitie.
-- Sursa defectului: politicile din 20260319_competitii_schema.sql verifica doar ca utilizatorul
-- ARE (la orice club) rolul ADMIN_CLUB, nu ca randul apartine clubului din contextul activ
-- (vezi 36-AUDIT-LIVE.md, DEC-4 / DEC-5).
--
-- Metoda: DROP politicile largi + politici permisive curate (has_access_to_club) +
-- politici RESTRICTIVE (se combina prin AND cu ORICE politica permisiva, inclusiv fantome).
-- SELECT-urile raman neatinse (D-16).
-- Interpretare D-15: gate-ul de status/deadline se aplica la INSERT, nu la UPDATE/DELETE
-- (retragerile si corectiile dupa inchidere raman posibile). Federatia (is_super_admin) e exceptata.
-- UPDATE nu verifica apartenenta sportivului la club: exista 38 inscrieri / 34 membri de echipa
-- legacy cu sportiv din alt club (inter-club, adaugati de federatie).

-- ═══ inscrieri_competitie ═══════════════════════════════════════════════════
DROP POLICY IF EXISTS inscrieri_insert_club ON public.inscrieri_competitie;
DROP POLICY IF EXISTS inscrieri_update_club ON public.inscrieri_competitie;
DROP POLICY IF EXISTS inscrieri_delete_club ON public.inscrieri_competitie;

-- rbv_ic_insert / rbv_ic_update (has_access_to_club) raman. rbv_ic_delete cere ADMIN_CLUB/SUPER_ADMIN;
-- adaugam stergere pentru INSTRUCTOR-ul clubului (comportamentul vechi, dar scoped).
DROP POLICY IF EXISTS ic_w_del ON public.inscrieri_competitie;
CREATE POLICY ic_w_del ON public.inscrieri_competitie
    FOR DELETE TO authenticated USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS ic_r_scope_ins ON public.inscrieri_competitie;
CREATE POLICY ic_r_scope_ins ON public.inscrieri_competitie AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id));

DROP POLICY IF EXISTS ic_r_scope_upd ON public.inscrieri_competitie;
CREATE POLICY ic_r_scope_upd ON public.inscrieri_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id))
    WITH CHECK (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id));

DROP POLICY IF EXISTS ic_r_scope_del ON public.inscrieri_competitie;
CREATE POLICY ic_r_scope_del ON public.inscrieri_competitie AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id));

DROP POLICY IF EXISTS ic_r_gate_ins ON public.inscrieri_competitie;
CREATE POLICY ic_r_gate_ins ON public.inscrieri_competitie AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_super_admin())
        OR (public.competitie_deschisa_inscrieri(competitie_id)
            AND public.categorie_apartine_competitiei(categorie_id, competitie_id)
            AND public.sportiv_apartine_clubului(sportiv_id, club_id)));

DROP POLICY IF EXISTS ic_r_gate_upd ON public.inscrieri_competitie;
CREATE POLICY ic_r_gate_upd ON public.inscrieri_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK ((SELECT public.is_super_admin())
        OR public.categorie_apartine_competitiei(categorie_id, competitie_id));

-- ═══ echipe_competitie ═════════════════════════════════════════════════════
DROP POLICY IF EXISTS echipe_insert_club ON public.echipe_competitie;
DROP POLICY IF EXISTS echipe_update_club ON public.echipe_competitie;
DROP POLICY IF EXISTS echipe_delete_club ON public.echipe_competitie;

DROP POLICY IF EXISTS ec_w_ins ON public.echipe_competitie;
CREATE POLICY ec_w_ins ON public.echipe_competitie
    FOR INSERT TO authenticated WITH CHECK (public.has_access_to_club(club_id));
DROP POLICY IF EXISTS ec_w_upd ON public.echipe_competitie;
CREATE POLICY ec_w_upd ON public.echipe_competitie
    FOR UPDATE TO authenticated USING (public.has_access_to_club(club_id)) WITH CHECK (public.has_access_to_club(club_id));
DROP POLICY IF EXISTS ec_w_del ON public.echipe_competitie;
CREATE POLICY ec_w_del ON public.echipe_competitie
    FOR DELETE TO authenticated USING (public.has_access_to_club(club_id));

DROP POLICY IF EXISTS ec_r_scope_ins ON public.echipe_competitie;
CREATE POLICY ec_r_scope_ins ON public.echipe_competitie AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id));
DROP POLICY IF EXISTS ec_r_scope_upd ON public.echipe_competitie;
CREATE POLICY ec_r_scope_upd ON public.echipe_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id))
    WITH CHECK (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id));
DROP POLICY IF EXISTS ec_r_scope_del ON public.echipe_competitie;
CREATE POLICY ec_r_scope_del ON public.echipe_competitie AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING (public.has_access_to_club(club_id) OR public.acces_extern_competitie(competitie_id, club_id));

DROP POLICY IF EXISTS ec_r_gate_ins ON public.echipe_competitie;
CREATE POLICY ec_r_gate_ins ON public.echipe_competitie AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_super_admin())
        OR (public.competitie_deschisa_inscrieri(competitie_id)
            AND public.categorie_apartine_competitiei(categorie_id, competitie_id)));
DROP POLICY IF EXISTS ec_r_gate_upd ON public.echipe_competitie;
CREATE POLICY ec_r_gate_upd ON public.echipe_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK ((SELECT public.is_super_admin())
        OR public.categorie_apartine_competitiei(categorie_id, competitie_id));

-- ═══ echipa_sportivi (prin echipa parinte) ═══════════════════════════════════
-- echipa_sportivi_manage era ALL (inclusiv SELECT); echipa_sportivi_select ramane (D-16).
DROP POLICY IF EXISTS echipa_sportivi_manage ON public.echipa_sportivi;

DROP POLICY IF EXISTS es_w_ins ON public.echipa_sportivi;
CREATE POLICY es_w_ins ON public.echipa_sportivi
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id AND public.has_access_to_club(e.club_id)));
DROP POLICY IF EXISTS es_w_upd ON public.echipa_sportivi;
CREATE POLICY es_w_upd ON public.echipa_sportivi
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id AND public.has_access_to_club(e.club_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id AND public.has_access_to_club(e.club_id)));
DROP POLICY IF EXISTS es_w_del ON public.echipa_sportivi;
CREATE POLICY es_w_del ON public.echipa_sportivi
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id AND public.has_access_to_club(e.club_id)));

DROP POLICY IF EXISTS es_r_scope_ins ON public.echipa_sportivi;
CREATE POLICY es_r_scope_ins ON public.echipa_sportivi AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
        AND (public.has_access_to_club(e.club_id) OR public.acces_extern_competitie(e.competitie_id, e.club_id))));
DROP POLICY IF EXISTS es_r_scope_upd ON public.echipa_sportivi;
CREATE POLICY es_r_scope_upd ON public.echipa_sportivi AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
        AND (public.has_access_to_club(e.club_id) OR public.acces_extern_competitie(e.competitie_id, e.club_id))))
    WITH CHECK (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
        AND (public.has_access_to_club(e.club_id) OR public.acces_extern_competitie(e.competitie_id, e.club_id))));
DROP POLICY IF EXISTS es_r_scope_del ON public.echipa_sportivi;
CREATE POLICY es_r_scope_del ON public.echipa_sportivi AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
        AND (public.has_access_to_club(e.club_id) OR public.acces_extern_competitie(e.competitie_id, e.club_id))));

DROP POLICY IF EXISTS es_r_gate_ins ON public.echipa_sportivi;
CREATE POLICY es_r_gate_ins ON public.echipa_sportivi AS RESTRICTIVE
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_super_admin())
        OR EXISTS (SELECT 1 FROM public.echipe_competitie e WHERE e.id = echipa_id
            AND public.competitie_deschisa_inscrieri(e.competitie_id)
            AND public.sportiv_apartine_clubului(sportiv_id, e.club_id)));

-- ═══ competitii / probe_competitie / categorii_competitie (DEC-5) ═══════════
-- Live: toate randurile au club_id NULL; UI-ul de creare/editare e doar pentru federatie (isAdmin).
DROP POLICY IF EXISTS competitii_insert_admin ON public.competitii;
DROP POLICY IF EXISTS competitii_update_admin ON public.competitii;
DROP POLICY IF EXISTS competitii_delete_admin ON public.competitii;
DROP POLICY IF EXISTS probe_manage_admin ON public.probe_competitie;
DROP POLICY IF EXISTS categorii_manage_admin ON public.categorii_competitie;

DROP POLICY IF EXISTS competitii_w_ins ON public.competitii;
CREATE POLICY competitii_w_ins ON public.competitii
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS competitii_w_upd ON public.competitii;
CREATE POLICY competitii_w_upd ON public.competitii
    FOR UPDATE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'))
    WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS competitii_w_del ON public.competitii;
CREATE POLICY competitii_w_del ON public.competitii
    FOR DELETE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));

DROP POLICY IF EXISTS probe_w_all ON public.probe_competitie;
CREATE POLICY probe_w_all ON public.probe_competitie
    FOR ALL TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'))
    WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS categorii_w_all ON public.categorii_competitie;
CREATE POLICY categorii_w_all ON public.categorii_competitie
    FOR ALL TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'))
    WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));

-- RESTRICTIVE: supravietuiesc oricarei politici permisive fantoma de scriere
DROP POLICY IF EXISTS competitii_r_ins ON public.competitii;
CREATE POLICY competitii_r_ins ON public.competitii AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS competitii_r_upd ON public.competitii;
CREATE POLICY competitii_r_upd ON public.competitii AS RESTRICTIVE
    FOR UPDATE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'))
    WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS competitii_r_del ON public.competitii;
CREATE POLICY competitii_r_del ON public.competitii AS RESTRICTIVE
    FOR DELETE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));

DROP POLICY IF EXISTS probe_r_ins ON public.probe_competitie;
CREATE POLICY probe_r_ins ON public.probe_competitie AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS probe_r_upd ON public.probe_competitie;
CREATE POLICY probe_r_upd ON public.probe_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'))
    WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS probe_r_del ON public.probe_competitie;
CREATE POLICY probe_r_del ON public.probe_competitie AS RESTRICTIVE
    FOR DELETE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));

DROP POLICY IF EXISTS categorii_r_ins ON public.categorii_competitie;
CREATE POLICY categorii_r_ins ON public.categorii_competitie AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS categorii_r_upd ON public.categorii_competitie;
CREATE POLICY categorii_r_upd ON public.categorii_competitie AS RESTRICTIVE
    FOR UPDATE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'))
    WITH CHECK ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));
DROP POLICY IF EXISTS categorii_r_del ON public.categorii_competitie;
CREATE POLICY categorii_r_del ON public.categorii_competitie AS RESTRICTIVE
    FOR DELETE TO authenticated USING ((SELECT public.get_active_role()) IN ('SUPER_ADMIN_FEDERATIE','ADMIN'));

NOTIFY pgrst, 'reload schema';
