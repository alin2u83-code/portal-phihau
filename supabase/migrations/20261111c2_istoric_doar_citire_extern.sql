-- Faza 39 review E1-1 + E1-3 (NEAPLICATA: aplicare doar cu OK explicit).
-- E1-1: contul extern nu mai poate scrie pe competitii TERMINATE (istoric = doar citire, D-12).
--       Terminata = status 'finalizata' SAU data_sfarsit < azi (Europe/Bucharest), ca in competitie_vizibila_cont_club.
-- E1-3: competitie_vizibila_cont_club nu mai e apelabila direct de authenticated (e apelata doar din helperi definer).

DO $$
DECLARE
  nt text := 'NOT EXISTS (SELECT 1 FROM public.competitii c WHERE c.id = competitie_id AND (c.status = ''finalizata'' OR COALESCE(c.data_sfarsit < (now() AT TIME ZONE ''Europe/Bucharest'')::date, false)))';
  nt_par text := 'NOT EXISTS (SELECT 1 FROM public.echipe_competitie e JOIN public.competitii c ON c.id = e.competitie_id WHERE e.id = echipa_id AND (c.status = ''finalizata'' OR COALESCE(c.data_sfarsit < (now() AT TIME ZONE ''Europe/Bucharest'')::date, false)))';
  g_ic text := 'public.acces_extern_competitie(competitie_id, club_id)';
  g_par text := 'exists (select 1 from public.echipe_competitie e where e.id = echipa_id and public.acces_extern_competitie(e.competitie_id, e.club_id))';
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inscrieri_competitie','echipe_competitie'] LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s AND coalesce(taxa_achitata,false) = false AND lower(status) in (''inscris'',''inscrisa'',''deschisa'') AND %s)',
                   'ext_p_'||t||'_ins', t, g_ic, nt);
    EXECUTE format('ALTER POLICY %I ON public.%I USING (%s AND %s) WITH CHECK (%s AND %s)',
                   'ext_p_'||t||'_upd', t, g_ic, nt, g_ic, nt);
    EXECUTE format('ALTER POLICY %I ON public.%I USING (%s AND coalesce(taxa_achitata,false) = false AND %s)',
                   'ext_p_'||t||'_del', t, g_ic, nt);
  END LOOP;

  EXECUTE format('ALTER POLICY ext_p_echipa_sportivi_ins ON public.echipa_sportivi WITH CHECK (%s AND %s)', g_par, nt_par);
  EXECUTE format('ALTER POLICY ext_p_echipa_sportivi_upd ON public.echipa_sportivi USING (%s AND %s) WITH CHECK (%s AND %s)', g_par, nt_par, g_par, nt_par);
  EXECUTE format('ALTER POLICY ext_p_echipa_sportivi_del ON public.echipa_sportivi USING (%s AND %s)', g_par, nt_par);
END $$;

REVOKE EXECUTE ON FUNCTION public.competitie_vizibila_cont_club(uuid, uuid) FROM authenticated;

NOTIFY pgrst, 'reload schema';

-- Rollback: restaureaza politicile din 20261106c (fara conditia nt) si
--   GRANT EXECUTE ON FUNCTION public.competitie_vizibila_cont_club(uuid, uuid) TO authenticated;
