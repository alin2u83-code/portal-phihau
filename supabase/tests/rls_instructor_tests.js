
// Acest script este destinat să fie rulat într-un mediu Node.js pentru a testa politicile RLS.
// Asigurați-vă că aveți `dotenv` și `@supabase/supabase-js` instalate (`npm install dotenv @supabase/supabase-js`).
// Creați un fișier `.env` la rădăcina proiectului cu variabilele de mediu necesare.

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Asigură încărcarea variabilelor de mediu

// --- CONFIGURARE ---
// Scriptul citește aceste valori din fișierul `.env`.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// --- DATE DE TEST ---
// ÎNLOCUIȚI ACESTE VALORI cu date reale din baza de date pentru a rula testele.
const INSTRUCTOR_EMAIL = 'instructor@phihau.ro'; // Email-ul unui utilizator cu rol 'Instructor'
const INSTRUCTOR_PASSWORD = 'password123';
const INSTRUCTOR_CLUB_ID = '3e5513f1-2c78-4363-8a9a-7dc60634f198'; // UUID-ul clubului instructorului
const RIVAL_CLUB_SPORTIV_ID = 'UUID_AL_UNUI_SPORTIV_DIN_ALT_CLUB'; // UUID-ul unui sportiv dintr-un club rival

// Inițializare client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- FUNCȚII DE TESTARE ---

async function runTests() {
    console.log('--- Începerea suitei de teste pentru politici RLS (Rol: Instructor) ---');

    // Pasul 1: Autentificare ca instructor
    console.log(`\n1. Autentificare ca ${INSTRUCTOR_EMAIL}...`);
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: INSTRUCTOR_EMAIL,
        password: INSTRUCTOR_PASSWORD,
    });

    if (signInError) {
        console.error('❌ EROARE la autentificare:', signInError.message);
        console.log('   Asigurați-vă că datele de autentificare și variabilele de mediu sunt corecte.');
        return;
    }
    if (!session) {
        console.error('❌ EROARE: Autentificarea nu a returnat o sesiune validă.');
        return;
    }
    console.log('✅ Autentificare reușită.');

    // Pasul 2: Testare acces la lista de sportivi
    await test_canReadOwnClubAthletes();

    // Pasul 3: Testare acces la plățile sportivilor
    await test_canReadOwnClubPayments();

    // Pasul 4: Testare interdicție acces la sportivi din alte cluburi
    await test_cannotReadRivalAthlete();

    console.log('\n--- Suita de teste a fost finalizată. ---');
    await supabase.auth.signOut();
}

async function test_canReadOwnClubAthletes() {
    console.log('\n2. Test: Poate citi lista de sportivi din propriul club...');
    const { data, error } = await supabase
        .from('sportivi')
        .select('id, nume, prenume, club_id');

    if (error) {
        console.error('❌ EȘUAT: EROARE la citirea sportivilor:', error.message);
        return;
    }

    if (data.length === 0) {
        console.warn('⚠️ AVERTISMENT: Nu s-au găsit sportivi. Testul este neconcludent, dar nu a eșuat. Asigurați-vă că există sportivi în clubul instructorului.');
        return;
    }
    
    const isOk = data.every(sportiv => sportiv.club_id === INSTRUCTOR_CLUB_ID);

    if (isOk) {
        console.log(`✅ SUCCES: A primit ${data.length} sportivi, toți din clubul corect (${INSTRUCTOR_CLUB_ID.slice(0,8)}...).`);
    } else {
        const otherClubs = data.filter(s => s.club_id !== INSTRUCTOR_CLUB_ID).map(s => s.club_id);
        console.error(`❌ EȘUAT: A primit sportivi din alte cluburi: ${[...new Set(otherClubs)].join(', ')}.`);
    }
}

async function test_canReadOwnClubPayments() {
    console.log('\n3. Test: Poate citi plățile doar pentru sportivii din propriul club...');
    // Interogăm plățile și facem JOIN pe `sportivi` pentru a obține `club_id`.
    // RLS pe `plati` ar trebui să permită acest JOIN doar pentru sportivii vizibili.
    const { data, error } = await supabase
        .from('plati')
        .select('id, sportiv_id, sportivi(club_id)');

    if (error) {
        console.error('❌ EȘUAT: EROARE la citirea plăților:', error.message);
        return;
    }

    if (data.length === 0) {
        console.warn('⚠️ AVERTISMENT: Nu s-au găsit plăți. Testul este neconcludent.');
        return;
    }

    const isOk = data.every(plata => {
        // RLS returnează `null` pentru relațiile la care nu are acces.
        // O plată este validă dacă nu are sportiv (ex: plată pe familie) sau dacă sportivul este din clubul corect.
        return !plata.sportivi || plata.sportivi.club_id === INSTRUCTOR_CLUB_ID;
    });

    if (isOk) {
        console.log(`✅ SUCCES: A primit ${data.length} plăți, toate aparținând sportivilor din clubul corect.`);
    } else {
        const otherClubs = data.filter(p => p.sportivi && p.sportivi.club_id !== INSTRUCTOR_CLUB_ID).map(p => p.sportivi.club_id);
        console.error(`❌ EȘUAT: A primit plăți pentru sportivi din alte cluburi: ${[...new Set(otherClubs)].join(', ')}.`);
    }
}

async function test_cannotReadRivalAthlete() {
    console.log(`\n4. Test: NU poate citi un sportiv specific dintr-un club rival...`);
    const { data, error } = await supabase
        .from('sportivi')
        .select('id')
        .eq('id', RIVAL_CLUB_SPORTIV_ID);

    if (error) {
        console.error(`❌ EȘUAT: EROARE neașteptată la interogare: ${error.message}. Politica RLS ar trebui să returneze un set gol, nu o eroare.`);
        return;
    }

    if (data.length === 0) {
        console.log(`✅ SUCCES: Interogarea pentru sportivul rival a returnat un set gol, conform așteptărilor.`);
    } else {
        console.error(`❌ EȘUAT: Politica RLS a permis citirea datelor pentru un sportiv dintr-un club rival. Date primite:`, data);
    }
}

// --- Pornirea testelor ---
if (!SUPABASE_URL || !INSTRUCTOR_EMAIL || !INSTRUCTOR_PASSWORD) {
    console.error("Vă rugăm să completați variabilele de mediu și datele de test din acest script înainte de a rula.");
} else {
    runTests();
}
      