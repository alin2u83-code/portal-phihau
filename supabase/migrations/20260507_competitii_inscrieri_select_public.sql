-- Deschide SELECT pe inscrieri_competitie si echipe_competitie pentru toti utilizatorii autentificati.
-- Datele de competitie (cine e inscris, in ce categorie, din ce club) sunt informatii publice
-- in cadrul aplicatiei. INSERT/UPDATE/DELETE raman restrictionate la propriul club sau admin.

DROP POLICY IF EXISTS "inscrieri_select" ON public.inscrieri_competitie;
CREATE POLICY "inscrieri_select" ON public.inscrieri_competitie
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "echipe_select" ON public.echipe_competitie;
CREATE POLICY "echipe_select" ON public.echipe_competitie
    FOR SELECT USING (auth.uid() IS NOT NULL);
