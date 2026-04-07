import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Grupa } from '../types';
import { getCachedData, setCachedData } from '../utils/cache';

export const useGrupe = (contextId: string | null | undefined, clubId?: string | null) => {
    const cacheKey = `cache_grupe_${contextId || 'all'}_${clubId || 'all'}`;

    return useQuery<Grupa[], Error>({
        queryKey: ['grupe', contextId, clubId],
        queryFn: async () => {
            // Check localStorage cache first
            const cached = getCachedData<Grupa[]>(cacheKey, 10);
            if (cached) return cached;

            let query = supabase.from('grupe').select('*, sportivi(count), program:orar_saptamanal!grupa_id(*)');
            // Filtrează grupele după club_id dacă nu este SUPER_ADMIN_FEDERATIE
            if (clubId) {
                query = query.eq('club_id', clubId);
            }
            const { data, error } = await query;
            if (error) throw error;

            const result = data as Grupa[];
            // Update localStorage cache
            setCachedData(cacheKey, result);

            return result;
        },
        staleTime: 10 * 60 * 1000, // Also tell React Query to keep it fresh for 10 mins
    });
};
