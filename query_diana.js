import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: sportiv } = await supabase.from('sportivi').select('*, cluburi(*)').ilike('nume', '%Ioniță%').ilike('prenume', '%Diana%').single();
    if (!sportiv) {
        console.log("Sportiv not found");
        return;
    }
    const { data: sesiune } = await supabase.from('sesiuni_examene').select('*').eq('status', 'Activ').single();
    
    console.log(JSON.stringify({ sportiv, sesiune }, null, 2));
}

run();
