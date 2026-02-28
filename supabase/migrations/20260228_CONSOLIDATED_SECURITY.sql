-- =================================================================
-- CONSOLIDATED SECURITY MASTER SCRIPT: Phi Hau Application
-- Data: 2026-02-28
-- Versiune: 5.0 (Final Refactored)
-- =================================================================

-- =================================================================
-- 1. MODUL ADMINISTRATIV: Funcții Helper și Utilitare
-- =================================================================

-- Resetare politici pentru un tabel (Idempotent)
CREATE OR REPLACE PROCEDURE public.reset_all_policies_for_table(p_table_name TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_record.policyname, p_table_name);
    END LOOP;
END;
$$;

-- Procedură pentru activare RLS și resetare politici (Idempotent)
CREATE OR REPLACE PROCEDURE public.setup_rls_for_table(p_table_name TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', p_table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', p_table_name);
    CALL public.reset_all_policies_for_table(p_table_name);
END;
$$;

-- Sursa de Adevăr: Funcții pentru citirea contextului din JWT (Rol activ și Club)
-- Forțează returnarea rolului în format UPPERCASE pentru a elimina erorile de scriere.
CREATE OR REPLACE FUNCTION public.get_active_role() RETURNS TEXT AS $$
  SELECT UPPER(auth.jwt() -> 'user_metadata' ->> 'rol_activ_context');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_active_club_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'club_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Funcție pentru citirea claim-urilor din JWT
CREATE OR REPLACE FUNCTION public.get_my_claim(claim_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
  BEGIN
    RETURN coalesce(current_setting('request.jwt.claims', true)::jsonb -> claim_name, '{}'::jsonb);
  END;
$$;

-- Funcție Atomică pentru Comutarea Rolului Activ
CREATE OR REPLACE FUNCTION public.switch_primary_context(p_target_context_id uuid)
RETURNS void AS $$
BEGIN
    -- Verifică dacă contextul țintă aparține utilizatorului curent
    IF NOT EXISTS (
        SELECT 1
        FROM public.utilizator_roluri_multicont
        WHERE id = p_target_context_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acces neautorizat sau context invalid.';
    END IF;

    -- Actualizează atomic toate contextele utilizatorului într-o singură operațiune.
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = (id = p_target_context_id)
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 2. CONFIGURARE RLS PE TOATE TABELELE
-- =================================================================

DO $$ 
BEGIN
    CALL public.setup_rls_for_table('sportivi');
    CALL public.setup_rls_for_table('plati');
    CALL public.setup_rls_for_table('cluburi');
    CALL public.setup_rls_for_table('alocare_plata');
    CALL public.setup_rls_for_table('sesiuni_examene');
    CALL public.setup_rls_for_table('prezenta_antrenament');
    CALL public.setup_rls_for_table('push_subscriptions');
    CALL public.setup_rls_for_table('nom_locatii');
    CALL public.setup_rls_for_table('reduceri');
    CALL public.setup_rls_for_table('preturi_config');
    CALL public.setup_rls_for_table('grade_preturi_config');
    CALL public.setup_rls_for_table('grade');
    CALL public.setup_rls_for_table('istoric_grade');
    CALL public.setup_rls_for_table('inscrieri_examene');
    CALL public.setup_rls_for_table('tranzactii');
    CALL public.setup_rls_for_table('grupe');
    CALL public.setup_rls_for_table('notificari');
    CALL public.setup_rls_for_table('program_antrenamente');
    CALL public.setup_rls_for_table('utilizator_roluri_multicont');
    CALL public.setup_rls_for_table('tipuri_plati');
    CALL public.setup_rls_for_table('tipuri_abonament');
    CALL public.setup_rls_for_table('evenimente');
    CALL public.setup_rls_for_table('rezultate');
    CALL public.setup_rls_for_table('familii');
    CALL public.setup_rls_for_table('anunturi_prezenta');
    CALL public.setup_rls_for_table('deconturi_federatie');
    -- Tabele adiționale din lista bazei de date
    CALL public.setup_rls_for_table('fisa_inscriere');
    CALL public.setup_rls_for_table('sesiune_activitate');
    CALL public.setup_rls_for_table('sali_antrenament');
    CALL public.setup_rls_for_table('roluri');
    CALL public.setup_rls_for_table('examene');
    CALL public.setup_rls_for_table('taxe_anuale_config');
    CALL public.setup_rls_for_table('politici_reducere');
    CALL public.setup_rls_for_table('istoric_transferuri');
    CALL public.setup_rls_for_table('participari');
    CALL public.setup_rls_for_table('participare_stagiu');
    CALL public.setup_rls_for_table('nomenclator_tipuri_plati');
    CALL public.setup_rls_for_table('nom_probe_examen');
    CALL public.setup_rls_for_table('note_examene');
    CALL public.setup_rls_for_table('detaliu_co_vo_dao');
    CALL public.setup_rls_for_table('facturi_federale');
    CALL public.setup_rls_for_table('catalog_pret');
    CALL public.setup_rls_for_table('orar_saptamanal');
    CALL public.setup_rls_for_table('eveniment');
    CALL public.setup_rls_for_table('inscrieri_evenimente');
    CALL public.setup_rls_for_table('locatie');
    CALL public.setup_rls_for_table('sala');
    CALL public.setup_rls_for_table('evaluare_examen');
    CALL public.setup_rls_for_table('membru_comisie');
    CALL public.setup_rls_for_table('plata');
    CALL public.setup_rls_for_table('sportivi_program_personalizat');
END $$;

-- =================================================================
-- 3. DEFINIRE POLITICI RLS CONSOLIDATE
-- =================================================================

-- --- A. NOMENCLATOARE ȘI STRUCTURĂ (Vizibile pentru toți membrii) ---
CREATE POLICY "Public/Membri - Vizualizare locatii" ON public.nom_locatii FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare grade" ON public.grade FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare preturi" ON public.preturi_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare grade_preturi" ON public.grade_preturi_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare grupe" ON public.grupe FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare reduceri" ON public.reduceri FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare tipuri_plati" ON public.tipuri_plati FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare tipuri_abonament" ON public.tipuri_abonament FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare cluburi" ON public.cluburi FOR SELECT USING (id = get_active_club_id() OR id = '00000000-0000-0000-0000-000000000000' OR tip_club = 'FEDERATIE');
CREATE POLICY "Public/Membri - Vizualizare roluri" ON public.roluri FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare orar" ON public.orar_saptamanal FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare evenimente" ON public.evenimente FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public/Membri - Vizualizare eveniment" ON public.eveniment FOR SELECT USING (auth.role() = 'authenticated');

-- --- B. SPORTIVI (Acces la propriile date) ---
CREATE POLICY "Sportiv - Vizualizare propriul profil" ON public.sportivi FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sportiv - Vizualizare propriile plăți" ON public.plati FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.user_id = auth.uid() AND (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id)));
CREATE POLICY "Sportiv - Vizualizare propriile tranzactii" ON public.tranzactii FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.user_id = auth.uid() AND (s.id = tranzactii.sportiv_id OR s.familie_id = tranzactii.familie_id)));
CREATE POLICY "Sportiv - Vizualizare propriile inscrieri" ON public.inscrieri_examene FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = inscrieri_examene.sportiv_id AND s.user_id = auth.uid()));
CREATE POLICY "Sportiv - Vizualizare propriul istoric grade" ON public.istoric_grade FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = istoric_grade.sportiv_id AND s.user_id = auth.uid()));
CREATE POLICY "Sportiv - Vizualizare propriile rezultate" ON public.rezultate FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = rezultate.sportiv_id AND s.user_id = auth.uid()));
CREATE POLICY "Sportiv - Vizualizare propria familie" ON public.familii FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.familie_id = familii.id AND s.user_id = auth.uid()));
CREATE POLICY "Sportiv - Vizualizare propriile anunturi" ON public.anunturi_prezenta FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = anunturi_prezenta.sportiv_id AND s.user_id = auth.uid()));
CREATE POLICY "Sportiv - Vizualizare propriile roluri" ON public.utilizator_roluri_multicont FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sportiv - Actualizare propriul rol primar" ON public.utilizator_roluri_multicont FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sportiv - Gestionare propriile alocări" ON public.alocare_plata FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sportiv - Gestionare propriile abonamente push" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sportiv - Vizualizare propriile notificari" ON public.notificari FOR SELECT USING (recipient_user_id = auth.uid());
CREATE POLICY "Sportiv - Vizualizare propriile inscrieri evenimente" ON public.inscrieri_evenimente FOR SELECT USING (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = inscrieri_evenimente.sportiv_id AND s.user_id = auth.uid()));

-- --- C. STAFF CLUB (ADMIN_CLUB / INSTRUCTOR) ---
-- Acces total (ALL) pe datele clubului lor
CREATE POLICY "Staff Club - Management sportivi club" ON public.sportivi FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND club_id = get_active_club_id());
CREATE POLICY "Staff Club - Management plăți club" ON public.plati FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE (s.id = plati.sportiv_id OR s.familie_id = plati.familie_id) AND s.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management tranzacții club" ON public.tranzactii FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND (EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = tranzactii.sportiv_id AND s.club_id = get_active_club_id()) OR EXISTS (SELECT 1 FROM public.sportivi s WHERE s.familie_id = tranzactii.familie_id AND s.club_id = get_active_club_id())));
CREATE POLICY "Staff Club - Management înscrieri club" ON public.inscrieri_examene FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = inscrieri_examene.sportiv_id AND s.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management istoric grade club" ON public.istoric_grade FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = istoric_grade.sportiv_id AND s.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management sesiuni examene" ON public.sesiuni_examene FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND club_id = get_active_club_id());
CREATE POLICY "Staff Club - Management prezenta" ON public.prezenta_antrenament FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.program_antrenamente a JOIN public.grupe g ON a.grupa_id = g.id WHERE a.id = prezenta_antrenament.antrenament_id AND g.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management evenimente" ON public.evenimente FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND club_id = get_active_club_id());
CREATE POLICY "Staff Club - Management rezultate" ON public.rezultate FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = rezultate.sportiv_id AND s.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management familii" ON public.familii FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.familie_id = familii.id AND s.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management anunturi" ON public.anunturi_prezenta FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = anunturi_prezenta.sportiv_id AND s.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management deconturi" ON public.deconturi_federatie FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND club_id = get_active_club_id());
CREATE POLICY "Staff Club - Vizualizare roluri club" ON public.utilizator_roluri_multicont FOR SELECT USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND club_id = get_active_club_id());
CREATE POLICY "Staff Club - Management orar" ON public.orar_saptamanal FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.grupe g WHERE g.id = orar_saptamanal.grupa_id AND g.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management program antrenamente" ON public.program_antrenamente FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.grupe g WHERE g.id = program_antrenamente.grupa_id AND g.club_id = get_active_club_id()));
CREATE POLICY "Staff Club - Management inscrieri evenimente" ON public.inscrieri_evenimente FOR ALL USING (get_active_role() IN ('ADMIN_CLUB', 'INSTRUCTOR') AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = inscrieri_evenimente.sportiv_id AND s.club_id = get_active_club_id()));

-- Management Nomenclatoare (Doar Admin Club)
CREATE POLICY "Admin Club - Management nomenclatoare" ON public.nom_locatii FOR ALL USING (get_active_role() = 'ADMIN_CLUB');
CREATE POLICY "Admin Club - Management reduceri" ON public.reduceri FOR ALL USING (get_active_role() = 'ADMIN_CLUB');
CREATE POLICY "Admin Club - Management preturi" ON public.preturi_config FOR ALL USING (get_active_role() = 'ADMIN_CLUB');
CREATE POLICY "Admin Club - Management grade_preturi" ON public.grade_preturi_config FOR ALL USING (get_active_role() = 'ADMIN_CLUB');

-- --- D. SUPER ADMIN FEDERATIE (Acces total peste tot) ---
CREATE POLICY "Super Admin - Acces total sportivi" ON public.sportivi FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total plati" ON public.plati FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total tranzactii" ON public.tranzactii FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total inscrieri" ON public.inscrieri_examene FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total istoric_grade" ON public.istoric_grade FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total locatii" ON public.nom_locatii FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total reduceri" ON public.reduceri FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total preturi" ON public.preturi_config FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total grade" ON public.grade FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total cluburi" ON public.cluburi FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total sesiuni" ON public.sesiuni_examene FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total prezenta" ON public.prezenta_antrenament FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total evenimente" ON public.evenimente FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total rezultate" ON public.rezultate FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total familii" ON public.familii FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total anunturi" ON public.anunturi_prezenta FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total deconturi" ON public.deconturi_federatie FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total roluri" ON public.utilizator_roluri_multicont FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total tipuri_plati" ON public.tipuri_plati FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total tipuri_abonament" ON public.tipuri_abonament FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total orar" ON public.orar_saptamanal FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total program antrenamente" ON public.program_antrenamente FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total inscrieri evenimente" ON public.inscrieri_evenimente FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total fisa_inscriere" ON public.fisa_inscriere FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total sesiune_activitate" ON public.sesiune_activitate FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total sali_antrenament" ON public.sali_antrenament FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total examene" ON public.examene FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total taxe_anuale_config" ON public.taxe_anuale_config FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total politici_reducere" ON public.politici_reducere FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total istoric_transferuri" ON public.istoric_transferuri FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total participari" ON public.participari FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total participare_stagiu" ON public.participare_stagiu FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total nomenclator_tipuri_plati" ON public.nomenclator_tipuri_plati FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total nom_probe_examen" ON public.nom_probe_examen FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total note_examene" ON public.note_examene FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total detaliu_co_vo_dao" ON public.detaliu_co_vo_dao FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total facturi_federale" ON public.facturi_federale FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total catalog_pret" ON public.catalog_pret FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total eveniment" ON public.eveniment FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total inscrieri_evenimente" ON public.inscrieri_evenimente FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total locatie" ON public.locatie FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total sala" ON public.sala FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total evaluare_examen" ON public.evaluare_examen FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total membru_comisie" ON public.membru_comisie FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total plata" ON public.plata FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');
CREATE POLICY "Super Admin - Acces total sportivi_program_personalizat" ON public.sportivi_program_personalizat FOR ALL USING (get_active_role() = 'SUPER_ADMIN_FEDERATIE');

-- =================================================================
-- 4. INTEGRARE VIEW-URI
-- =================================================================

ALTER VIEW public.view_istoric_plati_detaliat SET (security_invoker = on);
ALTER VIEW public.view_plata_sportiv SET (security_invoker = on);

-- =================================================================
-- 5. TRIGGER SINCRONIZARE METADATE JWT
-- =================================================================

CREATE OR REPLACE FUNCTION public.sync_user_metadata_from_profile()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  primary_context RECORD;
  roles_array text[];
BEGIN
  IF TG_OP = 'DELETE' THEN target_user_id := OLD.user_id; ELSE target_user_id := NEW.user_id; END IF;
  IF target_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT rol_denumire, club_id, sportiv_id INTO primary_context
  FROM public.utilizator_roluri_multicont
  WHERE user_id = target_user_id AND is_primary = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    SELECT rol_denumire, club_id, sportiv_id INTO primary_context
    FROM public.utilizator_roluri_multicont
    WHERE user_id = target_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  SELECT array_agg(DISTINCT rol_denumire) INTO roles_array
  FROM public.utilizator_roluri_multicont
  WHERE user_id = target_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'club_id', primary_context.club_id,
    'sportiv_id', primary_context.sportiv_id,
    'rol_activ_context', primary_context.rol_denumire,
    'roles', COALESCE(roles_array, '{}')
  )
  WHERE id = target_user_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS on_user_roles_change_sync_user_meta ON public.utilizator_roluri_multicont;

CREATE TRIGGER on_user_roles_change_sync_user_meta
  AFTER INSERT OR UPDATE OR DELETE ON public.utilizator_roluri_multicont
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_metadata_from_profile();
