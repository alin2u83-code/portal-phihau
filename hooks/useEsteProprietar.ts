import { useQuery } from '@tanstack/react-query';
import { esteProprietar } from '../services/accesExternService';

/** Doar pentru afișare; verificarea reală e server-side (RPC + endpoint). */
export function useEsteProprietar(): boolean {
  const { data } = useQuery({ queryKey: ['este-proprietar'], queryFn: esteProprietar, staleTime: Infinity, retry: false });
  return data === true;
}
