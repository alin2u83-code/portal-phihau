import assert from 'node:assert/strict';
import {
  ARME_GIAO_DAU_CVD, ORDINE_PRIMA_CENTURA_NEAGRA, motivCombinatieInterzisa, categoriePentruArma,
  conflicteCategorie, armePermiseGiaoDau, armeStale, avertismentStagii,
} from '../utils/armeCvd';

// Fixture sintetice; tipurile urmeaza migrarea 20261105a (Long Gian = articulata, Moc Guom = lemn)
const mk = (denumire: string, tip: any, ordine: number): any => ({ id: denumire, denumire, tip, ordine, activ: true });
const bong = mk('Bong', 'lemn', 510), songCot = mk('Song Cot', 'lemn', 530), mocCan = mk('Moc Can', 'lemn', 540);
const mocGuom = mk('Moc Guom', 'lemn', 550), maDao = mk('Ma Dao', 'lama', 580);
const longGian = mk('Long Gian', 'articulata', 520), longGian2 = mk('2 Long Gian', 'articulata', 600);
const arme = [bong, songCot, mocCan, mocGuom, maDao, longGian, longGian2];

assert.equal(ORDINE_PRIMA_CENTURA_NEAGRA, 19);

// combinatii interzise
assert.notEqual(motivCombinatieInterzisa(bong, songCot, 16), null);
assert.equal(motivCombinatieInterzisa(bong, songCot, 19), null);
assert.notEqual(motivCombinatieInterzisa(maDao, longGian, 23), null);
assert.notEqual(motivCombinatieInterzisa(longGian, maDao, 23), null);
assert.equal(motivCombinatieInterzisa(mocGuom, maDao, 23), null);
assert.equal(motivCombinatieInterzisa(bong, bong, 16), null);

// categorii (sportiv 42 ani, grad 23, competitie 2026-12-05)
const cat = (id: string, gradMin: number, gradMax: number, arma: string, ord: number): any => ({
  id, varsta_min: 40, varsta_max: 49, gen: 'Masculin', grad_min_ordine: gradMin, grad_max_ordine: gradMax, arma, ordine_afisare: ord,
});
const categorii = [cat('cBong', 21, 24, 'Bong', 1), cat('cGuom', 19, 24, 'Moc Guom', 2), cat('cLama', 19, 24, 'Arme cu lamă și articulate', 3)];
const lungu: any = { data_nasterii: '1984-03-10', gen: 'Masculin' };
const pt = (a: any) => categoriePentruArma(a, lungu, 23, '2026-12-05', categorii, arme)?.id ?? null;
assert.equal(pt(bong), 'cBong');
assert.equal(pt(mocGuom), 'cGuom');
assert.equal(pt(maDao), 'cLama');
assert.equal(pt(longGian), 'cLama'); // articulata intra in "Arme cu lamă și articulate"
assert.equal(pt(songCot), null);
const fixtureFaraLama = categorii.slice(0, 2);
assert.equal(categoriePentruArma(longGian, lungu, 23, '2026-12-05', fixtureFaraLama, arme), null);
// "2 Long Gian" nu se potriveste cu "Long Gian" exact
assert.equal(categoriePentruArma(longGian2, lungu, 23, '2026-12-05', [cat('cLG', 19, 24, 'Long Gian', 1)], arme), null);
assert.equal(categoriePentruArma(longGian, lungu, 23, '2026-12-05', [cat('c2', 19, 24, '2 Long Gian', 1)], arme), null);
// gen, varsta, grad, arma null, Mixt, limite null, ordine_afisare minim
assert.equal(categoriePentruArma(bong, { ...lungu, gen: 'Feminin' }, 23, '2026-12-05', [categorii[0]], arme), null);
assert.equal(categoriePentruArma(bong, lungu, 20, '2026-12-05', [categorii[0]], arme), null);
assert.equal(categoriePentruArma(bong, { ...lungu, data_nasterii: '1990-01-01' }, 23, '2026-12-05', [categorii[0]], arme), null);
assert.equal(categoriePentruArma(bong, { ...lungu, data_nasterii: null }, 23, '2026-12-05', [categorii[0]], arme), null);
assert.equal(categoriePentruArma(bong, lungu, 23, '2026-12-05', [{ ...categorii[0], arma: null }], arme), null);
assert.equal(categoriePentruArma(bong, lungu, 3, '2026-12-05', [{ ...categorii[0], gen: 'Mixt', grad_min_ordine: null, grad_max_ordine: null, varsta_max: null }], arme)?.id, 'cBong');
assert.equal(categoriePentruArma(bong, lungu, 23, '2026-12-05', [{ ...categorii[0], id: 'x', ordine_afisare: 9 }, { ...categorii[0], id: 'y', ordine_afisare: 2 }], arme)?.id, 'y');

// conflicte
assert.deepEqual(conflicteCategorie([{ armaId: 'a', categorieId: 'c1' }, { armaId: 'b', categorieId: 'c1' }]), ['b']);
assert.deepEqual(conflicteCategorie([{ armaId: 'a', categorieId: null }, { armaId: 'b', categorieId: null }]), []);

// giao dau
const gd = armePermiseGiaoDau(arme).map(a => a.denumire);
assert.deepEqual(gd, ['Bong', 'Song Cot', 'Moc Can', 'Moc Guom', 'Long Gian']);
assert.deepEqual([...ARME_GIAO_DAU_CVD], ['Bong', 'Song Cot', 'Moc Can', 'Moc Guom', 'Long Gian']);
assert.ok(!gd.includes('2 Long Gian'));

// stale
assert.deepEqual(armeStale(['a', 'b'], ['a']), ['b']);

// stagii
const cerinte = [{ grad_min_ordine: 21, grad_max_ordine: 24, stagii_nationale: 5 }];
assert.notEqual(avertismentStagii(23, 1, cerinte), null);
assert.equal(avertismentStagii(23, 5, cerinte), null);
assert.equal(avertismentStagii(10, 0, cerinte), null);

console.log('armeCvd_reguli: OK');
