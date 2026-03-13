INSERT INTO public.nom_categorii_competitie (id, denumire, varsta_min, varsta_max, ordine_afisare)
VALUES 
('0c2f53fa-214f-4dbd-8140-ffdd205e7452', 'Seniori', 18, 39, 5),
('5755d68a-0d22-438e-a042-dbbe80969469', 'Juniori 1', 16, 17, 4),
('6308a975-be0d-4be2-bca2-03b84a5f27fb', 'Juniori mici', 9, 12, 2),
('7c57eb19-46f0-4989-8424-f419c7392592', 'Juniori 2', 13, 15, 3),
('922a014a-c483-4536-9416-393cb21dd356', 'Veterani', 40, 120, 6),
('af434694-3bb7-479c-80dc-14541e7322e1', 'Copii', 4, 8, 1)
ON CONFLICT (id) DO UPDATE SET
    denumire = EXCLUDED.denumire,
    varsta_min = EXCLUDED.varsta_min,
    varsta_max = EXCLUDED.varsta_max,
    ordine_afisare = EXCLUDED.ordine_afisare;
