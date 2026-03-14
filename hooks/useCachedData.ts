import { useState, useCallback } from 'react';
import { getCachedData, setCachedData } from '../utils/cache';

interface UseCachedDataOptions {
    maxAgeMinutes?: number;
    cacheKey: string;
}

export const useCachedData = <T>(options: UseCachedDataOptions) => {
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (fetchFn: () => Promise<T>, forceRefresh = false): Promise<T | null> => {
        if (!forceRefresh) {
            const cached = getCachedData<T>(options.cacheKey, options.maxAgeMinutes);
            if (cached) {
                return cached;
            }
        }

        setLoading(true);
        try {
            const data = await fetchFn();
            if (data) {
                setCachedData(options.cacheKey, data);
            }
            return data;
        } catch (error) {
            console.error(`Error fetching data for ${options.cacheKey}:`, error);
            // Try to return stale data if fetch fails
            const stale = localStorage.getItem(options.cacheKey);
            if (stale) {
                try {
                    return JSON.parse(stale).data;
                } catch {
                    return null;
                }
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, [options.cacheKey, options.maxAgeMinutes]);

    return {
        fetchData,
        loading
    };
};
