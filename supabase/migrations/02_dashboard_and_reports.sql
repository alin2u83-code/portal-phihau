-- =================================================================
-- Funcții Optimizate pentru Dashboard și Rapoarte (v2.0)
-- Utilizează noile funcții helper bazate pe JWT pentru consistență.
-- =================================================================

-- Funcția 1: Raport detaliat de prezență
-- Returnează un tabel cu statistici de prezență pentru fiecare sportiv din clubul activ.
CREATE OR REPLACE FUNCTION get_raport_prezenta_detaliat()
RETURNS TABLE (
    sportiv_id uuid,
    nume_complet text,
    grad_actual text,
    antrenamente_tinute bigint,
    prezente_efective bigint,
    procentaj_prezenta numeric,
    ultima_prezenta date
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Utilizează noua funcție helper pentru a obține ID-ul clubului din JWT
    v_club_id uuid := public.get_active_club_id();
BEGIN
    RETURN QUERY
    WITH sportivi_club AS (
        SELECT
            s.id,
            s.nume || ' ' || s.prenume AS nume_complet,
            g.nume as grad_actual,
            s.grupa_id
        FROM public.sportivi s
        LEFT JOIN public.grade g ON s.grad_actual_id = g.id
        WHERE s.club_id = v_club_id AND s.status = 'Activ'
    ),
    antrenamente_per_grupa AS (
        SELECT
            pa.grupa_id,
            count(pa.id) as total
        FROM public.program_antrenamente pa
        WHERE pa.data <= CURRENT_DATE AND pa.grupa_id IN (SELECT DISTINCT sc.grupa_id FROM sportivi_club sc WHERE sc.grupa_id IS NOT NULL)
        GROUP BY pa.grupa_id
    ),
    prezente AS (
        SELECT
            pa.sportiv_id,
            count(*) as numar_prezente,
            max(ac.data) as ultima_prezenta
        FROM public.prezenta_antrenament pa
        JOIN public.program_antrenamente ac ON pa.antrenament_id = ac.id
        WHERE pa.sportiv_id IN (SELECT sc.id FROM sportivi_club sc)
        GROUP BY pa.sportiv_id
    )
    SELECT
        sc.id as sportiv_id,
        sc.nume_complet,
        sc.grad_actual,
        COALESCE(apg.total, 0) as antrenamente_tinute,
        COALESCE(p.numar_prezente, 0) as prezente_efective,
        CASE
            WHEN COALESCE(apg.total, 0) > 0 THEN
                TRUNC((COALESCE(p.numar_prezente, 0)::numeric / apg.total) * 100, 2)
            ELSE 0
        END as procentaj_prezenta,
        p.ultima_prezenta
    FROM sportivi_club sc
    LEFT JOIN prezente p ON sc.id = p.sportiv_id
    LEFT JOIN antrenamente_per_grupa apg ON sc.grupa_id = apg.grupa_id
    ORDER BY sc.nume_complet;
END;
$$;

-- Funcția 2: Statistici rapide pentru Dashboard-ul de Club
-- Returnează numărul de sportivi activi, grupe și totalul datoriilor pentru clubul activ.
CREATE OR REPLACE FUNCTION get_club_dashboard_stats()
RETURNS TABLE (
    sportivi_activi bigint,
    grupe_active bigint,
    total_datorii numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Utilizează noua funcție helper pentru a obține ID-ul clubului din JWT
    v_club_id uuid := public.get_active_club_id();
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.sportivi WHERE club_id = v_club_id AND status = 'Activ') as sportivi_activi,
        (SELECT COUNT(*) FROM public.grupe WHERE club_id = v_club_id) as grupe_active,
        (SELECT COALESCE(SUM(p.suma), 0)
         FROM public.plati p
         WHERE (p.status = 'Neachitat' OR p.status = 'Achitat Parțial')
         AND (
            (p.sportiv_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.id = p.sportiv_id AND s.club_id = v_club_id))
            OR
            (p.familie_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.sportivi s WHERE s.familie_id = p.familie_id AND s.club_id = v_club_id))
         )) as total_datorii;
END;
$$;