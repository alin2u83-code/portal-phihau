import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from './_rateLimit.js';
import { autentificaApelant } from './_autentificareApelant.js';
import { esteFederatie, valideazaCerereAprobare, proceseazaCerereAcces } from './_aprobaCerereAcces.js';

// Faza 36 (D-05): federația aprobă/respinge cereri de cont pentru acces extern la competiții.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rateLimitResult = checkRateLimit(`aproba-cerere-acces:${getClientIp(req)}`, { windowMs: 60000, maxRequests: 30 });
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'Prea multe cereri. Reîncercați peste un minut.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Serverul nu este configurat corect: VITE_SUPABASE_URL lipsește.' });
  }
  if (!supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Serverul nu este configurat corect: SUPABASE_SERVICE_ROLE_KEY lipsește.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Autentificare + autorizare ÎNAINTE de orice citire/scriere (T-36-23).
  const apelant = await autentificaApelant(supabaseAdmin, req.headers.authorization);
  if (!apelant.data) {
    return res.status(apelant.status ?? 401).json({ error: apelant.error });
  }
  if (!esteFederatie(apelant.data.callerRoles)) {
    return res.status(403).json({ error: 'Doar federația poate procesa cereri de acces.' });
  }

  const validare = valideazaCerereAprobare(req.body);
  if (validare.ok === false) {
    return res.status(400).json({ error: validare.error });
  }

  const rezultat = await proceseazaCerereAcces(supabaseAdmin, {
    ...validare.value,
    callerId: apelant.data.callerId, // doar din token, niciodată din body
  });

  if (!rezultat.ok) {
    return res.status(rezultat.status).json({ success: false, error: rezultat.error });
  }
  return res.status(rezultat.status).json({
    success: true,
    userId: rezultat.userId,
    userNou: rezultat.userNou,
    avertisment: rezultat.avertisment,
  });
}
