-- Diagnostic SQL: List sportivs from a club who do NOT have an active visa for a specific year
-- Replace [ID-UL_TAU] with the actual club UUID and [AN_CURENT] with the year (e.g., 2026)

SELECT 
    s.id,
    s.nume,
    s.prenume,
    s.cod_sportiv,
    s.club_id,
    c.nume as club_nume
FROM public.sportivi s
JOIN public.cluburi c ON s.club_id = c.id
WHERE s.club_id = '[ID-UL_TAU]' -- <--- INLOCUIESTE AICI
  AND s.status = 'Activ'
  AND NOT EXISTS (
      SELECT 1 
      FROM public.vize_sportivi v 
      WHERE v.sportiv_id = s.id 
        AND v.an = [AN_CURENT] -- <--- INLOCUIESTE AICI
        AND v.status_viza = 'Activ'
  )
ORDER BY s.nume, s.prenume;
