import { useQuery } from '@tanstack/react-query';
import { fetchIstoricGrupeSportiv, fetchIstoricMembriGrupa } from '../services/grupeIstoricService';
import type { SportivGrupaIstoric } from '../types';

export function useIstoricGrupeSportiv(sportiviId: string | null | undefined) {
    return useQuery<SportivGrupaIstoric[]>({
        queryKey: ['grupe-istoric-sportiv', sportiviId],
        queryFn: async () => {
            if (!sportiviId) return [];
            const { data, error } = await fetchIstoricGrupeSportiv(sportiviId);
            if (error) throw error;
            return (data as SportivGrupaIstoric[]) || [];
        },
        enabled: !!sportiviId,
        staleTime: 2 * 60 * 1000,
    });
}

export function useIstoricMembriGrupa(grupaId: string | null | undefined) {
    return useQuery({
        queryKey: ['grupe-istoric-membri', grupaId],
        queryFn: async () => {
            if (!grupaId) return [];
            const { data, error } = await fetchIstoricMembriGrupa(grupaId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!grupaId,
        staleTime: 2 * 60 * 1000,
    });
}
