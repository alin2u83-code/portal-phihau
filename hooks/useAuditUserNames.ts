import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import type { SearchableSelectOption } from '../components/ui';

interface UtilizatorRolRow {
  user_id: string | null;
  nume_utilizator_cache: string | null;
}

async function fetchUtilizatorRoluri(): Promise<UtilizatorRolRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('utilizator_roluri_multicont')
    .select('user_id, nume_utilizator_cache');
  if (error) return [];
  return (data as UtilizatorRolRow[]) ?? [];
}

export function useAuditUserNames() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-user-names'],
    queryFn: fetchUtilizatorRoluri,
    staleTime: 5 * 60_000,
  });

  const rows = data ?? [];

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (!row.user_id) continue;
      if (map[row.user_id]) continue;
      if (row.nume_utilizator_cache) {
        map[row.user_id] = row.nume_utilizator_cache;
      }
    }
    return map;
  }, [rows]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return Object.entries(nameMap)
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ro'));
  }, [nameMap]);

  return { nameMap, options, loading: isLoading };
}
