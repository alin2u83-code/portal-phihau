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
            // Corecție: Verificăm dacă 'value' există înainte de a-l accesa
            const resultValue = res.value;
            
            if (!resultValue || resultValue.error?.code === '42501') {
                // RLS error or permission denied
                rlsErrors.push(key);
                data[key] = [];
            } else {
                // Dacă nu e eroare 42501, populăm datele (sau array gol dacă e null)
                data[key] = resultValue.data || [];
            }
        } else {
            // Query failed for other reasons (rejected)
            console.error(`Query failed for ${key}:`, res.reason);
            data[key] = [];
        }
    });

    return { data, rlsErrors };
};