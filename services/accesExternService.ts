import { supabase } from '../supabaseClient';
import { inregistreazaEmailAuth } from './authEmailAuditService';
import { clasificaEroareOtp, construiesteContexte, type TipEroareOtp } from '../utils/accesExtern';
import type { CompetitiePublica, ContextAccesExtern, CodEroareCerereAcces } from '../types';

// Aceeași cheie și același format ca portalul principal (hooks/useAppLogic.ts) — supabaseClient.ts o citește
// și trimite headerul active-role-context-id în toate requesturile (RLS).
const CHEIE_CONTEXT = 'phi-hau-active-role-context-id';
const DURATA_MFA_ORE = 12;

const CODURI_CERERE: CodEroareCerereAcces[] = ['date_invalide', 'competitie_indisponibila', 'club_invalid', 'prea_multe_cereri'];

/** Teaser public; data = null când linkul e invalid / competiția e draft sau inexistentă. */
export async function incarcaCompetitiePublica(id: string): Promise<{ data: CompetitiePublica | null; error: any }> {
    if (!supabase) return { data: null, error: 'Supabase neinițializat' };
    const { data, error } = await supabase.rpc('get_competitie_publica', { p_id: id });
    return { data: error ? null : ((data as CompetitiePublica | null) ?? null), error };
}

/** Emailul conține DOAR un cod (D-04), nu link de acțiune. */
export async function trimiteCodAcces(email: string): Promise<{ tip: TipEroareOtp; error: any }> {
    if (!supabase) return { tip: 'alta', error: 'Supabase neinițializat' };
    const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false },
    });
    inregistreazaEmailAuth('cod_mfa', !error);
    return { tip: clasificaEroareOtp(error), error };
}

export async function verificaCodAcces(email: string, cod: string): Promise<{ user: any | null; error: any }> {
    if (!supabase) return { user: null, error: 'Supabase neinițializat' };
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: cod, type: 'email' });
    if (error || !data.user) return { user: null, error: error ?? new Error('Cod invalid') };
    // Best-effort: păstrează coerența ferestrei MFA a portalului principal (ADMIN_CLUB); un cont extern poate fi respins de RLS.
    try {
        const verificatPana = new Date(Date.now() + DURATA_MFA_ORE * 60 * 60 * 1000).toISOString();
        await supabase.from('mfa_email_verificari').upsert({ user_id: data.user.id, verificat_pana: verificatPana }, { onConflict: 'user_id' });
    } catch { /* ignorat intenționat */ }
    return { user: data.user, error: null };
}

/** Listă goală = emailul nu are acces (D-02). Accesul real e dat de RLS, nu de această listă. */
export async function incarcaContexteEligibile(userId: string, competitieId: string): Promise<{ data: ContextAccesExtern[]; error: any }> {
    if (!supabase) return { data: [], error: 'Supabase neinițializat' };
    const [roluri, granturi] = await Promise.all([
        supabase.from('utilizator_roluri_multicont').select('id, rol_denumire, club_id, club:club_id(id, nume)').eq('user_id', userId),
        supabase.from('acces_competitie_extern').select('competitie_id, club_id, activ, cluburi(nume)')
            .eq('user_id', userId).eq('competitie_id', competitieId).eq('activ', true),
    ]);
    const error = roluri.error ?? granturi.error;
    if (error) return { data: [], error };
    return { data: construiesteContexte((roluri.data ?? []) as any, (granturi.data ?? []) as any, competitieId), error: null };
}

/** Atenție: suprascrie contextul activ al portalului principal pe același browser (aceeași cheie localStorage). */
export function seteazaContextActiv(roleRowId: string): void {
    try { localStorage.setItem(CHEIE_CONTEXT, JSON.stringify(roleRowId)); } catch { /* storage blocat */ }
}

export async function trimiteCerereAcces(p: { competitieId: string; email: string; nume: string; clubId: string; mesaj?: string }):
    Promise<'ok' | CodEroareCerereAcces | 'eroare'> {
    if (!supabase) return 'eroare';
    const { data, error } = await supabase.rpc('trimite_cerere_acces', {
        p_competitie: p.competitieId, p_email: p.email, p_nume: p.nume, p_club: p.clubId, p_mesaj: p.mesaj?.trim() || null,
    });
    if (error) {
        const cod = CODURI_CERERE.find(c => (error.message ?? '').includes(c));
        return cod ?? 'eroare';
    }
    return 'ok'; // serverul întoarce 'ok' și pentru o cerere deja existentă (nu dezvăluim existența ei)
}

export async function incarcaCluburiPublice(): Promise<{ data: { id: string; nume: string }[]; error: any }> {
    if (!supabase) return { data: [], error: 'Supabase neinițializat' };
    // anonimul nu poate citi tabela cluburi (RLS): lista vine din RPC public; fallback pe tabela pentru utilizatori autentificati
    const rpc = await supabase.rpc('lista_cluburi_publice');
    if (!rpc.error && Array.isArray(rpc.data)) return { data: rpc.data as { id: string; nume: string }[], error: null };
    const { data, error } = await supabase.from('cluburi').select('id, nume').order('nume');
    return { data: data ?? [], error };
}

/** Rămâne pe linkul competiției (NU redirect la '/'). */
export async function deconecteaza(): Promise<void> {
    try { await supabase?.auth.signOut(); } catch { /* continuăm cu curățarea locală */ }
    try { localStorage.removeItem(CHEIE_CONTEXT); } catch { /* storage blocat */ }
    window.location.assign(window.location.pathname);
}
