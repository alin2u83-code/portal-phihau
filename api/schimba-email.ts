import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Serverul nu este configurat corect.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { user_id, new_email } = req.body;

  if (!user_id || !new_email) {
    return res.status(400).json({ error: 'user_id și new_email sunt obligatorii.' });
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
