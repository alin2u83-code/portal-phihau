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
  /** echipe Song Luyen active ale clubului, fara arma */
  echipeFaraArma?: Array<{ id: string; denumire: string; categorieId?: string; probaId?: string }>;
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
      } else if (!i.formaPerArma.get(s.id)?.get(armaId)) {
        out.push({ id: `forma-${s.id}-${armaId}`, tip: 'fara-forma', sportivId: s.id, text: `${n} · ${a}: formă nealeasă` });
      }
    }
  }
  for (const e of i.echipeFaraArma ?? []) {
    out.push({ id: `echipa-${e.id}`, tip: 'echipa-fara-arma', categorieId: e.categorieId, probaId: e.probaId, text: `Echipa ${e.denumire}: armă neselectată` });
  }
  return out;
}
