import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

/**
 * Hook bulk: id-urile sportivilor scutiți de abonament (personal club) din clubul curent.
 *
 * Motivație: câmpul scutit_abonament nu e în types.ts (constraint LOCKED, ca data_start_facturare)
 * și nici în view-ul rbv_sportivi_complet, deci îl citim separat, o singură dată pentru tot clubul.
 * RLS filtrează după club; nu mai filtrăm manual.
 */
export const useScutitiAbonament = () => {
    const queryClient = useQueryClient();
    const queryKey = ['scutiti-abonament'];

    const query = useQuery<Set<string>, Error>({
        queryKey,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('id')
                .eq('scutit_abonament', true);
            if (error) throw error;
            return new Set((data || []).map((r: any) => r.id as string));
        },
    });

    const mutation = useMutation<void, Error, { sportivId: string; scutit: boolean }>({
        mutationFn: async ({ sportivId, scutit }) => {
            const { error } = await supabase
                .from('sportivi')
                .update({ scutit_abonament: scutit } as any)
                .eq('id', sportivId);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        /** Id-urile sportivilor scutiți; set gol cât timp se încarcă */
        scutiti: query.data ?? new Set<string>(),
        isLoading: query.isLoading,
        setScutitAsync: mutation.mutateAsync,
        isSaving: mutation.isPending,
    };
};
