import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Grupa } from '../types';

export const useGrupe = (contextId: string | null | undefined) => {
    return useQuery<Grupa[], Error>({
        queryKey: ['grupe', contextId],
        queryFn: async () => {
            const { data, error } = await supabase.from('vedere_cluburi_grupe').select('*, program:orar_saptamanal!grupa_id(*)');
            if (error) throw error;
            return data as Grupa[];
        },
    });
};
