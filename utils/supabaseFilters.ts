import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';

const cleanUuid = (uuid: string | null | undefined): string | null => {
  if (typeof uuid !== 'string') return uuid;
  const cleaned = uuid.replace(/"/g, '').trim();
  return cleaned === 'null' || cleaned === '' ? null : cleaned;
};

// Decorator function to apply UUID cleaning to .eq() and .in() filters
export const withCleanUuidFilters = (supabase: SupabaseClient) => {
  const originalFrom = supabase.from; // Keep it as a method, not bound yet

  // Reassign supabase.from with a new function that captures the generic type
  supabase.from = function<T extends Record<string, any>>(table: string): PostgrestQueryBuilder<T, any, any> {
    // Call the original from method, ensuring it retains its generic behavior
    const query: any = originalFrom.call(this, table);

    const originalEq: typeof query.eq = query.eq.bind(query);
    const originalIn: typeof query.in = query.in.bind(query);

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
