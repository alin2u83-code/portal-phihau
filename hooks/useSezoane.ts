import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sezon } from '../types';
import { useData } from '../contexts/DataContext';

// Fara cache localStorage (spre deosebire de useGrupe) — lista de sezoane e
// mica per club si trebuie sa reflecte rapid activarea unui sezon nou
// (arhivare automata a grupelor per-sezon, filtrare facturare).
export const useSezoane = (clubId: string | null | undefined) => {
    return useQuery<Sezon[], Error>({
        queryKey: ['sezoane', clubId],
        enabled: !!clubId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sezoane')
                .select('*')
                .eq('club_id', clubId as string)
                .order('data_start', { ascending: false });
            if (error) throw error;
            return data as Sezon[];
        },
        staleTime: 5 * 60 * 1000,
    });
};

// Cand clubId este null (ex. admin de federatie fara context de club activ),
// sezonActivId ramane null — consumatorii trateaza asta ca "fara filtrare pe
// sezon", identic cu comportamentul de dinaintea fazei 27.
export const useSezonActiv = (clubId: string | null | undefined) => {
    const { data, isLoading } = useSezoane(clubId);
    const sezoane = data ?? [];
    const sezonActiv = sezoane.find(s => s.activ) ?? null;
    return {
        sezoane,
        sezonActiv,
        sezonActivId: sezonActiv?.id ?? null,
        isLoading,
    };
};

// Deriva clubId din contextul de rol activ curent — util in componentele de
// facturare care nu primesc clubul explicit prin props.
export const useSezonActivCurent = () => {
    const { activeRoleContext } = useData();
    const clubId = activeRoleContext?.club_id ?? null;
    return useSezonActiv(clubId);
};
