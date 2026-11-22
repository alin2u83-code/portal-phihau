/**
 * Test colocat pentru utils/reducereSportiv.ts
 * Rulare: `node --import tsx utils/reducereSportiv.test.ts`
 */
import assert from 'node:assert/strict';
import { valoareReducere, reducereAplicabila, reduceriFactura } from './reducereSportiv';

assert.equal(valoareReducere(200, { tip: 'procent', valoare: 100 }), 200);
assert.equal(valoareReducere(200, { tip: 'procent', valoare: 50 }), 100);
assert.equal(valoareReducere(200, { tip: 'procent', valoare: 150 }), 200, 'procent > 100 plafonat');
assert.equal(valoareReducere(220, { tip: 'suma_fixa', valoare: 30 }), 30);
assert.equal(valoareReducere(20, { tip: 'suma_fixa', valoare: 30 }), 20, 'suma fixa nu depaseste pretul');
assert.equal(valoareReducere(0, { tip: 'procent', valoare: 50 }), 0);
assert.equal(valoareReducere(200, null), 0);
assert.equal(valoareReducere(200, { tip: 'procent', valoare: -10 }), 0);
assert.equal(valoareReducere(333, { tip: 'procent', valoare: 33.333 }), 111, 'rotunjire la 2 zecimale');

assert.equal(reducereAplicabila({ este_activa: true, categorie_aplicabila: 'Abonament' }, 'Abonament'), true);
assert.equal(reducereAplicabila({ este_activa: true, categorie_aplicabila: 'Toate' }, 'FRAM'), true);
assert.equal(reducereAplicabila({ este_activa: false, categorie_aplicabila: 'Abonament' }, 'Abonament'), false);
assert.equal(reducereAplicabila({ este_activa: true, categorie_aplicabila: 'Echipament' }, 'Abonament'), false);
assert.equal(reducereAplicabila(null, 'Abonament'), false);

const R = (id: string, tip: 'procent' | 'suma_fixa', valoare: number, categorie_aplicabila = 'Abonament', este_activa = true) =>
    ({ id, nume: id, tip, valoare, categorie_aplicabila, este_activa });
// Familie 330 cu un membru cu 30 lei: reducerea scade din factura familiei
let f = reduceriFactura(330, 0, [R('a', 'suma_fixa', 30), undefined], 'Abonament');
assert.deepEqual([f.valoare, f.reducereId, f.detalii], [30, 'a', 'a']);
// doua reduceri -> suma lor, fara reducere_id unic
f = reduceriFactura(330, 0, [R('a', 'suma_fixa', 30), R('b', 'procent', 10)], 'Abonament');
assert.deepEqual([f.valoare, f.reducereId], [63, null]);
// plafonat la ce ramane dupa bonus
f = reduceriFactura(200, 150, [R('a', 'procent', 100)], 'Abonament');
assert.equal(f.valoare, 50);
// categorie nepotrivita / inactiva -> 0
assert.equal(reduceriFactura(200, 0, [R('a', 'procent', 100, 'Echipament')], 'Abonament').valoare, 0);
assert.equal(reduceriFactura(200, 0, [R('a', 'procent', 100, 'Abonament', false)], 'Abonament').valoare, 0);

console.log('reducereSportiv.test.ts: OK');
