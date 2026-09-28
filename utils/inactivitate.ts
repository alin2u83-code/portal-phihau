/**
 * Regula de expirare sesiune la inactivitate (D-08), aplicată DOAR pentru
 * rolurile din MFA_REQUIRED_ROLES (ADMIN_CLUB, SUPER_ADMIN_FEDERATIE — acces
 * date financiare). Client-side: setările Supabase (jwt_exp,
 * sessions_timebox, sessions_inactivity_timeout) sunt globale, nu per rol, și
 * time-box/inactivity timeout sunt disponibile doar pe planuri plătite —
 * singurul loc unde se poate aplica o regulă mai strictă doar pentru rolurile
 * privilegiate e aplicația (32-RESEARCH.md).
 */

export const DURATA_INACTIVITATE_MS = 60 * 60 * 1000;
export const AVERTIZARE_INAINTE_MS = 5 * 60 * 1000;

/** localStorage, partajat între taburi. */
export const CHEIE_ULTIMA_ACTIVITATE = 'phi-hau-ultima-activitate';
/** sessionStorage, valoare 'inactivitate'. */
export const CHEIE_MOTIV_DELOGARE = 'phi-hau-motiv-delogare';

/**
 * Maximul dintre timestamp-ul stocat local și ultima autentificare reală
 * (evită delogarea falsă a unui login proaspăt din cauza unui timestamp vechi
 * rămas în localStorage). Valorile din viitor se plafonează la `acumMs`.
 */
export function calculeazaUltimaActivitate(
    stocatMs: number | null,
    ultimaAutentificareIso: string | null | undefined,
    acumMs: number
): number {
    const candidati: number[] = [];

    if (typeof stocatMs === 'number' && Number.isFinite(stocatMs) && stocatMs > 0) {
        candidati.push(Math.min(stocatMs, acumMs));
    }

    if (ultimaAutentificareIso) {
        const parsat = Date.parse(ultimaAutentificareIso);
        if (Number.isFinite(parsat) && parsat > 0) {
            candidati.push(Math.min(parsat, acumMs));
        }
    }

    if (candidati.length === 0) return acumMs;
    return Math.max(...candidati);
}

/** Starea de inactivitate la momentul `acumMs`. */
export function stareInactivitate(
    ultimaActivitateMs: number,
    acumMs: number,
    durataMs: number = DURATA_INACTIVITATE_MS,
    avertizareMs: number = AVERTIZARE_INAINTE_MS
): 'activ' | 'avertizare' | 'expirat' {
    const inactiv = acumMs - ultimaActivitateMs;
    if (inactiv >= durataMs) return 'expirat';
    if (inactiv >= durataMs - avertizareMs) return 'avertizare';
    return 'activ';
}
