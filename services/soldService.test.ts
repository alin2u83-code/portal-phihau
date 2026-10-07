/**
 * Test colocat pentru services/soldService.ts
 * Rulare: `npx tsx services/soldService.test.ts` (model: components/Plati/hub/platiHubConfig.test.ts)
 */
import { calculeazaSolduri, calculeazaSold, calculeazaSumarIncasari } from './soldService';

const errors: string[] = [];
const eq = (a: unknown, b: unknown, msg: string) => { if (a !== b) errors.push(`${msg}: asteptat ${b}, primit ${a}`); };

const plati: any[] = [
    { sportiv_id: 's1', familie_id: null, suma: 100, status: 'Achitat' },
    { sportiv_id: 's1', familie_id: null, suma: 50, status: 'Anulat' },   // ignorat
    { sportiv_id: 's2', familie_id: 'f1', suma: 200, status: 'Neachitat' },
    { sportiv_id: 's3', familie_id: null, suma: 30, status: 'Neachitat' },
];
const tranzactii: any[] = [
    { sportiv_id: 's1', familie_id: null, suma: 100, data_platii: '2026-09-10', metoda_plata: 'Cash', club_id: 'c1' },
    { sportiv_id: 's2', familie_id: 'f1', suma: 250, data_platii: '2026-10-02', metoda_plata: 'Revolut', club_id: 'c1' },
    { sportiv_id: 's3', familie_id: null, suma: 10, data_platii: '2026-10-03', metoda_plata: 'Cash', club_id: 'c2' },
];

const { perSportiv, perFamilie } = calculeazaSolduri(plati, tranzactii);
eq(perSportiv.get('s1'), 0, 'sold s1 (factura anulata ignorata)');
eq(perFamilie.get('f1'), 50, 'sold familie f1 (credit)');
eq(perSportiv.get('s3'), -20, 'sold s3 (datorie)');
eq(perSportiv.get('s2'), undefined, 'membru familie fara itemi proprii');
eq(calculeazaSold(plati, tranzactii, { sportivIds: ['s2', 's3'], familieId: 'f1' }), 30, 'sold agregat familie + membri');

const sumar = calculeazaSumarIncasari(tranzactii, { dela: '2026-10-01', panaLa: '2026-10-31' });
eq(sumar.total, 260, 'total octombrie');
eq(sumar.perMetoda['Revolut'], 250, 'total Revolut');
eq(calculeazaSumarIncasari(tranzactii, { clubId: 'c2' }).total, 10, 'filtru club');
eq(calculeazaSumarIncasari(tranzactii, {}).perLuna.length, 2, 'doua luni');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('soldService: toate testele OK');
