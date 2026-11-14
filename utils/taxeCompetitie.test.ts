/**
 * Test colocat pentru utils/taxeCompetitie.ts (Faza 41, D-08: taxe pe categorii anulate).
 *
 * Proiectul nu are vitest/jest configurat.
 * Rulare: npx tsx utils/taxeCompetitie.test.ts
 * Pattern identic cu utils/taxeAnuale.test.ts; ieșire non-zero la eșec.
 */

import { construiesteRanduriPlata } from './taxeCompetitie';

let esecuri = 0;
function test(nume: string, fn: () => void): void {
  try { fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function egal(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

// ---------- fixtures ----------
const comp: any = { id: 'C', data_inceput: '2026-12-01', config_taxe: { individual_tehnica: 80, echipa_seniori: 120 } };
const mkCat = (id: string, status_categorie: any = 'activa', over: any = {}): any => ({
  id, proba_id: 'P1', denumire: id, varsta_max: 30, arma: null, status_categorie, ...over,
});
const mkIns = (id: string, categorie_id: string, over: any = {}): any => ({
  id, categorie_id, sportiv_id: `s${id}`, club_id: 'K1', status: 'inscris', taxa_achitata: false,
  sportiv: { nume: 'N', prenume: id, cluburi: { nume: 'Club1' } }, ...over,
});
const mkEc = (id: string, categorie_id: string, over: any = {}): any => ({
  id, categorie_id, club_id: 'K1', status: 'inscrisa', taxa_achitata: false, denumire_echipa: `E${id}`, ...over,
});
const calc = (cats: any[], ins: any[], ec: any[] = []) => construiesteRanduriPlata(comp, cats, [], ins, ec);

// ---------- teste ----------
test('categorie activa, neachitata: datorata', () => {
  const s = calc([mkCat('A')], [mkIns('1', 'A')]);
  egal(s.randuri[0].taxaAnulata, false, 'taxaAnulata');
  egal([s.totalCalculat, s.totalAchitat, s.totalRestant, s.nrIndividuale, s.nrTaxeAnulate], [80, 0, 80, 1, 0], 'totaluri');
});

test('categorie anulata, neachitata: linie pastrata, nedatorata', () => {
  const s = calc([mkCat('A', 'anulata')], [mkIns('1', 'A')]);
  egal(s.randuri.length, 1, 'linii');
  egal([s.randuri[0].taxa, s.randuri[0].taxaAnulata], [80, true], 'linie');
  egal([s.totalCalculat, s.totalRestant, s.nrIndividuale, s.nrTaxeAnulate, s.totalAchitatAnulat], [0, 0, 0, 1, 0], 'totaluri');
});

test('categorie anulata, achitata: ramane achitata, in totalAchitatAnulat', () => {
  const s = calc([mkCat('A', 'anulata')], [mkIns('1', 'A', { taxa_achitata: true })]);
  egal([s.randuri[0].taxaAnulata, s.randuri[0].taxaAchitata], [true, true], 'linie');
  egal([s.totalAchitat, s.totalAchitatAnulat, s.totalCalculat], [0, 80, 0], 'totaluri');
});

test('fuzionata si impartita se comporta ca anulata; null/activa = activ', () => {
  for (const st of ['fuzionata', 'impartita']) {
    egal(calc([mkCat('A', st)], [mkIns('1', 'A')]).randuri[0].taxaAnulata, true, st);
  }
  for (const st of [null, undefined, 'activa']) {
    egal(calc([mkCat('A', st)], [mkIns('1', 'A')]).randuri[0].taxaAnulata, false, String(st));
  }
});

test('echipa pe categorie anulata: o linie, nrEchipe 0, in nrTaxeAnulate', () => {
  const s = calc([mkCat('A', 'anulata')], [], [mkEc('1', 'A')]);
  egal(s.randuri.length, 1, 'linii');
  egal([s.randuri[0].taxaAnulata, s.nrEchipe, s.nrTaxeAnulate, s.totalCalculat], [true, 0, 1, 0], 'echipa');
});

test('categorie lipsa din lista: comportament legacy (datorata, fara anulare)', () => {
  const s = calc([], [mkIns('1', 'X')], [mkEc('2', 'X')]);
  egal(s.randuri.map(r => r.taxaAnulata), [false, false], 'taxaAnulata');
  egal([s.totalCalculat, s.nrTaxeAnulate], [80 + 120, 0], 'totaluri');
});

test('retrase (orice caz) sunt sarite complet', () => {
  const s = calc([mkCat('A', 'anulata')], [mkIns('1', 'A', { status: 'Retras' })], [mkEc('2', 'A', { status: 'RETRASA' })]);
  egal([s.randuri.length, s.nrTaxeAnulate], [0, 0], 'retrase');
});

test('mixt: doar liniile active intra in totaluri', () => {
  const s = calc([mkCat('A'), mkCat('B', 'anulata')], [mkIns('1', 'A', { taxa_achitata: true }), mkIns('2', 'B'), mkIns('3', 'B', { taxa_achitata: true })]);
  egal([s.totalCalculat, s.totalAchitat, s.totalRestant, s.nrIndividuale, s.nrTaxeAnulate, s.totalAchitatAnulat], [80, 80, 0, 1, 2, 80], 'mixt');
});

if (esecuri > 0) { console.log(`\n${esecuri} teste au esuat`); process.exit(1); }
console.log('\nToate testele au trecut');
