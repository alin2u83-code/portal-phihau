import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface StatusPrezenta {
  id: string;
  cod: string;
  denumire: string;
  este_prezent: boolean;
  ordine: number;
}

const fetchStatuse = async (): Promise<StatusPrezenta[]> => {
  const { data, error } = await supabase
    .from('statuse_prezenta')
    .select('*')
    .order('ordine');
  if (error) throw error;
  return data as StatusPrezenta[];
};

export const useStatusePrezenta = () => {
  const { data: statuse = [] } = useQuery<StatusPrezenta[]>({
    queryKey: ['statuse_prezenta'],
    queryFn: fetchStatuse,
    staleTime: Infinity, // nomenclator stabil, nu se schimba
  });

  const byId = Object.fromEntries(statuse.map(s => [s.id, s]));
  const byCod = Object.fromEntries(statuse.map(s => [s.cod, s]));

  return {
    statuse,
    byId,
    byCod,
    prezentId: byCod['prezent']?.id ?? null,
    absentId:  byCod['absent']?.id  ?? null,
  };
};
