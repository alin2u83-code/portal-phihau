-- =====================================================
-- FIX: Grant SELECT on toate vedere_cluburi_* views
-- pentru rolul authenticated
-- Fără acest GRANT, PostgREST returnează 401
-- =====================================================

GRANT SELECT ON public.vedere_cluburi_sportivi              TO authenticated;
GRANT SELECT ON public.vedere_cluburi_grupe                 TO authenticated;
GRANT SELECT ON public.vedere_cluburi_plati                 TO authenticated;
GRANT SELECT ON public.vedere_cluburi_tranzactii            TO authenticated;
GRANT SELECT ON public.vedere_cluburi_evenimente            TO authenticated;
GRANT SELECT ON public.vedere_cluburi_rezultate             TO authenticated;
GRANT SELECT ON public.vedere_cluburi_sesiuni_examene       TO authenticated;
GRANT SELECT ON public.vedere_cluburi_inscrieri_examene     TO authenticated;
GRANT SELECT ON public.vedere_cluburi_familii               TO authenticated;
GRANT SELECT ON public.vedere_cluburi_tipuri_abonament      TO authenticated;
GRANT SELECT ON public.vedere_cluburi_locatii               TO authenticated;
GRANT SELECT ON public.vedere_cluburi_preturi_config        TO authenticated;
GRANT SELECT ON public.vedere_cluburi_deconturi_federatie   TO authenticated;
GRANT SELECT ON public.vedere_cluburi_program_antrenamente  TO authenticated;
GRANT SELECT ON public.vedere_cluburi_anunturi_prezenta     TO authenticated;
GRANT SELECT ON public.vedere_cluburi_vizualizare_plati     TO authenticated;
GRANT SELECT ON public.vedere_cluburi_istoric_plati_detaliat TO authenticated;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Grants for vedere_cluburi views applied successfully.';
END $$;
