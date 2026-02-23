import { SupabaseClient } from '@supabase/supabase-js';

const cleanUuid = (uuid: string | null | undefined): string | null => {
  if (typeof uuid !== 'string') return uuid;
  const cleaned = uuid.replace(/\"/g, '').trim();
  return cleaned === 'null' || cleaned === '' ? null : cleaned;
};

export const withCleanUuidFilters = (client: SupabaseClient): SupabaseClient => {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Dacă accesăm .from, interceptăm query builder-ul
      if (prop === 'from' && typeof value === 'function') {
        return (...args: any[]) => {
          const queryBuilder = value.apply(target, args);
          
          // Interceptăm metodele .eq() și .in() ale query builder-ului
          const originalEq = queryBuilder.eq;
          const originalIn = queryBuilder.in;

          queryBuilder.eq = (column: string, val: any) => {
            if (typeof val === 'string' && (column.endsWith('_id') || column === 'id')) {
              return originalEq.call(queryBuilder, column, cleanUuid(val));
            }
            return originalEq.call(queryBuilder, column, val);
          };

          queryBuilder.in = (column: string, values: any[]) => {
            if (column.endsWith('_id') || column === 'id') {
              const cleaned = values.map(v => typeof v === 'string' ? cleanUuid(v) : v);
              return originalIn.call(queryBuilder, column, cleaned);
            }
            return originalIn.call(queryBuilder, column, values);
          };

          return queryBuilder;
        };
      }

      // Pentru orice altă proprietate/metodă (auth, storage etc.), returnăm valoarea originală legată corect
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
};