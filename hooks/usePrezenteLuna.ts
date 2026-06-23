import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

/**
 * Hook React Query: returnează datele prezenței unui sportiv pentru o lună/an anume.
 *
 * Sursă: view vedere_prezenta_sportiv (confirmat din FIX_VIEWS_AND_RLS.sql + IstoricPrezentaGlobal.tsx).
 * Coloana status din view este string ('prezent'/'absent') — confirmat din IstoricPrezentaGlobal.tsx
 * unde se face `row.status?.toLowerCase() === 'prezent'`.
 *
 * RLS: view-ul este scoped prin politicile din tabelele subiacente (prezenta_antrenament, program_antrenamente).
 * Sportivii din alt club nu sunt vizibili (Threat T-14-02 — accept, confirmat din cercetare).
 *
 * @param sportivId - ID-ul sportivului; dacă null → query dezactivat
 * @param luna - luna 1-indexed (1=ianuarie)
 * @param an - anul (ex: 2026)
 * @param enabled - control extern lazy-load (default true); util pentru load on demand la click
 * @returns query React Query cu `data: string[]` (lista datelor ISO 'YYYY-MM-DD' ale prezenței)
 *
 * ASSUMPTION A1 din RESEARCH.md: status din vedere_prezenta_sportiv este string 'prezent'/'absent'.
 * Dacă la runtime status nu e string, filtrul returnează [] (graceful degradation).
 */
export const usePrezenteLuna = (
    sportivId: string | null | undefined,
    luna: number,
    an: number,
    enabled = true
) => {
    return useQuery<string[], Error>({
        queryKey: ['prezente-luna', sportivId, luna, an],
        enabled: enabled && !!sportivId,
        staleTime: 5 * 60 * 1000, // 5 minute
        queryFn: async () => {
            if (!sportivId) return [];

            // Calculăm intervalul datelor pentru luna solicitată
            const primaZi = new Date(an, luna - 1, 1).toISOString().split('T')[0];
            const ultimaZi = new Date(an, luna, 0).toISOString().split('T')[0]; // ziua 0 a lunii viitoare = ultima zi a lunii curente

            const { data, error } = await supabase
                .from('vedere_prezenta_sportiv')
                .select('data, status')
                .eq('sportiv_id', sportivId)
                .gte('data', primaZi)
                .lte('data', ultimaZi);

            if (error) throw error;

            // Filtrăm doar rândurile cu status 'prezent' (string, confirmat din IstoricPrezentaGlobal.tsx)
            // Guard: dacă status nu e string, îl convertim înainte de comparație (graceful degradation)
            const datePresente = (data || [])
                .filter(row => String(row.status ?? '').toLowerCase() === 'prezent')
                .map(row => row.data as string)
                .filter(Boolean)
                .sort(); // sortare crescătoare

            return datePresente;
        },
    });
};
