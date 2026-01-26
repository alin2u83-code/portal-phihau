-- =================================================================
-- Script de Mentenanță: Corectarea Sportivilor Orfani
-- Versiunea 1.0
--
-- OBIECTIV:
-- 1. Identifică toți sportivii care nu sunt asociați cu niciun club (club_id IS NULL).
-- 2. Asignează acești sportivi la clubul principal "Phi Hau Iași".
-- 3. Adaugă o constrângere NOT NULL pe coloana `club_id` pentru a preveni
--    crearea de sportivi orfani în viitor, asigurând integritatea datelor.
-- =================================================================

-- Pasul 1: Actualizează sportivii existenți care nu au un club asignat.
-- Asignează-le ID-ul clubului implicit "Phi Hau Iași".
-- ACEASTĂ ACȚIUNE ESTE NECESARĂ ÎNAINTE DE A ADĂUGA CONSTRÂNGEREA NOT NULL.

DO $$
BEGIN
    RAISE NOTICE 'Se caută și se actualizează sportivii orfani...';

    UPDATE public.sportivi
    SET club_id = 'cbb0b228-b3e0-4735-9658-70999eb256c6' -- ID-ul Clubului Phi Hau Iași
    WHERE club_id IS NULL;

    RAISE NOTICE 'Actualizare finalizată.';
END $$;


-- Pasul 2: Adaugă constrângerea NOT NULL pe coloana club_id.
-- Aceasta va preveni ca viitoare înregistrări în tabelul `sportivi`
-- să aibă valoarea NULL pentru `club_id`, eliminând problemele
-- de vizibilitate cauzate de RLS (Row Level Security).

DO $$
BEGIN
    RAISE NOTICE 'Se adaugă constrângerea NOT NULL pe sportivi.club_id...';

    ALTER TABLE public.sportivi
    ALTER COLUMN club_id SET NOT NULL;

    RAISE NOTICE 'Constrângere adăugată cu succes. Toți sportivii trebuie să aparțină unui club de acum înainte.';
END $$;

-- =================================================================
-- Script finalizat.
-- =================================================================
