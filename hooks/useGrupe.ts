import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Grupa } from '../types';

export const useGrupe = (clubId: string | null) => {
    return useQuery<Grupa[], Error>({
        queryKey: ['grupe', clubId],
        queryFn: async () => {
            let query = supabase.from('grupe').select('*, program:orar_saptamanal!grupa_id(*)');
            if (clubId) {
                query = query.in('club_id', [clubId]);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data as Grupa[];
        },
    });
};
