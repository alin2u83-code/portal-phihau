/**
 * Test pentru utils/incasariPeTip.ts. Rulare: `npx tsx utils/incasariPeTip.test.ts`
 */
import { incasariPeTip } from './incasariPeTip';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}
const eq = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const AV = 'Avans / Neclasificat';
const plati = [{ id: 'p1', tip: 'Abonament' }, { id: 'p2', tip: 'Taxa Examen' }];

assert(eq(incasariPeTip([{ suma: 100, alocari: [{ plata_id: 'p1', suma_alocata: 100 }] }], plati), { Abonament: 100 }), 'alocare unica');
assert(eq(incasariPeTip([{ suma: 100, alocari: [{ plata_id: 'p1', suma_alocata: 60 }, { plata_id: 'p2', suma_alocata: 40 }] }], plati), { Abonament: 60, 'Taxa Examen': 40 }), 'alocari impartite pe tipuri');
assert(eq(incasariPeTip([{ suma: 100, alocari: [{ plata_id: 'p1', suma_alocata: 70 }] }], plati), { Abonament: 70, [AV]: 30 }), 'restul nealocat -> Avans');
assert(eq(incasariPeTip([{ suma: 50, alocari: undefined }, { suma: 20, alocari: [] }], plati), { [AV]: 70 }), 'fara alocari -> tot Avans');
assert(eq(incasariPeTip([{ suma: 40, alocari: [{ plata_id: 'zz', suma_alocata: 40 }] }], plati), { [AV]: 40 }), 'factura necunoscuta -> Avans');
assert(eq(incasariPeTip([{ suma: 0.3, alocari: [{ plata_id: 'p1', suma_alocata: 0.1 }, { plata_id: 'p1', suma_alocata: 0.2 }] }], plati), { Abonament: 0.3 }), 'rotunjire 0.1+0.2 = 0.3, rest < 0.005 ignorat');
