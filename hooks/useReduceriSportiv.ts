import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReduceriSportiv, type ReduceriPeSportiv } from '../services/reduceriSportivService';

const EMPTY: ReduceriPeSportiv = new Map();

/** Reducerile active pe sportiv pentru clubul dat (null = toate cele vizibile prin RLS). */
export function useReduceriSportiv(clubId?: string | null) {
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: ['reduceri-sportiv', clubId ?? 'toate'],
        queryFn: async () => {
            const { data, error } = await getReduceriSportiv(clubId);
            if (error) throw error;
            return data;
        },
        staleTime: 60_000,
    });
    return {
        reduceriPeSportiv: data ?? EMPTY,
        invalideaza: () => queryClient.invalidateQueries({ queryKey: ['reduceri-sportiv'] }),
    };
}
