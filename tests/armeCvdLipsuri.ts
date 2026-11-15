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
// Faza 42 (D-11, D-13..D-15): arme neeligibile la grad
const alBong = { armeAlese: new Map([['a', new Set(['bong'])]]) };
const faraDrept = () => new Set<string>();
const lipsuri = (extra: any) => calculeazaLipsuriCvd({ ...base, sportivi: [ok], ...extra });
// arma aleasa nepermisa gradului -> arma-neeligibila (nu fara-categorie), avertisment care nu blocheaza
const l1 = lipsuri({ ...alBong, drepturiSportiv: faraDrept });
assert.deepEqual(l1.map(l => l.tip), ['arma-neeligibila']);
assert.ok(l1[0].text.includes('nu blochează'));
// drepturi necunoscute (undefined) -> fara filtrare, comportament de azi
assert.deepEqual(tipuri([ok], { ...alBong, drepturiSportiv: () => undefined }), ['fara-categorie']);
// arma cu drept -> comportament normal
assert.deepEqual(tipuri([ok], { ...alBong, drepturiSportiv: () => new Set(['bong']) }), ['fara-categorie']);
// inscriere existenta pe arma neeligibila -> raman + avertisment (D-14); aleasa si inscrisa = un singur lipsa
const insc = [{ sportivId: 'a', armaId: 'bong' }];
const l2 = lipsuri({ ...alBong, drepturiSportiv: faraDrept, inscrieriArma: insc });
assert.deepEqual(l2.map(l => l.tip), ['arma-neeligibila']);
assert.ok(l2[0].text.includes('înscrierea rămâne'));
// doar inscrisa (nealeasa): avertisment neeligibila, fara crash
assert.equal(lipsuri({ drepturiSportiv: faraDrept, inscrieriArma: insc }).filter(l => l.tip === 'arma-neeligibila').length, 1);
// inscrisa si eligibila -> niciun avertisment de neeligibilitate
assert.equal(lipsuri({ ...alBong, drepturiSportiv: () => new Set(['bong']), inscrieriArma: insc }).filter(l => l.tip === 'arma-neeligibila').length, 0);
// inscriere a unui sportiv absent din i.sportivi -> ignorata
assert.deepEqual(tipuri([ok], { ...alBong, drepturiSportiv: () => undefined, inscrieriArma: [{ sportivId: 'zz', armaId: 'bong' }] }), ['fara-categorie']);
// fara-arma e avertisment care nu blocheaza
assert.ok(lipsuri({})[0].text.includes('nu blochează înscrierea'));

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
