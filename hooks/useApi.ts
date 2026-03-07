import { useState, useCallback } from 'react';
import { formatErrorMessage } from '../utils/error';

export function useApi<T>() {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (apiCall: () => Promise<T>) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiCall();
            setData(result);
            return result;
        } catch (err: any) {
            const message = formatErrorMessage(err);
            setError(message);
            throw err; // Re-throw to allow caller to handle it if needed
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, execute };
}
