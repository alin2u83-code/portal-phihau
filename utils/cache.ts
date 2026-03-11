export const getCachedData = <T>(key: string): T | null => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
        return JSON.parse(cached);
    } catch {
        return null;
    }
};

export const setCachedData = <T>(key: string, data: T): void => {
    localStorage.setItem(key, JSON.stringify(data));
};
