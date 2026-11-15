/**
 * Test colocat pentru utils/editareCompetitie.ts (Faza 42: regula FRAM + diferenta membri echipa).
 * Rulare: npx tsx utils/editareCompetitie.test.ts ; iesire non-zero la esec.
 */
import { anFramCompetitie, statusFram, diferentaMembri } from './editareCompetitie';

let esecuri = 0;
function test(nume: string, fn: () => void): void {
  try { fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function egal(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

const viza = (over: any = {}): any => ({ id: 'v', sportiv_id: 'S', an: 2027, tip: 'FRAM', scutit: false, plata: { status: 'Neachitat' }, ...over });
const c = (over: any = {}): any => ({ data_inceput: '2027-01-01', fram_obligatoriu: false, ...over });

test('anFramCompetitie 2027-01-01 = 2027', () => egal(anFramCompetitie(c()), 2027, 'an'));
test('anFramCompetitie 2026-12-31 = 2026 (fara shift fus orar)', () => egal(anFramCompetitie(c({ data_inceput: '2026-12-31' })), 2026, 'an'));

test('statusFram scutit -> ok', () => egal(statusFram(c(), 'S', [viza({ scutit: true })], false), 'ok', 'st'));
test('statusFram plata Achitat -> ok', () => egal(statusFram(c(), 'S', [viza({ plata: { status: 'Achitat' } })], false), 'ok', 'st'));
test('statusFram neachitat, regula off -> avertisment', () => egal(statusFram(c(), 'S', [viza()], false), 'avertisment', 'st'));
test('statusFram neachitat, regula on -> blocat', () => egal(statusFram(c({ fram_obligatoriu: true }), 'S', [viza()], false), 'blocat', 'st'));
test('statusFram neachitat, regula on, super admin -> exceptie', () => egal(statusFram(c({ fram_obligatoriu: true }), 'S', [viza()], true), 'exceptie', 'st'));
test('statusFram FRAM 2026 achitat, competitie 2027 -> nu ok', () => assert(statusFram(c(), 'S', [viza({ an: 2026, scutit: true })], false) !== 'ok', 'trebuia sa nu fie ok'));
test('statusFram FRQKD 2027 achitat -> nu ok', () => assert(statusFram(c(), 'S', [viza({ tip: 'FRQKD', scutit: true })], false) !== 'ok', 'trebuia sa nu fie ok'));
test('statusFram fram_obligatoriu undefined = false', () => egal(statusFram({ data_inceput: '2027-01-01' }, 'S', [], false), 'avertisment', 'st'));
test('statusFram alt sportiv nu conteaza -> blocat', () => egal(statusFram(c({ fram_obligatoriu: true }), 'S', [viza({ sportiv_id: 'X', scutit: true })], false), 'blocat', 'st'));

const m = (sportiv_id: string, rol: 'titular' | 'rezerva') => ({ sportiv_id, rol });
test('diferentaMembri exemplu mixt', () => {
  const d = diferentaMembri([m('A', 'titular'), m('B', 'titular'), m('C', 'rezerva')], [m('A', 'titular'), m('B', 'rezerva'), m('D', 'titular')]);
  egal(d, { adauga: [m('D', 'titular')], schimbaRol: [m('B', 'rezerva')], scoate: ['C'] }, 'diff');
});
test('diferentaMembri liste identice -> goale', () => {
  const l = [m('A', 'titular'), m('B', 'rezerva')];
  egal(diferentaMembri(l, l), { adauga: [], schimbaRol: [], scoate: [] }, 'diff');
});
test('diferentaMembri noi gol -> scoate tot', () => {
  egal(diferentaMembri([m('A', 'titular'), m('B', 'rezerva')], []), { adauga: [], schimbaRol: [], scoate: ['A', 'B'] }, 'diff');
});
test('diferentaMembri dubluri in noi -> ultima aparitie', () => {
  egal(diferentaMembri([], [m('A', 'titular'), m('A', 'rezerva')]), { adauga: [m('A', 'rezerva')], schimbaRol: [], scoate: [] }, 'diff');
});

if (esecuri > 0) { console.log(`\n${esecuri} teste esuate`); process.exit(1); }
console.log('\nToate testele au trecut');
