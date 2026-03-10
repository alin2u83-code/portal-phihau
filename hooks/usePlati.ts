import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Plata } from '../types';

export const usePlati = (clubId: string | null) => {
    return useQuery<Plata[], Error>({
        queryKey: ['plati', clubId],
        queryFn: async () => {
            const { data, error } = await supabase.from('vedere_cluburi_plati').select('*');
            if (error) throw error;
            return data as Plata[];
        },
    });
};
