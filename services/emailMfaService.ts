import { supabase } from '../supabaseClient';

const DURATA_VALABILITATE_ORE = 12;

export async function trimiteCodMfaEmail(email: string) {
    const { error } = await supabase!.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });
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
