import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Plata } from '../types';

export const usePlati = (clubId: string | null) => {
    return useQuery<Plata[], Error>({
        queryKey: ['plati', clubId],
        queryFn: async () => {
            let query = supabase.from('plati').select('*');
            if (clubId) {
                query = query.eq('club_id', clubId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data as Plata[];
        },
    });
};
