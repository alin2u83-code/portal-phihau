import { supabase } from '../supabaseClient';
import { inregistreazaEmailAuth } from './authEmailAuditService';

const DURATA_VALABILITATE_ORE = 12;

export async function trimiteCodMfaEmail(email: string) {
    const { error } = await supabase!.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });
    inregistreazaEmailAuth('cod_mfa', !error);
    return { error };
}

export async function verificaCodMfaEmail(email: string, cod: string) {
    const { data, error } = await supabase!.auth.verifyOtp({
        email,
        token: cod,
        type: 'email',
    });
    if (error || !data.user) {
        return { error };
    }

    const verificatPana = new Date(Date.now() + DURATA_VALABILITATE_ORE * 60 * 60 * 1000).toISOString();
    const { error: upsertErr } = await supabase!
        .from('mfa_email_verificari')
        .upsert({ user_id: data.user.id, verificat_pana: verificatPana }, { onConflict: 'user_id' });

    return { error: upsertErr ?? null };
}

export async function esteMfaEmailValid(userId: string): Promise<boolean> {
    const { data, error } = await supabase!
        .from('mfa_email_verificari')
        .select('verificat_pana')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return false;
    return new Date(data.verificat_pana).getTime() > Date.now();
}

// ── Dispozitiv de încredere (7 zile) ─────────────────────────────────────────
// Tokenul e generat pe server (RPC) și stocat aici; în DB există doar hash-ul. Un token nu e valid pentru alt utilizator.
const CHEIE_DISPOZITIV = 'phi-hau-mfa-dispozitiv';

function citesteDispozitiv(): { userId: string; token: string } | null {
    try {
        const raw = localStorage.getItem(CHEIE_DISPOZITIV);
        const p = raw ? JSON.parse(raw) : null;
        return p?.userId && p?.token ? p : null;
    } catch { return null; }
}

/** Marchează dispozitivul curent ca de încredere (necesită un cod MFA valid tocmai verificat). */
export async function inregistreazaDispozitivIncredere(userId: string): Promise<boolean> {
    const { data, error } = await supabase!.rpc('inregistreaza_dispozitiv_incredere');
    if (error || typeof data !== 'string') return false;
    try { localStorage.setItem(CHEIE_DISPOZITIV, JSON.stringify({ userId, token: data })); } catch { return false; }
    return true;
}

/** Adevărat dacă dispozitivul curent e de încredere pentru utilizator (și reînnoiește fereastra MFA de 12h). */
export async function esteDispozitivDeIncredere(userId: string): Promise<boolean> {
    const salvat = citesteDispozitiv();
    if (!salvat || salvat.userId !== userId) return false;
    const { data, error } = await supabase!.rpc('verifica_dispozitiv_incredere', { p_token: salvat.token });
    if (error) return false;
    if (data !== true) {
        try { localStorage.removeItem(CHEIE_DISPOZITIV); } catch {}
        return false;
    }
    return true;
}

/** Revocă toate dispozitivele de încredere (ex. după schimbarea parolei) și uită tokenul local. */
export async function revocaDispozitiveIncredere(): Promise<void> {
    try { localStorage.removeItem(CHEIE_DISPOZITIV); } catch {}
    await supabase!.rpc('revoca_dispozitive_incredere');
}
