import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

/**
 * Hook bulk citire data_start_facturare pentru TOȚI sportivii activi din club.
 *
 * Motivație: tabelul Luni Lipsă din RaportFinanciar are nevoie de data_start_facturare
 * pentru mulți sportivi simultan. Apelarea useDataStartFacturare per rând ar viola
 * regula React hooks (nu poți chema hook-uri în loop) și ar genera N query-uri inutile.
 *
 * Returnează: Record<sportiv_id, string | null>
 *   - string ISO 'YYYY-MM-DD' dacă e setată
 *   - null dacă nu e setată sau sportivul nu e activ
 *
 * Filtru 'Activ' se aplică la nivel de query (nu front-end) pentru a minimiza
 * volumul de date transferat.
 */
export const useDataStartFacturareAll = (): Record<string, string | null> => {
    const { data } = useQuery<Record<string, string | null>>({
        queryKey: ['data-start-facturare-all'],
        staleTime: 5 * 60 * 1000, // 5 minute
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('id, data_start_facturare')
                .eq('status', 'Activ');

            if (error) {
                console.error('[useDataStartFacturareAll] eroare:', error);
                return {};
            }

            const result: Record<string, string | null> = {};
            (data || []).forEach((row: any) => {
                result[row.id] = row.data_start_facturare ?? null;
            });
            return result;
        },
    });

    return data ?? {};
};
