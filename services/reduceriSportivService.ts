import { supabase } from '../supabaseClient';
import type { Reducere } from '../types';

/** Reducerea ACTIVĂ a fiecărui sportiv (cel mult una pe sportiv — index unic parțial în DB). */
export type ReduceriPeSportiv = Map<string, Reducere>;

const SELECT_REDUCERE = 'sportiv_id, reducere:reduceri(id, nume, tip, valoare, este_activa, categorie_aplicabila)';

/**
 * Citește reducerile atribuite sportivilor. Cu `clubId` filtrează explicit pe club
 * (RLS oricum limitează staff-ul la clubul activ; super adminul vede tot).
 */
export async function getReduceriSportiv(
    clubId?: string | null
): Promise<{ data: ReduceriPeSportiv; error: Error | null }> {
    let q = supabase
        .from('reduceri_sportiv')
        .select(clubId ? `${SELECT_REDUCERE}, sportiv:sportivi!inner(club_id)` : SELECT_REDUCERE)
        .eq('este_activa', true);
    if (clubId) q = q.eq('sportiv.club_id', clubId);

    const { data, error } = await q;
    const map: ReduceriPeSportiv = new Map();
    if (error) return { data: map, error };
    (data as any[] ?? []).forEach(r => { if (r.reducere) map.set(r.sportiv_id, r.reducere as Reducere); });
    return { data: map, error: null };
}

/** Reducerea activă a unui singur sportiv (sau null). */
export async function getReducereSportiv(sportivId: string): Promise<Reducere | null> {
    const { data } = await supabase
        .from('reduceri_sportiv')
        .select(SELECT_REDUCERE)
        .eq('sportiv_id', sportivId)
        .eq('este_activa', true)
        .maybeSingle();
    return ((data as any)?.reducere as Reducere) ?? null;
}

/**
 * Setează (sau scoate, cu `null`) reducerea activă a unui sportiv.
 * RPC atomic (ștergere + inserare într-o singură tranzacție): dacă inserarea e refuzată, reducerea veche rămâne.
 */
export async function seteazaReducereSportiv(
    sportivId: string,
    reducereId: string | null
): Promise<{ error: Error | null }> {
    const { error } = await supabase.rpc('seteaza_reducere_sportiv', {
        p_sportiv_id: sportivId,
        p_reducere_id: reducereId,
    });
    return { error };
}
