// Acest script este destinat să fie rulat într-un mediu Node.js pentru a testa politicile RLS.
// Asigurați-vă că aveți `dotenv` și `@supabase/supabase-js` instalate.
// Creați un fișier `.env` cu SUPABASE_URL și SUPABASE_ANON_KEY.

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// --- CONFIGURARE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Eroare: SUPABASE_URL sau SUPABASE_ANON_KEY lipsesc din .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
    console.log("--- Începere Testare RLS (Sistem Multi-Cont) ---");

    try {
        // 1. Testăm conexiunea și contextul de autentificare
        // Folosim funcția RPC corectată recent (SECURITY DEFINER)
        const { data: authContext, error: authError } = await supabase
            .rpc('get_user_auth_context');

        if (authError) {
            console.error("Eroare la obținerea contextului de autentificare:", authError.message);
            console.log("Sfat: Verifică dacă funcția get_user_auth_context a fost creată cu SECURITY DEFINER.");
        } else {
            console.log("Context Autentificare:", authContext);
        }

        // 2. Testăm accesul la Modulul Evenimente (Program Antrenamente)
        // Verificăm dacă putem citi programul fără a declanșa eroarea 'table users'
        console.log("\n--- Testare Modul Evenimente (Program Antrenamente) ---");
        const { data: programe, error: errPrograme } = await supabase
            .from('program_antrenamente')
            .select('*')
            .limit(5);

        if (errPrograme) {
            console.error("Eroare RLS program_antrenamente:", errPrograme.message);
            if (errPrograme.message.includes('users')) {
                console.error("!!! ALERTĂ: Încă există o politică sau un trigger care caută tabelul 'users'.");
            }
        } else {
            console.log(`Succes! Am preluat ${programe.length} înregistrări din program.`);
        }

        // 3. Testăm Modulul Sportivi (Prezență Antrenament)
        console.log("\n--- Testare Modul Sportivi (Prezență Antrenament) ---");
        const { data: prezente, error: errPrezente } = await supabase
            .from('prezenta_antrenament')
            .select('id, sportiv_id, data_prezenta')
            .limit(5);

        if (errPrezente) {
            console.error("Eroare RLS prezenta_antrenament:", errPrezente.message);
        } else {
            console.log(`Succes! Am preluat ${prezente.length} înregistrări de prezență.`);
        }

    } catch (err) {
        console.error("Eroare neașteptată în timpul execuției:", err);
    }
}

// Executăm testele
runTests();