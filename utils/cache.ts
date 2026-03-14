interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export const getCachedData = <T>(key: string, maxAgeMinutes: number = 10): T | null => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const now = Date.now();
        const ageMs = now - entry.timestamp;
        const maxAgeMs = maxAgeMinutes * 60 * 1000;

        if (ageMs > maxAgeMs) {
            localStorage.removeItem(key);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
};

export const setCachedData = <T>(key: string, data: T): void => {
    const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
};

export const clearCache = (key?: string): void => {
    if (key) {
        localStorage.removeItem(key);
    } else {
        // Clear all app caches
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cache_')) {
                localStorage.removeItem(k);
            }
        });
    }
};
