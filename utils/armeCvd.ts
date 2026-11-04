/**
 * Reguli pure pentru selectia armelor la competitii CVD (fara UI, fara DB).
 */
import type { Arma, CategorieCompetitie, Sportiv } from '../types';
import { calculeazaVarstaLaData } from './eligibilitateCompetitie';

// Prima centura neagra (grad.ordine), din comentariul migrarii 20261102c
export const ORDINE_PRIMA_CENTURA_NEAGRA = 19;

export const ARME_GIAO_DAU_CVD: readonly string[] = ['Bong', 'Song Cot', 'Moc Can', 'Moc Guom', 'Long Gian'];

const TOKEN_LAMA_ARTICULATA = 'Arme cu lamă și articulate';
const norm = (s: string) => s.trim().toLowerCase();

/** Motivul pentru care doua arme nu se pot combina, sau null daca e permis. */
export function motivCombinatieInterzisa(a: Arma, b: Arma, gradOrdine: number): string | null {
  if (a.id === b.id) return null;
  if ((a.tip === 'lama' && b.tip === 'articulata') || (a.tip === 'articulata' && b.tip === 'lama')) {
    return 'Lamă și articulată nu se pot combina';
  }
  if (gradOrdine < ORDINE_PRIMA_CENTURA_NEAGRA) {
    const grup = ['long gian', 'song cot', 'moc can'];
    const [x, y] = [norm(a.denumire), norm(b.denumire)];
    if ((x === 'bong' && grup.includes(y)) || (y === 'bong' && grup.includes(x))) {
      return 'Grade 1-4 CAP: Bong nu se combină cu Long Gian/Song Cot/Moc Can';
    }
  }
  return null;
}

/** Categoria in care intra sportivul cu arma data (cea cu ordine_afisare minim), sau null. */
export function categoriePentruArma(
  arma: Arma, sportiv: Sportiv, gradOrdine: number, dataCompetitie: string,
  categorii: CategorieCompetitie[], arme: Arma[],
): CategorieCompetitie | null {
  if (!sportiv.data_nasterii) return null;
  const varsta = calculeazaVarstaLaData(sportiv.data_nasterii, dataCompetitie);
  const den = norm(arma.denumire);
  const potrivite = categorii.filter(c => {
    if (!c.arma) return false;
    if (c.varsta_min > varsta || (c.varsta_max != null && c.varsta_max < varsta)) return false;
    if (c.gen !== 'Mixt' && c.gen !== sportiv.gen) return false;
    if (c.grad_min_ordine != null && gradOrdine < c.grad_min_ordine) return false;
    if (c.grad_max_ordine != null && gradOrdine > c.grad_max_ordine) return false;
    return c.arma.split(' / ').map(norm).some(t =>
      t === norm(TOKEN_LAMA_ARTICULATA)
        ? arme.some(x => x.id === arma.id && (x.tip === 'lama' || x.tip === 'articulata'))
        : t === den);
  });
  potrivite.sort((p, q) => p.ordine_afisare - q.ordine_afisare);
  return potrivite[0] ?? null;
}

/** Armele (dupa id) a caror categorie e deja luata de o arma anterioara. */
export function conflicteCategorie(alegeri: Array<{ armaId: string; categorieId: string | null }>): string[] {
  const vazute = new Set<string>();
  const conflicte: string[] = [];
  for (const { armaId, categorieId } of alegeri) {
    if (categorieId === null) continue;
    if (vazute.has(categorieId)) conflicte.push(armaId);
    else vazute.add(categorieId);
  }
  return conflicte;
}

export function armePermiseGiaoDau(arme: Arma[]): Arma[] {
  const permise = ARME_GIAO_DAU_CVD.map(norm);
  return arme.filter(a => permise.includes(norm(a.denumire)));
}

/** Armele alese care nu mai sunt disponibile (ex. dupa promovare de grad). */
export function armeStale(alese: string[], disponibile: string[]): string[] {
  return alese.filter(id => !disponibile.includes(id));
}

export function avertismentStagii(
  gradOrdine: number, nrStagiiLaArma: number,
  cerinte: Array<{ grad_min_ordine: number; grad_max_ordine: number; stagii_nationale: number }>,
): string | null {
  const c = cerinte.find(r => r.grad_min_ordine <= gradOrdine && gradOrdine <= r.grad_max_ordine);
  if (!c || nrStagiiLaArma >= c.stagii_nationale) return null;
  return `Sunt necesare ${c.stagii_nationale} stagii naționale la această armă, efectuate: ${nrStagiiLaArma}`;
}
