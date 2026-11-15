// Faza 42: sursa FRAM pentru inscriere, filtrata pe server (tip FRAM + an) ca sa nu fie trunchiata la 1000 de randuri
// ca useData().vizeSportivi; aceeasi regula "achitat" ca triggerul trg_participant_fram.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import type { VizaSportiv } from '../types';

export function useVizeFramClub(
  competitieId: string,
  an: number,
  clubId: string | null | undefined,
): { vize: VizaSportiv[]; eroare: string | null } {
  const q = useQuery({
    queryKey: ['vize-fram-club', competitieId, clubId, an],
    enabled: !!competitieId && !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('vize_club_competitie', { p_competitie: competitieId, p_club: clubId })
        .eq('tip', 'FRAM')
        .eq('an', an);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const vize = (q.data ?? []).map((v: any) => ({
    id: `${v.sportiv_id}-${v.an}-${v.tip}`,
    sportiv_id: v.sportiv_id,
    an: v.an,
    tip: v.tip,
    scutit: false,
    plata: v.achitata ? { status: 'Achitat' } : null,
    plata_id: null,
    club_id: clubId,
    status_viza: 'Activ',
    data_platii: '',
  })) as unknown as VizaSportiv[];
  return { vize, eroare: q.error ? ((q.error as any).message || 'eroare necunoscută') : null };
}
