import { createClient } from '@supabase/supabase-js';

// În aplicațiile Vite, variabilele de mediu sunt expuse pe `import.meta.env`.
// Utilizarea `process.env` este incorectă pe client-side și va eșua în build-ul de producție.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabase;

if (supabaseUrl && supabaseAnonKey) {
    // Ramura corectă pentru un mediu VITE configurat (ex: cu fișier .env.local sau variabile setate în Vercel/Netlify)
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    // Soluție de avarie pentru mediul de testare unde variabilele de mediu nu sunt disponibile.
    console.warn(`
        ************************************************************************
        ATENȚIE: Variabilele de mediu VITE_SUPABASE_URL și VITE_SUPABASE_ANON_KEY
        nu au fost găsite. Se folosesc chei de rezervă.
        
        Dacă întâmpinați erori de tip "Failed to fetch", cel mai probabil
        aceste chei de rezervă nu mai sunt valide.
        
        Asigurați-vă că ați înlocuit valorile de mai jos cu cele din
        proiectul DVS. Supabase pentru ca aplicația să funcționeze corect.
        ************************************************************************
    `);
    const tempSupabaseUrl = 'https://wuhidifzsutwgdfkwhmd.supabase.co'; // URL furnizat de utilizator

    // Cheia anonimă publică (anon key) corectă pentru proiectul Supabase.
    const tempSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1aGlkaWZ6c3V0d2dkZmt3aG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzY3NDgsImV4cCI6MjA4MzQ1Mjc0OH0.Dfq-DBnYlP5-Qo9bKF_FlS8Boc27pSsKCfqYpWV1fnI'; 
    supabase = createClient(tempSupabaseUrl, tempSupabaseAnonKey);
}

export { supabase };
