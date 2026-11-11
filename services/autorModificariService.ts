import { supabase } from '../supabaseClient';
import type { SesiuneActor, InstructorClub } from '../types';

const FARA_CLIENT = 'Supabase neinițializat';

/** Persoanele clubului (instructori/admini) din care se alege autorul declarat (D-06). */
export async function incarcaInstructoriClub(): Promise<{ data: InstructorClub[]; error: any }> {
    if (!supabase) return { data: [], error: FARA_CLIENT };
    const { data, error } = await supabase.rpc('instructori_club_cont');
    return { data: error ? [] : ((data as InstructorClub[] | null) ?? []), error };
}

/** Exact unul dintre actorUserId / actorNume; serverul validează apartenența la club. */
export async function deschideSesiuneActor(p: { competitieId: string; actorUserId?: string | null; actorNume?: string | null }): Promise<{ data: SesiuneActor | null; error: any }> {
    if (!supabase) return { data: null, error: FARA_CLIENT };
    const { data, error } = await supabase.rpc('deschide_sesiune_actor', {
        p_competitie: p.competitieId,
        p_actor_user_id: p.actorUserId ?? null,
        p_actor_nume: p.actorUserId ? null : (p.actorNume ?? null),
    });
    return { data: error ? null : (data as SesiuneActor), error };
}

/** data = null când nu există sesiune sau a expirat (4h inactivitate). */
export async function sesiuneActorCurenta(): Promise<{ data: SesiuneActor | null; error: any }> {
    if (!supabase) return { data: null, error: FARA_CLIENT };
    const { data, error } = await supabase.rpc('sesiune_actor_curenta');
    return { data: error ? null : ((data as SesiuneActor | null) ?? null), error };
}

export async function inchideSesiuneActor(): Promise<{ error: any }> {
    if (!supabase) return { error: FARA_CLIENT };
    const { error } = await supabase.rpc('inchide_sesiune_actor');
    return { error };
}
