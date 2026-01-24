-- Adaugă coloana club_id la diverse tabele și creează constrângerile Foreign Key
ALTER TABLE public.grupe ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.sesiuni_examene ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.evenimente ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.familii ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.tipuri_abonament ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.reduceri ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.nom_locatii ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.preturi_config ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;
ALTER TABLE public.grade_preturi_config ADD COLUMN club_id UUID REFERENCES public.cluburi(id) ON DELETE CASCADE;

-- Creează indecși pentru a optimiza interogările filtrate după club_id
CREATE INDEX idx_grupe_club_id ON public.grupe(club_id);
CREATE INDEX idx_sesiuni_examene_club_id ON public.sesiuni_examene(club_id);
CREATE INDEX idx_evenimente_club_id ON public.evenimente(club_id);
CREATE INDEX idx_familii_club_id ON public.familii(club_id);
CREATE INDEX idx_tipuri_abonament_club_id ON public.tipuri_abonament(club_id);
CREATE INDEX idx_reduceri_club_id ON public.reduceri(club_id);
CREATE INDEX idx_nom_locatii_club_id ON public.nom_locatii(club_id);
CREATE INDEX idx_preturi_config_club_id ON public.preturi_config(club_id);
CREATE INDEX idx_grade_preturi_config_club_id ON public.grade_preturi_config(club_id);

-- NOTĂ: Rulați acest script o singură dată. După rulare, va trebui să populați manual coloana `club_id`
-- pentru înregistrările existente, altfel acestea nu vor fi vizibile pentru Adminii de Club.
-- Exemplu: UPDATE public.grupe SET club_id = 'UUID-ul-clubului-principal' WHERE club_id IS NULL;