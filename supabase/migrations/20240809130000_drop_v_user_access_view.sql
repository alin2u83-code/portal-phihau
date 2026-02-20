-- =================================================================
-- Remediere Vulnerabilitate de Securitate
-- v1.0
-- =================================================================
-- Scop: Elimină view-ul `public.v_user_access` care a fost semnalat
-- ca un risc de securitate, deoarece ar putea expune date din `auth.users`
-- către roluri neautorizate (`anon`, `authenticated`).
--
-- Justificare:
-- - O analiză a codului frontend curent nu a găsit nicio utilizare
--   pentru acest view.
-- - Arhitectura de securitate curentă se bazează pe politici RLS
--   granulare și pe contextul din JWT, făcând acest view probabil redundant
--   și o sursă de confuzie.
-- - Eliminarea view-ului este cea mai sigură și curată metodă de a
--   remedia vulnerabilitatea, prevenind orice expunere accidentală a datelor.
-- =================================================================

DROP VIEW IF EXISTS public.v_user_access;
