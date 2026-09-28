// api/alerta-securitate-login.ts
// Endpoint public (fără autentificare, apelat fire-and-forget din useAuth
// imediat după signInWithPassword) — înregistrează fiecare tentativă de
// login și declanșează cele 2 tipuri de alertă de securitate:
//   1. 5+ login-uri eșuate în 15 minute pe același email/username (brute-force)
//   2. login admin (ADMIN_CLUB/SUPER_ADMIN_FEDERATIE) de pe IP+browser
//      nemaivăzut pentru acel cont (dispozitiv necunoscut)
//
// A 10-a funcție Vercel din 12 permise pe planul Hobby (vezi interfaces din
// PLAN.md) — nu necesită consolidare acum.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { checkRateLimit, getClientIp } from './_rateLimit.js';
import { trimiteAlertaSecuritate } from './_mailerSecuritate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);

    // Rate limit per IP — endpoint public, orice vizitator îl poate apela.
    const rateLimitIp = checkRateLimit(`alerta-securitate-login:ip:${ip}`, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimitIp.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateLimitIp.resetAt - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Prea multe cereri. Reîncercați în câteva secunde.' });
    }

    const { emailFolosit, reusit, userId } = req.body || {};

    if (typeof emailFolosit !== 'string' || emailFolosit.trim().length === 0) {
        return res.status(400).json({ error: 'emailFolosit este obligatoriu.' });
    }
    if (typeof reusit !== 'boolean') {
        return res.status(400).json({ error: 'reusit trebuie să fie boolean.' });
    }

    const emailLower = emailFolosit.trim().toLowerCase();

    // Rate limit per email — limitează flood distribuit pe un singur cont țintă.
    const rateLimitEmail = checkRateLimit(`alerta-securitate-login:email:${emailLower}`, { windowMs: 60000, maxRequests: 20 });
    if (!rateLimitEmail.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateLimitEmail.resetAt - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Prea multe cereri pentru acest cont. Reîncercați în câteva secunde.' });
    }

    const userAgent = (req.headers['user-agent'] as string) || 'necunoscut';

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ error: 'Serverul nu este configurat corect.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Endpoint apelat fire-and-forget din client — un 4xx/5xx ar apărea ca
    // eroare de rețea inutilă în consola browserului, fără ca nimeni s-o vadă.
    try {
        await supabaseAdmin.from('auth_tentative_login').insert({
            email_folosit: emailLower,
            ip,
            user_agent: userAgent,
            reusit,
            user_id: reusit ? (userId || null) : null,
        });

        const acumFormatat = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });

        if (reusit === false) {
            const acumMinus15Min = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { count } = await supabaseAdmin
                .from('auth_tentative_login')
                .select('id', { count: 'exact', head: true })
                .eq('email_folosit', emailLower)
                .eq('reusit', false)
                .gte('created_at', acumMinus15Min);

            if ((count || 0) >= 5) {
                const subiect = 'Alertă securitate PhiHau: 5+ login-uri eșuate în 15 minute';
                const corpText = `S-au înregistrat ${count} login-uri eșuate în ultimele 15 minute pentru contul: ${emailLower}\n\nIP: ${ip}\nBrowser/dispozitiv: ${userAgent}\nOra: ${acumFormatat}\n\nVerifică Jurnal Audit → card Alerte Securitate Admin.`;
                await trimiteAlertaSecuritate({
                    supabaseAdmin,
                    tip: 'login_esuat_burst',
                    referinta: emailLower,
                    subiect,
                    corpText,
                });
            }
        } else if (userId) {
            const { data: roluriRows } = await supabaseAdmin
                .from('utilizator_roluri_multicont')
                .select('rol_denumire')
                .eq('user_id', userId);

            const roluri = roluriRows || [];
            const esteAdmin = roluri.some((r: any) => r.rol_denumire === 'ADMIN_CLUB' || r.rol_denumire === 'SUPER_ADMIN_FEDERATIE');

            if (esteAdmin) {
                const uaHash = createHash('sha256').update(userAgent).digest('hex');

                const { data: dispozitivExistent } = await supabaseAdmin
                    .from('auth_dispozitive_cunoscute')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('ip', ip)
                    .eq('user_agent_hash', uaHash)
                    .maybeSingle();

                if (!dispozitivExistent) {
                    await supabaseAdmin.from('auth_dispozitive_cunoscute').insert({
                        user_id: userId,
                        ip,
                        user_agent_hash: uaHash,
                    });

                    const rolGasit = roluri.map((r: any) => r.rol_denumire).join(', ') || 'necunoscut';
                    const subiect = 'Alertă securitate PhiHau: login admin de pe dispozitiv necunoscut';
                    const corpText = `Cont admin autentificat de pe o combinație IP+browser nemaivăzută.\n\nUser ID: ${userId}\nRol: ${rolGasit}\nIP: ${ip}\nBrowser/dispozitiv: ${userAgent}\nOra: ${acumFormatat}\n\nVerifică Jurnal Audit → card Alerte Securitate Admin.`;
                    await trimiteAlertaSecuritate({
                        supabaseAdmin,
                        tip: 'dispozitiv_necunoscut',
                        referinta: `${userId}:${ip}`,
                        subiect,
                        corpText,
                    });
                } else {
                    await supabaseAdmin
                        .from('auth_dispozitive_cunoscute')
                        .update({ ultima_vazut: new Date().toISOString() })
                        .eq('id', dispozitivExistent.id);
                }
            }
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[alerta-securitate-login] eroare', err);
        return res.status(200).json({ ok: false });
    }
}
