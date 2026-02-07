import { SupabaseClient } from '@supabase/supabase-js';
import { Permissions } from '../types';

interface QueryOptions {
    select?: string;
    page?: number;
    pageSize?: number;
}

/**
 * Preia date dintr-un tabel specificat, aplicând automat filtrarea pe bază de club,
 * conform permisiunilor utilizatorului, și optimizări pentru performanță (paginare, selecție coloane).
 *
 * @param supabase Clientul Supabase.
 * @param permissions Obiectul de permisiuni pentru utilizatorul curent.
 * @param activeClubId ID-ul clubului activ pentru filtrare. Pentru adminii de federație, `null` preia date din toate cluburile, iar un ID specificat aplică un filtru global.
 * @param tableName Numele tabelului de interogat.
 * @param options Parametri opționali pentru optimizare.
 * @param options.select Un string cu coloanele de selectat (ex: 'id, nume'), implicit '*'. Reduce dimensiunea datelor.
 * @param options.page Numărul paginii pentru paginare (începe de la 1).
 * @param options.pageSize Numărul de elemente pe pagină.
 * @returns O promisiune care se rezolvă cu datele preluate și o eventuală eroare.
 */
export async function getMyClubData<T>(
    supabase: SupabaseClient,
    permissions: Permissions,
    activeClubId: string | null,
    tableName: string,
    options: QueryOptions = {}
): Promise<{ data: T[] | null; error: any | null }> {
    
    const { select = '*', page, pageSize } = options;
    
    if (!supabase) {
        return { data: null, error: { message: 'Clientul Supabase nu a fost inițializat.' }};
    }
    
    let query = supabase.from(tableName).select(select);

    // Aplică filtrarea pe bază de club
    if (permissions.isFederationAdmin) {
        // Adminii de federație văd toate cluburile, cu excepția cazului în care este activ un filtru global
        if (activeClubId) {
            query = query.eq('club_id', activeClubId);
        }
    } else {
        // Utilizatorii non-admin sunt restricționați la contextul propriului club
        if (!activeClubId) {
            console.warn(`[dataService] Apel getMyClubData pentru '${tableName}' fără un club activ pentru un utilizator non-admin. Se returnează un set gol.`);
            return { data: [], error: null };
        }
        query = query.eq('club_id', activeClubId);
    }
    
    // Aplică paginarea pentru optimizarea pe mobil
    if (page && pageSize) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
    }

    const { data, error } = await query;

    return { data: data as T[] | null, error };
}
