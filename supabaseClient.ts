import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
    const activeClubId = localStorage.getItem('phi-hau-global-club-filter');
    const cleanedClubId = activeClubId ? activeClubId.replace(/"/g, '') : '';

    const headers = new Headers(options?.headers);
    if (cleanedClubId) {
      headers.set('active-role-context-id', cleanedClubId);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: customFetch,
    },
  });
} else {
  console.warn("Variabilele de mediu Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) nu sunt setate. Clientul Supabase nu a fost initializat.");
}

if (!supabaseInstance) {
  throw new Error("Supabase client is not initialized. Please check your environment variables.");
}

export const supabase = supabaseInstance as SupabaseClient;


