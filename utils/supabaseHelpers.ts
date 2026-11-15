import { PostgrestError } from '@supabase/supabase-js';

export interface SettledQuery {
    status: 'fulfilled' | 'rejected';
    value?: {
        data: any[] | null;
        error: PostgrestError | null;
    };
    reason?: any;
}

// Faza 38: o cerere esuata (alta eroare decat RLS 42501) NU mai devine [] (un [] gol suprascria date incarcate);
// cheia ramane absenta din `data` si e raportata in `erori`. Se logheaza doar cheia si codul erorii.
export const processSettledQueries = (results: SettledQuery[], queryKeys: string[]) => {
    const data: Record<string, any[]> = {};
    const rlsErrors: string[] = [];
    const erori: string[] = [];

    results.forEach((res, index) => {
        const key = queryKeys[index];

        if (res.status === 'fulfilled') {
            const resultValue = res.value;

            if (!resultValue || resultValue.error?.code === '42501') {
                // RLS error or permission denied
                rlsErrors.push(key);
                data[key] = [];
            } else if (resultValue.error) {
                console.warn(`Query failed for ${key}: ${resultValue.error.code ?? 'fara cod'}`);
                erori.push(key);
            } else {
                data[key] = resultValue.data ?? [];
            }
        } else {
            console.error(`Query failed for ${key}:`, res.reason);
            erori.push(key);
        }
    });

    return { data, rlsErrors, erori };
};
