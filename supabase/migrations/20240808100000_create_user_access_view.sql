-- =================================================================
-- Vedere pentru Contextul de Acces al Utilizatorului
-- v1.0
-- =================================================================
-- Scop: Creează o singură sursă de adevăr pentru a prelua profilul
-- complet al unui utilizator și toate rolurile sale asociate
-- într-o singură interogare eficientă.
-- Vederea este securizată automat prin folosirea `auth.uid()`.
-- =================================================================

CREATE OR REPLACE VIEW public.v_user_access AS
SELECT
    s.*, -- Selectează toate coloanele din tabela 'sportivi'
    c.nume AS club_nume,
    (
        SELECT array_agg(ur.rol_denumire)
        FROM public.utilizator_roluri_multicont ur
        WHERE ur.user_id = s.user_id
    ) AS roles_list
FROM
    public.sportivi s
LEFT JOIN
    public.cluburi c ON s.club_id = c.id
WHERE
    s.user_id = auth.uid()
LIMIT 1;
