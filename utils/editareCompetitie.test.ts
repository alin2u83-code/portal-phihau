/**
 * Test colocat pentru utils/editareCompetitie.ts (Faza 42: regula FRAM + diferenta membri echipa).
 * Rulare: npx tsx utils/editareCompetitie.test.ts ; iesire non-zero la esec.
 */
import { anFramCompetitie, statusFram, diferentaMembri, taxaParticipare, taxeDeReglatDupaMutari } from './editareCompetitie';

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

// --- D-09: taxaParticipare + taxeDeReglatDupaMutari ---
const comp: any = { config_taxe: { individual_tehnica: 80, individual_cvd: 100, echipa_juniori: 150, echipa_seniori: 120, cvd_echipa: 90 } };
const cat = (id: string, over: any = {}): any => ({ id, denumire: `Cat ${id}`, numar_categorie: 1, varsta_max: 40, arma: null, status_categorie: 'activa', ...over });
const cats = [cat('A'), cat('B'), cat('C'), cat('ARMA', { arma: 'baton' }), cat('JUN', { varsta_max: 17 }), cat('SEN'), cat('ANUL', { status_categorie: 'anulata' })];
const ctxD = (inscrieri: any[], echipe: any[] = []): any => ({ competitie: comp, categorii: cats, inscrieri, echipe });
const mut = (tip: any, id: string, v: string, n: string, data = '2027-01-01T10:00:00Z') => ({ tip, id, categorieVeche: v, categorieNoua: n, data });

test('taxaParticipare individual tehnica = 80', () => egal(taxaParticipare(comp, 'inscriere', cats[0]), 80, 'taxa'));
test('taxaParticipare individual cu arma = 100', () => egal(taxaParticipare(comp, 'inscriere', cats[3]), 100, 'taxa'));
test('taxaParticipare echipa junior 150 / senior 120', () => egal([taxaParticipare(comp, 'echipa', cats[4]), taxaParticipare(comp, 'echipa', cats[5])], [150, 120], 'taxa'));
test('taxaParticipare echipa fara categorie = fallback senior', () => egal(taxaParticipare(comp, 'echipa', undefined), 120, 'taxa'));
test('taxaParticipare categorie anulata = 0', () => egal(taxaParticipare(comp, 'inscriere', cats[6]), 0, 'taxa'));

test('taxeDeReglat individual intre doua active cu aceeasi taxa -> []', () =>
  egal(taxeDeReglatDupaMutari([mut('inscriere', 'i1', 'A', 'B')], ctxD([{ id: 'i1', categorie_id: 'B', club_id: 'K', status: 'inscris' }])), [], 'res'));
test('taxeDeReglat echipa junior -> senior achitata: 150 -> 120', () => {
  const r = taxeDeReglatDupaMutari([mut('echipa', 'e1', 'JUN', 'SEN')], ctxD([], [{ id: 'e1', categorie_id: 'SEN', club_id: 'K', status: 'inscrisa', taxa_achitata: true, denumire_echipa: 'Echipa X' }]));
  egal(r.map(x => [x.nume, x.taxaVeche, x.taxaNoua, x.achitata, x.categorieInitiala, x.categorieCurenta]), [['Echipa X', 150, 120, true, 'Cat JUN', 'Cat SEN']], 'res');
});
test('taxeDeReglat A -> B -> C cu taxa A = C -> []', () =>
  egal(taxeDeReglatDupaMutari([mut('inscriere', 'i1', 'A', 'ARMA', '2027-01-01T10:00:00Z'), mut('inscriere', 'i1', 'ARMA', 'B', '2027-01-02T10:00:00Z')], ctxD([{ id: 'i1', categorie_id: 'B', club_id: 'K', status: 'inscris' }])), [], 'res'));
test('taxeDeReglat categorie initiala anulata -> activa: 0 -> taxa', () => {
  const r = taxeDeReglatDupaMutari([mut('inscriere', 'i1', 'ANUL', 'A')], ctxD([{ id: 'i1', categorie_id: 'A', club_id: 'K', status: 'inscris', sportiv: { nume: 'pop', prenume: 'Ion' } }]));
  egal(r.map(x => [x.nume, x.taxaVeche, x.taxaNoua]), [['POP Ion', 0, 80]], 'res');
});
test('taxeDeReglat rand retras -> []', () =>
  egal(taxeDeReglatDupaMutari([mut('inscriere', 'i1', 'A', 'ARMA')], ctxD([{ id: 'i1', categorie_id: 'ARMA', club_id: 'K', status: 'retras' }])), [], 'res'));
test('taxeDeReglat id absent din ctx -> []', () =>
  egal(taxeDeReglatDupaMutari([mut('inscriere', 'lipsa', 'A', 'ARMA')], ctxD([])), [], 'res'));
test('taxeDeReglat sortate descrescator dupa data', () => {
  const r = taxeDeReglatDupaMutari(
    [mut('inscriere', 'i1', 'A', 'ARMA', '2027-01-01T10:00:00Z'), mut('inscriere', 'i2', 'A', 'ARMA', '2027-01-05T10:00:00Z')],
    ctxD([{ id: 'i1', categorie_id: 'ARMA', club_id: 'K', status: 'inscris' }, { id: 'i2', categorie_id: 'ARMA', club_id: 'K', status: 'inscris' }]));
  egal(r.map(x => x.id), ['i2', 'i1'], 'ordine');
});

if (esecuri > 0) { console.log(`\n${esecuri} teste esuate`); process.exit(1); }
console.log('\nToate testele au trecut');
