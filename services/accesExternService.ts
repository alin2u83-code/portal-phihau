import { supabase } from '../supabaseClient';
import { inregistreazaEmailAuth } from './authEmailAuditService';
import { clasificaEroareOtp, construiesteContexte, clasificaCompetitiiClub, type TipEroareOtp } from '../utils/accesExtern';
import type { CompetitiePublica, ContextAccesExtern, CodEroareCerereAcces, Competitie, CompetitiiClubClasificate, ContCompetitieClub } from '../types';

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
export async function incarcaContexteEligibile(userId: string): Promise<{ data: ContextAccesExtern[]; error: any }> {
    if (!supabase) return { data: [], error: 'Supabase neinițializat' };
    const [roluri, cont] = await Promise.all([
        supabase.from('utilizator_roluri_multicont').select('id, rol_denumire, club_id, club:club_id(id, nume)').eq('user_id', userId),
        supabase.from('conturi_competitie_club').select('club_id, cluburi(nume)').eq('user_id', userId).maybeSingle(),
    ]);
    const error = roluri.error ?? cont.error;
    if (error) return { data: [], error };
    return { data: construiesteContexte((roluri.data ?? []) as any, (cont.data ?? null) as any), error: null };
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

const COLOANE_COMPETITIE = 'id, denumire, tip, status, data_inceput, data_sfarsit, deadline_inscrieri, locatie';

/** Competițiile vizibile clubului (RLS: competitie_vizibila_cont_club), împărțite în active / istoric (D-03, D-12). */
export async function incarcaCompetitiiClub(clubId: string): Promise<{ data: CompetitiiClubClasificate; error: any }> {
    const gol: CompetitiiClubClasificate = { active: [], istoric: [] };
    if (!supabase) return { data: gol, error: 'Supabase neinițializat' };
    // participarea: o singură linie per competiție (limit pe tabela referită), ca limita max-rows să nu taie istoricul
    const participare = (tabela: 'inscrieri_competitie' | 'echipe_competitie') =>
        supabase!.from('competitii').select(`id, ${tabela}!inner(id)`).eq(`${tabela}.club_id`, clubId).limit(1, { referencedTable: tabela });
    const [comp, insc, ech] = await Promise.all([
        supabase.from('competitii').select(COLOANE_COMPETITIE).neq('status', 'draft').order('data_inceput'),
        participare('inscrieri_competitie'),
        participare('echipe_competitie'),
    ]);
    const error = comp.error ?? insc.error ?? ech.error;
    if (error) return { data: gol, error };
    const ids = new Set<string>([...(insc.data ?? []), ...(ech.data ?? [])].map((r: any) => r.id));
    const azi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' });
    return { data: clasificaCompetitiiClub((comp.data ?? []) as unknown as Competitie[], ids, azi), error: null };
}

// --- Cont de competiție per club (doar proprietarul aplicației; RPC/endpoint verifică server-side, UI-ul doar ascunde) ---
// Managementul (ADMIN_CLUB/INSTRUCTOR) se acordă pe contul de club în 39-15 (D-18).

/** false și când RPC-ul lipsește (migrare neaplicată) sau dă eroare: comutatorul rămâne ascuns. */
export async function esteProprietar(): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('este_proprietar');
    return !error && data === true;
}

/** RLS: doar proprietarul vede toate conturile; ceilalți văd cel mult rândul propriu. */
export async function listaConturiCluburi(): Promise<{ data: ContCompetitieClub[]; error: any }> {
    if (!supabase) return { data: [], error: 'Supabase neinițializat' };
    const { data, error } = await supabase.from('conturi_competitie_club').select('club_id, email, creat_la, modificat_la');
    return { data: error ? [] : ((data ?? []) as ContCompetitieClub[]), error };
}

type RezultatContClub = { ok: boolean; status: number; error?: string; avertisment?: string };

async function apelContClub(operatie: 'creeaza' | 'schimba_email', clubId: string, email: string): Promise<RezultatContClub> {
    if (!supabase) return { ok: false, status: 0, error: 'Supabase neinițializat' };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, status: 401, error: 'Sesiune expirată. Reautentifică-te.' };
    try {
        const res = await fetch('/api/aproba-cerere-acces?action=cont-club', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ operatie, club_id: clubId, email }),
        });
        const body = await res.json().catch(() => ({}));
        return res.ok
            ? { ok: true, status: res.status, avertisment: body?.avertisment }
            : { ok: false, status: res.status, error: body?.error || 'Operația nu a putut fi efectuată.' };
    } catch {
        return { ok: false, status: 0, error: 'Eroare de rețea.' };
    }
}

export const creeazaContClub = (clubId: string, email: string) => apelContClub('creeaza', clubId, email);
export const schimbaEmailContClub = (clubId: string, email: string) => apelContClub('schimba_email', clubId, email);
