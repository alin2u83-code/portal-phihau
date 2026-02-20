import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Tipuri de Date ---

/**
 * Reprezintă structura unui rând de date procesat din fișierul CSV.
 */
interface CsvRow {
  cnp: string;
  ordine_grad: number;
  rezultat: 'Admis' | 'Respins' | 'Neprezentat';
  contributie: number;
  data_examen: string; // Format 'YYYY-MM-DD'
  comisie?: string; // Opțional, poate fi pe sesiune, nu pe rând
}

/**
 * Reprezintă rezultatul procesării pentru un singur rând.
 */
interface ProcessResult {
  cnp: string;
  status: 'Succes' | 'Eroare' | 'Avertisment';
  message: string;
}

/**
 * Procesează un lot de rezultate de examen dintr-un fișier CSV.
 * Pentru fiecare rând, apelează o funcție RPC din Supabase care rulează ca o tranzacție atomică.
 *
 * @param supabaseAdmin - Un client Supabase inițializat cu `service_role_key` pentru a avea permisiuni administrative.
 * @param csvData - Un array de obiecte, fiecare reprezentând un rând din CSV.
 * @param sesiuneId - UUID-ul sesiunii de examen la care se referă aceste rezultate.
 * @returns Un obiect care conține un flag de succes general și un array cu detaliile procesării pentru fiecare rând.
 */
export async function processExamResults(
    supabaseAdmin: SupabaseClient,
    csvData: CsvRow[],
    sesiuneId: string
): Promise<{ success: boolean; results: ProcessResult[] }> {
    const results: ProcessResult[] = [];
    let hasErrors = false;

    console.log(`Începe procesarea a ${csvData.length} înregistrări pentru sesiunea ${sesiuneId}...`);

    for (const row of csvData) {
        try {
            // Validare de bază a rândului
            if (!row.cnp || !row.ordine_grad || !row.rezultat || !row.data_examen) {
                throw new Error('Rândul este incomplet. Lipsesc date esențiale (cnp, ordine_grad, rezultat, data_examen).');
            }

            // Apelarea funcției RPC care gestionează logica tranzacțională
            const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_exam_row', {
                p_cnp: String(row.cnp),
                p_ordine_grad: Number(row.ordine_grad),
                p_rezultat: row.rezultat,
                p_contributie: Number(row.contributie),
                p_data_examen: row.data_examen,
                p_sesiune_id: sesiuneId,
            });

            if (rpcError) {
                // Erorile aruncate de `RAISE EXCEPTION` în funcția PG sunt prinse aici.
                throw new Error(rpcError.message);
            }
            
            if (typeof rpcResult === 'string' && rpcResult.startsWith('DUPLICATE_IGNORED:')) {
                 results.push({ cnp: row.cnp, status: 'Avertisment', message: rpcResult });
            } else {
                 results.push({ cnp: row.cnp, status: 'Succes', message: rpcResult || 'Procesat.' });
            }

        } catch (error: any) {
            hasErrors = true;
            // Curățarea mesajului de eroare pentru a fi mai lizibil
            const cleanMessage = error.message.replace(/error: /g, '').replace(/hint: .*/, '').trim();
            results.push({ cnp: row.cnp, status: 'Eroare', message: cleanMessage });
        }
    }

    console.log('Procesare finalizată.');
    return { success: !hasErrors, results };
}

/*
--- EXEMPLU DE UTILIZARE ---

// Acest cod ar rula într-un mediu server-side (ex: Supabase Edge Function)

// import { createClient } from '@supabase/supabase-js';
// import { processExamResults } from './import-processor';

// const supabaseAdmin = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// const dateExemplu: CsvRow[] = [
//   {
//     "cnp": "1234567890123",
//     "ordine_grad": 2,
//     "rezultat": "Admis",
//     "contributie": 100,
//     "data_examen": "2026-02-15",
//     "comisie": "Alin Lungu"
//   },
//   {
//     "cnp": "9999999999999", // CNP invalid
//     "ordine_grad": 3,
//     "rezultat": "Admis",
//     "contributie": 120,
//     "data_examen": "2026-02-15"
//   }
// ];

// const SESIUNE_EXAMEN_ID = 'uuid-ul-sesiunii-de-examen';

// (async () => {
//   const { success, results } = await processExamResults(supabaseAdmin, dateExemplu, SESIUNE_EXAMEN_ID);
//   console.log('Rezultat final:', { success });
//   console.table(results);
// })();

*/