import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const activeRoleContextId = localStorage.getItem('phi-hau-active-role-context-id')?.replace(/"/g, '');
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (activeRoleContextId && UUID_REGEX.test(activeRoleContextId)) {
      headers.set('active-role-context-id', activeRoleContextId);
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


