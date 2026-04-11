import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableInfo() {
    console.log('--- Inspectare sesiuni_examene ---');
    
    // Query information_schema via RPC or raw query if possible
    // Since I can't run raw SQL easily via supabase-js without an RPC, 
    // I'll try to fetch one record to see the columns.
    const { data: sample, error } = await supabase.from('sesiuni_examene').select('*').limit(1);
    
    if (error) {
        console.error('Eroare la preluarea datelor:', error.message);
    } else {
        console.log('Coloane detectate:', Object.keys(sample[0] || {}));
        console.log('Exemplu date:', sample[0]);
    }

    // Check if 'nume' column exists
    if (sample[0] && 'nume' in sample[0]) {
        console.log('Coloana "nume" EXISTA.');
    } else {
        console.log('Coloana "nume" NU EXISTA in sesiuni_examene. Poate este stocata in alt tabel sau campul se numeste altfel (ex: descriere).');
    }
}

checkTableInfo();
