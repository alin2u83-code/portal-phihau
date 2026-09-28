// api/_mailerSecuritate.ts
// Trimitere email alerte securitate (login brute-force + dispozitiv admin
// necunoscut) prin ACELAȘI canal SMTP Hostinger deja configurat pentru Auth,
// dar dintr-un handler Vercel separat — Supabase Auth SMTP trimite doar cele
// 4 emailuri fixe (reset parolă, confirmare cont, cod MFA, schimbare email)
// și nu suportă conținut custom (vezi PLAN Task 3, decizie tehnică).
//
// nodemailer: singura dependență nouă a acestui plan, verificată la checkpoint
// uman (Task 2) înainte de install — 0 dependențe runtime proprii, MIT.

import nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';

// Transport creat o singură dată la nivel de modul — reutilizat între invocări
// în același cold start Vercel.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Găsește adresele de email ale tuturor conturilor SUPER_ADMIN_FEDERATIE.
 * Ignoră erorile per-id (nu oprește bucla) — un singur cont cu probleme nu
 * trebuie să blocheze alertarea celorlalți.
 */
export async function gasesteDestinatariSuperAdmin(supabaseAdmin: SupabaseClient): Promise<string[]> {
    const { data: roluriRows, error } = await supabaseAdmin
        .from('utilizator_roluri_multicont')
        .select('user_id')
        .eq('rol_denumire', 'SUPER_ADMIN_FEDERATIE');

    if (error || !roluriRows) return [];

    const userIds = Array.from(new Set(roluriRows.map((r: any) => r.user_id).filter(Boolean)));

    const emails: string[] = [];
    for (const id of userIds) {
        try {
            const { data, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);
            if (getUserError) continue;
            const email = data?.user?.email;
            if (email) emails.push(email);
        } catch {
            // ignoră eroarea per-id, continuă bucla
        }
    }

    return Array.from(new Set(emails));
}

export interface ParametriAlertaSecuritate {
    supabaseAdmin: SupabaseClient;
    tip: 'login_esuat_burst' | 'dispozitiv_necunoscut';
    referinta: string;
    subiect: string;
    corpText: string;
}

/**
 * Trimite alerta de securitate pe email către toți SUPER_ADMIN_FEDERATIE,
 * cu cooldown anti-spam de 30 minute per (tip, referinta). NU face niciodată
 * throw — apelantul (handlerul Vercel) nu trebuie blocat de un eșec aici.
 */
export async function trimiteAlertaSecuritate(params: ParametriAlertaSecuritate): Promise<void> {
    const { supabaseAdmin, tip, referinta, subiect, corpText } = params;

    // 1. Cooldown anti-spam: dacă s-a trimis deja o alertă recentă pentru
    // aceeași țintă, nu mai trimite/loghează din nou.
    const acumMinus30Min = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: alerteRecente } = await supabaseAdmin
        .from('auth_alerte_trimise')
        .select('id')
        .eq('tip', tip)
        .eq('referinta', referinta)
        .eq('reusit', true)
        .gte('created_at', acumMinus30Min)
        .limit(1);

    if (alerteRecente && alerteRecente.length > 0) {
        return;
    }

    // 2. Găsește destinatari.
    const destinatari = await gasesteDestinatariSuperAdmin(supabaseAdmin);
    if (destinatari.length === 0) {
        await supabaseAdmin.from('auth_alerte_trimise').insert({
            tip,
            referinta,
            destinatari_count: 0,
            reusit: false,
            eroare: 'Niciun SUPER_ADMIN_FEDERATIE cu email găsit',
        });
        return;
    }

    // 3. Trimite email-ul, loghează rezultatul (succes sau eșec).
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: destinatari.join(','),
            subject: subiect,
            text: corpText,
        });

        await supabaseAdmin.from('auth_alerte_trimise').insert({
            tip,
            referinta,
            destinatari_count: destinatari.length,
            reusit: true,
        });
    } catch (err: any) {
        await supabaseAdmin.from('auth_alerte_trimise').insert({
            tip,
            referinta,
            destinatari_count: destinatari.length,
            reusit: false,
            eroare: String(err?.message || err).slice(0, 500),
        });
        console.error('[alerta-securitate] trimitere esuata', err);
    }
}
