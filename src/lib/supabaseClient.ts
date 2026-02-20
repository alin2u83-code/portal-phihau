import { createClient } from '@supabase/supabase-js';

// Folosim process.env în loc de import.meta.env pentru compatibilitate
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // În producție, am putea dori să nu aruncăm o eroare, ci să afișăm o pagină de eroare
  // Dar pentru dezvoltare, este mai bine să eșuăm rapid.
  console.error('Supabase URL and Anon Key must be defined in .env file');
  // Simulează o eroare pentru a opri execuția dacă variabilele nu sunt setate
  throw new Error('Supabase configuration is missing.'); 
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
