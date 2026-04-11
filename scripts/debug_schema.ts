import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Table: sesiuni_examene ---');
    const { data: columns, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'sesiuni_examene' });
    if (colError) {
        // Fallback if the RPC doesn't exist
        const { data: cols, error } = await supabase.from('sesiuni_examene').select('*').limit(1);
        if (error) console.error('Error fetching columns:', error);
        else console.log('Columns (from sample data):', Object.keys(cols[0] || {}));
    } else {
        console.log('Columns:', columns);
    }

    console.log('\n--- Constraints: sesiuni_examene ---');
    // We can't easily query information_schema via Supabase JS without an RPC.
    // Let's try to find if there's a check constraint in the code.
}

run();
