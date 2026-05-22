import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { club_id, sportiv_id, tip, variabile } = req.body;
  if (!club_id || !sportiv_id || !tip) {
    return res.status(400).json({ error: 'club_id, sportiv_id, tip sunt obligatorii' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc('add_sms_to_queue', {
    p_club_id: club_id,
    p_sportiv_id: sportiv_id,
    p_tip: tip,
    p_variabile: variabile ?? {},
  });

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(422).json({ error: 'SMS nu a putut fi programat (template lipsă sau telefon invalid)' });

  return res.json({ queue_id: data });
}
