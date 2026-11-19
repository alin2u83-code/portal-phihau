/**
 * Test colocat pentru utils/clonareCompetitie.ts (Faza 45: clonare competiție).
 *
 * Rulare: npx tsx utils/clonareCompetitie.test.ts
 * Pattern identic cu utils/categoriiAdmin.test.ts; ieșire non-zero la eșec.
 */

import { structuraInitiala, avertismenteTip, numeImplicit, valideazaClonare, TIPURI_CLONARE } from './clonareCompetitie';

let esecuri = 0;
function test(nume: string, fn: () => void): void {
  try { fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function egal(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

// ---------- fixtures (sintetice) ----------
const cat = (id: string, nr: number, extra: any = {}): any => ({
  id, competitie_id: 'C', proba_id: 'P1', numar_categorie: nr, denumire: id,
  status_categorie: 'activa', este_fuzionata: false, categorii_fuzionate_din: null, ...extra,
});

test('doar categorii active: toate, in ordine, fara avertismente', () => {
  const r = structuraInitiala([cat('a', 1), cat('b', 2), cat('c', 3)]);
  egal(r.ids, ['a', 'b', 'c'], 'ids');
  egal(r.avertismente.length, 0, 'avertismente');
  egal(r.anulate, 0, 'anulate');
  egal(r.excluse, [], 'excluse');
});

test('categorie anulata: inclusa (D-07) si numarata', () => {
  const r = structuraInitiala([cat('a', 1), cat('x', 2, { status_categorie: 'anulata' })]);
  egal(r.ids, ['a', 'x'], 'ids');
  egal(r.anulate, 1, 'anulate');
});

test('impartire Faza 41: parintele inclus, copiii exclusi, fara avertisment', () => {
  const r = structuraInitiala([
    cat('P', 1, { status_categorie: 'impartita', categorii_fuzionate_din: ['A', 'B'] }),
    cat('A', 2), cat('B', 3),
  ]);
  egal(r.ids, ['P'], 'ids');
  egal(r.excluse, ['A', 'B'], 'excluse');
  egal(r.avertismente.length, 0, 'avertismente');
});

test('fuziune Faza 41: sursele incluse, rezultatul exclus', () => {
  const r = structuraInitiala([
    cat('S1', 1, { status_categorie: 'fuzionata' }),
    cat('S2', 2, { status_categorie: 'fuzionata' }),
    cat('R', 3, { este_fuzionata: true, categorii_fuzionate_din: ['S1', 'S2'] }),
  ]);
  egal(r.ids, ['S1', 'S2'], 'ids');
  egal(r.excluse, ['R'], 'excluse');
  egal(r.avertismente.length, 0, 'avertismente');
});

test('fuziune veche (autoreferinta): categoria pastrata inclusa cu avertisment, sursa exclusa', () => {
  const r = structuraInitiala([
    cat('S', 1, { status_categorie: 'fuzionata' }),
    cat('K', 7, { este_fuzionata: true, categorii_fuzionate_din: ['S', 'K'] }),
  ]);
  egal(r.ids, ['K'], 'ids');
  egal(r.avertismente.length, 1, 'avertismente');
  egal(r.avertismente[0].categorieId, 'K', 'categorieId');
  egal(r.avertismente[0].numar, 7, 'numar');
});

test('fuziune cu sursa lipsa din lista: se pastreaza K2, avertisment, sursele existente excluse', () => {
  const r = structuraInitiala([
    cat('S', 1, { status_categorie: 'fuzionata' }),
    cat('K2', 2, { este_fuzionata: true, categorii_fuzionate_din: ['X-lipsa', 'S'] }),
  ]);
  egal(r.ids, ['K2'], 'ids');
  egal(r.avertismente.length, 1, 'avertismente');
});

test('rezultat de fuziune cu array gol / NULL: pastrat, avertisment', () => {
  const r = structuraInitiala([
    cat('F1', 1, { este_fuzionata: true, categorii_fuzionate_din: [] }),
    cat('F2', 2, { este_fuzionata: true, categorii_fuzionate_din: null }),
  ]);
  egal(r.ids, ['F1', 'F2'], 'ids');
  egal(r.avertismente.length, 2, 'avertismente');
});

test('parinte impartit cu array gol sau doar id-uri lipsa: parintele exclus, avertisment', () => {
  const r = structuraInitiala([
    cat('P1', 1, { status_categorie: 'impartita', categorii_fuzionate_din: [] }),
    cat('P2', 2, { status_categorie: 'impartita', categorii_fuzionate_din: ['lipsa'] }),
    cat('N', 3),
  ]);
  egal(r.ids, ['N'], 'ids');
  egal(r.avertismente.length, 2, 'avertismente');
});

test('rezultat de fuziune impartit ulterior: el si copiii exclusi, avertisment', () => {
  const r = structuraInitiala([
    cat('R', 1, { este_fuzionata: true, status_categorie: 'impartita', categorii_fuzionate_din: ['C1', 'C2'] }),
    cat('C1', 2), cat('C2', 3),
  ]);
  egal(r.ids, [], 'ids');
  egal(r.avertismente.length, 1, 'avertismente');
});

test('lant: copil de impartire fuzionat prin RPC: parinte inclus, copil si rezultat excluse, cealalta sursa inclusa', () => {
  const r = structuraInitiala([
    cat('P', 1, { status_categorie: 'impartita', categorii_fuzionate_din: ['A', 'B'] }),
    cat('A', 2, { status_categorie: 'fuzionata' }),
    cat('B', 3),
    cat('Z', 4, { status_categorie: 'fuzionata' }),
    cat('R', 5, { este_fuzionata: true, categorii_fuzionate_din: ['A', 'Z'] }),
  ]);
  egal(r.ids, ['P', 'Z'], 'ids');
  egal(r.avertismente.length, 0, 'avertismente');
});

test('forma datelor reale (84 randuri): 72 id-uri, 2 avertismente, 9 anulate, 12 excluse', () => {
  const rows: any[] = [];
  let n = 0;
  for (let i = 0; i < 56; i++) rows.push(cat(`act${i}`, ++n));
  for (let i = 0; i < 2; i++) {
    rows.push(cat(`src${i}`, ++n, { status_categorie: 'fuzionata' }));
    rows.push(cat(`keep${i}`, ++n, { este_fuzionata: true, categorii_fuzionate_din: [`src${i}`, `keep${i}`] }));
  }
  for (let i = 0; i < 9; i++) rows.push(cat(`anu${i}`, ++n, { status_categorie: 'anulata' }));
  for (let i = 0; i < 5; i++) {
    rows.push(cat(`par${i}`, ++n, { status_categorie: 'impartita', categorii_fuzionate_din: [`ch${i}a`, `ch${i}b`] }));
    rows.push(cat(`ch${i}a`, ++n));
    rows.push(cat(`ch${i}b`, ++n));
  }
  egal(rows.length, 84, 'fixture');
  const r = structuraInitiala(rows);
  egal(r.ids.length, 72, 'ids');
  egal(r.avertismente.length, 2, 'avertismente');
  egal(r.anulate, 9, 'anulate');
  egal(r.excluse.length, 12, 'excluse');
});

test('avertismenteTip: acelasi tip -> nimic (A7)', () => {
  const probe: any[] = [{ id: 'p1', tip_proba: 'giao_dau' }];
  const r = avertismenteTip('tehnica', 'tehnica', probe, [cat('a', 1)], ['a']);
  egal(r.probe.length, 0, 'probe');
  egal(r.categorii, 0, 'categorii');
});

test('avertismenteTip: tehnica -> cvd: thao_quyen_individual si sincron incompatibile, song_luyen compatibil', () => {
  const probe: any[] = [
    { id: 'p1', tip_proba: 'thao_quyen_individual' },
    { id: 'p2', tip_proba: 'sincron' },
    { id: 'p3', tip_proba: 'song_luyen' },
  ];
  const cats = [cat('a', 1, { proba_id: 'p1' }), cat('b', 2, { proba_id: 'p1' }), cat('c', 3, { proba_id: 'p2' }), cat('d', 4, { proba_id: 'p3' }), cat('e', 5, { proba_id: 'p1' })];
  const r = avertismenteTip('tehnica', 'cvd', probe, cats, ['a', 'b', 'c', 'd']); // 'e' nu e selectata
  egal(r.probe.map(p => p.tip_proba), ['thao_quyen_individual', 'sincron'], 'probe');
  egal(r.categorii, 3, 'categorii');
});

test('numeImplicit: an + 1, altfel (copie)', () => {
  egal(numeImplicit('Copii si Juniori (Iasi 2025)'), 'Copii si Juniori (Iasi 2026)', 'cu an');
  egal(numeImplicit('Cupa'), 'Cupa (copie)', 'fara an');
  egal(numeImplicit('Cupa 12025'), 'Cupa 12025 (copie)', 'numar lung nu e an');
});

const valid = { denumire: 'Cupa 2027', tip: 'tehnica', dataInceput: '2027-03-10', dataSfarsit: '2027-03-12', deadline: '2027-03-01' };

test('valideazaClonare: input valid -> fara mesaje', () => {
  egal(valideazaClonare(valid, ['Cupa 2026']), [], 'mesaje');
  assert(TIPURI_CLONARE.includes('cvd') && !TIPURI_CLONARE.includes('stagiu' as any), 'TIPURI_CLONARE');
});

test('valideazaClonare: fiecare regula produce un mesaj', () => {
  const un = (f: any, ex: string[] = []) => valideazaClonare({ ...valid, ...f }, ex).length;
  egal(un({ denumire: '   ' }), 1, 'nume gol');
  egal(un({ denumire: 'x'.repeat(201) }), 1, 'nume lung');
  egal(un({ denumire: '  CUPA 2027 ' }, ['cupa 2027']), 1, 'duplicat');
  egal(un({ tip: 'stagiu' }), 1, 'tip');
  egal(un({ dataInceput: '' }), 1, 'data lipsa');
  egal(un({ dataSfarsit: '2027-03-09' }), 1, 'sfarsit inainte');
  egal(un({ deadline: '2027-03-11' }), 1, 'deadline dupa inceput');
});

if (esecuri > 0) { console.log(`\n${esecuri} teste esuate`); process.exit(1); }
console.log('\nToate testele au trecut');
