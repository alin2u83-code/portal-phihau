import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing URL or Key');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles:', error ? error.message : 'exists');
  
  const { data: sData, error: sError } = await supabase.from('sportivi').select('*').limit(1);
  console.log('Sportivi:', sError ? sError.message : 'exists');
}
check();
