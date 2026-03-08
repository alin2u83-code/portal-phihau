import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export const useSportivi = (clubId: string | null) => {
    return useQuery<Sportiv[], Error>({
        queryKey: ['sportivi', clubId],
        queryFn: async () => {
            let query = supabase
                .from('sportivi')
                .select('*, cluburi(*), roluri:utilizator_roluri_multicont(id, rol_denumire)');
            
            if (clubId && clubId !== 'null' && clubId !== 'undefined') {
                query = query.eq('club_id', clubId);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            
            // Map the roles to the expected format
            const formattedData = (data as any[]).map(s => ({
                ...s,
                roluri: s.roluri.map((r: any) => ({ id: r.id, nume: r.rol_denumire }))
            }));

            return formattedData as Sportiv[];
        },
    });
};
