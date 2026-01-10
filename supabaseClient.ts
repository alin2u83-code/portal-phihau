import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
  });
} else {
  console.warn("Variabilele de mediu Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) nu sunt setate. Clientul Supabase nu a fost initializat.");
}

export const supabase = supabaseInstance;