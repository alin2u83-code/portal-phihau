import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Plata } from '../types';

export const usePlati = (contextId: string | null | undefined) => {
    return useQuery<Plata[], Error>({
        queryKey: ['plati', contextId],
        queryFn: async () => {
            const { data, error } = await supabase.from('plati').select('*');
            if (error) throw error;
            return data as Plata[];
        },
    });
};
