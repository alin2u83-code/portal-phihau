import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export interface SportiviFilters {
    status?: string;
    rolId?: string;
    gradId?: string;
    searchTerm?: string;
    grupaId?: string;
}

export interface PaginationOptions {
    page: number;
    pageSize: number;
}

export interface SortOptions {
    column: string;
    ascending: boolean;
}

export const fetchSportiviData = async (
    filters: SportiviFilters = {},
    pagination?: PaginationOptions,
    sort?: SortOptions
): Promise<{ data: Sportiv[], count: number }> => {
    let selectString = 'id, user_id, nume, prenume, email, username, status, familie_id, club_id, grupa_id, grad_actual_id, data_nasterii, data_inscrierii, cnp, telefon, adresa, gen, cluburi(id, nume), roluri:utilizator_roluri_multicont(id, rol_id, rol_denumire)';
    if (filters.rolId) {
        selectString = 'id, user_id, nume, prenume, email, username, status, familie_id, club_id, grupa_id, grad_actual_id, data_nasterii, data_inscrierii, cnp, telefon, adresa, gen, cluburi(id, nume), roluri:utilizator_roluri_multicont!inner(id, rol_id, rol_denumire)';
    }

    let query = supabase
        .from('sportivi')
        .select(selectString, { count: 'exact' });
    
    if (filters.rolId) {
        query = query.eq('roluri.rol_id', filters.rolId);
    }
    
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.gradId) {
        query = query.eq('grad_actual_id', filters.gradId);
    }
    if (filters.grupaId === 'fara-grupa') {
        query = query.is('grupa_id', null);
    } else if (filters.grupaId) {
        query = query.eq('grupa_id', filters.grupaId);
    }
    if (filters.searchTerm) {
        query = query.or(`nume.ilike.%${filters.searchTerm}%,prenume.ilike.%${filters.searchTerm}%`);
    }

    if (sort) {
        query = query.order(sort.column, { ascending: sort.ascending });
    } else {
        query = query.order('nume', { ascending: true });
    }

    if (pagination) {
        const from = (pagination.page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
    }

    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const formattedData = (data as any[]).map(s => ({
        ...s,
        roluri: s.roluri ? s.roluri.map((r: any) => ({ id: r.rol_id || r.id, nume: r.rol_denumire })) : []
    }));

    return { data: formattedData as Sportiv[], count: count || 0 };
};

export const useSportivi = (
    filters: SportiviFilters = {},
    pagination?: PaginationOptions,
    sort?: SortOptions,
    contextId?: string
) => {
    const queryResult = useQuery<{ data: Sportiv[], count: number }, Error>({
        queryKey: ['sportivi', filters, pagination, sort, contextId],
        queryFn: () => fetchSportiviData(filters, pagination, sort),
    });

    return {
        ...queryResult,
        data: queryResult.data?.data,
        count: queryResult.data?.count || 0,
        fetchSportiviData
    };
};

