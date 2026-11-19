import { supabase } from '../supabaseClient';
import { notificaIncercareLogin } from './alertaSecuritateService';
import { clasificaEroareAuth, construiesteContexte, clasificaCompetitiiClub, CHEIE_CONTEXT_EXTERN, CHEIE_CONTEXT_PORTAL, type TipEroareAuth } from '../utils/accesExtern';
import type { CompetitiePublica, ContextAccesExtern, CodEroareCerereAcces, Competitie, CompetitiiClubClasificate, ContCompetitieClub } from '../types';

// Zona externă are cheie proprie (CHEIE_CONTEXT_EXTERN); supabaseClient.ts o alege după cale și trimite
// headerul active-role-context-id în toate requesturile (RLS). Portalul rămâne pe CHEIE_CONTEXT_PORTAL.

const CODURI_CERERE: CodEroareCerereAcces[] = ['date_invalide', 'competitie_indisponibila', 'club_invalid', 'prea_multe_cereri'];

/** Teaser public; data = null când linkul e invalid / competiția e draft sau inexistentă. */
export async function incarcaCompetitiePublica(id: string): Promise<{ data: CompetitiePublica | null; error: any }> {
    if (!supabase) return { data: null, error: 'Supabase neinițializat' };
    const { data, error } = await supabase.rpc('get_competitie_publica', { p_id: id });
    return { data: error ? null : ((data as CompetitiePublica | null) ?? null), error };
}

/** Login extern cu parola (Faza 43). Nu marcheaza verificarea MFA pe email: parola nu dovedeste MFA. */
export async function loginParolaAcces(email: string, parola: string): Promise<{ user: any | null; tip: TipEroareAuth }> {
    if (!supabase) return { user: null, tip: 'alta' };
    try {
        const adresa = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({ email: adresa, password: parola });
        // acelasi control anti brute-force ca login-ul de management (cont de club partajat)
        notificaIncercareLogin(adresa, !error, data?.user?.id, data?.session?.access_token);
        if (error || !data?.user) return { user: null, tip: error ? clasificaEroareAuth(error) : 'alta' };
        return { user: data.user, tip: 'ok' };
    } catch {
        return { user: null, tip: 'alta' };
    }
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

/** Implicit setează contextul zonei externe. 'portal' doar când utilizatorul trece intenționat în portal (suprascrie contextul portalului). */
export function seteazaContextActiv(roleRowId: string, pentru: 'extern' | 'portal' = 'extern'): void {
    const cheie = pentru === 'portal' ? CHEIE_CONTEXT_PORTAL : CHEIE_CONTEXT_EXTERN;
    try { localStorage.setItem(cheie, JSON.stringify(roleRowId)); } catch { /* storage blocat */ }
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
    try { localStorage.removeItem(CHEIE_CONTEXT_EXTERN); } catch { /* storage blocat */ }
    window.location.assign(window.location.pathname);
}

const COLOANE_COMPETITIE = 'id, denumire, tip, status, data_inceput, data_sfarsit, deadline_inscrieri, locatie, fram_obligatoriu';

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

// --- Management acordat pe contul de club (D-16, D-18): RPC-uri doar proprietar (42501 altfel) ---

export type RolManagementAcordabil = 'ADMIN_CLUB' | 'INSTRUCTOR';
export interface ManagementContClub { club_id: string; rol_denumire: RolManagementAcordabil; acordat_la: string; user_vechi?: boolean }

/** Listă goală și la eroare (ex. migrarea 20261111e neaplicată): cardurile apar fără management. */
export async function incarcaManagementConturi(): Promise<{ data: ManagementContClub[]; error: any }> {
    if (!supabase) return { data: [], error: 'Supabase neinițializat' };
    const { data, error } = await supabase.rpc('management_cont_club_stare');
    return { data: error ? [] : ((data ?? []) as ManagementContClub[]), error };
}

export async function acordaManagementContClub(clubId: string, rol: RolManagementAcordabil): Promise<{ error: any }> {
    if (!supabase) return { error: 'Supabase neinițializat' };
    const { error } = await supabase.rpc('acorda_management_cont_club', { p_club: clubId, p_rol: rol });
    return { error };
}

export async function revocaManagementContClub(clubId: string): Promise<{ error: any }> {
    if (!supabase) return { error: 'Supabase neinițializat' };
    const { error } = await supabase.rpc('revoca_management_cont_club', { p_club: clubId });
    return { error };
}

export const creeazaContClub = (clubId: string, email: string) => apelContClub('creeaza', clubId, email);
export const schimbaEmailContClub = (clubId: string, email: string) => apelContClub('schimba_email', clubId, email);
