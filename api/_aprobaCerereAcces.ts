// api/_aprobaCerereAcces.ts
// Logica DB pentru aprobarea/respingerea cererilor de acces extern la competiții (Faza 36, D-05).
// Prefix `_` = nu devine funcție Vercel. Rulează cu service role: autorizarea
// (SUPER_ADMIN_FEDERATIE) se face în handler ÎNAINTE de a apela proceseazaCerereAcces.
// Nu trimite niciun email (memoria feedback_email_fara_linkuri_actiune): utilizatorul
// se autentifică ulterior cu OTP pe pagina competiției.

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROL_EXTERN = 'REPREZENTANT_COMPETITIE';

export type ActiuneCerere = 'aproba' | 'respinge';

export interface CerereAprobare {
    cerere_id: string;
    actiune: ActiuneCerere;
    motiv?: string;
}

export function valideazaCerereAprobare(
    body: unknown
): { ok: true; value: CerereAprobare } | { ok: false; error: string } {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Date lipsă sau invalide.' };
    const { cerere_id, actiune, motiv } = body as Record<string, unknown>;
    if (typeof cerere_id !== 'string' || !UUID_RE.test(cerere_id)) {
        return { ok: false, error: 'Identificator de cerere invalid.' };
    }
    if (actiune !== 'aproba' && actiune !== 'respinge') {
        return { ok: false, error: 'Acțiune necunoscută.' };
    }
    if (actiune === 'aproba') return { ok: true, value: { cerere_id, actiune } };
    if (motiv !== undefined && motiv !== null) {
        if (typeof motiv !== 'string' || motiv.length > 300) {
            return { ok: false, error: 'Motivul poate avea cel mult 300 de caractere.' };
        }
    }
    return { ok: true, value: { cerere_id, actiune, motiv: typeof motiv === 'string' && motiv ? motiv : undefined } };
}

// Eșuează închis: orice rol necunoscut (inclusiv REPREZENTANT_COMPETITIE) => false.
export function esteFederatie(callerRoles: Array<{ rol_denumire?: string | null }>): boolean {
    return (callerRoles || []).some(r => r?.rol_denumire === 'SUPER_ADMIN_FEDERATIE');
}

export interface RezultatProcesare {
    ok: boolean;
    status: number;
    error?: string;
    userId?: string;
    userNou?: boolean;
    avertisment?: string;
}

const eroareGenerica = (status = 500): RezultatProcesare => ({
    ok: false,
    status,
    error: 'Cererea nu a putut fi procesată. Reîncercați sau contactați administratorul.',
});

export async function proceseazaCerereAcces(
    supabaseAdmin: SupabaseClient,
    params: { cerere_id: string; actiune: ActiuneCerere; motiv?: string; callerId: string }
): Promise<RezultatProcesare> {
    const { cerere_id, actiune, motiv, callerId } = params;

    const { data: cerere, error: cerereErr } = await supabaseAdmin
        .from('cereri_acces_competitie')
        .select('id, competitie_id, email, nume, club_id, status')
        .eq('id', cerere_id)
        .maybeSingle();
    if (cerereErr) return eroareGenerica();
    if (!cerere) return { ok: false, status: 404, error: 'Cererea nu există.' };
    if (cerere.status !== 'in_asteptare') {
        return { ok: false, status: 409, error: 'Cererea a fost deja procesată.' };
    }

    const marcheaza = (patch: Record<string, unknown>) =>
        supabaseAdmin
            .from('cereri_acces_competitie')
            .update({ ...patch, procesat_la: new Date().toISOString(), procesat_de: callerId })
            .eq('id', cerere_id)
            .eq('status', 'in_asteptare'); // evită dublă procesare concurentă

    if (actiune === 'respinge') {
        const { error } = await marcheaza({ status: 'respinsa', motiv_respingere: motiv ?? null });
        return error ? eroareGenerica() : { ok: true, status: 200 };
    }

    // --- aprobare ---
    let userId: string | null = null;
    let userNou = false;
    let rolInserat = false;
    let grantNou = false;

    const rollback = async () => {
        if (userNou && userId) {
            // cascada din auth.users curăță și rolul/grantul, dar le ștergem explicit mai jos oricum
            await supabaseAdmin.from('acces_competitie_extern').delete().eq('user_id', userId).eq('cerere_id', cerere_id);
            await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('user_id', userId).eq('rol_denumire', ROL_EXTERN);
            await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
            return;
        }
        if (!userId) return;
        if (grantNou) {
            await supabaseAdmin.from('acces_competitie_extern').delete()
                .eq('user_id', userId).eq('competitie_id', cerere.competitie_id).eq('club_id', cerere.club_id);
        }
        if (rolInserat) {
            await supabaseAdmin.from('utilizator_roluri_multicont').delete()
                .eq('user_id', userId).eq('rol_denumire', ROL_EXTERN);
        }
    };

    try {
        const { data: idExistent, error: rpcErr } = await supabaseAdmin.rpc('user_id_dupa_email', { p_email: cerere.email });
        if (rpcErr) return eroareGenerica();

        if (idExistent) {
            userId = idExistent as string;
        } else {
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
                email: cerere.email,
                email_confirm: true,
                user_metadata: { nume: cerere.nume, sursa: 'cerere_acces_competitie' },
            });
            if (authErr || !authData?.user) return eroareGenerica();
            userId = authData.user.id;
            userNou = true;
        }

        const { data: rolRow, error: rolErr } = await supabaseAdmin
            .from('roluri').select('id').eq('nume', ROL_EXTERN).maybeSingle();
        if (rolErr || !rolRow) {
            await rollback();
            return { ok: false, status: 500, error: `Rolul ${ROL_EXTERN} lipsește din baza de date (rulați migrația 36-02).` };
        }

        const { data: roluriUser, error: roluriErr } = await supabaseAdmin
            .from('utilizator_roluri_multicont').select('rol_denumire').eq('user_id', userId);
        if (roluriErr) { await rollback(); return eroareGenerica(); }

        const areRolExtern = (roluriUser || []).some((r: any) => r.rol_denumire === ROL_EXTERN);
        const areAlteRoluri = (roluriUser || []).some((r: any) => r.rol_denumire !== ROL_EXTERN);

        if (!areRolExtern) {
            // DEC-1/DEC-2/DEC-9: club_id și sportiv_id NULL; triggerul nu mai leagă sportiv pentru acest rol.
            const { error: insRolErr } = await supabaseAdmin.from('utilizator_roluri_multicont').insert({
                user_id: userId,
                rol_id: rolRow.id,
                rol_denumire: ROL_EXTERN,
                club_id: null,
                sportiv_id: null,
                is_primary: !areAlteRoluri,
                nume_utilizator_cache: cerere.nume,
            });
            if (insRolErr) { await rollback(); return eroareGenerica(); }
            rolInserat = true;
        }

        const { data: grantExistent, error: grantSelErr } = await supabaseAdmin
            .from('acces_competitie_extern').select('id')
            .eq('user_id', userId).eq('competitie_id', cerere.competitie_id).eq('club_id', cerere.club_id)
            .maybeSingle();
        if (grantSelErr) { await rollback(); return eroareGenerica(); }

        if (grantExistent) {
            const { error: updErr } = await supabaseAdmin.from('acces_competitie_extern')
                .update({ activ: true, email: cerere.email, nume: cerere.nume, cerere_id, creat_de: callerId })
                .eq('id', grantExistent.id);
            if (updErr) { await rollback(); return eroareGenerica(); }
        } else {
            const { error: insErr } = await supabaseAdmin.from('acces_competitie_extern').insert({
                user_id: userId, competitie_id: cerere.competitie_id, club_id: cerere.club_id,
                activ: true, email: cerere.email, nume: cerere.nume, cerere_id, creat_de: callerId,
            });
            if (insErr) { await rollback(); return eroareGenerica(); }
            grantNou = true;
        }

        const { error: marcErr } = await marcheaza({ status: 'aprobata', motiv_respingere: null });
        if (marcErr) { await rollback(); return eroareGenerica(); }

        return {
            ok: true, status: 200, userId, userNou,
            ...(areAlteRoluri ? { avertisment: 'cont_existent_cu_alte_roluri' } : {}),
        };
    } catch {
        await rollback().catch(() => {});
        return eroareGenerica();
    }
}
