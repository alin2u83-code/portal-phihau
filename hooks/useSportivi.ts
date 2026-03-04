import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export const useSportivi = (clubId: string | null) => {
    return useQuery<Sportiv[], Error>({
        queryKey: ['sportivi', clubId],
        queryFn: async () => {
            let query = supabase.from('sportivi').select('*, cluburi(*)');
            if (clubId) {
                query = query.eq('club_id', clubId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data as Sportiv[];
        },
    });
};
