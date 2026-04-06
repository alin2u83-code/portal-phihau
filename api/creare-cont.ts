import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "Serverul nu este configurat corect: VITE_SUPABASE_URL lipsește." });
  }
  if (!supabaseServiceRoleKey) {
    return res.status(500).json({ error: "Serverul nu este configurat corect: SUPABASE_SERVICE_ROLE_KEY lipsește." });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { email, password, userData, roles } = req.body;

  try {
    // 1. Create user in auth.users (sau preia user-ul existent dacă emailul e deja înregistrat)
    let userId: string;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });

    if (authError) {
      // Dacă emailul există deja în auth.users, preia user_id-ul existent
      const isAlreadyRegistered =
        authError.message?.toLowerCase().includes('already been registered') ||
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists');

      if (!isAlreadyRegistered) throw authError;

      // Caută user-ul existent în sportivi după email
      const { data: existingSportiv, error: findError } = await supabaseAdmin
        .from('sportivi')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (findError) throw findError;
      if (!existingSportiv?.user_id) {
        throw new Error(`Emailul ${email} există în autentificare dar nu are un profil sportiv asociat. Contactați administratorul.`);
      }

      userId = existingSportiv.user_id;
    } else {
      userId = authData.user.id;
    }

    // 2. Assign roles via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('refactor_create_user_account', {
      p_nume: userData.nume,
      p_prenume: userData.prenume,
      p_email: email,
      p_username: userData.username || null,
      p_club_id: userData.club_id || null,
      p_roles: roles,
      p_user_id: userId,
      p_additional_data: {
        data_nasterii: userData.data_nasterii,
        cnp: userData.cnp,
        gen: userData.gen,
        telefon: userData.telefon,
        adresa: userData.adresa,
        grad_actual_id: userData.grad_actual_id,
        grupa_id: userData.grupa_id
      }
    });

    if (rpcError) throw rpcError;

    res.json({ success: true, userId });
  } catch (error: any) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: error.message });
  }
}
