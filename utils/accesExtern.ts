// Funcții pure pentru zona externă a competiției (Faza 36). Fără Supabase/React, ca să se testeze în Node.
import type { ContextAccesExtern, Permissions } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id-ul competiției din /competitie/<uuid>; orice alt format => null (link invalid). */
export function extrageCompetitieId(pathname: string): string | null {
    const m = /^\/competitie\/([^/]+)\/?$/.exec(pathname);
    if (!m || !UUID_RE.test(m[1])) return null;
    return m[1].toLowerCase();
}

export type TipEroareOtp = 'ok' | 'fara_cont' | 'limita' | 'alta';

/** Regula din 36-AUDIT-LIVE DEC-8: email fără cont => 422 'otp_disabled'; limită => 429 / over_*_rate_limit. */
export function clasificaEroareOtp(error: { status?: number; code?: string; message?: string } | null | undefined): TipEroareOtp {
    if (!error) return 'ok';
    const mesaj = (error.message ?? '').toLowerCase();
    if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit' || mesaj.includes('rate limit')) return 'limita';
    if (error.code === 'otp_disabled' || error.status === 422 || mesaj.includes('signups not allowed')) return 'fara_cont';
    return 'alta';
}

/** Zona competiției: /competitie (listă) și /competitie/<id> (un link invalid îl tratează pagina). */
export function esteZonaCompetitie(pathname: string): boolean {
    return pathname === '/competitie' || pathname.startsWith('/competitie/');
}

export function esteListaZona(pathname: string): boolean {
    return /^\/competitie\/?$/.test(pathname);
}

type RandRol = { id: string; rol_denumire: string; club_id: string | null; club?: { nume?: string } | null };
export type RandContClub = { club_id: string; cluburi?: { nume?: string } | null };

/** D-02: ADMIN_CLUB/INSTRUCTOR din rolurile existente; REPREZENTANT_COMPETITIE din contul de club (primul = intrarea implicită). Fără rol eligibil => []. */
export function construiesteContexte(roluri: RandRol[], contClub: RandContClub | null): ContextAccesExtern[] {
    const rezultat: ContextAccesExtern[] = [];
    const rep = (roluri ?? []).find(r => r.rol_denumire === 'REPREZENTANT_COMPETITIE');
    if (rep && contClub) {
        rezultat.push({ roleRowId: rep.id, rol: 'REPREZENTANT_COMPETITIE', clubId: contClub.club_id, clubNume: contClub.cluburi?.nume ?? '' });
    }
    for (const r of roluri ?? []) {
        if ((r.rol_denumire === 'ADMIN_CLUB' || r.rol_denumire === 'INSTRUCTOR') && r.club_id) {
            rezultat.push({ roleRowId: r.id, rol: r.rol_denumire, clubId: r.club_id, clubNume: r.club?.nume ?? '' });
        }
    }
    return rezultat;
}

/**
 * D-03/D-12, aceeași regulă ca SQL competitie_vizibila_cont_club (20261111c): draft exclus;
 * terminată = finalizata SAU data_sfarsit < azi; activă = neterminată; istoric = terminată cu participarea clubului.
 * `azi` = YYYY-MM-DD (Europe/Bucharest), comparație de stringuri.
 */
export function clasificaCompetitiiClub<T extends { id: string; status: string; data_inceput: string | null; data_sfarsit: string | null }>(
    competitii: T[], idsParticipare: Set<string>, azi: string,
): { active: T[]; istoric: T[] } {
    const active: T[] = [];
    const istoric: T[] = [];
    for (const c of competitii ?? []) {
        if (c.status === 'draft') continue;
        const terminata = c.status === 'finalizata' || (!!c.data_sfarsit && c.data_sfarsit < azi);
        if (!terminata) active.push(c);
        else if (idsParticipare.has(c.id)) istoric.push(c);
    }
    const dupaInceput = (x: T, y: T) => (x.data_inceput ?? '').localeCompare(y.data_inceput ?? '');
    active.sort(dupaInceput);
    istoric.sort((x, y) => dupaInceput(y, x));
    return { active, istoric };
}

/** Zona externă: admin de club pe clubul din context (și pentru INSTRUCTOR, D-13), restul false. */
export function construiestePermisiuniExtern(clubId: string): Permissions {
    return {
        isSuperAdmin: false,
        isAdmin: false,
        isFederationAdmin: false,
        isAdminClub: true,
        isInstructor: false,
        isSportiv: false,
        hasAdminAccess: false,
        isFederationLevel: false,
        canManageFinances: false,
        canGradeStudents: false,
        visibleClubIds: [clubId],
        canBeClubAdmin: false,
        canBeFederationAdmin: false,
        isMultiContextAdmin: false,
        hasClubFilter: true,
    };
}
