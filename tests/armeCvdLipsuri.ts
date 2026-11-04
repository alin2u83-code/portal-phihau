import assert from 'node:assert/strict';
import { calculeazaLipsuriCvd } from '../utils/armeCvdLipsuri';

const grade: any[] = [{ id: 'g1', ordine: 5, nume: 'Grad 5' }];
const ok: any = { id: 'a', data_nasterii: '2000-01-01', grad_actual_id: 'g1' };
const base = {
  grade, dataCompetitie: '2026-12-05', armeAlese: new Map(), categoriePerArma: new Map(), formaPerArma: new Map(),
  denumireArma: (id: string) => id, nume: (s: any) => s.id,
};
const tipuri = (sportivi: any[], extra: any = {}) => calculeazaLipsuriCvd({ ...base, sportivi, ...extra }).map(l => l.tip);

// fara data nastere -> doar fara-date (nu mai calculeaza restul)
assert.deepEqual(tipuri([{ ...ok, id: 'x', data_nasterii: null }]), ['fara-date']);
// fara arma
assert.deepEqual(tipuri([ok]), ['fara-arma']);
// arma fara categorie
assert.deepEqual(tipuri([ok], { armeAlese: new Map([['a', new Set(['bong'])]]) }), ['fara-categorie']);
// categorie ok, forma lipsa
const cat = new Map([['a', new Map([['bong', {}]])]]);
assert.deepEqual(tipuri([ok], { armeAlese: new Map([['a', new Set(['bong'])]]), categoriePerArma: cat, verificaForme: true }), ['fara-forma']);
// forma nu se semnaleaza pana la vizita in Pas2
assert.deepEqual(tipuri([ok], { armeAlese: new Map([['a', new Set(['bong'])]]), categoriePerArma: cat }), []);
// totul setat
const forma = new Map([['a', new Map([['bong', 'f1']])]]);
assert.deepEqual(tipuri([ok], { armeAlese: new Map([['a', new Set(['bong'])]]), categoriePerArma: cat, formaPerArma: forma, verificaForme: true }), []);
// echipa fara arma
assert.deepEqual(tipuri([], { echipeFaraArma: [{ id: 'e1', denumire: 'E', categorieArma: 'Bong' }] }), ['echipa-fara-arma']);
// categorie fara arma -> nu se semnaleaza
assert.deepEqual(tipuri([], { echipeFaraArma: [{ id: 'e1', denumire: 'E', categorieArma: null }] }), []);
// completitudine hub CVD
import { completitudineCvd } from '../utils/armeCvdLipsuri';
const al = new Map([['a', new Set(['bong', 'guom', 'dao'])]]);
const ct = new Map([['a', new Map<string, unknown>([['bong', {}], ['guom', {}], ['dao', {}]])]]);
const fm = (n: number) => new Map([['a', new Map(['bong', 'guom', 'dao'].slice(0, n).map(x => [x, 'f'] as [string, string]))]]);
assert.deepEqual(completitudineCvd(['a'], al, ct, fm(3)), { total: 3, complet: 3, faraForma: 0 });
assert.deepEqual(completitudineCvd(['a'], al, ct, fm(1)), { total: 3, complet: 1, faraForma: 2 });
// arma fara categorie nu conteaza in total
assert.deepEqual(completitudineCvd(['a'], al, new Map([['a', new Map<string, unknown>([['bong', {}]])]]), fm(1)), { total: 1, complet: 1, faraForma: 0 });
assert.deepEqual(completitudineCvd([], al, ct, fm(0)), { total: 0, complet: 0, faraForma: 0 });
console.log('OK');
