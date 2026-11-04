import { gradEfectivLaData } from './eligibilitateCompetitie';

export type TipLipsa = 'fara-arma' | 'fara-categorie' | 'fara-forma' | 'fara-date' | 'echipa-fara-arma';
export interface Lipsa { id: string; tip: TipLipsa; text: string; sportivId?: string; categorieId?: string; probaId?: string }

interface Intrare {
  sportivi: any[]; // sportivii relevanti (selectati / inscrisi / cu arme)
  grade: any[];
  dataCompetitie: string;
  armeAlese: Map<string, Set<string>>;
  categoriePerArma: Map<string, Map<string, unknown>>;
  formaPerArma: Map<string, Map<string, string>>;
  denumireArma: (armaId: string) => string;
  nume: (s: any) => string;
  /** false pana la prima vizita in Pas2: formele se aleg/auto-aleg acolo (optiunile se incarca async), deci nu se semnaleaza mai devreme */
  verificaForme?: boolean;
  /** echipe Song Luyen active ale clubului, fara arma; se semnaleaza doar daca categoria are arma (`categorieArma`) */
  echipeFaraArma?: Array<{ id: string; denumire: string; categorieId?: string; probaId?: string; categorieArma?: string | null }>;
}

/** Lipsurile CVD care blocheaza inscrierea corecta; fiecare tine cont ca fara grad/data nasterii categoria nu se poate calcula. */
export function calculeazaLipsuriCvd(i: Intrare): Lipsa[] {
  const out: Lipsa[] = [];
  for (const s of i.sportivi) {
    const n = i.nume(s);
    const grad = gradEfectivLaData(s, i.grade, i.dataCompetitie);
    if (!grad || !s.data_nasterii) {
      out.push({ id: `date-${s.id}`, tip: 'fara-date', sportivId: s.id, text: `${n}: ${!grad ? 'fără grad' : 'fără dată de naștere'}, categoria nu se poate calcula` });
      continue;
    }
    const alese = i.armeAlese.get(s.id);
    if (!alese || alese.size === 0) {
      out.push({ id: `arma-${s.id}`, tip: 'fara-arma', sportivId: s.id, text: `${n}: nicio armă aleasă` });
      continue;
    }
    for (const armaId of alese) {
      const a = i.denumireArma(armaId);
      if (!i.categoriePerArma.get(s.id)?.has(armaId)) {
        out.push({ id: `cat-${s.id}-${armaId}`, tip: 'fara-categorie', sportivId: s.id, text: `${n} · ${a}: nicio categorie potrivită` });
      } else if (i.verificaForme && !i.formaPerArma.get(s.id)?.get(armaId)) {
        out.push({ id: `forma-${s.id}-${armaId}`, tip: 'fara-forma', sportivId: s.id, text: `${n} · ${a}: formă nealeasă` });
      }
    }
  }
  for (const e of i.echipeFaraArma ?? []) {
    if (!e.categorieArma) continue;
    out.push({ id: `echipa-${e.id}`, tip: 'echipa-fara-arma', categorieId: e.categorieId, probaId: e.probaId, text: `Echipa ${e.denumire}: armă neselectată` });
  }
  return out;
}

/** Completitudine proba individuala CVD: perechi (sportiv, arma) care au categorie; completa = are forma aleasa. */
export function completitudineCvd(
  sportivIds: Iterable<string>,
  armeAlese: Map<string, Set<string>>,
  categoriePerArma: Map<string, Map<string, unknown>>,
  formaPerArma: Map<string, Map<string, string>>,
): { total: number; complet: number; faraForma: number } {
  let total = 0, complet = 0;
  for (const id of sportivIds) {
    for (const armaId of armeAlese.get(id) ?? []) {
      if (!categoriePerArma.get(id)?.has(armaId)) continue;
      total++;
      if (formaPerArma.get(id)?.get(armaId)) complet++;
    }
  }
  return { total, complet, faraForma: total - complet };
}
