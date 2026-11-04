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

type RandRol = { id: string; rol_denumire: string; club_id: string | null; club?: { nume?: string } | null };
type RandGrant = { competitie_id: string; club_id: string; activ: boolean; cluburi?: { nume?: string } | null };

/** D-02: clubul rezultă din rolurile existente. Un email fără rol eligibil primește []. */
export function construiesteContexte(roluri: RandRol[], granturi: RandGrant[], competitieId: string): ContextAccesExtern[] {
    const rezultat: ContextAccesExtern[] = [];
    for (const r of roluri ?? []) {
        if ((r.rol_denumire === 'ADMIN_CLUB' || r.rol_denumire === 'INSTRUCTOR') && r.club_id) {
            rezultat.push({ roleRowId: r.id, rol: r.rol_denumire, clubId: r.club_id, clubNume: r.club?.nume ?? '' });
        }
    }
    const rand = (roluri ?? []).find(r => r.rol_denumire === 'REPREZENTANT_COMPETITIE');
    const grant = rand && (granturi ?? []).find(g => g.competitie_id === competitieId && g.activ);
    if (rand && grant) {
        rezultat.push({ roleRowId: rand.id, rol: 'REPREZENTANT_COMPETITIE', clubId: grant.club_id, clubNume: grant.cluburi?.nume ?? '' });
    }
    return rezultat;
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
