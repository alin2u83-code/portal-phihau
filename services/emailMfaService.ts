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

export const ZILE_DISPOZITIV_INCREDERE = 30;

/** Preferința "Aceasta e un dispozitiv personal" (bifa de la login). Implicit: da. */
export const CHEIE_RAMANE_CONECTAT = 'phi-hau-ramane-conectat';
/** localStorage = sesiunea e temporară (bifă debifată). Markerul "încă vie" e un cookie de sesiune (fără Expires):
 *  partajat între taburi, dispare când se închide browserul. supabaseClient.ts îl citește la pornire. */
export const CHEIE_SESIUNE_TEMPORARA = 'phi-hau-sesiune-temporara';
export const COOKIE_SESIUNE_VIE = 'phi-hau-sesiune-vie';
/** sessionStorage: alegerea de dinaintea redirectului Google; se aplică abia după autentificare reușită. */
export const CHEIE_RAMANE_IN_ASTEPTARE = 'phi-hau-ramane-in-asteptare';

export function citestePreferintaRamaneConectat(): boolean {
    try { return localStorage.getItem(CHEIE_RAMANE_CONECTAT) !== '0'; } catch { return true; }
}

/** Salvează alegerea de la login (apelat DOAR după autentificare reușită); debifat => sesiunea se închide la închiderea browserului. */
export function seteazaRamaneConectat(ramane: boolean): void {
    try {
        localStorage.setItem(CHEIE_RAMANE_CONECTAT, ramane ? '1' : '0');
        if (ramane) {
            localStorage.removeItem(CHEIE_SESIUNE_TEMPORARA);
            document.cookie = `${COOKIE_SESIUNE_VIE}=; path=/; max-age=0; SameSite=Lax`;
        } else {
            localStorage.setItem(CHEIE_SESIUNE_TEMPORARA, '1');
            document.cookie = `${COOKIE_SESIUNE_VIE}=1; path=/; SameSite=Lax`;
        }
    } catch { /* storage blocat: rămâne comportamentul implicit */ }
}

/** Google: retine alegerea inainte de redirect; se aplica dupa SIGNED_IN (vezi aplicaRamaneInAsteptare). */
export function retineRamaneInAsteptare(ramane: boolean): void {
    try { sessionStorage.setItem(CHEIE_RAMANE_IN_ASTEPTARE, ramane ? '1' : '0'); } catch {}
}

/** Alegerea retinuta pentru un login Google esuat/abandonat nu trebuie sa se aplice unui login ulterior. */
export function anuleazaRamaneInAsteptare(): void {
    try { sessionStorage.removeItem(CHEIE_RAMANE_IN_ASTEPTARE); } catch {}
}

export function aplicaRamaneInAsteptare(): void {
    try {
        const v = sessionStorage.getItem(CHEIE_RAMANE_IN_ASTEPTARE);
        if (v === null) return;
        sessionStorage.removeItem(CHEIE_RAMANE_IN_ASTEPTARE);
        seteazaRamaneConectat(v === '1');
    } catch {}
}

/** Etichetă scurtă pentru lista de dispozitive (ex. "Chrome pe Windows"). */
function etichetaDispozitiv(): string {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const browser = /Edg(e|A|iOS)?\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox'
        : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    // iPadOS 13+ raporteaza "Macintosh"; il deosebim de Mac dupa ecranul tactil.
    const ipadOs = /Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) || ipadOs ? 'iOS'
        : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'necunoscut';
    return `${browser} pe ${os}`;
}

export type DispozitivIncredere = { id: string; eticheta: string | null; creat_la: string; ultima_folosire: string | null; expira_la: string; curent: boolean };

export async function listeazaDispozitiveIncredere(): Promise<DispozitivIncredere[]> {
    const { data, error } = await supabase!.rpc('listeaza_dispozitive_incredere', { p_token: citesteDispozitiv()?.token ?? null });
    if (error) throw error; // apelantul afișează eroarea (ex. migrare neaplicată), nu "nicio listă"
    return Array.isArray(data) ? data : [];
}

export async function revocaDispozitivIncredere(id: string, eraCurent: boolean): Promise<boolean> {
    const { error } = await supabase!.rpc('revoca_dispozitiv_incredere', { p_id: id });
    if (!error && eraCurent) { try { localStorage.removeItem(CHEIE_DISPOZITIV); } catch {} }
    return !error;
}

/** Marchează dispozitivul curent ca de încredere (necesită un cod MFA valid tocmai verificat). */
export async function inregistreazaDispozitivIncredere(userId: string): Promise<boolean> {
    const { data, error } = await supabase!.rpc('inregistreaza_dispozitiv_incredere', { p_eticheta: etichetaDispozitiv() });
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
