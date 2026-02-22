-- =================================================================
-- Funcție Atomică pentru Comutarea Rolului Activ (v3.0)
-- =================================================================
-- Scop: Înlocuiește funcția `set_primary_context` cu o versiune mai simplă
-- și atomică, `switch_primary_context`, care operează direct pe ID-ul
-- unic al contextului de rol (`utilizator_roluri_multicont.id`).
--
-- Funcționalitate Cheie:
-- - Utilizează un singur UPDATE statement pentru a comuta flag-ul `is_primary`,
--   asigurând atomicitatea operațiunii.
-- - Se bazează pe `auth.uid()` pentru securitate, permițând doar
--   utilizatorului autentificat să-și schimbe propriul context.
-- - Declanșarea acestui UPDATE va activa automat trigger-ul existent
--   care sincronizează metadatele în JWT, fără a necesita cod suplimentar.
-- =================================================================

-- Ștergem funcțiile vechi pentru a evita confuzia și conflictele.
DROP FUNCTION IF EXISTS public.set_primary_context(uuid, text);
DROP FUNCTION IF EXISTS public.switch_active_role(uuid);

-- Creăm noua funcție RPC, mai eficientă și mai sigură.
CREATE OR REPLACE FUNCTION public.switch_primary_context(p_target_context_id uuid)
RETURNS void AS $$
BEGIN
    -- Pas 1: Verifică dacă contextul țintă aparține utilizatorului curent
    -- Aceasta este o măsură de securitate esențială.
    IF NOT EXISTS (
        SELECT 1
        FROM public.utilizator_roluri_multicont
        WHERE id = p_target_context_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acces neautorizat sau context invalid.';
    END IF;

    -- Pas 2: Actualizează atomic toate contextele utilizatorului într-o singură operațiune.
    -- Condiția `(id = p_target_context_id)` va evalua la `true` doar pentru rândul țintă,
    -- setându-l ca primar, și la `false` pentru toate celelalte.
    UPDATE public.utilizator_roluri_multicont
    SET is_primary = (id = p_target_context_id)
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
