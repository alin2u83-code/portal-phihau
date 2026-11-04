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
import { trimiteAlertaSecuritate, trimiteEmailUtilizator } from './_mailerSecuritate.js';
import { cautaGeoIp, formateazaGeoIp } from './_geoIp.js';

// userId din body e furnizat de client: îl acceptăm doar dacă tokenul de sesiune (Bearer) aparține aceluiași utilizator.
async function sesiuneApartineUtilizatorului(supabaseAdmin: any, req: VercelRequest, userId: string): Promise<boolean> {
    const auth = (req.headers['authorization'] as string) || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return false;
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return !error && data?.user?.id === userId;
}

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
                const geoText = formateazaGeoIp(await cautaGeoIp(ip));
                const subiect = 'Alertă securitate PhiHau: 5+ login-uri eșuate în 15 minute';
                const corpText = `S-au înregistrat ${count} login-uri eșuate în ultimele 15 minute pentru contul: ${emailLower}\n\nIP: ${ip}\n${geoText}\nBrowser/dispozitiv: ${userAgent}\nOra: ${acumFormatat}\n\nVerifică Jurnal Audit → card Alerte Securitate Admin.`;
                await trimiteAlertaSecuritate({
                    supabaseAdmin,
                    tip: 'login_esuat_burst',
                    referinta: emailLower,
                    subiect,
                    corpText,
                });
            }
        } else if (userId && await sesiuneApartineUtilizatorului(supabaseAdmin, req, userId)) {
            const { data: roluriRows } = await supabaseAdmin
                .from('utilizator_roluri_multicont')
                .select('rol_denumire')
                .eq('user_id', userId);

            const roluri = roluriRows || [];
            const esteAdmin = roluri.some((r: any) => r.rol_denumire === 'ADMIN_CLUB' || r.rol_denumire === 'SUPER_ADMIN_FEDERATIE');

            // Dispozitive urmărite pentru toți utilizatorii: titularul primește email la dispozitiv nou,
            // super-adminii primesc alerta doar pentru conturi de admin.
            const uaHash = createHash('sha256').update(userAgent).digest('hex');

            const { data: dispozitivExistent } = await supabaseAdmin
                .from('auth_dispozitive_cunoscute')
                .select('id')
                .eq('user_id', userId)
                .eq('ip', ip)
                .eq('user_agent_hash', uaHash)
                .maybeSingle();

            if (dispozitivExistent) {
                await supabaseAdmin
                    .from('auth_dispozitive_cunoscute')
                    .update({ ultima_vazut: new Date().toISOString() })
                    .eq('id', dispozitivExistent.id);
            } else {
                const { count: dispozitiveAnterioare } = await supabaseAdmin
                    .from('auth_dispozitive_cunoscute')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId);

                await supabaseAdmin.from('auth_dispozitive_cunoscute').insert({
                    user_id: userId,
                    ip,
                    user_agent_hash: uaHash,
                });

                // Primul dispozitiv al contului nu declanșează email către titular (nu există "obișnuit" față de care să fie nou).
                if ((dispozitiveAnterioare || 0) > 0 && emailLower.includes('@')) {
                    const rl = checkRateLimit(`alerta-dispozitiv-nou:user:${userId}`, { windowMs: 60 * 60 * 1000, maxRequests: 3 });
                    if (rl.allowed) {
                        const geo = formateazaGeoIp(await cautaGeoIp(ip));
                        await trimiteEmailUtilizator(
                            emailLower,
                            'PhiHau: autentificare de pe un dispozitiv nou',
                            `Contul tău a fost folosit de pe un dispozitiv sau o rețea pe care nu le-am mai văzut.

Browser/dispozitiv: ${userAgent}
IP: ${ip}
${geo}
Ora: ${acumFormatat}

Dacă ai fost tu, nu trebuie să faci nimic.
Dacă nu ai fost tu: intră în cont, deschide Setări cont → „Deconectează de pe toate dispozitivele” și schimbă parola.`
                        );
                    }
                }

                if (esteAdmin) {
                    const rolGasit = roluri.map((r: any) => r.rol_denumire).join(', ') || 'necunoscut';

                    // Nume + prenume din sportivi (fallback: emailul folosit la login).
                    let numeAfisat = emailLower;
                    try {
                        const { data: sportiv } = await supabaseAdmin
                            .from('sportivi')
                            .select('nume, prenume')
                            .eq('user_id', userId)
                            .limit(1)
                            .maybeSingle();
                        const nc = [sportiv?.nume, sportiv?.prenume].filter(Boolean).join(' ').trim();
                        if (nc) numeAfisat = nc;
                    } catch {
                        // fallback pe email
                    }

                    const geoText = formateazaGeoIp(await cautaGeoIp(ip));
                    const subiect = 'Alertă securitate PhiHau: login admin de pe dispozitiv necunoscut';
                    const corpText = `Cont admin autentificat de pe o combinație IP+browser nemaivăzută.

Utilizator: ${numeAfisat}
Rol: ${rolGasit}
IP: ${ip}
${geoText}
Browser/dispozitiv: ${userAgent}
Ora: ${acumFormatat}

Verifică Jurnal Audit → card Alerte Securitate Admin.`;
                    await trimiteAlertaSecuritate({
                        supabaseAdmin,
                        tip: 'dispozitiv_necunoscut',
                        referinta: `${userId}:${ip}`,
                        subiect,
                        corpText,
                    });
                }
            }
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[alerta-securitate-login] eroare', err);
        return res.status(200).json({ ok: false });
    }
}
