import { createClient } from '@supabase/supabase-js';

// NOTĂ PENTRU DEZVOLTARE:
// Mediul de execuție curent nu suportă variabile de mediu (process.env sau import.meta.env).
// Pentru a rezolva eroarea la pornire și a permite aplicației să ruleze în acest mediu de test,
// am adăugat mai jos valori de exemplu (placeholders).
// Acestea trebuie înlocuite cu URL-ul și cheia ANONIMĂ (publică) din proiectul real Supabase
// sau, mai bine, restaurată logica de citire din process.env într-un mediu care o suportă (ex: Vercel, Vite dev server).

const supabaseUrl = 'https://gkqhayxwyecefdvvoqeb.supabase.co'; // EXEMPLU: Înlocuiește cu URL-ul tău Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdWhheXh3eWVjZWZkdnZvcWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDQ0NTEyMDcsImV4cCI6MTk1OTAyNzIwN30.i--0_6_4ve32b_N5S758iQ_3aQ59s2cW1j2h2A-4-Yc'; // EXEMPLU: Înlocuiește cu cheia ta Anon

export const supabase = createClient(supabaseUrl, supabaseAnonKey);