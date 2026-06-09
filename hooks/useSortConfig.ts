import { useState } from 'react';

export interface SortConfigEntry {
  key: string;
  direction: 'asc' | 'desc';
}

export function useSortConfig(initial?: SortConfigEntry[]): {
  sortConfig: SortConfigEntry[];
  requestSort: (key: string, shiftKey?: boolean) => void;
  clearSort: () => void;
} {
  const [sortConfig, setSortConfig] = useState<SortConfigEntry[]>(initial ?? []);

  const requestSort = (key: string, shiftKey?: boolean) => {
    setSortConfig(prev => {
      const existing = prev.find(s => s.key === key);

      if (shiftKey) {
        // Multi-sort mode
        if (existing) {
          if (existing.direction === 'asc') {
            return prev.map(s => s.key === key ? { ...s, direction: 'desc' as const } : s);
          } else {
            return prev.filter(s => s.key !== key);
          }
        } else {
          return [...prev, { key, direction: 'asc' as const }];
        }
      } else {
        // Single-sort mode (replace)
        if (existing) {
          if (existing.direction === 'asc') {
            return [{ key, direction: 'desc' as const }];
          } else {
            return [];
          }
        } else {
          return [{ key, direction: 'asc' as const }];
        }
      }
    });
  };

  const clearSort = () => setSortConfig([]);

  return { sortConfig, requestSort, clearSort };
}

export function applySortConfig<T>(
  data: T[],
  sortConfig: SortConfigEntry[],
  getField: (item: T, key: string) => unknown,
  tiebreaker?: (a: T, b: T) => number
): T[] {
  if (sortConfig.length === 0) return [...data];

  return [...data].sort((a, b) => {
    for (const { key, direction } of sortConfig) {
      const aVal = getField(a, key);
      const bVal = getField(b, key);

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    }

    if (tiebreaker) return tiebreaker(a, b);
    return 0;
  });
}
