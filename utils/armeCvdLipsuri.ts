import { gradEfectivLaData } from './eligibilitateCompetitie';

export type TipLipsa = 'fara-arma' | 'arma-neeligibila' | 'fara-categorie' | 'fara-forma' | 'fara-date' | 'echipa-fara-arma';
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
  /** Faza 42: ids armelor permise gradului efectiv al sportivului; undefined = necunoscut, fara filtrare */
  drepturiSportiv?: (sportivId: string) => Set<string> | undefined;
  /** Faza 42: inscrierile active ale clubului care poarta arma_id */
  inscrieriArma?: Array<{ sportivId: string; armaId: string }>;
}

/** Lipsurile CVD; doar fara-forma blocheaza (apelantul decide), fara-arma si arma-neeligibila sunt avertismente. Fiecare tine cont ca fara grad/data nasterii categoria nu se poate calcula. */
export function calculeazaLipsuriCvd(i: Intrare): Lipsa[] {
  const out: Lipsa[] = [];
  for (const s of i.sportivi) {
    const n = i.nume(s);
    const grad = gradEfectivLaData(s, i.grade, i.dataCompetitie);
    if (!grad || !s.data_nasterii) {
      out.push({ id: `date-${s.id}`, tip: 'fara-date', sportivId: s.id, text: `${n}: ${!grad ? 'fără grad' : 'fără dată de naștere'}, categoria nu se poate calcula` });
      continue;
    }
    const drept = i.drepturiSportiv?.(s.id);
    const raportate = new Set<string>();
    // D-14: inscrierea pe o arma devenita neeligibila ramane; doar se semnaleaza
    if (drept) {
      for (const { sportivId, armaId } of i.inscrieriArma ?? []) {
        if (sportivId !== s.id || drept.has(armaId) || raportate.has(armaId)) continue;
        raportate.add(armaId);
        out.push({ id: `neelig-insc-${s.id}-${armaId}`, tip: 'arma-neeligibila', sportivId: s.id, text: `${n} · ${i.denumireArma(armaId)}: înscris, dar arma nu mai este permisă gradului la data competiției — înscrierea rămâne; verifică gradul sau retrage-o` });
      }
    }
    const alese = i.armeAlese.get(s.id);
    if (!alese || alese.size === 0) {
      out.push({ id: `arma-${s.id}`, tip: 'fara-arma', sportivId: s.id, text: `${n}: nicio armă aleasă (avertisment, nu blochează înscrierea)` });
      continue;
    }
    for (const armaId of alese) {
      const a = i.denumireArma(armaId);
      if (drept && !drept.has(armaId)) {
        if (!raportate.has(armaId)) out.push({ id: `neelig-${s.id}-${armaId}`, tip: 'arma-neeligibila', sportivId: s.id, text: `${n} · ${a}: armă nepermisă gradului la data competiției — nu se înscrie (avertisment, nu blochează)` });
        continue;
      }
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
