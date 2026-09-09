import { supabase } from '../supabaseClient';

// Alătură prezenta în memorie printr-un query separat pe prezenta_antrenament,
// în loc de embedded join PostgREST (`prezenta:prezenta_antrenament(...)`).
// Embedded join-ul genera un LATERAL subquery per rând care sub sarcină
// trecea de statement_timeout (vezi pg_stat_statements: mean 1.17s, max 7.15s).
export async function attachPrezenta<T extends { id: string }>(
    rows: T[]
): Promise<(T & { prezenta: { sportiv_id: string; status_id: string }[] })[]> {
    if (rows.length === 0) return [];
    const ids = rows.map(r => r.id);
    const { data, error } = await supabase
        .from('prezenta_antrenament')
        .select('antrenament_id, sportiv_id, status_id')
        .in('antrenament_id', ids);
    if (error) throw error;

    const byAntrenamentId: Record<string, { sportiv_id: string; status_id: string }[]> = {};
    (data || []).forEach(p => {
        (byAntrenamentId[p.antrenament_id] ||= []).push({ sportiv_id: p.sportiv_id, status_id: p.status_id });
    });

    return rows.map(r => ({ ...r, prezenta: byAntrenamentId[r.id] || [] }));
}
