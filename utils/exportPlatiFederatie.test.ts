/**
 * Test colocat pentru utils/exportPlatiFederatie.ts
 * Rulare: `npx tsx utils/exportPlatiFederatie.test.ts`
 */

import type { DecontFederatie, SportivAcoperitPlata } from '../types';
import { construiesteRanduriExport, formateazaDataRo } from './exportPlatiFederatie';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`FAIL: ${message}`);
    console.log(`PASS: ${message}`);
}

const decont = (id: string, club_id: string, extra: Partial<DecontFederatie> = {}): DecontFederatie => ({
    id,
    club_id,
    tip_activitate: 'FRQKD',
    nr_participanti: 1,
    suma_totala: 100,
    status_plata: 'Platit',
    data_generare: '2026-10-01T08:00:00Z',
    an_fiscal: 2026,
    metoda_plata: 'Cash',
    ...extra,
});

const acoperit = (decont_id: string, nume: string, extra: Partial<SportivAcoperitPlata> = {}): SportivAcoperitPlata => ({
    decont_id,
    sportiv_id: 's-' + nume,
    an: 2026,
    tip: 'FRQKD',
    suma: 50,
    plata_id: null,
    nume,
    prenume: 'Ion',
    data_nasterii: '2010-03-04',
    ...extra,
});

export function runTests(): { passed: number; failed: number; errors: string[] } {
    const errors: string[] = [];
    let passed = 0;
    let failed = 0;
    const run = (name: string, fn: () => void) => {
        try {
            fn();
            passed++;
        } catch (e: any) {
            failed++;
            errors.push(`${name}: ${e.message}`);
            console.error(`FAIL: ${name} — ${e.message}`);
        }
    };

    const deconturi = [
        decont('d1', 'c1aaaaaa-0000', { data_decont: '2026-10-05', metoda_plata: 'Transfer Bancar' }),
        decont('d2', 'c2bbbbbb-0000', { metoda_plata: 'Revolut' }),
    ];
    const clubs = [{ id: 'c1aaaaaa-0000', nume: 'Club Alfa' }];

    run('3 randuri cu club/perioada/metoda corecte, sortate', () => {
        const randuri = construiesteRanduriExport({
            deconturi,
            clubs,
            acoperiti: [acoperit('d2', 'Zaharia'), acoperit('d1', 'Popescu'), acoperit('d1', 'Ababei')],
        });
        assert(randuri.length === 3, '3 randuri');
        assert(randuri[0].Club === 'Club Alfa' && randuri[0].Nume === 'Ababei', 'sortat dupa club apoi nume');
        assert(randuri[1].Nume === 'Popescu' && randuri[1].Metoda === 'Transfer Bancar', 'metoda decont d1');
        assert(randuri[0].Perioada === '2026-2027', 'perioada FRQKD = sezon');
        assert(randuri[2].Club === 'Club c2bbbbbb', 'club fara nume -> fallback pe primele 8 caractere');
        assert(randuri[2].Metoda === 'Revolut', 'metoda decont d2');
        assert(randuri[0].Data_nasterii === '04.03.2010', 'data nasterii formatata');
    });

    run('acoperit cu decont inexistent -> Club fallback', () => {
        const randuri = construiesteRanduriExport({
            deconturi,
            clubs,
            acoperiti: [acoperit('necunoscut-123456', 'Test')],
        });
        assert(randuri[0].Club.startsWith('Club necunosc'), 'fallback club');
        assert(randuri[0].Metoda === '' && randuri[0].Data_plata === '', 'fara metoda / data');
    });

    run("data '2026-10-05' -> '05.10.2026'", () => {
        assert(formateazaDataRo('2026-10-05') === '05.10.2026', 'format ro');
        assert(formateazaDataRo('2026-10-05T23:30:00Z') === '05.10.2026', 'timestamp fara fus orar');
        assert(formateazaDataRo(null) === '', 'null -> gol');
    });

    run('data_plata folosita din data_decont, altfel data_generare', () => {
        const randuri = construiesteRanduriExport({
            deconturi,
            clubs,
            acoperiti: [acoperit('d1', 'A'), acoperit('d2', 'B')],
        });
        assert(randuri.find(r => r.Nume === 'A')!.Data_plata === '05.10.2026', 'data_decont');
        assert(randuri.find(r => r.Nume === 'B')!.Data_plata === '01.10.2026', 'data_generare');
    });

    run('FRAM 2026 -> Perioada 2026', () => {
        const randuri = construiesteRanduriExport({
            deconturi: [decont('d3', 'c1aaaaaa-0000', { tip_activitate: 'FRAM' })],
            clubs,
            acoperiti: [acoperit('d3', 'X', { tip: 'FRAM', an: 2026 })],
        });
        assert(randuri[0].Perioada === '2026' && randuri[0].Taxa === 'FRAM', 'perioada FRAM = an');
    });

    console.log(`\n${passed} teste trecute, ${failed} esuate.`);
    return { passed, failed, errors };
}

const isDirectRun = typeof process !== 'undefined' && process.argv[1] && /exportPlatiFederatie\.test\.(ts|js)$/.test(process.argv[1]);
if (isDirectRun) {
    const result = runTests();
    if (result.failed > 0) {
        result.errors.forEach(e => console.error(' - ' + e));
        process.exit(1);
    }
}
