-- Faza 41 (fix ACL): trg_echipe_denumire_implicita() este functie de trigger SECURITY DEFINER (20261110b),
-- expusa din greseala la authenticated. Triggerele nu cer EXECUTE la apel, deci REVOKE nu afecteaza trigger-ul.
-- Rollback: GRANT EXECUTE ON FUNCTION public.trg_echipe_denumire_implicita() TO authenticated;
REVOKE ALL ON FUNCTION public.trg_echipe_denumire_implicita() FROM PUBLIC, anon, authenticated;
