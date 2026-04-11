import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertion() {
    console.log('--- Simulare Inserare Sesiune Examen ---');

    // 1. Validarea numelui sesiunii (doar 'Vara' sau 'Iarna')
    // Nota: Daca nu exista o constrangere CHECK in DB, aceasta va trece.
    const invalidSessionName = {
        data: '2026-06-15',
        locatie_id: '00000000-0000-0000-0000-000000000000', // UUID invalid (nu exista)
        club_id: null,
        comisia: ['Membru 1'],
        nume: 'Primavara' // Nume invalid conform cerintei
    };

    console.log('Test 1: Inserare cu nume invalid si UUID inexistent...');
    const { data, error } = await supabase
        .from('sesiuni_examene')
        .insert(invalidSessionName)
        .select();

    if (error) {
        console.error('Eroare detectata:', error.message);
        console.error('Cod eroare:', error.code);
        
        if (error.code === '23503') {
            console.log('Explicatie: Constrangere de Foreign Key (FK) incalcata. UUID-ul pentru locatie_id sau club_id nu exista in tabelele parinte.');
        } else if (error.code === '23514') {
            console.log('Explicatie: Constrangere CHECK incalcata. Probabil numele sesiunii nu este "Vara" sau "Iarna".');
        } else if (error.code === '22007') {
            console.log('Explicatie: Formatul datei este invalid.');
        }
    } else {
        console.log('Inserare reusita (Atentie: Inseamna ca nu exista constrangeri stricte in DB pentru aceste campuri!):', data);
    }
}

testInsertion();
