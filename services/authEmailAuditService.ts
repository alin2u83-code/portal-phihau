import { supabase } from '../supabaseClient';
import type { TipEmailAuth, StatisticiEmailuriAuth } from '../types';

/**
 * Fire-and-forget: nu asteapta, nu arunca niciodata. Contorul nu are voie sa
 * afecteze fluxul de Auth (relevant pentru MFA, D-09).
 */
export function inregistreazaEmailAuth(tip: TipEmailAuth, reusit: boolean): void {
    if (!supabase) return;
    try {
        supabase.rpc('inregistreaza_email_auth', { p_tip: tip, p_reusit: reusit }).then(() => {}, () => {});
    } catch {
        // esec silentios — contorul e doar indicativ
    }
}

export async function getStatisticiEmailuriAuth(): Promise<{ data: StatisticiEmailuriAuth | null; error: any }> {
    if (!supabase) return { data: null, error: 'Supabase neinitializat' };
    const { data, error } = await supabase.rpc('get_statistici_emailuri_auth');
    return { data: data as StatisticiEmailuriAuth | null, error };
}
