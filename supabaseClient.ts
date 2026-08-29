import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fallback pe process.env: import.meta.env.VITE_* există doar sub Vite (browser/build).
// Scripturile Node/tsx (ex. services/facturaService.test.ts) nu au context Vite, deci
// import.meta.env e undefined acolo — fără acest fallback, importul acestui modul ar
// arunca eroare la orice script Node care importă (chiar indirect) un fișier din
// services/ sau hooks/. Nu schimbă nimic în browser: acolo import.meta.env.VITE_* e
// mereu injectat la build-time de Vite, deci fallback-ul nu se activează niciodată.
const viteEnv = (import.meta as any).env;
const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
const supabaseUrl = viteEnv?.VITE_SUPABASE_URL || nodeEnv?.VITE_SUPABASE_URL;
const supabaseAnonKey = viteEnv?.VITE_SUPABASE_ANON_KEY || nodeEnv?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const activeRoleContextId = typeof localStorage !== 'undefined'
      ? localStorage.getItem('phi-hau-active-role-context-id')?.replace(/"/g, '')
      : undefined;
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


