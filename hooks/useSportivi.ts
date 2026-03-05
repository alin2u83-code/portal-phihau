import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export const useSportivi = (clubId: string | null) => {
    return useQuery<Sportiv[], Error>({
        queryKey: ['sportivi', clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('*, cluburi(*), roluri:utilizator_roluri_multicont(rol_denumire)');
            
            if (error) throw error;
            
            // Map the roles to the expected format
            const formattedData = (data as any[]).map(s => ({
                ...s,
                roluri: s.roluri.map((r: any) => ({ nume: r.rol_denumire }))
            }));

            return formattedData as Sportiv[];
        },
    });
};
