-- D-09 (faza 31 - hub Plati si Facturi): INSTRUCTOR trebuie sa poata folosi butonul
-- de corectie rapida din FacturaDetaliu.tsx, care face .update() direct pe tabela plati.
--
-- Policy-ul rbv_plati_update avea un rol-check redundant
-- (rol_denumire IN ('SUPER_ADMIN_FEDERATIE', 'ADMIN_CLUB')) ANDuit peste
-- has_access_to_club(), care deja restrictioneaza corect rolurile:
--   SUPER_ADMIN_FEDERATIE, ADMIN, sau ADMIN_CLUB/INSTRUCTOR cu club_id potrivit
--   (gated pe header-ul active-role-context-id).
-- Acel AND redundant excludea INSTRUCTOR de la UPDATE, desi are deja SELECT
-- prin rbv_plati_admin_club (acelasi has_access_to_club, fara rol-check extra).
--
-- Fix: aliniem UPDATE la exact acelasi pattern deja folosit de SELECT.
DROP POLICY IF EXISTS rbv_plati_update ON public.plati;

CREATE POLICY rbv_plati_update ON public.plati
FOR UPDATE TO authenticated
USING (
  has_access_to_club(COALESCE(club_id, (SELECT s.club_id FROM sportivi s WHERE s.id = plati.sportiv_id)))
)
WITH CHECK (
  has_access_to_club(COALESCE(club_id, (SELECT s.club_id FROM sportivi s WHERE s.id = plati.sportiv_id)))
);
