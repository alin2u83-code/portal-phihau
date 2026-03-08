import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export interface SportiviFilters {
    clubId?: string | null;
    status?: string;
    rolId?: string;
    gradId?: string;
}

export const useSportivi = (filters: SportiviFilters = {}) => {
    return useQuery<Sportiv[], Error>({
        queryKey: ['sportivi', filters],
        queryFn: async () => {
            let query = supabase
                .from('sportivi')
                .select('*, cluburi(*), roluri:utilizator_roluri_multicont(id, rol_denumire)');
            
            if (filters.clubId && filters.clubId !== 'null' && filters.clubId !== 'undefined') {
                query = query.eq('club_id', filters.clubId);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.gradId) {
                query = query.eq('grad_actual_id', filters.gradId);
            }
            // Note: Filtering by role (rolId) might require a join or a different approach if roluri is a separate table. 
            // Assuming roluri is a joined table, this might need adjustment based on schema.

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
