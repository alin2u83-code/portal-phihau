// Faza 42: helperi puri (fara Supabase). Regula FRAM oglindeste trigger-ul trg_participant_fram din
// migrarea 20261115b (an = anul data_inceput, platit = scutit sau plata Achitat) - se schimba impreuna.
import type { Competitie, VizaSportiv, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie } from '../types';
import { areTaxaAchitata } from './taxeAnuale';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from './taxeCompetitie';
import { categorieActiva } from '../components/Competitii/constants';

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

/** D-09: taxa datorata pentru un participant intr-o categorie; 0 pe categorie ne-activa (aceeasi regula ca taxaAnulata din taxeCompetitie). */
export function taxaParticipare(competitie: Competitie, tip: 'inscriere' | 'echipa', cat: CategorieCompetitie | undefined): number {
  if (cat && !categorieActiva(cat)) return 0;
  if (tip === 'inscriere') return calculeazaTaxaIndividuala(competitie, cat);
  return cat ? calculeazaTaxaEchipa(cat, competitie) : (competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120);
}

export interface MutareCategorieAudit { tip: 'inscriere' | 'echipa'; id: string; categorieVeche: string; categorieNoua: string; data: string }

export interface TaxaDeReglat {
  tip: 'inscriere' | 'echipa'; id: string; clubId: string; nume: string;
  categorieInitiala: string; categorieCurenta: string;
  taxaVeche: number; taxaNoua: number; achitata: boolean; data: string;
}

/** D-09: mutari de categorie (din audit_log) care schimba taxa calculata sau numarul de taxe datorate; nimic nu se recalculeaza/factureaza. */
export function taxeDeReglatDupaMutari(
  mutari: MutareCategorieAudit[],
  ctx: { competitie: Competitie; categorii: CategorieCompetitie[]; inscrieri: InscriereCompetitie[]; echipe: EchipaCompetitie[] },
): TaxaDeReglat[] {
  const grupuri = new Map<string, MutareCategorieAudit[]>();
  for (const m of mutari) {
    const k = `${m.tip}:${m.id}`;
    grupuri.set(k, [...(grupuri.get(k) ?? []), m]);
  }
  const numeCat = (id: string) => { const c = ctx.categorii.find(x => x.id === id); return c ? (c.denumire ?? `Categoria ${c.numar_categorie}`) : '—'; };
  const out: TaxaDeReglat[] = [];
  for (const lista of grupuri.values()) {
    const sortate = [...lista].sort((a, b) => a.data.localeCompare(b.data));
    const { tip, id } = sortate[0];
    const rand = tip === 'inscriere' ? ctx.inscrieri.find(i => i.id === id) : ctx.echipe.find(e => e.id === id);
    if (!rand || /^retras/i.test(rand.status ?? '')) continue;
    const initiala = sortate[0].categorieVeche;
    const taxaVeche = taxaParticipare(ctx.competitie, tip, ctx.categorii.find(c => c.id === initiala));
    const taxaNoua = taxaParticipare(ctx.competitie, tip, ctx.categorii.find(c => c.id === rand.categorie_id));
    if (taxaVeche === taxaNoua) continue;
    const sp = tip === 'inscriere' ? ((rand as InscriereCompetitie).sportiv as any) : null;
    out.push({
      tip, id, clubId: rand.club_id,
      nume: tip === 'inscriere' ? (sp ? `${String(sp.nume ?? '').toUpperCase()} ${sp.prenume ?? ''}`.trim() : (rand as InscriereCompetitie).sportiv_id) : ((rand as EchipaCompetitie).denumire_echipa || 'Echipă'),
      categorieInitiala: numeCat(initiala), categorieCurenta: numeCat(rand.categorie_id),
      taxaVeche, taxaNoua, achitata: !!rand.taxa_achitata, data: sortate[sortate.length - 1].data,
    });
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
}
