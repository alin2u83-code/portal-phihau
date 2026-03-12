import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase environment variables for server.");
    return res.status(500).json({ error: "Serverul nu este configurat corect." });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { email, password, userData, roles } = req.body;

  try {
    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });

    if (authError) throw authError;

    // 2. Assign roles via RPC
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userData.familie_id && !uuidRegex.test(userData.familie_id)) {
        return res.status(400).json({ error: 'familie_id invalid.' });
    }

    const { error: rpcError } = await supabaseAdmin.rpc('refactor_create_user_account', {
      p_nume: userData.nume,
      p_prenume: userData.prenume,
      p_email: email,
      p_username: userData.username || null,
      p_club_id: userData.club_id || null,
      p_roles: roles,
      p_user_id: authData.user.id,
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

    return res.status(200).json({ success: true, userId: authData.user.id });
  } catch (error: any) {
    console.error("Error creating account:", error);
    return res.status(500).json({ error: error.message });
  }
}
