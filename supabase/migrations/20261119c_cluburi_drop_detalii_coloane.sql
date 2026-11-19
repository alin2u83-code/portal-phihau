-- Quick 261119-ihl, VAL 3 (destructiv): cif / perioada_gratie_zile / factura_automata_inscriere pleaca din `cluburi`.
-- STARE: APLICAT pe live 19.11.2026 (deploy Val 2 READY, 0 diferente detalii vs cluburi inainte).
-- Datele raman in `cluburi_detalii` (backfill facut in 20261119a). Dupa asta `cluburi` public contine doar nume/oras/tema/logo/slug/federatie.
-- ROLLBACK date: ALTER TABLE cluburi ADD COLUMN cif text UNIQUE, ADD COLUMN perioada_gratie_zile integer NOT NULL DEFAULT 30,
--   ADD COLUMN factura_automata_inscriere boolean NOT NULL DEFAULT false; apoi UPDATE ... FROM cluburi_detalii.
-- Unicitatea CIF: de la UNIQUE pe cluburi.cif (cluburi_cif_key, dispare cu coloana) la indexul parțial cluburi_detalii_cif_unic (20261119b).

-- Singurul obiect care depinde de coloane (verificat live: 0 dependenti, nefolosit in aplicatie). Fara CASCADE.
DROP VIEW public.rbv_cluburi_detaliu;

ALTER TABLE public.cluburi
    DROP COLUMN cif,
    DROP COLUMN perioada_gratie_zile,
    DROP COLUMN factura_automata_inscriere;

-- Recreat identic (aceeasi lista de coloane, acelasi filtru), cu CIF din cluburi_detalii.
-- CREATE OR REPLACE ar reseta security_invoker, de aceea DROP + CREATE + setare explicita.
CREATE VIEW public.rbv_cluburi_detaliu AS
SELECT c.id, c.nume, d.cif, c.oras, c.federatie_id, c.created_at, c.theme_config, c.logo_url, c.slug
FROM public.cluburi c
LEFT JOIN public.cluburi_detalii d ON d.club_id = c.id
WHERE public.is_super_admin() OR public.is_admin_club(c.id);

ALTER VIEW public.rbv_cluburi_detaliu SET (security_invoker = true);
GRANT SELECT ON public.rbv_cluburi_detaliu TO authenticated;
REVOKE ALL ON public.rbv_cluburi_detaliu FROM anon;
