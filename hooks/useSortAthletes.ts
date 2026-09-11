import { useCallback, useState } from 'react';

export type SortBy = 'nume' | 'prenume' | 'grade';

export interface SortableAthlete {
    nume: string;
    prenume: string;
    gradOrdine?: number;
}

export function useSortAthletes<T extends SortableAthlete>(initialSortBy: SortBy = 'nume') {
    const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const sortAthletes = useCallback((athletes: T[]): T[] => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...athletes].sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'grade') {
                const oa = a.gradOrdine ?? 9999;
                const ob = b.gradOrdine ?? 9999;
                cmp = oa !== ob ? oa - ob : a.nume.localeCompare(b.nume);
            } else if (sortBy === 'prenume') {
                cmp = a.prenume.localeCompare(b.prenume) || a.nume.localeCompare(b.nume);
            } else {
                cmp = a.nume.localeCompare(b.nume) || a.prenume.localeCompare(b.prenume);
            }
            return cmp * dir;
        });
    }, [sortBy, sortDir]);

    return { sortBy, setSortBy, sortDir, setSortDir, sortAthletes };
}
