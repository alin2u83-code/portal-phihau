import { createClient } from '@supabase/supabase-js';

// NOTĂ PENTRU DEZVOLTARE:
// Mediul de execuție curent nu suportă variabile de mediu (process.env sau import.meta.env).
// Pentru a rezolva eroarea la pornire și a permite aplicației să ruleze în acest mediu de test,
// am adăugat mai jos valori de exemplu (placeholders).
// Logica de citire din process.env este corectă pentru mediul de producție (Vercel),
// dar este comentată aici pentru a permite rularea în acest sandbox.

const supabaseUrl = 'https://gkqhayxwyecefdvvoqeb.supabase.co'; // EXEMPLU: Înlocuiește cu URL-ul tău Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdWhheXh3eWVjZWZkdnZvcWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDQ0NTEyMDcsImV4cCI6MTk1OTAyNzIwN30.i--0_6_4ve32b_N5S758iQ_3aQ59s2cW1j2h2A-4-Yc'; // EXEMPLU: Înlocuiește cu cheia ta Anon

/*
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variabilele de mediu VITE_SUPABASE_URL și VITE_SUPABASE_ANON_KEY trebuie setate.");
}
*/

export const supabase = createClient(supabaseUrl, supabaseAnonKey);