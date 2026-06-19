import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useQuickAccess(userId: string) {
    const countsKey = `qkd_nav_counts_${userId}`;
    const favoritesKey = `qkd_nav_favorites_${userId}`;

    const [counts, setCounts] = useLocalStorage<Record<string, number>>(countsKey, {});
    const [favorites, setFavorites] = useLocalStorage<string[]>(favoritesKey, []);

    const trackView = useCallback((view: string) => {
        setCounts(prev => ({ ...prev, [view]: (prev[view] || 0) + 1 }));
    }, [setCounts]);

    const toggleFavorite = useCallback((view: string) => {
        setFavorites(prev =>
            prev.includes(view) ? prev.filter(v => v !== view) : [...prev, view]
        );
    }, [setFavorites]);

    const topViews = useMemo(() => {
        const favSet = new Set(favorites);
        return Object.entries(counts)
            .filter(([view]) => !favSet.has(view))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([view]) => view);
    }, [counts, favorites]);

    return { favorites, topViews, toggleFavorite, trackView };
}
