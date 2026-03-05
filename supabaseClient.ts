import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  // Custom fetch wrapper to inject headers from localStorage
  const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    
    // Inject active-role-context-id if available
    const activeRoleContextId = localStorage.getItem('active-role-context-id');
    if (activeRoleContextId) {
      headers.set('active-role-context-id', activeRoleContextId);
    }

    return fetch(url, { ...options, headers });
  };

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
      fetch: customFetch,
    },
  });
} else {
  console.warn("Variabilele de mediu Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) nu sunt setate. Clientul Supabase nu a fost initializat.");
}

export const supabase = supabaseInstance;