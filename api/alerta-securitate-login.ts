// api/alerta-securitate-login.ts
// Endpoint public (fără autentificare, apelat fire-and-forget din useAuth
// imediat după signInWithPassword) — înregistrează fiecare tentativă de
// login și declanșează alertele de securitate:
//   1. 5+ login-uri eșuate în 15 minute pe același email/username (brute-force)
//   2. login admin (ADMIN_CLUB/SUPER_ADMIN_FEDERATIE) de pe IP+browser
//      nemaivăzut pentru acel cont (dispozitiv necunoscut) -> email la super-admini
//   3. login de pe un browser nemaivăzut pentru cont -> email către titularul contului
//
// Orice date despre utilizator (userId, email destinatar) se iau din tokenul de
// sesiune (Bearer) verificat server-side, NU din body: endpoint-ul e public.
//
// A 10-a funcție Vercel din 12 permise pe planul Hobby (vezi interfaces din
// PLAN.md) — nu necesită consolidare acum.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { checkRateLimit, getClientIp } from './_rateLimit.js';
import { trimiteAlertaSecuritate, trimiteEmailUtilizator } from './_mailerSecuritate.js';
import { cautaGeoIp, formateazaGeoIp } from './_geoIp.js';

const MAX_EMAILURI_DISPOZITIV_NOU_PE_ORA = 3;
const RETENTIE_DISPOZITIVE_ZILE = 90;

/** Utilizatorul (id + email) al tokenului Bearer, doar dacă id-ul coincide cu `userId` din body. */
async function utilizatorDinSesiune(supabaseAdmin: any, req: VercelRequest, userId: string): Promise<{ id: string; email: string | null } | null> {
    const auth = (req.headers['authorization'] as string) || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user || data.user.id !== userId) return null;
    return { id: data.user.id, email: data.user.email ?? null };
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
        // Sesiunea se verifică ÎNAINTE de orice scriere: user_id din body nu e de încredere.
        const utilizator = reusit && typeof userId === 'string' && userId
            ? await utilizatorDinSesiune(supabaseAdmin, req, userId)
            : null;
        if (reusit && userId && !utilizator) {
            console.warn('[alerta-securitate-login] sesiune neverificata pentru userId din body: se omit urmarirea dispozitivelor si alertele');
        }

        await supabaseAdmin.from('auth_tentative_login').insert({
            email_folosit: emailLower,
            ip,
            user_agent: userAgent,
            reusit,
            user_id: utilizator ? utilizator.id : null,
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
        } else if (utilizator) {
            const { data: roluriRows } = await supabaseAdmin
                .from('utilizator_roluri_multicont')
                .select('rol_denumire')
                .eq('user_id', utilizator.id);

            const roluri = roluriRows || [];
            const esteAdmin = roluri.some((r: any) => r.rol_denumire === 'ADMIN_CLUB' || r.rol_denumire === 'SUPER_ADMIN_FEDERATIE');
            const uaHash = createHash('sha256').update(userAgent).digest('hex');

            // Înainte de insert: câte dispozitive are contul și dacă browserul (UA) a mai fost văzut, de pe orice IP.
            // Pe rețele mobile IP-ul se schimbă des; UA nemaivăzut e semnalul pentru email către titular.
            const { data: dispozitiveCont } = await supabaseAdmin
                .from('auth_dispozitive_cunoscute')
                .select('user_agent_hash')
                .eq('user_id', utilizator.id);
            const areDispozitive = (dispozitiveCont || []).length > 0;
            const uaCunoscut = (dispozitiveCont || []).some((d: any) => d.user_agent_hash === uaHash);

            // Insert atomic: UNIQUE (user_id, ip, user_agent_hash). La cereri concurente doar una reușește => un singur email.
            const { error: insertErr } = await supabaseAdmin.from('auth_dispozitive_cunoscute').insert({
                user_id: utilizator.id,
                ip,
                user_agent_hash: uaHash,
            });

            if (insertErr && insertErr.code === '23505') {
                // Combinația IP+browser e deja cunoscută.
                await supabaseAdmin
                    .from('auth_dispozitive_cunoscute')
                    .update({ ultima_vazut: new Date().toISOString() })
                    .eq('user_id', utilizator.id)
                    .eq('ip', ip)
                    .eq('user_agent_hash', uaHash);
            } else if (insertErr) {
                // Fără rând înregistrat nu trimitem nimic (altfel alerta ar reveni la fiecare login).
                console.error('[alerta-securitate-login] insert dispozitiv esuat', insertErr);
            } else {
                // Dispozitiv (IP+browser) nou. Curățare: ștergem intrările vechi ale contului.
                const limitaRetentie = new Date(Date.now() - RETENTIE_DISPOZITIVE_ZILE * 24 * 60 * 60 * 1000).toISOString();
                await supabaseAdmin
                    .from('auth_dispozitive_cunoscute')
                    .delete()
                    .eq('user_id', utilizator.id)
                    .lt('ultima_vazut', limitaRetentie);

                // Email către titular: doar pentru browser nemaivăzut și doar dacă contul avea deja dispozitive.
                // Destinatarul e emailul contului din sesiune, nu cel din body.
                if (areDispozitive && !uaCunoscut && utilizator.email) {
                    // Limită partajată între instanțe serverless: numărăm rândurile noi din ultima oră în DB.
                    const acumMinus1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                    const { count: noiUltimaOra } = await supabaseAdmin
                        .from('auth_dispozitive_cunoscute')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', utilizator.id)
                        .gte('prima_vazut', acumMinus1h);
                    if ((noiUltimaOra || 0) <= MAX_EMAILURI_DISPOZITIV_NOU_PE_ORA) {
                        const geo = formateazaGeoIp(await cautaGeoIp(ip));
                        const uaAfisat = userAgent.slice(0, 200);
                        await trimiteEmailUtilizator(
                            utilizator.email,
                            'PhiHau: autentificare de pe un dispozitiv nou',
                            `Contul tău a fost folosit de pe un browser sau dispozitiv pe care nu le-am mai văzut.\n\nBrowser/dispozitiv: ${uaAfisat}\nIP: ${ip}\n${geo}\nOra: ${acumFormatat}\n\nDacă ai fost tu, nu trebuie să faci nimic.\nDacă nu ai fost tu: intră în cont, deschide Setări cont → „Deconectează de pe toate dispozitivele” și schimbă parola.`
                        );
                    }
                }

                if (esteAdmin) {
                    const rolGasit = roluri.map((r: any) => r.rol_denumire).join(', ') || 'necunoscut';

                    // Nume + prenume din sportivi (fallback: emailul contului).
                    let numeAfisat = utilizator.email || emailLower;
                    try {
                        const { data: sportiv } = await supabaseAdmin
                            .from('sportivi')
                            .select('nume, prenume')
                            .eq('user_id', utilizator.id)
                            .limit(1)
                            .maybeSingle();
                        const nc = [sportiv?.nume, sportiv?.prenume].filter(Boolean).join(' ').trim();
                        if (nc) numeAfisat = nc;
                    } catch {
                        // fallback pe email
                    }

                    const geoText = formateazaGeoIp(await cautaGeoIp(ip));
                    const subiect = 'Alertă securitate PhiHau: login admin de pe dispozitiv necunoscut';
                    const corpText = `Cont admin autentificat de pe o combinație IP+browser nemaivăzută.\n\nUtilizator: ${numeAfisat}\nRol: ${rolGasit}\nIP: ${ip}\n${geoText}\nBrowser/dispozitiv: ${userAgent}\nOra: ${acumFormatat}\n\nVerifică Jurnal Audit → card Alerte Securitate Admin.`;
                    await trimiteAlertaSecuritate({
                        supabaseAdmin,
                        tip: 'dispozitiv_necunoscut',
                        referinta: `${utilizator.id}:${ip}`,
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
