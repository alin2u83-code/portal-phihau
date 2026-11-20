/**
 * Test colocat pentru utils/dateLaCerere.ts (Faza 38 D-01: harta view -> date grele).
 *
 * Proiectul nu are vitest/jest configurat.
 * Rulare: npx tsx utils/dateLaCerere.test.ts
 * Pattern identic cu utils/categoriiAdmin.test.ts; iesire non-zero la esec.
 *
 * Seturile din testele "explicit" sunt cele TRASATE din codul real al fiecarui ecran
 * (vezi 38-05-SUMMARY.md); daca un ecran incepe sa citeasca o cheie noua, testul trebuie actualizat odata cu harta.
 */

import { TOATE_CHEILE_LA_CERERE, cheiPentruView } from './dateLaCerere';
import type { CheieLaCerere, View } from '../types';

let esecuri = 0;
function test(nume: string, fn: () => void): void {
  try { fn(); console.log(`PASS: ${nume}`); } catch (e: any) { esecuri++; console.log(`FAIL: ${nume} -> ${e?.message ?? e}`); }
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
const sortat = (a: readonly string[]) => [...a].sort();
function egal(a: readonly string[], b: readonly string[], msg: string): void {
  if (JSON.stringify(sortat(a)) !== JSON.stringify(sortat(b))) throw new Error(`${msg}: [${sortat(a)}] != [${sortat(b)}]`);
}

const HUB: CheieLaCerere[] = [
  'plati', 'tranzactii', 'istoricPlatiDetaliat', 'reduceri', 'preturiConfig',
  'vizeSportivi', 'decontSportivi', 'deconturiFederatie', 'taxaAnualaFederatieConfig', 'inscrieriExamene',
];

// Toate view-urile din switch-ul AppRouter (+ cateva care nu sunt in harta).
const VIEW_URI_ROUTER: View[] = [
  'legitimatii', 'import-sportivi', 'istoric-activitate', 'jurnal-audit', 'conturi-cluburi', 'deduplicare-sportivi',
  'cereri-inscriere', 'protectia-datelor', 'cereri-gdpr', 'admin-console', 'federation-dashboard', 'admin-dashboard',
  'dashboard', 'my-portal', 'sportivi', 'profil-sportiv', 'structura-federatie', 'examene', 'stagii', 'competitii',
  'template-probe', 'activitati-nationale', 'inlantuiri-admin', 'admin-sms', 'prezenta', 'prezenta-instructor',
  'raport-lunar-prezenta', 'program-antrenamente', 'rapoarte', 'grupe', 'activitati', 'raport-prezenta',
  'raport-interval-examen', 'calendar', 'plati-hub', 'plati-scadente', 'gestiune-facturi', 'facturi-fara-prezenta',
  'jurnal-incasari', 'raport-financiar', 'financial-dashboard', 'tipuri-abonament', 'configurare-preturi', 'reduceri',
  'taxe-anuale', 'nomenclatoare', 'deconturi-federatie', 'perioade-vacanta', 'produse', 'vanzari-produse',
  'user-management', 'cluburi', 'anunturi-federatie', 'data-maintenance', 'rapoarte-examen', 'setari-club', 'grade',
  'audit-grade', 'familii', 'notificari', 'sezoane', 'istoric-prezenta', 'istoric-plati', 'account-settings',
  'fisa-digitala', 'fisa-competitie', 'button-catalog', 'setup-mfa',
];

test('setup-mfa nu cere nimic', () => {
  egal(cheiPentruView('setup-mfa', 'ADMIN_CLUB'), [], 'setup-mfa');
  egal(cheiPentruView('setup-mfa', null), [], 'setup-mfa fara rol');
});

test('view nemapat cade pe TOATE_CHEILE_LA_CERERE', () => {
  egal(cheiPentruView('button-catalog', 'ADMIN_CLUB'), TOATE_CHEILE_LA_CERERE, 'button-catalog');
  egal(cheiPentruView('profil-sportiv', 'ADMIN_CLUB'), TOATE_CHEILE_LA_CERERE, 'profil-sportiv');
  egal(cheiPentruView('examene', 'INSTRUCTOR'), TOATE_CHEILE_LA_CERERE, 'examene');
});

test('TOATE_CHEILE_LA_CERERE are cele 12 chei grele, fara istoricul complet de prezenta', () => {
  assert(TOATE_CHEILE_LA_CERERE.length === 12, `lungime ${TOATE_CHEILE_LA_CERERE.length}`);
  assert(!TOATE_CHEILE_LA_CERERE.includes('antrenamenteIstoricComplet' as CheieLaCerere), 'contine istoricul complet');
  assert(new Set(TOATE_CHEILE_LA_CERERE).size === 12, 'duplicate');
});

test('niciun view din router nu cere antrenamenteIstoricComplet (il cer componentele, 38-06)', () => {
  for (const v of VIEW_URI_ROUTER) {
    for (const rol of [null, 'SPORTIV', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE']) {
      assert(!cheiPentruView(v, rol).includes('antrenamenteIstoricComplet'), `${v}/${rol}`);
    }
  }
});

test('rezultatul nu are duplicate si nu e sursa de mutatie partajata', () => {
  for (const v of VIEW_URI_ROUTER) {
    const r = cheiPentruView(v, 'ADMIN_CLUB');
    assert(new Set(r).size === r.length, `duplicate la ${v}`);
  }
  cheiPentruView('button-catalog', null).pop();
  assert(TOATE_CHEILE_LA_CERERE.length === 12, 'TOATE_CHEILE_LA_CERERE mutat de apelant');
});

test('toate aliasurile hub-ului Plati & Facturi cer setul complet financiar + taxe', () => {
  const aliasuri: View[] = [
    'plati-hub', 'plati-scadente', 'gestiune-facturi', 'facturi-fara-prezenta', 'jurnal-incasari', 'raport-financiar',
    'financial-dashboard', 'tipuri-abonament', 'configurare-preturi', 'reduceri', 'taxe-anuale', 'nomenclatoare',
    'deconturi-federatie', 'perioade-vacanta', 'produse', 'vanzari-produse',
  ];
  for (const v of aliasuri) egal(cheiPentruView(v, 'ADMIN_CLUB'), HUB, v);
});

test('dashboard admin = plati + inscrieriExamene + deconturiFederatie (strict submultime)', () => {
  for (const v of ['dashboard', 'my-portal'] as View[]) {
    for (const rol of ['ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE', 'ADMIN']) {
      const r = cheiPentruView(v, rol);
      egal(r, ['plati', 'inscrieriExamene', 'deconturiFederatie'], `${v}/${rol}`);
      assert(r.length < TOATE_CHEILE_LA_CERERE.length, 'nu e submultime stricta');
    }
  }
});

test('dashboard sportiv = plati + istoricGrade + inscrieriExamene + rezultate', () => {
  for (const v of ['dashboard', 'my-portal'] as View[]) {
    egal(cheiPentruView(v, 'SPORTIV'), ['plati', 'istoricGrade', 'inscrieriExamene', 'rezultate'], v);
  }
});

test('dashboard cu rol necunoscut/lipsa = reuniunea celor doua (plasa de siguranta)', () => {
  const uniune = ['plati', 'inscrieriExamene', 'deconturiFederatie', 'istoricGrade', 'rezultate'];
  egal(cheiPentruView('dashboard', null), uniune, 'null');
  egal(cheiPentruView('my-portal', 'REPREZENTANT_COMPETITIE'), uniune, 'reprezentant');
});

test('dashboard-urile de federatie nu cer date grele (interogari proprii)', () => {
  egal(cheiPentruView('federation-dashboard', 'SUPER_ADMIN_FEDERATIE'), [], 'federation-dashboard');
  egal(cheiPentruView('admin-dashboard', 'SUPER_ADMIN_FEDERATIE'), [], 'admin-dashboard');
});

test('sportivi cere plati, istoricPlatiDetaliat, tranzactii (+ reduceri pentru FacturaDetaliu)', () => {
  const r = cheiPentruView('sportivi', 'ADMIN_CLUB');
  for (const k of ['plati', 'istoricPlatiDetaliat', 'tranzactii'] as CheieLaCerere[]) assert(r.includes(k), `lipseste ${k}`);
  egal(r, ['plati', 'tranzactii', 'istoricPlatiDetaliat', 'reduceri'], 'sportivi');
});

test('competitii cere vizeSportivi; fisa-competitie cere inscrieriExamene', () => {
  egal(cheiPentruView('competitii', 'ADMIN_CLUB'), ['vizeSportivi'], 'competitii');
  egal(cheiPentruView('fisa-competitie', 'SPORTIV'), ['inscrieriExamene'], 'fisa-competitie');
});

test('ecranele de prezenta/grupe/program nu cer nimic de la harta (istoricul complet il cer componentele)', () => {
  const goale: View[] = [
    'grupe', 'prezenta', 'prezenta-instructor', 'program-antrenamente', 'activitati',
    'raport-prezenta', 'raport-lunar-prezenta', 'istoric-prezenta', 'rapoarte',
  ];
  for (const v of goale) egal(cheiPentruView(v, 'ADMIN_CLUB'), [], v);
});

test('calendar cere rezultate + preturiConfig; raport-interval-examen cere istoricGrade', () => {
  egal(cheiPentruView('calendar', 'ADMIN_CLUB'), ['rezultate', 'preturiConfig'], 'calendar');
  egal(cheiPentruView('raport-interval-examen', 'INSTRUCTOR'), ['istoricGrade'], 'raport-interval-examen');
});

test('istoric-plati personal cere plati + istoricPlatiDetaliat + inscrieriExamene (denumire taxa examen)', () => {
  egal(cheiPentruView('istoric-plati', 'SPORTIV'), ['plati', 'istoricPlatiDetaliat', 'inscrieriExamene'], 'istoric-plati');
});

test('ecranele administrative fara date grele nu cer nimic; audit-grade cere istoricGrade', () => {
  const goale: View[] = [
    'legitimatii', 'jurnal-audit', 'conturi-cluburi', 'cereri-inscriere', 'protectia-datelor', 'cereri-gdpr',
    'structura-federatie', 'template-probe', 'activitati-nationale', 'inlantuiri-admin', 'user-management', 'cluburi',
    'anunturi-federatie', 'setari-club', 'grade', 'notificari', 'sezoane', 'account-settings',
  ];
  for (const v of goale) egal(cheiPentruView(v, 'ADMIN_CLUB'), [], v);
  egal(cheiPentruView('audit-grade', 'ADMIN_CLUB'), ['istoricGrade'], 'audit-grade');
});

test('view-urile largi (profil, examene, rapoarte examen, backup, fisa digitala, familii, stagii) raman pe plasa de siguranta', () => {
  const largi: View[] = ['profil-sportiv', 'examene', 'rapoarte-examen', 'data-maintenance', 'fisa-digitala', 'familii', 'stagii', 'admin-sms', 'import-sportivi', 'istoric-activitate', 'deduplicare-sportivi', 'admin-console'];
  for (const v of largi) egal(cheiPentruView(v, 'ADMIN_CLUB'), TOATE_CHEILE_LA_CERERE, v);
});

if (esecuri > 0) { console.log(`\n${esecuri} teste au esuat`); process.exit(1); }
console.log('\nToate testele au trecut');
