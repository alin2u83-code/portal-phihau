import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: Request, res: Response) {
    const { data: sportiv } = await supabase.from('sportivi').select('*, cluburi(*)').ilike('nume', '%Ioniță%').single();
    const { data: sesiune } = await supabase.from('sesiuni_examene').select('*').eq('status', 'Activ').single();
    
    res.json({ sportiv, sesiune });
}
