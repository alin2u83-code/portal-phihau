import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from './_rateLimit.js';
import { autentificaApelant, incarcaTintaCont } from './_autentificareApelant.js';
import { verificaPermisiuneModificareCont } from './_permisiuniCont.js';
import { valideazaParola } from '../utils/parola.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit — endpoint-ul rula anterior neautentificat, cu SERVICE_ROLE_KEY.
  const rateLimitResult = checkRateLimit(`reset-parola:${getClientIp(req)}`, { windowMs: 60000, maxRequests: 10 });
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Prea multe cereri. Reîncercați peste un minut.', reincercabil: true });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Serverul nu este configurat corect.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Autentificare apelant — oricine cunoștea un user_id putea seta parola
  // oricărui cont, inclusiv SUPER_ADMIN_FEDERATIE, înainte de acest fix.
  const { data: apelant, status: authStatus, error: authError } = await autentificaApelant(supabaseAdmin, req.headers.authorization);
  if (!apelant) {
    return res.status(authStatus!).json({ error: authError });
  }

  const { user_id, parola_noua } = req.body;

  if (!user_id || typeof user_id !== 'string' || !parola_noua || typeof parola_noua !== 'string') {
    return res.status(400).json({ error: 'user_id și parola_noua sunt obligatorii.' });
  }

  const validare = valideazaParola(parola_noua);
  if (!validare.valid) {
    return res.status(400).json({ error: validare.mesaj });
  }

  const { data: tinta, error: tintaError } = await incarcaTintaCont(supabaseAdmin, user_id);
  if (!tinta) {
    return res.status(500).json({ error: tintaError });
  }

  const permisiune = verificaPermisiuneModificareCont({
    callerId: apelant.callerId,
    callerRoles: apelant.callerRoles,
    tintaUserId: user_id,
    tintaRoles: tinta.tintaRoles,
    cluburiTinta: tinta.cluburiTinta,
    permiteSine: false,
  });
  if (permisiune.permis === false) {
    return res.status(permisiune.status).json({ error: permisiune.error });
  }

  try {
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: parola_noua,
    });

    if (authUpdateError) throw authUpdateError;

    // Marchează că sportivul trebuie să-și schimbe parola la prima autentificare
    const { error: dbError } = await supabaseAdmin
      .from('sportivi')
      .update({ trebuie_schimbata_parola: true })
      .eq('user_id', user_id);

    if (dbError) {
      console.warn('Nu s-a putut seta trebuie_schimbata_parola:', dbError.message);
      // Nu eșuăm complet — parola a fost resetată cu succes
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: error.message });
  }
}
