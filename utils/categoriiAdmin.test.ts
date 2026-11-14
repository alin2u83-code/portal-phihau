/**
 * Test colocat pentru utils/categoriiAdmin.ts (Faza 41: preview anulare / mutare / fuziune / împărțire).
 *
 * Proiectul nu are vitest/jest configurat.
 * Rulare: npx tsx utils/categoriiAdmin.test.ts
 * Pattern identic cu utils/taxeAnuale.test.ts; ieșire non-zero la eșec.
 */

import {
  cheieRand, compatibile, categorieDinInput, participanti, participantiFaraCategorie, sportiviInscrisi,
  verificaTinta, planAnulare, planMutare, mutariDinPlan,
} from './categoriiAdmin';

let esecuri = 0;
function test(nume: string, fn: () => void): void {
  try { fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function egal(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}

// ---------- fixtures ----------
const NUME_GRADE: Record<number, string> = { 1: 'Debutant', 2: '1 Câp Galben', 6: '1 Câp Roșu', 9: '4 Câp Roșu', 10: 'Centura Violet', 14: 'C.V. 4 Câp Alb', 15: '1 Câp Albastru' };
const grade: any[] = Object.keys(NUME_GRADE).map(o => ({ id: `g${o}`, nume: NUME_GRADE[+o], ordine: +o, varsta_minima: 0, timp_asteptare: '', grad_start_id: null }));
const comp: any = { id: 'C', data_inceput: '2026-12-01', taxa_individual: 80, taxa_echipa: 150, config_taxe: null };

const mkCat = (id: string, over: any = {}): any => ({
  id, competitie_id: 'C', proba_id: 'P1', numar_categorie: 1, denumire: id, varsta_min: 8, varsta_max: 9, gen: 'Feminin',
  grad_min_ordine: 6, grad_max_ordine: 9, arma: null, tip_participare: 'individual', sportivi_per_echipa_min: 1,
  sportivi_per_echipa_max: 1, rezerve_max: 0, max_echipe_per_club: 2, min_participanti_start: 3, ordine_afisare: 1,
  doua_quyenuri: false, status_categorie: 'activa', ...over,
});
// nascut 2017 -> 9 ani la 2026-12-01; grad 6 (fara bump 7/13 ani pentru grad >=6 sub 13 ani)
const mkSp = (id: string, over: any = {}): any => ({
  id, nume: `Nume${id}`, prenume: 'Ana', gen: 'Feminin', status: 'Activ', grad_actual_id: 'g6', data_nasterii: '2017-06-15',
  club_id: 'K1', cluburi: { id: 'K1', nume: 'Club1' }, ...over,
});
const mkIns = (id: string, cat: any, sp: any, over: any = {}): any => ({
  id, competitie_id: 'C', categorie_id: cat.id, club_id: sp.club_id, sportiv_id: sp.id, status: 'inscris',
  taxa_achitata: false, inlantuire_id: null, inlantuire_id_2: null, sportiv: sp, ...over,
});
const mkEch = (id: string, cat: any, membri: any[], over: any = {}): any => ({
  id, competitie_id: 'C', categorie_id: cat.id, club_id: 'K1', denumire_echipa: `Echipa ${id}`, status: 'inscrisa', taxa_achitata: false,
  echipa_sportivi: membri.map(m => ({ sportiv_id: m.id, rol: m.rol ?? 'titular', sportiv: m.sp ?? m })), ...over,
});
const ctxDe = (categorii: any[], inscrieri: any[] = [], echipe: any[] = []): any => ({ categorii, inscrieri, echipe, grade, competitie: comp });

// ---------- cheieRand / compatibile ----------
test('cheieRand: tip:id', () => egal(cheieRand({ tip: 'inscriere', id: 'a' }), 'inscriere:a', 'cheie'));

test('compatibile: proba, tip_participare si arma (null-egal)', () => {
  const a = mkCat('A');
  assert(compatibile(a, mkCat('B')), 'identice');
  assert(compatibile(mkCat('A', { proba_id: null }), mkCat('B', { proba_id: null })), 'proba null-egal');
  assert(!compatibile(a, mkCat('B', { proba_id: 'P2' })), 'proba diferita');
  assert(!compatibile(a, mkCat('B', { tip_participare: 'echipa' })), 'tip diferit');
  assert(!compatibile(a, mkCat('B', { arma: 'baston' })), 'arma diferita');
  assert(compatibile(mkCat('A', { arma: 'baston' }), mkCat('B', { arma: 'baston' })), 'arma egala');
});

// ---------- participanti ----------
test('participanti: doar active, nume/club/grad/quyen/membri, exclude retrase', () => {
  const A = mkCat('A'), B = mkCat('B');
  const s1 = mkSp('1', { nume: 'Popescu', prenume: 'Ana' }), s2 = mkSp('2', { grad_actual_id: 'g9' }), s3 = mkSp('3'), s4 = mkSp('4', { grad_actual_id: null });
  const ins = [
    mkIns('i1', A, s1, { inlantuire: { id: 'q1', denumire: 'Quyen 1' }, inlantuire_2: { id: 'q2', denumire: 'Quyen 2' }, taxa_achitata: true }),
    mkIns('i2', A, s2, { status: 'RETRAS' }),
    mkIns('i3', B, s3),
    mkIns('i4', A, s4),
  ];
  const ech = [
    mkEch('e1', A, [{ id: '5', sp: mkSp('5') }, { id: '6', rol: 'rezerva', sp: mkSp('6') }]),
    mkEch('e2', A, [{ id: '7', sp: mkSp('7') }], { status: 'Retrasa' }),
  ];
  const r = participanti(['A'], ctxDe([A, B], ins, ech));
  egal(r.map(x => x.id).sort(), ['e1', 'i1', 'i4'], 'ids');
  const i1 = r.find(x => x.id === 'i1')!;
  egal(i1.nume, 'POPESCU Ana', 'nume');
  egal(i1.clubNume, 'Club1', 'club');
  egal(i1.gradNume, '1 Câp Roșu', 'grad');
  egal(i1.quyen, 'Quyen 1 + Quyen 2', 'quyen');
  assert(i1.taxaAchitata === true, 'taxaAchitata');
  assert(i1.varsta === 9, 'varsta 9');
  egal(r.find(x => x.id === 'i4')!.gradNume, '—', 'grad necunoscut');
  egal(r.find(x => x.id === 'i4')!.quyen, '—', 'quyen lipsa');
  const e1 = r.find(x => x.id === 'e1')!;
  egal(e1.nume, 'Echipa e1', 'nume echipa');
  egal(e1.membri.map(m => m.id), ['5'], 'membri titulari');
});

test('participantiFaraCategorie: doar randuri active pe categorii ne-active', () => {
  const A = mkCat('A'), B = mkCat('B', { status_categorie: 'anulata' }), C = mkCat('C', { status_categorie: 'fuzionata' });
  const ins = [mkIns('i1', A, mkSp('1')), mkIns('i2', B, mkSp('2')), mkIns('i3', C, mkSp('3')), mkIns('i4', B, mkSp('4'), { status: 'retras' })];
  const ech = [mkEch('e1', B, [{ id: '5', sp: mkSp('5') }])];
  egal(participantiFaraCategorie(ctxDe([A, B, C], ins, ech)).map(x => x.id).sort(), ['e1', 'i2', 'i3'], 'orfani');
});

test('sportiviInscrisi: indivizi activi + membri echipe active, fara dubluri', () => {
  const A = mkCat('A');
  const s1 = mkSp('1'), s2 = mkSp('2'), s3 = mkSp('3');
  const ins = [mkIns('i1', A, s1), mkIns('i2', A, s3, { status: 'retras' })];
  const ech = [mkEch('e1', A, [{ id: '1', sp: s1 }, { id: '2', sp: s2 }]), mkEch('e2', A, [{ id: '3', sp: s3 }], { status: 'retrasa' })];
  egal(sportiviInscrisi('A', ins, ech).sort(), ['1', '2'], 'sportivi');
});

// ---------- planAnulare ----------
test('planAnulare: taxe neachitate/achitate + avertismente, tinta null', () => {
  const A = mkCat('A');
  const ins = [mkIns('i1', A, mkSp('1')), mkIns('i2', A, mkSp('2')), mkIns('i3', A, mkSp('3'), { taxa_achitata: true })];
  const p = planAnulare(A, ctxDe([A], ins));
  assert(p.asteptat === 3, 'asteptat 3');
  egal(p.taxe, { nrNeachitate: 2, sumaNeachitata: 160, nrAchitate: 1, sumaAchitata: 80 }, 'taxe');
  egal(p.blocaje, [], 'fara blocaje');
  assert(p.randuri.every(r => r.tinta === null), 'tinta null');
  assert(p.avertismente.some(a => a.includes('3 participanți rămân «Fără categorie»')), 'avert fara categorie');
  assert(p.avertismente.some(a => a.includes('1 taxe deja achitate (80 lei)')), 'avert achitate');
});

test('planAnulare: categorie deja anulata -> blocaj', () => {
  const A = mkCat('A', { status_categorie: 'anulata' });
  const p = planAnulare(A, ctxDe([A], [mkIns('i1', A, mkSp('1'))]));
  assert(p.blocaje.includes('Categoria nu este activă.'), 'blocaj');
});

// ---------- planMutare ----------
test('planMutare: sugereaza unica tinta eligibila; 2 candidati -> null; incompatibila niciodata', () => {
  const B = mkCat('B', { status_categorie: 'anulata' });
  const X = mkCat('X', { numar_categorie: 2 });
  const Y = mkCat('Y', { proba_id: 'P2' });                         // incompatibila
  const Z = mkCat('Z', { status_categorie: 'anulata' });             // ne-activa
  const i1 = mkIns('i1', B, mkSp('1'));
  const sel = [{ tip: 'inscriere' as const, id: 'i1' }];
  const p1 = planMutare(sel, ctxDe([B, X, Y, Z], [i1]));
  assert(p1.randuri[0].tinta === 'X', `tinta X (a fost ${p1.randuri[0].tinta})`);
  const p2 = planMutare(sel, ctxDe([B, X, Y, Z, mkCat('X2')], [i1]));
  assert(p2.randuri[0].tinta === null, 'doi candidati -> null');
  const p3 = planMutare(sel, ctxDe([B, Y], [i1]));
  assert(p3.randuri[0].tinta === null, 'incompatibila nu se sugereaza');
  const p4 = planMutare([{ tip: 'inscriere', id: 'lipsa' }], ctxDe([B, X], [i1]));
  assert(p4.blocaje.includes('Unele înscrieri nu mai sunt disponibile; reîncarcă.'), 'rand lipsa -> blocaj');
});

// ---------- verificaTinta ----------
test('verificaTinta (mutare): blocaje', () => {
  const A = mkCat('A', { status_categorie: 'anulata' });
  const X = mkCat('X');
  const s1 = mkSp('1');
  const i1 = mkIns('i1', A, s1);
  const ctx = ctxDe([A, X, mkCat('Y', { proba_id: 'P2' }), mkCat('Z', { status_categorie: 'anulata' })], [i1]);
  const rand = participanti(['A'], ctx)[0];
  const cat = (id: string) => ctx.categorii.find((c: any) => c.id === id);
  assert(verificaTinta(rand, X, ctx, 'mutare').blocaj === null, 'X ok');
  assert(!!verificaTinta(rand, cat('Y'), ctx, 'mutare').blocaj, 'incompatibila');
  assert(!!verificaTinta(rand, A, ctx, 'mutare').blocaj, 'categoria curenta');
  assert(!!verificaTinta(rand, cat('Z'), ctx, 'mutare').blocaj, 'ne-activa');
  const ctx2 = ctxDe([A, X], [i1, mkIns('i9', X, s1, { status: 'retras' })]);
  assert(!!verificaTinta(participanti(['A'], ctx2)[0], X, ctx2, 'mutare').blocaj, 'are deja rand in tinta (orice status)');
});

test('verificaTinta: avertismente (alta inscriere activa, eligibilitate, taxa achitata diferita)', () => {
  const A = mkCat('A', { status_categorie: 'anulata' });
  const X = mkCat('X');
  const D = mkCat('D', { varsta_min: 10, varsta_max: 11 });
  const s1 = mkSp('1');
  const ctx = ctxDe([A, X, D], [mkIns('i1', A, s1), mkIns('i2', D, s1)]);
  const rand = participanti(['A'], ctx)[0];
  const v = verificaTinta(rand, X, ctx, 'mutare');
  assert(v.blocaj === null, 'fara blocaj');
  assert(v.avertismente.some(a => a.includes('altă înscriere activă')), 'alta inscriere activa la aceeasi proba');
  const Xvarsta = mkCat('Xv', { varsta_min: 12, varsta_max: 13 });
  const ctx2 = ctxDe([A, Xvarsta], [mkIns('i1', A, s1)]);
  const v2 = verificaTinta(participanti(['A'], ctx2)[0], Xvarsta, ctx2, 'mutare');
  assert(v2.avertismente.some(a => a.includes('Vârsta prea mică')), 'avertisment eligibilitate');
  const compTaxe: any = { ...comp, config_taxe: { individual_tehnica: 80, individual_cvd: 100 } };
  const Xarma = mkCat('Xa', { arma: 'baston' });
  const ctx3 = { ...ctxDe([A, Xarma], [mkIns('i1', A, s1, { taxa_achitata: true })]), competitie: compTaxe };
  const v3 = verificaTinta(participanti(['A'], ctx3)[0], Xarma, ctx3, 'impartire');
  assert(v3.blocaj === null, 'compatibilitatea nu se verifica la impartire');
  assert(v3.avertismente.includes('Taxă achitată 80 lei; în categoria țintă 100 lei — diferența se reglează manual.'), 'taxa diferita');
});

// ---------- mutariDinPlan ----------
test('mutariDinPlan: alegere suprascrie sugestia, nealocate + blocaj, dubluri', () => {
  const B = mkCat('B', { status_categorie: 'anulata' });
  const X = mkCat('X', { numar_categorie: 2 }), X2 = mkCat('X2', { numar_categorie: 3 });
  const s1 = mkSp('1'), s2 = mkSp('2');
  const ins = [mkIns('i1', B, s1), mkIns('i2', B, s2)];
  const ctx = ctxDe([B, X], ins);
  const sel = [{ tip: 'inscriere' as const, id: 'i1' }, { tip: 'inscriere' as const, id: 'i2' }];
  const plan = planMutare(sel, ctx);
  const m1 = mutariDinPlan(plan, {}, ctx);
  egal(m1.mutari.length, 2, 'ambele au sugestie');
  const ctx2 = ctxDe([B, X, X2], ins);
  const plan2 = planMutare(sel, ctx2);          // 2 candidati -> fara sugestie
  const m2 = mutariDinPlan(plan2, { 'inscriere:i1': 'X' }, ctx2);
  assert(m2.nealocate === 1, 'un nealocat');
  assert(m2.blocaje.includes('1 participanți nealocați — alege categoria pe fiecare rând.'), 'blocaj nealocati');
  const m3 = mutariDinPlan(plan2, { 'inscriere:i1': 'X', 'inscriere:i2': 'X2' }, ctx2);
  egal(m3.mutari, [{ tip: 'inscriere', id: 'i1', tinta: 'X' }, { tip: 'inscriere', id: 'i2', tinta: 'X2' }], 'mutari');
  egal(m3.blocaje, [], 'fara blocaje');
  // acelasi sportiv in doua inscrieri catre aceeasi tinta
  const C2 = mkCat('C2', { status_categorie: 'anulata' });
  const ctx4 = ctxDe([B, C2, X], [mkIns('i1', B, s1), mkIns('i3', C2, s1)]);
  const plan4 = planMutare([{ tip: 'inscriere', id: 'i1' }, { tip: 'inscriere', id: 'i3' }], ctx4);
  const m4 = mutariDinPlan(plan4, {}, ctx4);
  assert(m4.blocaje.some(b => b.includes('de două ori')), 'blocaj dublura');
  assert(Array.isArray(m1.avertismente['inscriere:i1']), 'avertismente pe cheieRand');
});

test('categorieDinInput: copie activa cu intervalul nou', () => {
  const A = mkCat('A', { status_categorie: 'anulata', este_fuzionata: true, categorii_fuzionate_din: ['x'] });
  const c = categorieDinInput(A, { cheie: 'N1', denumire: 'D', varsta_min: 10, varsta_max: null, gen: 'Mixt', grad_min_ordine: null, grad_max_ordine: 9 });
  assert(c.id === 'N1' && c.denumire === 'D' && c.varsta_max === null && c.gen === 'Mixt', 'campuri noi');
  assert(c.status_categorie === 'activa' && c.este_fuzionata === false && c.categorii_fuzionate_din === null, 'activa');
});

if (esecuri > 0) { console.log(`\n${esecuri} teste au esuat`); process.exit(1); }
console.log('\nToate testele au trecut');
