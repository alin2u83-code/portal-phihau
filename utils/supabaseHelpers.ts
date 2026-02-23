import { PostgrestError } from '@supabase/supabase-js';

export interface SettledQuery {
    status: 'fulfilled' | 'rejected';
    value?: {
        data: any[] | null;
        error: PostgrestError | null;
    };
    reason?: any;
}

export const processSettledQueries = (results: SettledQuery[], queryKeys: string[]) => {
    const data: Record<string, any[]> = {};
    const rlsErrors: string[] = [];

    results.forEach((res, index) => {
        const key = queryKeys[index];
        if (res.status === 'fulfilled') {
            if (res.value?.data === null || (res.value?.error && res.value.error.code === '42501')) {
                // RLS error or permission denied
                rlsErrors.push(key);
                data[key] = [];
            } else {
                data[key] = res.value?.data || [];
            }
        } else {
            // Query failed for other reasons
            console.error(`Query failed for ${key}:`, res.reason);
            data[key] = [];
        }
    });

    return { data, rlsErrors };
};
