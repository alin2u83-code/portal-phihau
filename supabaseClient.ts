import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  const activeClubId = localStorage.getItem('phi-hau-global-club-filter');
  const cleanedClubId = activeClubId ? activeClubId.replace(/"/g, '') : '';

  const headers: Record<string, string> = {};
  
  // Adăugăm header-ul DOAR dacă avem un ID valid. 
  // Asta previne eroarea de Postgres: invalid input syntax for type uuid: ""
  if (cleanedClubId) {
    headers['active-role-context-id'] = cleanedClubId;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: headers,
    },
  });
} else {
  console.warn("Variabilele de mediu Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) nu sunt setate. Clientul Supabase nu a fost initializat.");
}

if (!supabaseInstance) {
  throw new Error("Supabase client is not initialized. Please check your environment variables.");
}

export const supabase = supabaseInstance as SupabaseClient;


