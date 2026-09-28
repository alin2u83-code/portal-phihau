import { supabase } from '../supabaseClient';
import type { StatisticiAlerteSecuritate } from '../types';

/**
 * Fire-and-forget: nu asteapta, nu arunca niciodata — eșec silențios, nu
 * trebuie să afecteze fluxul de login (mirror inregistreazaEmailAuth).
 * Scrierea e via fetch (nu RPC direct) — handlerul Vercel are logica de
 * detecție/trimitere email, nu poate fi mutată în frontend.
 */
export function notificaIncercareLogin(emailFolosit: string, reusit: boolean, userId?: string): void {
    try {
        fetch('/api/alerta-securitate-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailFolosit, reusit, userId }),
        }).catch(() => {});
    } catch {
        // esec silentios — contorul e doar indicativ
    }
}

export async function getStatisticiAlerteSecuritate(): Promise<{ data: StatisticiAlerteSecuritate | null; error: any }> {
    if (!supabase) return { data: null, error: 'Supabase neinitializat' };
    const { data, error } = await supabase.rpc('get_statistici_alerte_securitate');
    return { data: data as StatisticiAlerteSecuritate | null, error };
}
