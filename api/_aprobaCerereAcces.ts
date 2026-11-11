// api/_aprobaCerereAcces.ts
// Logica DB pentru aprobarea/respingerea cererilor de acces extern la competiții (Faza 36, D-05).
// Faza 39 (D-01): aprobarea creează contul de competiție al clubului (creeazaContClub) și e permisă
// doar proprietarului aplicației; respingerea rămâne la federație.
// Prefix `_` = nu devine funcție Vercel. Rulează cu service role: autorizarea se face
// în handler ÎNAINTE de a apela proceseazaCerereAcces.
// Nu trimite niciun email (memoria feedback_email_fara_linkuri_actiune): utilizatorul
// se autentifică ulterior cu OTP pe pagina competiției.

import type { SupabaseClient } from '@supabase/supabase-js';
import { creeazaContClub } from './_contCompetitieClub.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // --- aprobare (Faza 39, D-01): creează contul de competiție al clubului din cerere ---
    const cont = await creeazaContClub(supabaseAdmin, {
        club_id: cerere.club_id, email: cerere.email, callerId,
    });
    if (!cont.ok) {
        // Club cu cont existent: cererea rămâne în așteptare, proprietarul decide.
        return cont.status === 409 && cont.error === 'Clubul are deja cont de competiție.'
            ? { ok: false, status: 409, error: 'Clubul are deja cont de competiție. Respinge cererea sau schimbă emailul din Conturi cluburi.' }
            : { ok: false, status: cont.status, error: cont.error };
    }

    let { error: marcErr } = await marcheaza({ status: 'aprobata', motiv_respingere: null });
    if (marcErr) ({ error: marcErr } = await marcheaza({ status: 'aprobata', motiv_respingere: null })); // E1-2: un retry
    if (marcErr) {
        // Contul a fost creat dar cererea nu s-a marcat: raportăm eroare; reîncercarea dă 409 (cont existent).
        return eroareGenerica();
    }
    return { ok: true, status: 200, userId: cont.userId, userNou: true };
}
