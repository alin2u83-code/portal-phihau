import { supabase } from '../supabaseClient';
import type { PoliticaReducere } from '../types';

/**
 * Faza 30 Feature 3: citire politici de loialitate active pentru un club.
 *
 * Doar politicile cu `reinnoiri_necesare` setat (nenul) sunt relevante pentru
 * bonusul automat de loialitate — politicile de reducere manuala (fara acest
 * camp) nu fac parte din acest flux.
 *
 * NOTA (Task 1, 20.09.2026): RLS pe politici_reducere are o singura politica
 * activa, "Bypass_Super_Admin" — doar SUPER_ADMIN_FEDERATIE poate citi randuri.
 * Apelat dintr-un context ADMIN_CLUB, acest serviciu va returna { data: [], error: null }
 * (RLS filtreaza tacit, nu arunca eroare) pana cand politica RLS e extinsa
 * separat — risc deschis, documentat pentru planul 30-05.
 */
export async function getPoliticiLoialitate(
    clubId: string
): Promise<{ data: PoliticaReducere[] | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('politici_reducere')
        .select('*')
        .eq('club_id', clubId)
        .eq('activ', true)
        .not('reinnoiri_necesare', 'is', null);

    if (error) {
        return { data: null, error };
    }
    return { data: data as PoliticaReducere[], error: null };
}
