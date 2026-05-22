import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { club_id, limit = '50', status, tip } = req.query as Record<string, string>;
  if (!club_id) return res.status(400).json({ error: 'club_id este obligatoriu' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "Serverul nu este configurat corect: VITE_SUPABASE_URL lipsește." });
  }
  if (!supabaseServiceRoleKey) {
    return res.status(500).json({ error: "Serverul nu este configurat corect: SUPABASE_SERVICE_ROLE_KEY lipsește." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const parsedLimit = parseInt(limit, 10);
  const safeLimit = (!isNaN(parsedLimit) && parsedLimit > 0) ? Math.min(parsedLimit, 200) : 50;

  let query = supabase
    .from('sms_queue')
    .select('id, sportiv_id, telefon, mesaj, tip, status, retry_count, sent_at, delivered_at, error_message, created_at')
    .eq('club_id', club_id)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (status) query = query.eq('status', status);
  if (tip) query = query.eq('tip', tip);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}
