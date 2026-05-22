import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { club_id, limit = '50', status, tip } = req.query as Record<string, string>;
  if (!club_id) return res.status(400).json({ error: 'club_id este obligatoriu' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('sms_queue')
    .select('id, sportiv_id, telefon, mesaj, tip, status, retry_count, sent_at, delivered_at, error_message, created_at')
    .eq('club_id', club_id)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit), 200));

  if (status) query = query.eq('status', status);
  if (tip) query = query.eq('tip', tip);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}
