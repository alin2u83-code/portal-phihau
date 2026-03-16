-- Tabel pentru gestiunea vizelor medicale
CREATE TABLE IF NOT EXISTS public.vize_medicale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sportiv_id UUID NOT NULL REFERENCES public.sportivi(id) ON DELETE CASCADE,
    data_emitere DATE NOT NULL,
    data_expirare DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Valid', 'Expirat', 'În așteptare')),
    document_url TEXT, -- Link către fișierul încărcat (PDF/Imagine)
    observatii TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru viteză la filtrarea vizelor expirate
CREATE INDEX IF NOT EXISTS idx_vize_medicale_expirare ON public.vize_medicale(data_expirare);
CREATE INDEX IF NOT EXISTS idx_vize_medicale_sportiv ON public.vize_medicale(sportiv_id);

-- Politici RLS (Securitate)
ALTER TABLE public.vize_medicale ENABLE ROW LEVEL SECURITY;

-- Sportivii își pot vedea propriile vize
CREATE POLICY "Sportivii își văd propriile vize" ON public.vize_medicale
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.sportivi WHERE id = sportiv_id));

-- Adminii și Instructorii pot vedea și gestiona tot
CREATE POLICY "Adminii și Instructorii gestionează vizele" ON public.vize_medicale
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roluri r ON ur.rol_id = r.id
            WHERE ur.user_id = auth.uid() AND r.nume IN ('ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE')
        )
    );
