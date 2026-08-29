/**
 * services/facturaService.test.ts
 *
 * Script de test end-to-end pentru anuleazaFacturaAbonament / reactiveazaFacturaAbonament /
 * stergeFacturaAbonament (quick 260829-erg) + cheiePrezenta (hooks/usePrezenteLunare.ts).
 *
 * Proiectul NU are runner de teste configurat (package.json are doar scriptul `lint`,
 * fără vitest/jest) — conform constrângerii „fără librării externe noi", acest fișier
 * NU e un unit test, ci un script `tsx` executabil care rulează scenariile din
 * <behavior> (planul Task 3) pe DB-ul real, folosind facturi de test create și șterse
 * la finalul rulării. Scrie PASS/FAIL pe stdout și iese cu exit code diferit de zero
 * la primul eșec.
 *
 * Rulare:
 *   npx tsx services/facturaService.test.ts
 *
 * Cerințe: `.env` cu VITE_SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY (același `.env`
 * folosit de celelalte scripturi Node din `scripts/`, ex. scripts/audit_rls_faza25.ts).
 *
 * De ce un client separat cu SERVICE_ROLE_KEY: funcțiile din facturaService.ts rulează
 * normal prin clientul aplicației (anon key, RLS activ, scopat pe club prin sesiunea
 * autentificată + header active-role-context-id). Un script Node headless nu are o
 * sesiune de autentificare, deci UPDATE/DELETE prin clientul anon ar fi blocate tăcut
 * de RLS (0 rânduri afectate, fără eroare) — nu ar testa logica de business, ar testa
 * RLS-ul (deja verificat separat, live, în Task 1 prin pg_policies). De aceea toate cele
 * trei funcții acceptă un al doilea parametru opțional `client` (implicit clientul
 * aplicației) — aici injectăm un client cu SERVICE_ROLE_KEY, consistent cu convenția
 * din scripts/audit_rls_faza25.ts.
 *
 * `dotenv.config()` trebuie apelat înainte de orice import static care atinge
 * supabaseClient.ts (care citește process.env ca fallback la import.meta.env în afara
 * Vite) — de aceea modulele aplicației sunt importate DINAMIC (await import(...)) după
 * dotenv.config(), nu static la începutul fișierului.
 */
import dotenv from 'dotenv';
dotenv.config();

interface TestResult {
    name: string;
    ok: boolean;
    detail?: string;
}

async function main() {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
        console.error('LIPSESC VITE_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY din .env — nu pot rula testul.');
        process.exit(1);
    }

    const testClient = createClient(supabaseUrl, serviceKey);

    const { anuleazaFacturaAbonament, reactiveazaFacturaAbonament, stergeFacturaAbonament } =
        await import('./facturaService');
    const { cheiePrezenta } = await import('../hooks/usePrezenteLunare');

    const results: TestResult[] = [];
    const assert = (name: string, ok: boolean, detail?: string) => {
        results.push({ name, ok, detail });
        console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${!ok && detail ? ` (${detail})` : ''}`);
    };

    // ── Setup: un sportiv real din DB, pentru FK valid pe plati.sportiv_id ──
    const { data: sportivTest, error: sportivErr } = await testClient
        .from('sportivi')
        .select('id, club_id')
        .limit(1)
        .maybeSingle();

    if (sportivErr || !sportivTest) {
        console.error('Nu am găsit niciun sportiv în DB pentru testul de integrare. Abandon.', sportivErr?.message);
        process.exit(1);
    }

    const createTestPlata = async (status: string, suma = 50) => {
        const azi = new Date();
        const { data, error } = await testClient
            .from('plati')
            .insert({
                sportiv_id: sportivTest.id,
                familie_id: null,
                club_id: sportivTest.club_id,
                suma,
                data: azi.toISOString().split('T')[0],
                status,
                descriere: '[TEST facturaService.test.ts] Abonament test',
                tip: 'Abonament',
                observatii: 'Creat automat de services/facturaService.test.ts — șters la finalul rulării.',
                luna: azi.getMonth() + 1,
                an: azi.getFullYear(),
            })
            .select()
            .single();
        if (error || !data) {
            throw new Error(`Nu am putut crea factura de test (status=${status}): ${error?.message}`);
        }
        return data;
    };

    const cleanupPlata = async (id: string) => {
        await testClient.from('plati').delete().eq('id', id);
    };

    try {
        // ── anuleazaFacturaAbonament ──────────────────────────────────────
        {
            const p = await createTestPlata('Neachitat');
            const { data, error } = await anuleazaFacturaAbonament(p.id, testClient);
            assert('anuleazaFacturaAbonament pe Neachitat → status Anulat', !error && data?.status === 'Anulat', error?.message);
            await cleanupPlata(p.id);
        }
        {
            const p = await createTestPlata('Achitat');
            const { data, error } = await anuleazaFacturaAbonament(p.id, testClient);
            assert(
                'anuleazaFacturaAbonament pe Achitat → refuzată, mesaj despre achitat',
                !data && !!error?.message && error.message.toLowerCase().includes('achitat'),
                JSON.stringify(error)
            );
            const { data: verif } = await testClient.from('plati').select('status').eq('id', p.id).maybeSingle();
            assert('factura Achitat rămâne neschimbată după refuz (fără UPDATE)', verif?.status === 'Achitat');
            await cleanupPlata(p.id);
        }
        {
            const p = await createTestPlata('Achitat Parțial');
            const { data, error } = await anuleazaFacturaAbonament(p.id, testClient);
            assert(
                'anuleazaFacturaAbonament pe Achitat Parțial → refuzată, mesaj despre încasări',
                !data && !!error?.message,
                JSON.stringify(error)
            );
            const { data: verif } = await testClient.from('plati').select('status').eq('id', p.id).maybeSingle();
            assert('factura Achitat Parțial rămâne neschimbată după refuz', verif?.status === 'Achitat Parțial');
            await cleanupPlata(p.id);
        }
        {
            const p = await createTestPlata('Anulat');
            const { data, error } = await anuleazaFacturaAbonament(p.id, testClient);
            assert(
                'anuleazaFacturaAbonament pe factură deja Anulat → idempotent, fără eroare',
                !error && data?.status === 'Anulat',
                JSON.stringify(error)
            );
            await cleanupPlata(p.id);
        }

        // ── reactiveazaFacturaAbonament ───────────────────────────────────
        {
            const p = await createTestPlata('Anulat');
            const { data, error } = await reactiveazaFacturaAbonament(p.id, testClient);
            assert(
                'reactiveazaFacturaAbonament pe Anulat → status revine la Neachitat',
                !error && data?.status === 'Neachitat',
                JSON.stringify(error)
            );
            await cleanupPlata(p.id);
        }
        {
            const p = await createTestPlata('Neachitat');
            const { data, error } = await reactiveazaFacturaAbonament(p.id, testClient);
            assert(
                'reactiveazaFacturaAbonament pe factură care nu e Anulat → eroare, fără UPDATE',
                !data && !!error?.message,
                JSON.stringify(error)
            );
            const { data: verif } = await testClient.from('plati').select('status').eq('id', p.id).maybeSingle();
            assert('statusul rămâne Neachitat după refuz de reactivare', verif?.status === 'Neachitat');
            await cleanupPlata(p.id);
        }

        // ── stergeFacturaAbonament ────────────────────────────────────────
        {
            const p = await createTestPlata('Neachitat');
            const { error } = await stergeFacturaAbonament(p.id, testClient);
            assert('stergeFacturaAbonament pe Neachitat fără referințe → DELETE reușit', !error, JSON.stringify(error));
            const { data: verif } = await testClient.from('plati').select('id').eq('id', p.id).maybeSingle();
            assert('rândul a dispărut efectiv din DB', !verif);
            // fără cleanup — a fost șters de funcția testată
        }
        {
            const p = await createTestPlata('Achitat');
            const { error } = await stergeFacturaAbonament(p.id, testClient);
            assert('stergeFacturaAbonament pe Achitat → refuzată', !!error, JSON.stringify(error));
            const { data: verif } = await testClient.from('plati').select('id').eq('id', p.id).maybeSingle();
            assert('factura Achitat NU a fost ștearsă', !!verif);
            await cleanupPlata(p.id);
        }
        {
            const p = await createTestPlata('Neachitat');
            const { data: sesiune } = await testClient.from('sesiuni_examene').select('id').limit(1).maybeSingle();
            const { data: grad } = await testClient.from('grade').select('id').limit(1).maybeSingle();
            if (sesiune && grad) {
                const { data: inscriere, error: insErr } = await testClient
                    .from('inscrieri_examene')
                    .insert({
                        sportiv_id: sportivTest.id,
                        sesiune_id: sesiune.id,
                        plata_id: p.id,
                        grad_sustinut_id: grad.id,
                        grad_actual_id: null,
                        varsta_la_examen: 18,
                    })
                    .select()
                    .single();
                if (!insErr && inscriere) {
                    const { error } = await stergeFacturaAbonament(p.id, testClient);
                    assert(
                        'stergeFacturaAbonament referențiată în inscrieri_examene → refuzată explicit',
                        !!error?.message && error.message.toLowerCase().includes('examene'),
                        JSON.stringify(error)
                    );
                    await testClient.from('inscrieri_examene').delete().eq('id', inscriere.id);
                } else {
                    assert(
                        'stergeFacturaAbonament referențiată în inscrieri_examene (SKIP — insert setup eșuat)',
                        true,
                        insErr?.message
                    );
                }
            } else {
                assert(
                    'stergeFacturaAbonament referențiată în inscrieri_examene (SKIP — fără sesiune/grad în DB pentru setup)',
                    true
                );
            }
            await cleanupPlata(p.id);
        }
        {
            const p = await createTestPlata('Achitat Parțial');
            const { data: tranzactie, error: trzErr } = await testClient
                .from('tranzactii')
                .insert({
                    plata_ids: [p.id],
                    sportiv_id: sportivTest.id,
                    familie_id: null,
                    club_id: sportivTest.club_id,
                    suma: 10,
                    data_platii: new Date().toISOString().split('T')[0],
                    metoda_plata: 'Cash',
                })
                .select()
                .single();
            if (!trzErr && tranzactie) {
                const { error } = await stergeFacturaAbonament(p.id, testClient);
                assert(
                    'stergeFacturaAbonament inclusă în tranzactii.plata_ids → refuzată explicit',
                    !!error?.message && error.message.toLowerCase().includes('tranzac'),
                    JSON.stringify(error)
                );
                await testClient.from('tranzactii').delete().eq('id', tranzactie.id);
            } else {
                assert(
                    'stergeFacturaAbonament inclusă în tranzactii.plata_ids (SKIP — insert setup eșuat)',
                    true,
                    trzErr?.message
                );
            }
            await cleanupPlata(p.id);
        }

        // ── cheiePrezenta (hooks/usePrezenteLunare.ts) ────────────────────
        {
            const cheie = cheiePrezenta('abc-123', 6, 2026);
            assert("cheiePrezenta('abc-123', 6, 2026) === 'abc-123-2026-6'", cheie === 'abc-123-2026-6', cheie);
        }
    } catch (err: any) {
        console.error('EROARE NEAȘTEPTATĂ ÎN TEST:', err?.message || err);
        results.push({ name: 'excepție neprinsă în timpul rulării', ok: false, detail: err?.message });
    }

    const nrEsuate = results.filter(r => !r.ok).length;
    console.log('\n' + '='.repeat(60));
    console.log(`Rezultat: ${results.length - nrEsuate}/${results.length} PASS`);
    console.log('='.repeat(60));

    process.exit(nrEsuate > 0 ? 1 : 0);
}

main();
