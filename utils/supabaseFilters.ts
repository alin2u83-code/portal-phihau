import { SupabaseClient } from '@supabase/supabase-js';

const cleanUuid = (uuid: string | null | undefined): string | null => {
  if (typeof uuid !== 'string') return uuid;
  const cleaned = uuid.replace(/"/g, '').trim();
  return cleaned === 'null' || cleaned === '' ? null : cleaned;
};

// Decorator function to apply UUID cleaning to .eq() and .in() filters
export const withCleanUuidFilters = <T extends Record<string, any>>(supabase: SupabaseClient) => {
  const originalFrom = supabase.from.bind(supabase);

  supabase.from = <U extends T>(table: string) => {
    const query = originalFrom<U>(table);
    const originalEq = query.eq.bind(query);
    const originalIn = query.in.bind(query);

    query.eq = (column: string, value: string | number | boolean | null) => {
      if (typeof value === 'string' && (column.endsWith('_id') || column === 'id')) {
        return originalEq(column, cleanUuid(value));
      }
      return originalEq(column, value);
    };

    query.in = (column: string, values: (string | number | boolean | null)[]) => {
      if (column.endsWith('_id') || column === 'id') {
        const cleanedValues = values.map(v => typeof v === 'string' ? cleanUuid(v) : v);
        return originalIn(column, cleanedValues);
      }
      return originalIn(column, values);
    };

    return query;
  };

  return supabase;
};
