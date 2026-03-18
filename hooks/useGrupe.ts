import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Grupa } from '../types';
import { getCachedData, setCachedData } from '../utils/cache';

export const useGrupe = (contextId: string | null | undefined) => {
    const cacheKey = `cache_grupe_${contextId || 'all'}`;
    
    return useQuery<Grupa[], Error>({
        queryKey: ['grupe', contextId],
        queryFn: async () => {
            // Check localStorage cache first
            const cached = getCachedData<Grupa[]>(cacheKey, 10);
            if (cached) return cached;

            const { data, error } = await supabase.from('vedere_cluburi_grupe').select('*, sportivi(count), program:orar_saptamanal!grupa_id(*)');
            if (error) throw error;
            
            const result = data as Grupa[];
            // Update localStorage cache
            setCachedData(cacheKey, result);
            
            return result;
        },
        staleTime: 10 * 60 * 1000, // Also tell React Query to keep it fresh for 10 mins
    });
};
