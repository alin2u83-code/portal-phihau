-- =================================================================
-- Funcție RPC pentru Raport de Încasări Lunare pe Categorii
-- v1.0
-- =================================================================
-- Scop: Calculează totalul încasărilor pentru luna curentă, grupate
-- pe categoriile 'Vize', 'Echipament' și 'Stagii'.
--
-- Funcționalitate:
-- - Este conștientă de context: Folosește `get_active_role()` și
--   `get_active_club_id()` din JWT pentru a filtra datele.
-- - SuperAdminii văd un raport consolidat pentru toată federația.
-- - Adminii de club/Instructorii văd un raport doar pentru clubul lor activ.
-- - Gestionează corect plățile parțiale prin distribuirea proporțională
--   a sumei unei tranzacții între facturile pe care le acoperă.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_income_by_category()
RETURNS TABLE (
    categorie TEXT,
    total_incasat NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_active_role TEXT;
    v_active_club_id UUID;
    v_start_of_month DATE;
    v_end_of_month DATE;
BEGIN
    -- Obține contextul din JWT-ul utilizatorului care apelează funcția
    v_active_role := public.get_active_role();
    v_active_club_id := public.get_active_club_id();

    -- Definește intervalul de date pentru luna curentă
    v_start_of_month := date_trunc('month', current_date);
    v_end_of_month := date_trunc('month', current_date) + interval '1 month' - interval '1 day';

    RETURN QUERY
    WITH transactions_in_month AS (
        -- Pas 1: Găsește toate tranzacțiile relevante din luna curentă
        SELECT
            t.id,
            t.suma,
            t.plata_ids
        FROM public.tranzactii t
        WHERE t.data_platii BETWEEN v_start_of_month AND v_end_of_month
          AND array_length(t.plata_ids, 1) > 0 -- Procesează doar tranzacțiile legate de facturi
    ),
    payments_for_transactions AS (
        -- Pas 2: Extrage toate facturile acoperite de aceste tranzacții, aplicând filtrul de securitate
        SELECT
            tim.id AS tranzactie_id,
            tim.suma AS suma_tranzactie,
            p.id AS plata_id,
            p.tip,
            p.suma AS suma_plata
        FROM transactions_in_month tim
        CROSS JOIN LATERAL unnest(tim.plata_ids) AS plata_id_unnested
        JOIN public.plati p ON p.id = plata_id_unnested
        WHERE
            -- Super Adminul vede tot
            v_active_role = 'SUPER_ADMIN_FEDERATIE'
            OR
            -- Restul rolurilor văd doar datele clubului lor
            EXISTS (
                SELECT 1
                FROM public.sportivi s
                WHERE (s.id = p.sportiv_id OR (p.familie_id IS NOT NULL AND s.familie_id = p.familie_id))
                  AND s.club_id = v_active_club_id
            )
    ),
    transaction_totals AS (
        -- Pas 3: Calculează totalul datorat pentru fiecare tranzacție, pentru a permite distribuția proporțională
        SELECT
            pft.tranzactie_id,
            SUM(pft.suma_plata) as total_datorat_pe_tranzactie
        FROM payments_for_transactions pft
        GROUP BY pft.tranzactie_id
    )
    -- Pas 4: Calculează suma finală pe categorii
    SELECT
        CASE
            WHEN pft.tip = 'Taxa Anuala' THEN 'Vize'
            WHEN pft.tip = 'Taxa Stagiu' THEN 'Stagii'
            ELSE pft.tip
        END::TEXT AS categorie,
        -- Distribuie suma tranzacției proporțional între facturile acoperite
        SUM(
            pft.suma_tranzactie * (pft.suma_plata / NULLIF(tt.total_datorat_pe_tranzactie, 0))
        )::NUMERIC AS total_incasat
    FROM
        payments_for_transactions pft
    JOIN
        transaction_totals tt ON pft.tranzactie_id = tt.tranzactie_id
    WHERE
        pft.tip IN ('Taxa Anuala', 'Echipament', 'Taxa Stagiu')
    GROUP BY
        categorie;
END;
$$;
