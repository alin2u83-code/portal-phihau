// api/_permisiuniCont.ts
// Gardă pură, fără I/O, testabilă independent — decide dacă apelantul unui
// endpoint de creare cont are dreptul de a acorda rolurile cerute în clubul
// țintă. Închide CR-01 (escaladare de privilegii cross-club) din 26-REVIEW.md:
// vechea logică compara greutatea maximă globală a apelantului cu greutatea
// rolului cerut, independent de clubul țintă — un ADMIN_CLUB în Club A putea
// astfel crea un cont ADMIN_CLUB în Club B, unde era doar SPORTIV. Aici
// comparația se face întotdeauna împotriva greutății apelantului ÎN CLUBUL
// ȚINTĂ (gClub), nu împotriva maximului global.

export const ROLE_WEIGHTS: Record<string, number> = {
    'SUPER_ADMIN_FEDERATIE': 5,
    'ADMIN': 4,
    'ADMIN_CLUB': 3,
    'INSTRUCTOR': 2,
    'SPORTIV': 1,
};

// Pragul minim de greutate globală necesar ca să poți crea conturi (INSTRUCTOR+).
export const GREUTATE_MINIMA_CREARE_CONT = 2;

// Pragul peste care scoping-ul pe club nu se mai aplică — apelantul e federație.
export const GREUTATE_FEDERATIE = 5;

export interface RolApelant {
    rol_denumire: string;
    club_id: string | null;
}

export type RezultatPermisiune =
    | { permis: true }
    | { permis: false; status: 400 | 403; error: string };

export function greutateMaximaGlobala(callerRoles: RolApelant[]): number {
    return Math.max(0, ...callerRoles.map(r => ROLE_WEIGHTS[r.rol_denumire] || 0));
}

export function greutatePerClub(callerRoles: RolApelant[]): Map<string, number> {
    const rezultat = new Map<string, number>();
    for (const r of callerRoles) {
        if (!r.club_id) continue; // roluri fără club (ex. SUPER_ADMIN_FEDERATIE) — tratate separat, prin short-circuit-ul de federație
        const greutate = ROLE_WEIGHTS[r.rol_denumire] || 0;
        rezultat.set(r.club_id, Math.max(rezultat.get(r.club_id) ?? 0, greutate));
    }
    return rezultat;
}

export function verificaPermisiuneCreareCont(params: {
    callerRoles: RolApelant[];
    roles: unknown;
    clubTinta: string | null;
}): RezultatPermisiune {
    const { callerRoles, roles, clubTinta } = params;

    // 1. Greutatea globală minimă pentru a putea crea conturi deloc (INSTRUCTOR+).
    const globala = greutateMaximaGlobala(callerRoles);
    if (globala < GREUTATE_MINIMA_CREARE_CONT) {
        return { permis: false, status: 403, error: 'Nu aveți permisiunea de a crea conturi.' };
    }

    // 2. Lista de roluri cerute trebuie să fie un array nevid.
    if (!Array.isArray(roles) || roles.length === 0) {
        return { permis: false, status: 400, error: 'Lista de roluri este invalidă.' };
    }

    // 3. Fiecare rol cerut trebuie să fie cunoscut.
    for (const roleName of roles) {
        if (!(roleName in ROLE_WEIGHTS)) {
            return { permis: false, status: 400, error: `Rol necunoscut: ${roleName}.` };
        }
    }

    // 4. Federația poate crea în orice club — comportament păstrat din 26-01.
    if (globala >= GREUTATE_FEDERATIE) {
        return { permis: true };
    }

    // 5. Scoping pe club: apelantul trebuie să aibă un rol în clubul țintă.
    const gClub = clubTinta ? (greutatePerClub(callerRoles).get(clubTinta) ?? 0) : 0;
    if (!clubTinta || gClub === 0) {
        return { permis: false, status: 403, error: 'Nu puteți crea conturi în alt club.' };
    }

    // 6. Anti-escaladare: niciun rol cerut nu poate depăși greutatea apelantului în acest club.
    for (const roleName of roles as string[]) {
        if (ROLE_WEIGHTS[roleName] > gClub) {
            return {
                permis: false,
                status: 403,
                error: 'Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră în acest club.',
            };
        }
    }

    return { permis: true };
}

/**
 * Gardă pură pentru modificarea unui cont EXISTENT (reset parolă, schimbare
 * email/username — Faza 32, D-07). Greutatea țintei e calculată GLOBAL (nu
 * per club): operația afectează contul în toate cluburile unde are roluri,
 * deci un INSTRUCTOR din clubul A nu poate reseta un cont care e ADMIN_CLUB
 * în clubul B, chiar dacă ținta nu are niciun rol în clubul A.
 */
export function verificaPermisiuneModificareCont(params: {
    callerId: string;
    callerRoles: RolApelant[];
    tintaUserId: string;
    tintaRoles: RolApelant[];
    cluburiTinta: string[];
    permiteSine: boolean;
}): RezultatPermisiune {
    const { callerId, callerRoles, tintaUserId, tintaRoles, cluburiTinta, permiteSine } = params;

    // 0. Propriul cont — permis dacă fluxul o permite explicit (ex. AccountSettings).
    if (permiteSine && callerId === tintaUserId) {
        return { permis: true };
    }

    // 1. Greutatea globală minimă pentru a putea modifica orice cont (INSTRUCTOR+).
    const globalaApelant = greutateMaximaGlobala(callerRoles);
    if (globalaApelant < GREUTATE_MINIMA_CREARE_CONT) {
        return { permis: false, status: 403, error: 'Nu aveți permisiunea de a modifica acest cont.' };
    }

    // 2. Un cont de federație nu poate fi modificat din aplicație, de nimeni.
    const globalaTinta = greutateMaximaGlobala(tintaRoles);
    if (globalaTinta >= GREUTATE_FEDERATIE) {
        return { permis: false, status: 403, error: 'Contul unui administrator de federație nu poate fi modificat din aplicație.' };
    }

    // 3. Federația poate modifica orice cont non-federație.
    if (globalaApelant >= GREUTATE_FEDERATIE) {
        return { permis: true };
    }

    // 4. Scoping pe club: apelantul trebuie să aibă autoritate (greutate >= 2)
    //    într-un club unde ținta are prezență.
    const greutatiPerClub = greutatePerClub(callerRoles);
    const cluburiCuAutoritate = cluburiTinta.filter(clubId => (greutatiPerClub.get(clubId) ?? 0) >= GREUTATE_MINIMA_CREARE_CONT);
    if (cluburiCuAutoritate.length === 0) {
        return { permis: false, status: 403, error: 'Nu puteți modifica un cont din alt club.' };
    }

    // 5. Anti-escaladare: greutatea apelantului în cel puțin unul din acele
    //    cluburi trebuie să depășească STRICT greutatea globală a țintei.
    const areAutoritateSuficienta = cluburiCuAutoritate.some(clubId => (greutatiPerClub.get(clubId) ?? 0) > globalaTinta);
    if (!areAutoritateSuficienta) {
        return { permis: false, status: 403, error: 'Nu puteți modifica un cont cu privilegii egale sau mai mari decât ale dumneavoastră.' };
    }

    return { permis: true };
}
