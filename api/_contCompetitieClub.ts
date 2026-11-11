// api/_contCompetitieClub.ts
// Faza 39 (D-01, D-13, D-14, D-15): cont unic de competiție per club, creat doar de proprietarul aplicației.
// Prefix `_` = nu devine funcție Vercel. Rulează cu service role: autorizarea
// (esteProprietarApelant) se face în handler ÎNAINTE de orice scriere.
// Contul are doar cod OTP pe email (fără parolă, fără link de acțiune).

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROL_EXTERN = 'REPREZENTANT_COMPETITIE';

export type OperatieContClub = 'creeaza' | 'schimba_email';

export interface CerereContClub {
    operatie: OperatieContClub;
    club_id: string;
    email: string;
}

export function valideazaCerereContClub(
    body: unknown
): { ok: true; value: CerereContClub } | { ok: false; error: string } {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Date lipsă sau invalide.' };
    const { operatie, club_id, email } = body as Record<string, unknown>;
    if (operatie !== 'creeaza' && operatie !== 'schimba_email') {
        return { ok: false, error: 'Operație necunoscută.' };
    }
    if (typeof club_id !== 'string' || !UUID_RE.test(club_id)) {
        return { ok: false, error: 'Identificator de club invalid.' };
    }
    if (typeof email !== 'string') return { ok: false, error: 'Email invalid.' };
    const e = email.trim().toLowerCase();
    if (e.length < 5 || e.length > 254 || !EMAIL_RE.test(e)) {
        return { ok: false, error: 'Adresa de email nu este validă.' };
    }
    return { ok: true, value: { operatie, club_id, email: e } };
}

// Eșuează închis: orice eroare => false.
export async function esteProprietarApelant(supabaseAdmin: SupabaseClient, callerId: string): Promise<boolean> {
    try {
        const { data, error } = await supabaseAdmin
            .from('proprietari_aplicatie').select('user_id').eq('user_id', callerId).maybeSingle();
        return !error && !!data;
    } catch {
        return false;
    }
}

export interface RezultatContClub {
    ok: boolean;
    status: number;
    error?: string;
    userId?: string;
    avertisment?: string;
}

const eroareGenerica = (status = 500): RezultatContClub => ({
    ok: false,
    status,
    error: 'Operația nu a putut fi efectuată. Reîncercați sau contactați administratorul.',
});

const EMAIL_FOLOSIT: RezultatContClub = {
    ok: false,
    status: 409,
    error: 'Emailul aparține deja unui cont. Folosește un email dedicat clubului.',
};

// Creează identitatea auth + rândul de rol REPREZENTANT_COMPETITIE (fără rând în conturi_competitie_club).
// La orice eșec își face singură rollback.
async function creeazaIdentitateClub(
    supabaseAdmin: SupabaseClient,
    club: { id: string; nume: string },
    email: string
): Promise<RezultatContClub> {
    const { data: idExistent, error: rpcErr } = await supabaseAdmin.rpc('user_id_dupa_email', { p_email: email });
    if (rpcErr) return eroareGenerica();
    if (idExistent) return EMAIL_FOLOSIT;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { sursa: 'cont_competitie_club', club_id: club.id },
    });
    if (authErr || !authData?.user) return eroareGenerica();
    const userId = authData.user.id;

    const rollback = async () => {
        await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('user_id', userId).eq('rol_denumire', ROL_EXTERN);
        await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    };

    try {
        const { data: rolRow, error: rolErr } = await supabaseAdmin
            .from('roluri').select('id').eq('nume', ROL_EXTERN).maybeSingle();
        if (rolErr || !rolRow) { await rollback(); return eroareGenerica(); }

        // DEC-2/DEC-9 (Faza 36): club_id și sportiv_id NULL; legătura cu clubul e în conturi_competitie_club.
        const { error: insRolErr } = await supabaseAdmin.from('utilizator_roluri_multicont').insert({
            user_id: userId,
            rol_id: rolRow.id,
            rol_denumire: ROL_EXTERN,
            club_id: null,
            sportiv_id: null,
            is_primary: true,
            nume_utilizator_cache: 'Cont competiție ' + club.nume,
        });
        if (insRolErr) { await rollback(); return eroareGenerica(); }
        return { ok: true, status: 200, userId };
    } catch {
        await rollback().catch(() => {});
        return eroareGenerica();
    }
}

async function incarcaClub(supabaseAdmin: SupabaseClient, club_id: string) {
    return supabaseAdmin.from('cluburi').select('id, nume').eq('id', club_id).maybeSingle();
}

async function stergeIdentitate(supabaseAdmin: SupabaseClient, userId: string) {
    await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('user_id', userId).eq('rol_denumire', ROL_EXTERN);
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
}

export async function creeazaContClub(
    supabaseAdmin: SupabaseClient,
    params: { club_id: string; email: string; callerId: string }
): Promise<RezultatContClub> {
    const { club_id, email, callerId } = params;
    try {
        const { data: club, error: clubErr } = await incarcaClub(supabaseAdmin, club_id);
        if (clubErr) return eroareGenerica();
        if (!club) return { ok: false, status: 404, error: 'Clubul nu există.' };

        const { data: contExistent, error: contErr } = await supabaseAdmin
            .from('conturi_competitie_club').select('club_id').eq('club_id', club_id).maybeSingle();
        if (contErr) return eroareGenerica();
        if (contExistent) return { ok: false, status: 409, error: 'Clubul are deja cont de competiție.' };

        const identitate = await creeazaIdentitateClub(supabaseAdmin, club, email);
        if (!identitate.ok) return identitate;
        const userId = identitate.userId!;

        const { error: insErr } = await supabaseAdmin.from('conturi_competitie_club')
            .insert({ club_id, user_id: userId, email, creat_de: callerId });
        if (insErr) {
            await stergeIdentitate(supabaseAdmin, userId);
            // 23505 = cerere concurentă a creat deja contul clubului
            return insErr.code === '23505'
                ? { ok: false, status: 409, error: 'Clubul are deja cont de competiție.' }
                : eroareGenerica();
        }
        return { ok: true, status: 200, userId };
    } catch {
        return eroareGenerica();
    }
}

export async function schimbaEmailContClub(
    supabaseAdmin: SupabaseClient,
    params: { club_id: string; email: string; callerId: string }
): Promise<RezultatContClub> {
    const { club_id, email } = params;
    try {
        const { data: cont, error: contErr } = await supabaseAdmin
            .from('conturi_competitie_club').select('user_id, email').eq('club_id', club_id).maybeSingle();
        if (contErr) return eroareGenerica();
        if (!cont) return { ok: false, status: 404, error: 'Clubul nu are cont de competiție.' };
        if (cont.email === email) return { ok: false, status: 409, error: 'Emailul este deja cel curent.' };

        const { data: club, error: clubErr } = await incarcaClub(supabaseAdmin, club_id);
        if (clubErr) return eroareGenerica();
        if (!club) return { ok: false, status: 404, error: 'Clubul nu există.' };

        const identitate = await creeazaIdentitateClub(supabaseAdmin, club, email);
        if (!identitate.ok) return identitate;
        const userNou = identitate.userId!;
        const userVechi = cont.user_id as string;

        // WHERE user_id = vechi: protecție la concurență. De aici helperii RLS nu mai recunosc vechiul user_id.
        const { data: mutat, error: updErr } = await supabaseAdmin.from('conturi_competitie_club')
            .update({ user_id: userNou, email, modificat_la: new Date().toISOString() })
            .eq('club_id', club_id).eq('user_id', userVechi)
            .select('club_id');
        if (updErr || !mutat || mutat.length === 0) {
            await stergeIdentitate(supabaseAdmin, userNou);
            return updErr ? eroareGenerica() : { ok: false, status: 409, error: 'Contul a fost modificat între timp. Reîncercați.' };
        }

        // Vechiul utilizator: ban + dispozitive de încredere șterse. Rândul lui de rol REPREZENTANT_COMPETITIE RĂMÂNE:
        // fără el este_doar_extern() ar deveni false și restrictivele ext_r_* n-ar mai limita un JWT încă valid.
        // shortcut: ban în loc de ștergere — ștergerea ar putea eșua pe FK și ar pierde referințe de audit;
        // de revizuit dacă emailul vechi trebuie refolosit.
        let avertisment: string | undefined;
        const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userVechi, { ban_duration: '876000h' });
        if (banErr) avertisment = 'ban_esuat'; // accesul RLS e deja retras
        await supabaseAdmin.from('mfa_dispozitive_incredere').delete().eq('user_id', userVechi);
        await supabaseAdmin.from('mfa_email_verificari').delete().eq('user_id', userVechi);

        return { ok: true, status: 200, userId: userNou, ...(avertisment ? { avertisment } : {}) };
    } catch {
        return eroareGenerica();
    }
}
