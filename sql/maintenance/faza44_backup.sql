-- Faza 44: backup inainte de orice migrare in domeniul financiar.
-- Se ruleaza o singura data prin Supabase MCP execute_sql, dupa OK explicit.
-- Esueaza intentionat daca backup_faza44 exista deja (CREATE SCHEMA fara IF NOT EXISTS),
-- ca sa nu suprascrie primul instantaneu.
-- Restaurare un rand/tabel: INSERT INTO public.<t> SELECT * FROM backup_faza44.<t> WHERE id = ...;
-- (dupa verificarea ca randul lipseste sau dupa UPDATE explicit din backup, dupa id, niciodata "orbeste").

CREATE SCHEMA backup_faza44;
REVOKE ALL ON SCHEMA backup_faza44 FROM PUBLIC, anon, authenticated;

CREATE TABLE backup_faza44.plati (LIKE public.plati INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.plati SELECT * FROM public.plati;
ALTER TABLE backup_faza44.plati ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.tranzactii (LIKE public.tranzactii INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.tranzactii SELECT * FROM public.tranzactii;
ALTER TABLE backup_faza44.tranzactii ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.tranzactie_plata (LIKE public.tranzactie_plata INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.tranzactie_plata SELECT * FROM public.tranzactie_plata;
ALTER TABLE backup_faza44.tranzactie_plata ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.obligatii_plata (LIKE public.obligatii_plata INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.obligatii_plata SELECT * FROM public.obligatii_plata;
ALTER TABLE backup_faza44.obligatii_plata ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.incasari_efective (LIKE public.incasari_efective INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.incasari_efective SELECT * FROM public.incasari_efective;
ALTER TABLE backup_faza44.incasari_efective ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.alocari_plati (LIKE public.alocari_plati INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.alocari_plati SELECT * FROM public.alocari_plati;
ALTER TABLE backup_faza44.alocari_plati ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.plata (LIKE public.plata INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.plata SELECT * FROM public.plata;
ALTER TABLE backup_faza44.plata ENABLE ROW LEVEL SECURITY;

CREATE TABLE backup_faza44.catalog_pret (LIKE public.catalog_pret INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO backup_faza44.catalog_pret SELECT * FROM public.catalog_pret;
ALTER TABLE backup_faza44.catalog_pret ENABLE ROW LEVEL SECURITY;

-- Definitii text (functii, triggere, view-uri, politici, coloane)
CREATE TABLE backup_faza44.definitii (
  tip text,
  obiect text,
  definitie text,
  captat_la timestamptz DEFAULT now()
);
ALTER TABLE backup_faza44.definitii ENABLE ROW LEVEL SECURITY;

INSERT INTO backup_faza44.definitii (tip, obiect, definitie)
SELECT 'functie', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
  AND (p.prosrc ~* '(plata_ids|suma_totala|suma_incasata|obligatii_plata|incasari_efective|alocari_plati|catalog_pret|tip_plata|tip_abonament_id)'
       OR p.proname IN ('proceseaza_incasare_normalizata','proceseaza_plata_factura','recalculare_stare_plata','generare_factura_examen'));

INSERT INTO backup_faza44.definitii (tip, obiect, definitie)
SELECT 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND t.tgrelid::regclass::text IN ('plati','tranzactii','tranzactie_plata','obligatii_plata','incasari_efective','alocari_plati','plata','catalog_pret');

INSERT INTO backup_faza44.definitii (tip, obiect, definitie)
SELECT 'view', v.viewname,
       pg_get_viewdef(c.oid, true) || E'\n-- reloptions: ' || coalesce(c.reloptions::text, '-')
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname AND c.relnamespace = 'public'::regnamespace
WHERE v.schemaname = 'public'
  AND v.definition ~* '(plata_ids|suma_totala|suma_incasata|obligatii_plata|incasari_efective|alocari_plati|catalog_pret|tip_plata|tip_abonament_id|(from|join)\s+(public\.)?plata\M)';

INSERT INTO backup_faza44.definitii (tip, obiect, definitie)
SELECT 'politica', tablename || '.' || policyname,
       'cmd=' || cmd || ' roles=' || roles::text || ' qual=' || coalesce(qual, '') || ' with_check=' || coalesce(with_check, '')
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('plati','tranzactii','tranzactie_plata','obligatii_plata','incasari_efective','alocari_plati','plata','catalog_pret');

INSERT INTO backup_faza44.definitii (tip, obiect, definitie)
SELECT 'coloane', table_name || '.' || column_name,
       data_type || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, '')
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('plati','tranzactii','tranzactie_plata');

-- Verificare: count + checksum public vs backup
SELECT 'plati' t,
  (SELECT count(*) FROM public.plati) n_pub, (SELECT count(*) FROM backup_faza44.plati) n_bak,
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.plati x) md5_pub,
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.plati x) md5_bak
UNION ALL SELECT 'tranzactii',
  (SELECT count(*) FROM public.tranzactii), (SELECT count(*) FROM backup_faza44.tranzactii),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.tranzactii x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.tranzactii x)
UNION ALL SELECT 'tranzactie_plata',
  (SELECT count(*) FROM public.tranzactie_plata), (SELECT count(*) FROM backup_faza44.tranzactie_plata),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.tranzactie_plata x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.tranzactie_plata x)
UNION ALL SELECT 'obligatii_plata',
  (SELECT count(*) FROM public.obligatii_plata), (SELECT count(*) FROM backup_faza44.obligatii_plata),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.obligatii_plata x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.obligatii_plata x)
UNION ALL SELECT 'incasari_efective',
  (SELECT count(*) FROM public.incasari_efective), (SELECT count(*) FROM backup_faza44.incasari_efective),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.incasari_efective x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.incasari_efective x)
UNION ALL SELECT 'alocari_plati',
  (SELECT count(*) FROM public.alocari_plati), (SELECT count(*) FROM backup_faza44.alocari_plati),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.alocari_plati x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.alocari_plati x)
UNION ALL SELECT 'plata',
  (SELECT count(*) FROM public.plata), (SELECT count(*) FROM backup_faza44.plata),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.plata x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.plata x)
UNION ALL SELECT 'catalog_pret',
  (SELECT count(*) FROM public.catalog_pret), (SELECT count(*) FROM backup_faza44.catalog_pret),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM public.catalog_pret x),
  (SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM backup_faza44.catalog_pret x);

SELECT tip, count(*) FROM backup_faza44.definitii GROUP BY tip ORDER BY tip;
