/** Rulare: `npx tsx utils/facturiSportiv.test.ts` */
import { construiesteFacturi, totalDeAchitat, facturiAleSportivului } from './facturiSportiv';

const errors: string[] = [];
const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) errors.push(`${m}: asteptat ${b}, primit ${a}`); };

const plati: any[] = [
    { id: 'a', sportiv_id: 's1', familie_id: null, suma: 100, status: 'Neachitat', data: '2026-10-01', descriere: 'A' },
    { id: 'b', sportiv_id: 's1', familie_id: null, suma: 200, status: 'Achitat Parțial', data: '2026-09-01', descriere: 'B' },
    { id: 'c', sportiv_id: 's1', familie_id: null, suma: 50, status: 'Anulat', data: '2026-08-01', descriere: 'C' },
    { id: 'd', sportiv_id: 's1', familie_id: null, suma: 80, status: 'Achitat', data: '2026-07-01', descriere: 'D' },
    { id: 'x', sportiv_id: 's9', familie_id: null, suma: 10, status: 'Neachitat', data: '2026-07-01', descriere: 'X' },
];
const istoric: any[] = [{ plata_id: 'b', total_incasat: 60, tranzactie_id: 't1', data_plata_string: '2026-09-05', metoda_plata: 'Cash' }];

const facturi = construiesteFacturi(facturiAleSportivului(plati, { id: 's1', familie_id: null } as any), istoric);
eq(facturi.length, 4, 'doar facturile lui s1');
eq(facturi[0].detalii.plata_id, 'a', 'cea mai noua prima');
eq(totalDeAchitat(facturi), 240, 'a(100) + b(200-60)');
eq(facturi.find(f => f.detalii.plata_id === 'b')!.incasari.length, 1, 'incasare pe b');
eq(facturi.find(f => f.detalii.plata_id === 'c')!.rest, 0, 'anulata nu e datorie');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('facturiSportiv: toate testele OK');
