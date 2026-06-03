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

  const { user_id, parola_noua } = req.body;

  if (!user_id || !parola_noua) {
    return res.status(400).json({ error: 'user_id și parola_noua sunt obligatorii.' });
  }

  if (parola_noua.length < 8) {
    return res.status(400).json({ error: 'Parola trebuie să aibă cel puțin 8 caractere.' });
  }

  try {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: parola_noua,
    });

    if (authError) throw authError;

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
