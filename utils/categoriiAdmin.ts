/**
 * Faza 41: preview-uri pure (fără Supabase) pentru anulare / mutare / fuziune / împărțire categorii.
 * Calculate pe datele deja încărcate; RPC-ul categorii_aplica_operatie re-validează pe server (41-01).
 */
import { categorieActiva } from '../components/Competitii/constants';
import { verificaEligibilitate, gradEfectivLaData, calculeazaVarstaLaData } from './eligibilitateCompetitie';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from './taxeCompetitie';
import { buildCategorieDenumire } from './competitiiTemplates';
import type {
  CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad, Competitie, Sportiv,
  OperatieCategorii, CategorieNouaInput, MutareCategorie,
} from '../types';

export interface ParticipantCategorie {
  tip: 'inscriere' | 'echipa';
  id: string;
  categorieId: string;
  clubId: string;
  nume: string;
  clubNume: string;
  gradNume: string;
  varsta: number | null;
  gen: 'Feminin' | 'Masculin' | null;
  quyen: string;
  taxaAchitata: boolean;
  sportivId: string | null;
  sportiv: Sportiv | null;
  membri: Sportiv[];
}

/** tinta: cheia unei categorii noi sau id-ul uneia existente; null = alegere manuală. */
export interface RandPlanCategorie extends ParticipantCategorie { tinta: string | null }

export interface PlanOperatieCategorii {
  operatie: OperatieCategorii;
  surse: string[];
  categoriiNoi: CategorieNouaInput[];
  randuri: RandPlanCategorie[];
  blocaje: string[];
  avertismente: string[];
  asteptat: number | null;
  taxe: { nrNeachitate: number; sumaNeachitata: number; nrAchitate: number; sumaAchitata: number } | null;
}

export interface RezultatMutari {
  mutari: MutareCategorie[];
  nealocate: number;
  blocaje: string[];
  avertismente: Record<string, string[]>;
}

export type CriteriuImpartire = 'varsta' | 'grad' | 'gen';

export interface CtxCategorii {
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  competitie: Competitie;
}

const NEDEFINIT = '—';
const retras = (s?: string | null) => /^retras/i.test(s ?? '');
const cmp = (a: string, b: string) => a.localeCompare(b, 'ro-RO');
const membriEchipa = (e: EchipaCompetitie) => e.echipa_sportivi ?? e.sportivi ?? [];

export const cheieRand = (r: { tip: string; id: string }): string => `${r.tip}:${r.id}`;

export function compatibile(a: CategorieCompetitie, b: CategorieCompetitie): boolean {
  return (a.proba_id ?? null) === (b.proba_id ?? null)
    && a.tip_participare === b.tip_participare
    && (a.arma ?? null) === (b.arma ?? null);
}

/** Categorie „virtuală” (încă neinserată) cu id = cheia ei, ca să se poată reutiliza verificaEligibilitate. */
export function categorieDinInput(sursa: CategorieCompetitie, n: CategorieNouaInput): CategorieCompetitie {
  return {
    ...sursa, id: n.cheie, denumire: n.denumire, varsta_min: n.varsta_min, varsta_max: n.varsta_max, gen: n.gen,
    grad_min_ordine: n.grad_min_ordine, grad_max_ordine: n.grad_max_ordine,
    status_categorie: 'activa', este_fuzionata: false, categorii_fuzionate_din: null,
  };
}

function gradNumePentru(sp: Sportiv | null | undefined, ctx: CtxCategorii): string {
  if (!sp) return NEDEFINIT;
  return gradEfectivLaData(sp, ctx.grade, ctx.competitie.data_inceput)?.nume ?? NEDEFINIT;
}

/** Rândurile active (ne-retrase) ale categoriilor date; sortate după club apoi nume. */
export function participanti(categorieIds: string[], ctx: CtxCategorii): ParticipantCategorie[] {
  const ids = new Set(categorieIds);
  const out: ParticipantCategorie[] = [];
  for (const i of ctx.inscrieri) {
    if (!ids.has(i.categorie_id) || retras(i.status)) continue;
    const sp = (i.sportiv as any) ?? null;
    out.push({
      tip: 'inscriere', id: i.id, categorieId: i.categorie_id, clubId: i.club_id,
      nume: sp ? `${String(sp.nume ?? '').toUpperCase()} ${sp.prenume ?? ''}`.trim() : i.sportiv_id,
      clubNume: sp?.cluburi?.nume ?? '',
      gradNume: gradNumePentru(sp, ctx),
      varsta: sp?.data_nasterii ? calculeazaVarstaLaData(sp.data_nasterii, ctx.competitie.data_inceput) : null,
      gen: sp?.gen ?? null,
      quyen: [i.inlantuire?.denumire, i.inlantuire_2?.denumire].filter(Boolean).join(' + ') || NEDEFINIT,
      taxaAchitata: !!i.taxa_achitata, sportivId: i.sportiv_id, sportiv: sp, membri: [],
    });
  }
  for (const e of ctx.echipe) {
    if (!ids.has(e.categorie_id) || retras(e.status)) continue;
    const membri = membriEchipa(e).filter(m => m.rol !== 'rezerva').map(m => m.sportiv).filter(Boolean) as Sportiv[];
    const gradMax = membri.map(m => gradEfectivLaData(m, ctx.grade, ctx.competitie.data_inceput))
      .filter(Boolean).sort((a, b) => b!.ordine - a!.ordine)[0];
    out.push({
      tip: 'echipa', id: e.id, categorieId: e.categorie_id, clubId: e.club_id,
      nume: e.denumire_echipa || 'Echipă',
      clubNume: (e as any).club?.nume ?? (membri[0] as any)?.cluburi?.nume ?? '',
      gradNume: gradMax?.nume ?? NEDEFINIT, varsta: null, gen: null,
      quyen: e.inlantuire?.denumire ?? NEDEFINIT,
      taxaAchitata: !!e.taxa_achitata, sportivId: null, sportiv: null, membri,
    });
  }
  return out.sort((a, b) => cmp(a.clubNume, b.clubNume) || cmp(a.nume, b.nume));
}

/** D-07: rândurile active rămase legate de o categorie ne-activă (anulată / fuzionată / împărțită). */
export function participantiFaraCategorie(ctx: CtxCategorii): ParticipantCategorie[] {
  return participanti(ctx.categorii.filter(c => !categorieActiva(c)).map(c => c.id), ctx);
}

export function sportiviInscrisi(categorieId: string, inscrieri: InscriereCompetitie[], echipe: EchipaCompetitie[]): string[] {
  const s = new Set<string>();
  inscrieri.filter(i => i.categorie_id === categorieId && !retras(i.status)).forEach(i => s.add(i.sportiv_id));
  echipe.filter(e => e.categorie_id === categorieId && !retras(e.status)).forEach(e => membriEchipa(e).forEach(m => s.add(m.sportiv_id)));
  return [...s];
}

const taxaRand = (r: ParticipantCategorie, cat: CategorieCompetitie, comp: Competitie) =>
  r.tip === 'inscriere' ? calculeazaTaxaIndividuala(comp, cat) : calculeazaTaxaEchipa(cat, comp);

/** Sportivii de verificat pentru eligibilitate: individul sau titularii echipei. */
const sportiviDeVerificat = (r: ParticipantCategorie): Sportiv[] => (r.tip === 'inscriere' ? (r.sportiv ? [r.sportiv] : []) : r.membri);

/** Blocaje (doar la mutare) + avertismente pentru mutarea unui rând în categoria `tinta`. */
export function verificaTinta(
  rand: ParticipantCategorie, tinta: CategorieCompetitie, ctx: CtxCategorii, operatie: OperatieCategorii,
): { blocaj: string | null; avertismente: string[] } {
  const curenta = ctx.categorii.find(c => c.id === rand.categorieId);
  let blocaj: string | null = null;
  if (operatie === 'mutare') {
    if (curenta && !compatibile(curenta, tinta)) blocaj = 'Categoria țintă nu este compatibilă (probă / tip / armă).';
    else if (tinta.id === rand.categorieId) blocaj = 'Categoria țintă este chiar categoria curentă.';
    else if (!categorieActiva(tinta)) blocaj = 'Categoria țintă nu este activă.';
    else if (rand.tip === 'inscriere' && ctx.inscrieri.some(i => i.categorie_id === tinta.id && i.sportiv_id === rand.sportivId)) {
      blocaj = 'Sportivul are deja o înscriere în categoria țintă.';
    }
  }
  const avertismente: string[] = [];
  if (rand.tip === 'inscriere') {
    const alta = ctx.inscrieri.some(i => {
      if (i.id === rand.id || i.sportiv_id !== rand.sportivId || retras(i.status)) return false;
      const c = ctx.categorii.find(k => k.id === i.categorie_id);
      return !!c && categorieActiva(c) && c.id !== tinta.id && (c.proba_id ?? null) === (tinta.proba_id ?? null);
    });
    if (alta) avertismente.push('Sportivul are deja altă înscriere activă la aceeași probă.');
  }
  const motive = new Set<string>();
  sportiviDeVerificat(rand).forEach(s => verificaEligibilitate(s, tinta, ctx.grade, ctx.competitie.data_inceput).motive.forEach(m => motive.add(m)));
  if (motive.size) avertismente.push(`Eligibilitate: ${[...motive].join('; ')}.`);
  if (rand.taxaAchitata && curenta) {
    const veche = taxaRand(rand, curenta, ctx.competitie), noua = taxaRand(rand, tinta, ctx.competitie);
    if (veche !== noua) avertismente.push(`Taxă achitată ${veche} lei; în categoria țintă ${noua} lei — diferența se reglează manual.`);
  }
  return { blocaj, avertismente };
}

const planGol = (operatie: OperatieCategorii): PlanOperatieCategorii =>
  ({ operatie, surse: [], categoriiNoi: [], randuri: [], blocaje: [], avertismente: [], asteptat: null, taxe: null });

/** D-04 / D-08: anularea lasă rândurile „Fără categorie”; taxele se raportează, nu se modifică. */
export function planAnulare(cat: CategorieCompetitie, ctx: CtxCategorii): PlanOperatieCategorii {
  const randuri = participanti([cat.id], ctx).map(r => ({ ...r, tinta: null }));
  const taxe = { nrNeachitate: 0, sumaNeachitata: 0, nrAchitate: 0, sumaAchitata: 0 };
  for (const r of randuri) {
    const t = taxaRand(r, cat, ctx.competitie);
    if (r.taxaAchitata) { taxe.nrAchitate++; taxe.sumaAchitata += t; } else { taxe.nrNeachitate++; taxe.sumaNeachitata += t; }
  }
  const blocaje = categorieActiva(cat) ? [] : ['Categoria nu este activă.'];
  const avertismente: string[] = [];
  if (randuri.length) avertismente.push(`${randuri.length} participanți rămân «Fără categorie» până la realocare.`);
  if (taxe.nrAchitate) avertismente.push(`${taxe.nrAchitate} taxe deja achitate (${taxe.sumaAchitata} lei) rămân marcate achitate: se reportează la realocare sau se returnează clubului.`);
  return { ...planGol('anulare'), surse: [cat.id], randuri, blocaje, avertismente, asteptat: randuri.length, taxe };
}

/** Realocare rânduri „Fără categorie” (sau mutare simplă): sugestie doar când există o singură țintă validă. */
export function planMutare(selectie: { tip: 'inscriere' | 'echipa'; id: string }[], ctx: CtxCategorii): PlanOperatieCategorii {
  const toate = participanti(ctx.categorii.map(c => c.id), ctx);
  const chei = new Set(selectie.map(cheieRand));
  const alese = toate.filter(r => chei.has(cheieRand(r)));
  const blocaje = alese.length < chei.size ? ['Unele înscrieri nu mai sunt disponibile; reîncarcă.'] : [];
  const randuri: RandPlanCategorie[] = alese.map(r => {
    const curenta = ctx.categorii.find(c => c.id === r.categorieId);
    const verificati = sportiviDeVerificat(r);
    const candidate = !curenta || !verificati.length ? [] : ctx.categorii.filter(c =>
      c.id !== curenta.id && categorieActiva(c) && compatibile(curenta, c)
      && verificaTinta(r, c, ctx, 'mutare').blocaj === null
      && verificati.every(s => verificaEligibilitate(s, c, ctx.grade, ctx.competitie.data_inceput).eligibil));
    return { ...r, tinta: candidate.length === 1 ? candidate[0].id : null };
  });
  return { ...planGol('mutare'), surse: [...new Set(randuri.map(r => r.categorieId))], randuri, blocaje };
}

/** Transformă planul + alegerile super adminului în payload-ul `p_mutari`. */
export function mutariDinPlan(plan: PlanOperatieCategorii, alegeri: Record<string, string>, ctx: CtxCategorii): RezultatMutari {
  const rez: RezultatMutari = { mutari: [], nealocate: 0, blocaje: [], avertismente: {} };
  if (plan.operatie === 'anulare') return rez;
  const prima = ctx.categorii.find(c => c.id === plan.surse[0]);
  const vazute = new Set<string>();
  for (const r of plan.randuri) {
    const k = cheieRand(r);
    const tinta = alegeri[k] ?? r.tinta;
    if (!tinta) { rez.nealocate++; continue; }
    rez.mutari.push({ tip: r.tip, id: r.id, tinta });
    const nou = plan.categoriiNoi.find(n => n.cheie === tinta);
    const cat = nou ? (prima ? categorieDinInput(prima, nou) : undefined) : ctx.categorii.find(c => c.id === tinta);
    if (!cat) { rez.blocaje.push(`${r.nume}: categoria țintă nu mai există.`); continue; }
    const v = verificaTinta(r, cat, ctx, plan.operatie);
    rez.avertismente[k] = v.avertismente;
    if (v.blocaj) rez.blocaje.push(`${r.nume}: ${v.blocaj}`);
    if (r.tip === 'inscriere') {
      const dup = `${r.sportivId}|${tinta}`;
      if (vazute.has(dup)) rez.blocaje.push(`${r.nume}: apare de două ori în categoria țintă.`);
      vazute.add(dup);
    }
  }
  if (rez.nealocate) rez.blocaje.push(`${rez.nealocate} participanți nealocați — alege categoria pe fiecare rând.`);
  return rez;
}
