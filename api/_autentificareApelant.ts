// api/_autentificareApelant.ts
// Autentificare Bearer + încărcare roluri apelant, reutilizat de endpoint-urile
// care modifică conturi existente (Faza 32, D-07 — reset-parola-sportiv,
// account, genereaza-magic-link rulau anterior cu SUPABASE_SERVICE_ROLE_KEY
// fără nicio verificare a apelantului). Pattern identic cu api/creare-cont.ts
// (Faza 26), extras aici pentru reutilizare fără I/O nou.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RolApelant } from './_permisiuniCont.js';

export interface ApelantAutentificat {
    callerId: string;
    callerRoles: RolApelant[];
}

export function extrageTokenBearer(authorization: string | string[] | undefined): string | null {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
}

export async function autentificaApelant(
    supabaseAdmin: SupabaseClient,
    authorization: string | string[] | undefined
): Promise<{ data: ApelantAutentificat | null; status: 401 | 500 | null; error: string | null }> {
    const token = extrageTokenBearer(authorization);
    if (!token) {
        return { data: null, status: 401, error: 'Autentificare necesară.' };
    }

    const { data: callerAuthData, error: callerAuthError } = await supabaseAdmin.auth.getUser(token);
    if (callerAuthError || !callerAuthData?.user) {
        return { data: null, status: 401, error: 'Sesiune invalidă sau expirată. Reautentificați-vă.' };
    }
    const callerId = callerAuthData.user.id;

    const { data: callerRoleRows, error: callerRolesError } = await supabaseAdmin
        .from('utilizator_roluri_multicont')
        .select('rol_denumire, club_id')
        .eq('user_id', callerId);

    if (callerRolesError) {
        return { data: null, status: 500, error: 'Nu s-au putut verifica permisiunile apelantului.' };
    }

    return { data: { callerId, callerRoles: (callerRoleRows || []) as RolApelant[] }, status: null, error: null };
}

export async function incarcaTintaCont(
    supabaseAdmin: SupabaseClient,
    userId: string
): Promise<{ data: { tintaRoles: RolApelant[]; cluburiTinta: string[] } | null; error: string | null }> {
    const { data: roluriRows, error: roluriError } = await supabaseAdmin
        .from('utilizator_roluri_multicont')
        .select('rol_denumire, club_id')
        .eq('user_id', userId);

    if (roluriError) {
        return { data: null, error: 'Nu s-au putut verifica permisiunile contului țintă.' };
    }

    const { data: sportivRow, error: sportivError } = await supabaseAdmin
        .from('sportivi')
        .select('club_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (sportivError) {
        return { data: null, error: 'Nu s-a putut verifica clubul contului țintă.' };
    }

    const tintaRoles = (roluriRows || []) as RolApelant[];
    const cluburiTinta = Array.from(new Set(
        [...tintaRoles.map(r => r.club_id), sportivRow?.club_id ?? null].filter((id): id is string => !!id)
    ));

    return { data: { tintaRoles, cluburiTinta }, error: null };
}
