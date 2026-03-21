-- Fix: Normalizare status prezenta_antrenament (lowercase → Uppercase)
-- Cauza: FormularPrezenta salva 'prezent'/'absent' iar InstructorPrezentaPage
--        salva 'Prezent'/'Absent'. Fiecare component citea doar propriul format.
-- Rezultat: 747 inregistrari lowercase, 35 uppercase, incompatibile reciproc.

UPDATE public.prezenta_antrenament
SET status = 'Prezent'
WHERE status = 'prezent';

UPDATE public.prezenta_antrenament
SET status = 'Absent'
WHERE status = 'absent';
