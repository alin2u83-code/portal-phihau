import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from './_rateLimit.js';
import { autentificaApelant, incarcaTintaCont } from './_autentificareApelant.js';
import { verificaPermisiuneModificareCont } from './_permisiuniCont.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit — endpoint-ul rula anterior neautentificat, cu SERVICE_ROLE_KEY.
  const rateLimitResult = checkRateLimit(`account:${getClientIp(req)}`, { windowMs: 60000, maxRequests: 30 });
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Prea multe cereri. Reîncercați peste un minut.', reincercabil: true });
  }

  const action = req.query.action as string;
  if (action === 'email') return handleEmail(req, res);
  if (action === 'username') return handleUsername(req, res);
  return res.status(400).json({ error: 'action invalid (email|username)' });
}

async function handleEmail(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Serverul nu este configurat corect.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: apelant, status: authStatus, error: authError } = await autentificaApelant(supabaseAdmin, req.headers.authorization);
  if (!apelant) {
    return res.status(authStatus!).json({ error: authError });
  }

  const { user_id, new_email } = req.body;

  if (!user_id || typeof user_id !== 'string' || !new_email || typeof new_email !== 'string' || !new_email.includes('@')) {
    return res.status(400).json({ error: 'user_id și new_email sunt obligatorii.' });
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
    permiteSine: true,
  });
  if (permisiune.permis === false) {
    return res.status(permisiune.status).json({ error: permisiune.error });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      email: new_email,
      email_confirm: true,
    });

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleUsername(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Serverul nu este configurat corect.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: apelant, status: authStatus, error: authError } = await autentificaApelant(supabaseAdmin, req.headers.authorization);
  if (!apelant) {
    return res.status(authStatus!).json({ error: authError });
  }

  const { user_id, username } = req.body;

  if (!user_id || typeof user_id !== 'string' || !username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'user_id și username sunt obligatorii.' });
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
    permiteSine: true,
  });
  if (permisiune.permis === false) {
    return res.status(permisiune.status).json({ error: permisiune.error });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      user_metadata: { username },
    });

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: error.message });
  }
}
