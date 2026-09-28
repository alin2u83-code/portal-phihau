import { supabase } from '../supabaseClient';

/**
 * Construiește headerele JSON + Authorization: Bearer din sesiunea curentă,
 * pentru apeluri către endpoint-uri /api/* care cer autentificare (32-05).
 * Nu aruncă — serviciile întorc { data, error } (CLAUDE.md).
 */
export async function obtineHeadereAutentificare(): Promise<{ data: Record<string, string> | null; error: string | null }> {
    if (!supabase) {
        return { data: null, error: 'Clientul Supabase nu este inițializat.' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
        return { data: null, error: 'Sesiune expirată. Reautentificați-vă și încercați din nou.' };
    }

    return {
        data: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        error: null,
    };
}
