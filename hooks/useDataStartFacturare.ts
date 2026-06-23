import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

/**
 * Hook citire/scriere câmp data_start_facturare per sportiv.
 *
 * Motivație: câmpul data_start_facturare nu este adăugat în types.ts (constraint LOCKED din CONTEXT.md).
 * Acesta face un fetch separat, izolat, evitând orice modificare a interfeței Sportiv.
 *
 * data_start_facturare: string ISO 'YYYY-MM-DD' sau null dacă nu e setat.
 * NULL = sportivul nu are calcul "luni lipsă" activat (decis în CONTEXT.md).
 */
export const useDataStartFacturare = (sportivId: string | null | undefined) => {
    const queryClient = useQueryClient();
    const queryKey = ['data-start-facturare', sportivId];

    const query = useQuery<string | null, Error>({
        queryKey,
        enabled: !!sportivId,
        staleTime: 5 * 60 * 1000, // 5 minute
        queryFn: async () => {
            if (!sportivId) return null;
            const { data, error } = await supabase
                .from('sportivi')
                .select('data_start_facturare')
                .eq('id', sportivId)
                .maybeSingle();
            if (error) throw error;
            return (data as any)?.data_start_facturare ?? null;
        },
    });

    const mutation = useMutation<void, Error, string | null>({
        mutationFn: async (value: string | null) => {
            if (!sportivId) throw new Error('sportivId lipsă');
            const { error } = await supabase
                .from('sportivi')
                .update({ data_start_facturare: value } as any)
                .eq('id', sportivId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        /** Data de start a facturării: string ISO 'YYYY-MM-DD' sau null */
        dataStartFacturare: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error,
        /** Setează data_start_facturare; acceptă string ISO 'YYYY-MM-DD' sau null pentru ștergere */
        setDataStartFacturare: mutation.mutate,
        setDataStartFacturareAsync: mutation.mutateAsync,
        isSaving: mutation.isPending,
        saveError: mutation.error,
    };
};
