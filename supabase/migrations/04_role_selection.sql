-- =================================================================
-- Funcție RPC pentru setarea contextului de rol activ
-- =================================================================
-- Scop: Permite unui utilizator autentificat să-și seteze rolul activ,
-- care este apoi stocat în profilul său din tabela `sportivi`.
-- Aplicația citește această valoare la login pentru a determina
-- ce context să încarce.
--
-- `SECURITY DEFINER` este folosit pentru a permite funcției să scrie
-- în tabela `sportivi`, chiar dacă utilizatorul nu ar avea în mod
-- normal permisiunea directă de a-și modifica propriul `rol_activ_context`.
-- Clauza `WHERE user_id = auth.uid()` asigură că utilizatorii
-- își pot modifica doar propriul profil.
-- =================================================================

CREATE OR REPLACE FUNCTION public.set_active_role(p_role_name text)
RETURNS void AS $$
BEGIN
  UPDATE public.sportivi
  SET rol_activ_context = p_role_name
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
