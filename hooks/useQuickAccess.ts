import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

const MAX_RECENTS = 4;

export function useQuickAccess(userId: string) {
    const countsKey = `qkd_nav_counts_${userId}`;
    const favoritesKey = `qkd_nav_favorites_${userId}`;
    const recentsKey = `qkd_nav_recent_${userId}`;

    const [counts, setCounts] = useLocalStorage<Record<string, number>>(countsKey, {});
    const [favorites, setFavorites] = useLocalStorage<string[]>(favoritesKey, []);
    const [recents, setRecents] = useLocalStorage<string[]>(recentsKey, []);

    const trackView = useCallback((view: string) => {
        setCounts(prev => ({ ...prev, [view]: (prev[view] || 0) + 1 }));
        setRecents(prev => [view, ...(Array.isArray(prev) ? prev : []).filter(v => v !== view)].slice(0, MAX_RECENTS));
    }, [setCounts, setRecents]);

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

    return { favorites, topViews, recents, toggleFavorite, trackView };
}
