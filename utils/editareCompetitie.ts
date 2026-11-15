// Faza 42: helperi puri (fara Supabase). Regula FRAM oglindeste trigger-ul trg_participant_fram din
// migrarea 20261115b (an = anul data_inceput, platit = scutit sau plata Achitat) - se schimba impreuna.
import type { Competitie, VizaSportiv } from '../types';
import { areTaxaAchitata } from './taxeAnuale';

/** Anul FRAM al competitiei = EXTRACT(YEAR FROM data_inceput) din SQL; fara Date (fara shift de fus orar). */
export const anFramCompetitie = (c: Pick<Competitie, 'data_inceput'>): number => Number(c.data_inceput.slice(0, 4));

export type StareFram = 'ok' | 'avertisment' | 'blocat' | 'exceptie';

/** Decizie UX; poarta reala e trigger-ul din DB. */
export function statusFram(
  c: Pick<Competitie, 'data_inceput' | 'fram_obligatoriu'>,
  sportivId: string,
  vize: VizaSportiv[],
  esteSuperAdmin: boolean,
): StareFram {
  if (areTaxaAchitata(vize, sportivId, 'FRAM', anFramCompetitie(c))) return 'ok';
  if (!c.fram_obligatoriu) return 'avertisment';
  return esteSuperAdmin ? 'exceptie' : 'blocat';
}

export interface MembruEchipa { sportiv_id: string; rol: 'titular' | 'rezerva' }

/** Apelantul scrie in ordinea: adauga, schimbaRol, scoate - nu sterge niciodata inainte sa scrie noii membri. */
export function diferentaMembri(vechi: MembruEchipa[], noi: MembruEchipa[]) {
  const nou = new Map(noi.map(m => [m.sportiv_id, m] as const)); // dubluri: ultima aparitie castiga
  const vech = new Map(vechi.map(m => [m.sportiv_id, m] as const));
  const lista = [...nou.values()];
  return {
    adauga: lista.filter(m => !vech.has(m.sportiv_id)),
    schimbaRol: lista.filter(m => vech.has(m.sportiv_id) && vech.get(m.sportiv_id)!.rol !== m.rol),
    scoate: [...vech.keys()].filter(id => !nou.has(id)),
  };
}
