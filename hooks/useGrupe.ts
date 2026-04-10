import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Grupa } from '../types';
import { getCachedData, setCachedData } from '../utils/cache';

export const useGrupe = (contextId: string | null | undefined, clubId?: string | null) => {
    const cacheKey = `cache_grupe_${contextId || 'all'}_${clubId || 'all'}`;
    // Nu executa query-ul până când contextId nu este cunoscut (utilizatorul și-a selectat rolul)
    const isReady = !!contextId;

    return useQuery<Grupa[], Error>({
        queryKey: ['grupe', contextId, clubId],
        enabled: isReady,
        queryFn: async () => {
            // Check localStorage cache first
            const cached = getCachedData<Grupa[]>(cacheKey, 10);
            if (cached) return cached;

            let query = supabase.from('grupe').select('*, sportivi!grupa_id(count), program:orar_saptamanal!grupa_id(*)');
            // Filtrează grupele după club_id dacă nu este SUPER_ADMIN_FEDERATIE
            if (clubId) {
                query = query.eq('club_id', clubId);
            }
            const { data, error } = await query;
            if (error) throw error;

            const result = data as Grupa[];
            // Nu salva în cache dacă rezultatul e gol — evită blocarea re-fetch-ului
            // când utilizatorul nu are încă grupe sau club_id nu era setat corect
            if (result && result.length > 0) {
                setCachedData(cacheKey, result);
            }

            return result;
        },
        staleTime: (query) => {
            // Nu considera datele "fresh" dacă sunt goale — permite re-fetch la navigare
            const data = query.state.data as Grupa[] | undefined;
            if (!data || data.length === 0) return 0;
            return 10 * 60 * 1000; // 10 min dacă avem date reale
        },
    });
};
